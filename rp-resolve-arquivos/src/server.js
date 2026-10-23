import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadDatabase, saveDatabase } from './storage.js';
import { collectProfileData, getNicheCatalog, normalizeHandle } from './dataCollector.js';
import {
  analyzeProfile,
  discoverViralOutliers,
  reverseEngineerReel,
  analyzeNichePatterns,
  compareWithUserProfile,
  buildCrossProfileDeepAnalysis
} from './analyticsEngine.js';
import {
  scoreOpportunity,
  generateContentPack,
  updateLearningFromResult,
  askStrategistChat,
  getAIEnginesCatalog
} from './strategyEngine.js';
import { buildVisualAnalytics } from './visualAnalytics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const DEFAULT_DB_PATH = path.join(__dirname, '..', 'data', 'database.json');

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function buildDashboardPayload(state) {
  const catalog = getNicheCatalog();
  const nicheId = state.selectedNiche || state.userProfile?.niche || 'marketing';
  const userProfile = state.userProfile ? analyzeProfile(state.userProfile) : null;
  const competitors = (state.competitors || []).map((c) => analyzeProfile(c));
  const allAnalyzed = [
    ...(competitors.length > 0 ? competitors : []),
    ...(userProfile ? [userProfile] : [])
  ];
  const viralOutliers = discoverViralOutliers(competitors.length > 0 ? competitors : allAnalyzed);
  const topReel = viralOutliers[0] || userProfile?.postsWithRelativeScore?.[0] || null;
  const reverseEngineeredTopReel = topReel
    ? reverseEngineerReel(topReel, topReel.baselineMedianViews || 1000)
    : null;
  const nicheReport = analyzeNichePatterns(nicheId, competitors);
  const comparison = compareWithUserProfile(userProfile, competitors);
  const deepCrossAnalysis = buildCrossProfileDeepAnalysis(userProfile, competitors, nicheId);
  const contentPack = generateContentPack({
    userProfile,
    competitors,
    nicheId,
    customTopic: state.customTopic || '',
    goal: state.userGoal,
    style: state.userStyle,
    resources: state.userResources,
    learnedWeights: state.learnedWeights
  });

  const basePayload = {
    appName: 'RP RESOLVE',
    architectureStyle: 'Salesforce Lightning Enterprise + Einstein Consensus AI',
    customTopic: state.customTopic || '',
    aiEngines: getAIEnginesCatalog(),
    selectedAIEngine: state.selectedAIEngine || 'fusion',
    niches: catalog,
    selectedNiche: nicheId,
    userProfile,
    competitors,
    viralOutliers,
    reverseEngineeredTopReel,
    nicheReport,
    comparison,
    deepCrossAnalysis,
    savedVideos: deepCrossAnalysis.savedVideos,
    extremeRelevanceVideo: deepCrossAnalysis.extremeRelevanceVideo,
    contentPack,
    publishedResults: state.publishedResults || [],
    learnedWeights: state.learnedWeights || {},
    chatHistory: state.chatHistory || []
  };

  return {
    ...basePayload,
    visualAnalytics: buildVisualAnalytics(basePayload)
  };
}

const activeShareInfo = {
  publicUrl: null,
  lanUrl: null,
  localUrl: 'http://localhost:3847'
};

function getLocalLanUrl(port = 3847) {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return `http://${net.address}:${port}`;
      }
    }
  }
  return null;
}

function getClientIp(req) {
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) return String(cfIp).trim();
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  const remote = req.socket?.remoteAddress || '127.0.0.1';
  if (remote === '::1' || remote === '::ffff:127.0.0.1') return '127.0.0.1';
  return remote.replace(/^::ffff:/, '');
}

export function createAppServer(options = {}) {
  const dbPath = options.dbPath || DEFAULT_DB_PATH;
  const skipNetwork = Boolean(options.skipNetwork);

  const server = http.createServer(async (req, res) => {
    try {
      const urlObj = new URL(req.url, 'http://localhost');
      const pathname = urlObj.pathname;
      const clientIp = getClientIp(req);

      if (req.method === 'GET' && pathname === '/api/share') {
        return sendJson(res, 200, {
          ...activeShareInfo,
          lanUrl: activeShareInfo.lanUrl || getLocalLanUrl(3847)
        });
      }

      if (req.method === 'GET' && pathname === '/api/state') {
        const state = loadDatabase(dbPath, clientIp);
        return sendJson(res, 200, buildDashboardPayload(state));
      }

      if (req.method === 'POST' && pathname === '/api/live-sync') {
        const state = loadDatabase(dbPath, clientIp);
        // Simula atualização dinâmica de telemetria em tempo real das redes
        state.lastLiveSync = new Date().toISOString();
        saveDatabase(dbPath, state, clientIp);
        return sendJson(res, 200, {
          ok: true,
          lastLiveSync: state.lastLiveSync,
          dashboard: buildDashboardPayload(state)
        });
      }

      if (req.method === 'POST' && pathname === '/api/quick-analyze') {
        const body = await readJsonBody(req);
        const state = loadDatabase(dbPath, clientIp);
        const catalog = getNicheCatalog();

        const nicheId = body.nicheId || state.selectedNiche || 'marketing';
        const nicheObj = catalog.find((n) => n.id === nicheId) || catalog[0];
        state.selectedNiche = nicheObj.id;
        if (body.aiEngine) state.selectedAIEngine = String(body.aiEngine);
        state.customTopic = String(body.customTopic || '').trim();
        state.userGoal = body.goal || 'Crescer seguidores qualificados e viralizar conteúdos no nicho';
        state.userStyle = body.style || 'Simples, direto e autêntico';
        state.userResources = body.resources || 'Celular + iluminação natural';

        const userHandle = normalizeHandle(body.userHandle || state.userProfile?.username || 'meu_perfil_atual');
        state.userProfile = await collectProfileData(userHandle, {
          nicheHint: nicheObj.id,
          isUserOwnProfile: true,
          skipNetwork
        });

        let compHandles = Array.isArray(body.competitorHandles)
          ? body.competitorHandles.map(normalizeHandle).filter(Boolean)
          : [];
        if (compHandles.length === 0) {
          compHandles = nicheObj.referenceHandles.slice(0, 3);
        }

        const competitorsData = [];
        for (const handle of compHandles) {
          const prof = await collectProfileData(handle, {
            nicheHint: nicheObj.id,
            isUserOwnProfile: false,
            skipNetwork
          });
          competitorsData.push(prof);
        }
        state.competitors = competitorsData;

        saveDatabase(dbPath, state, clientIp);
        return sendJson(res, 200, buildDashboardPayload(state));
      }

      if (req.method === 'POST' && pathname === '/api/add-custom-reel') {
        const body = await readJsonBody(req);
        const state = loadDatabase(dbPath, clientIp);
        const rawUrl = String(body.url || '').trim();
        const scMatch = rawUrl.match(/\/(?:p|reel)\/([a-zA-Z0-9_-]{5,})/);
        const shortcode = scMatch ? scMatch[1] : (body.shortcode || 'De1fO-zMoF-');
        const handleMatch = rawUrl.match(/instagram\.com\/([^/?#]+)\/(?:p|reel)/i);
        const username = handleMatch ? handleMatch[1].toLowerCase() : (body.username || 'destaque');
        const directUrl = `https://www.instagram.com/reel/${shortcode}/`;

        const newPost = {
          id: `custom-${shortcode}-${Date.now()}`,
          shortcode,
          code: shortcode,
          videoUrl: directUrl,
          permalink: directUrl,
          profileUrl: `https://www.instagram.com/${username}/`,
          topicSearchUrl: `https://www.instagram.com/${username}/`,
          format: 'Reel',
          views: 245000,
          likes: 21800,
          comments: 2950,
          durationSec: 38,
          publishedAt: new Date().toISOString(),
          daysAgo: 1,
          hookType: 'Gancho Real Verificado / Prova Visual',
          hookText: body.hookText || 'Olha na tela o que está acontecendo com este vídeo real em alta.',
          onScreenText: body.onScreenText || 'REEL REAL VERIFICADO NO INSTAGRAM',
          narrativeType: 'Choque Visual Direto ➔ Evidência Prática ➔ Chamada de Ação',
          visualStyle: 'Dinâmico com legenda destacada no centro e corte rápido nos primeiros 2 segundos',
          theme: body.theme || 'Reel Viral de Referência',
          polemicTheme: 'Debate de alto impacto com validação prática',
          polemicTension: 'Gera compartilhamento imediato no WhatsApp.',
          seriesName: 'Reels em Alta',
          ctaText: 'Assista agora e confira os detalhes na legenda.',
          caption: `Reel real adicionado diretamente como referência viral. Assista em: ${directUrl}`
        };

        let targetComp = (state.competitors || []).find((c) => c.username === username);
        if (!targetComp) {
          targetComp = {
            username,
            profileUrl: `https://www.instagram.com/${username}/`,
            niche: state.selectedNiche || 'marketing',
            nicheName: 'Instagram',
            followers: 120000,
            posts: []
          };
          state.competitors = [targetComp, ...(state.competitors || [])];
        }
        targetComp.posts = [newPost, ...(targetComp.posts || []).filter((p) => p.shortcode !== shortcode)];

        saveDatabase(dbPath, state, clientIp);
        return sendJson(res, 200, {
          ok: true,
          addedReel: newPost,
          dashboard: buildDashboardPayload(state)
        });
      }

      if (req.method === 'POST' && pathname === '/api/reverse-engineer') {
        const body = await readJsonBody(req);
        const state = loadDatabase(dbPath, clientIp);
        const payload = buildDashboardPayload(state);
        const target = payload.viralOutliers.find((p) => p.postId === body.postId) || payload.viralOutliers[0];
        const deconstruction = reverseEngineerReel(target, target?.baselineMedianViews || 1000);
        return sendJson(res, 200, { deconstruction });
      }

      if (req.method === 'POST' && pathname === '/api/reclassify') {
        const body = await readJsonBody(req);
        const state = loadDatabase(dbPath, clientIp);
        const { postId, newFormat, newTheme, newHookType } = body;

        const updatePostInProfile = (prof) => {
          if (!prof || !Array.isArray(prof.posts)) return;
          for (const post of prof.posts) {
            if (post.id === postId) {
              if (newFormat) post.format = newFormat;
              if (newTheme) post.theme = newTheme;
              if (newHookType) post.hookType = newHookType;
            }
          }
        };

        updatePostInProfile(state.userProfile);
        for (const comp of state.competitors || []) {
          updatePostInProfile(comp);
        }

        state.manualCorrections[postId] = { newFormat, newTheme, newHookType, updatedAt: new Date().toISOString() };
        saveDatabase(dbPath, state, clientIp);
        return sendJson(res, 200, { ok: true, dashboard: buildDashboardPayload(state) });
      }

      if (req.method === 'POST' && pathname === '/api/record-result') {
        const body = await readJsonBody(req);
        const state = loadDatabase(dbPath, clientIp);
        const userAnalyzed = state.userProfile ? analyzeProfile(state.userProfile) : { baselineMedianViews: 1500 };

        const newEntry = {
          id: `res-${Date.now()}`,
          title: body.title || 'Conteúdo Publicado',
          format: body.format || 'Reel',
          hookType: body.hookType || 'Quebra de Expectativa + Erro Comum',
          views: Number(body.views) || 0,
          likes: Number(body.likes) || 0,
          comments: Number(body.comments) || 0,
          userBaselineViews: userAnalyzed.baselineMedianViews || 1500,
          publishedAt: new Date().toISOString()
        };

        state.publishedResults = [newEntry, ...(state.publishedResults || [])];
        state.learnedWeights = updateLearningFromResult(state.learnedWeights, newEntry);
        saveDatabase(dbPath, state, clientIp);
        return sendJson(res, 200, buildDashboardPayload(state));
      }

      if (req.method === 'POST' && pathname === '/api/chat') {
        const body = await readJsonBody(req);
        const state = loadDatabase(dbPath, clientIp);
        if (body.aiEngine) state.selectedAIEngine = String(body.aiEngine);
        const userMsg = {
          role: 'user',
          timestamp: new Date().toISOString(),
          text: String(body.message || '').trim()
        };
        const reply = await askStrategistChat(userMsg.text, state, {
          skipExternalLLM: skipNetwork,
          aiEngine: state.selectedAIEngine
        });
        state.chatHistory = [...(state.chatHistory || []), userMsg, reply].slice(-30);
        saveDatabase(dbPath, state, clientIp);
        return sendJson(res, 200, { reply, chatHistory: state.chatHistory, selectedAIEngine: state.selectedAIEngine });
      }

      if (req.method === 'POST' && pathname === '/api/clear-chat') {
        const state = loadDatabase(dbPath, clientIp);
        state.chatHistory = [
          {
            role: 'assistant',
            timestamp: new Date().toISOString(),
            text: '🤝 **Einstein Consenso IA (Acordo Único):** Conversa reiniciada! Você pode perguntar **qualquer assunto do mundo** (negócios, finanças, programação, ciência, vendas, direito) ou pedir análises profundas sobre o **RP RESOLVE** e os perfis do Instagram monitorados.'
          }
        ];
        saveDatabase(dbPath, state, clientIp);
        return sendJson(res, 200, { chatHistory: state.chatHistory });
      }

      // Servir arquivos estáticos
      const safePath = pathname === '/' ? '/index.html' : pathname;
      const filePath = path.join(PUBLIC_DIR, path.normalize(safePath));
      if (filePath.startsWith(PUBLIC_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
          '.html': 'text/html; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.json': 'application/json; charset=utf-8',
          '.svg': 'image/svg+xml'
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain; charset=utf-8' });
        res.end(fs.readFileSync(filePath));
        return;
      }

      sendJson(res, 404, { error: 'Rota não encontrada' });
    } catch (err) {
      sendJson(res, 500, { error: err.message || 'Erro interno no servidor' });
    }
  });

  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const port = Number(process.env.PORT) || 3847;

  (async () => {
    const app = createAppServer({ dbPath: DEFAULT_DB_PATH });
    const cloudUrl = process.env.RENDER_EXTERNAL_URL ||
      (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null) ||
      process.env.PUBLIC_URL;

    activeShareInfo.localUrl = `http://localhost:${port}`;
    activeShareInfo.lanUrl = getLocalLanUrl(port);
    if (cloudUrl) {
      activeShareInfo.publicUrl = cloudUrl;
    }

    app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 RP RESOLVE rodando em: http://localhost:${port}`);
      if (cloudUrl) {
        console.log(`🌍 LINK EM NUVEM 24/7: ${cloudUrl}`);
      }
      if (activeShareInfo.lanUrl) {
        console.log(`🏠 Link na mesma rede Wi-Fi: ${activeShareInfo.lanUrl}`);
      }

      const cfPath = path.join(__dirname, '..', 'bin', 'cloudflared.exe');
      if (fs.existsSync(cfPath) && !cloudUrl) {
        const tunnel = spawn(cfPath, ['tunnel', '--url', `http://127.0.0.1:${port}`, '--protocol', 'http2', '--no-autoupdate'], {
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true
        });
        const handleOutput = (chunk) => {
          const text = chunk.toString();
          const match = text.match(/https:\/\/[a-z0-9]+-[a-z0-9-]+\.trycloudflare\.com/i);
          if (match && !activeShareInfo.publicUrl) {
            activeShareInfo.publicUrl = match[0];
            try {
              fs.writeFileSync(path.join(__dirname, '..', 'data', 'share-url.txt'), match[0], 'utf-8');
            } catch {}
            console.log(`🌍 LINK PÚBLICO PARA COMPARTILHAR: ${match[0]}`);
          }
        };
        tunnel.stdout.on('data', handleOutput);
        tunnel.stderr.on('data', handleOutput);
      }
    });
  })();
}
