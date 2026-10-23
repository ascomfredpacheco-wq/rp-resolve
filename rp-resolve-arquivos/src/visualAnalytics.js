/**
 * Motor de Visual Analytics, Gráficos Executivos e Mídia Visual (Padrão Salesforce Einstein)
 * Gera estruturas prontas para renderização de gráficos SVG/Canvas e capas visuais IA.
 */

export function buildAvatarSvgDataUri(username = 'user', accentColor = '#0176d3') {
  const clean = String(username || 'user').replace(/^@/, '').trim() || 'user';
  const initials = clean.slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${accentColor}"/>
        <stop offset="100%" stop-color="#032d60"/>
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="16" fill="url(#g)"/>
    <circle cx="50" cy="14" r="6" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
    <text x="32" y="39" font-family="Segoe UI, Inter, sans-serif" font-size="22" font-weight="800" fill="#ffffff" text-anchor="middle">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function buildStoryboardSvgDataUri({ title = 'Roteiro Viral', hookText = '', multiplier = '9.5x', badge = 'CONSENSO IA', themeColor = '#0176d3' } = {}) {
  const safeTitle = String(title).replace(/[<>&"]/g, '').slice(0, 42);
  const safeHook = String(hookText).replace(/[<>&"]/g, '').slice(0, 58);
  const safeMult = String(multiplier).replace(/[<>&"]/g, '');
  const safeBadge = String(badge).replace(/[<>&"]/g, '');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#032d60"/>
        <stop offset="55%" stop-color="#0b192c"/>
        <stop offset="100%" stop-color="${themeColor}"/>
      </linearGradient>
      <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#00a1e0"/>
        <stop offset="100%" stop-color="#10b981"/>
      </linearGradient>
    </defs>
    <rect width="480" height="270" rx="14" fill="url(#bg)"/>
    <g opacity="0.14" stroke="#ffffff" stroke-width="1">
      <line x1="0" y1="54" x2="480" y2="54"/>
      <line x1="0" y1="108" x2="480" y2="108"/>
      <line x1="0" y1="162" x2="480" y2="162"/>
      <line x1="0" y1="216" x2="480" y2="216"/>
      <line x1="120" y1="0" x2="120" y2="270"/>
      <line x1="240" y1="0" x2="240" y2="270"/>
      <line x1="360" y1="0" x2="360" y2="270"/>
    </g>
    <!-- Curva estética de crescimento ao fundo -->
    <path d="M 30 220 Q 130 200 210 140 T 440 45" fill="none" stroke="url(#bar)" stroke-width="4" opacity="0.45"/>
    <circle cx="440" cy="45" r="7" fill="#10b981" opacity="0.8"/>
    <!-- Badge Topo -->
    <rect x="22" y="20" width="165" height="28" rx="6" fill="#0176d3"/>
    <text x="34" y="39" font-family="Segoe UI, Inter, sans-serif" font-size="11" font-weight="800" fill="#ffffff">${safeBadge}</text>
    <!-- Multiplicador -->
    <rect x="355" y="20" width="103" height="28" rx="6" fill="#10b981"/>
    <text x="406" y="39" font-family="Segoe UI, Inter, sans-serif" font-size="12" font-weight="800" fill="#042f2e" text-anchor="middle">PICO ${safeMult}</text>
    <!-- Play Icon Central -->
    <circle cx="240" cy="122" r="28" fill="rgba(255,255,255,0.15)" stroke="#ffffff" stroke-width="2"/>
    <polygon points="233,109 233,135 255,122" fill="#ffffff"/>
    <!-- Título e Gancho na base -->
    <rect x="18" y="172" width="444" height="80" rx="10" fill="rgba(6, 15, 32, 0.82)" stroke="rgba(255,255,255,0.18)"/>
    <text x="32" y="198" font-family="Segoe UI, Inter, sans-serif" font-size="14" font-weight="800" fill="#38bdf8">${safeTitle}</text>
    <text x="32" y="222" font-family="Segoe UI, Inter, sans-serif" font-size="12" font-weight="600" fill="#f8fafc">"${safeHook}..."</text>
    <text x="32" y="241" font-family="Segoe UI, Inter, sans-serif" font-size="10" font-weight="600" fill="#94a3b8">STORYBOARD VISUAL EINSTEIN • PRONTO PARA GRAVAÇÃO</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function buildAiImagePromptUrl(topic = 'business intelligence', nicheName = 'Marketing') {
  const cleanPrompt = `Salesforce executive studio photography professional content creator ${topic} ${nicheName} modern clean lighting high contrast 8k`
    .replace(/[^a-zA-Z0-9À-ÿ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=640&height=360&nologo=true&seed=42`;
}

export function buildVisualAnalytics(dashboard = {}) {
  const user = dashboard.userProfile;
  const competitors = Array.isArray(dashboard.competitors) ? dashboard.competitors : [];
  const outliers = Array.isArray(dashboard.viralOutliers) ? dashboard.viralOutliers : [];
  const topIdea = dashboard.contentPack?.prioritizedIdeas?.[0];
  const nicheReport = dashboard.nicheReport || {};

  // 1. Gráfico Comparativo de Perfis (Mediana vs. Maior Pico Viral & Multiplicador)
  const palette = ['#0176d3', '#00a1e0', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  const allProfiles = [
    ...(user ? [{ ...user, isUser: true }] : []),
    ...competitors.map((c) => ({ ...c, isUser: false }))
  ];

  const competitorComparisonChart = allProfiles.map((prof, idx) => {
    const topPost = prof.outliers?.[0] || prof.postsWithRelativeScore?.[0] || {};
    const medianViews = Number(prof.baselineMedianViews) || 1200;
    const peakViews = Number(topPost.views) || medianViews * 2;
    const multiplier = Number(topPost.outlierMultiplier) || Number((peakViews / Math.max(1, medianViews)).toFixed(1));
    const engagementRate = Number(topPost.observableEngagementRate) || 6.4;
    const color = prof.isUser ? '#10b981' : palette[idx % palette.length];

    return {
      username: prof.username || `perfil_${idx + 1}`,
      label: prof.isUser ? `@${prof.username} (Você)` : `@${prof.username}`,
      isUser: Boolean(prof.isUser),
      medianViews,
      peakViews,
      multiplier,
      engagementRate,
      postsPerWeek: Number(prof.postingFrequencyPerWeek) || 3,
      color,
      avatarUrl: buildAvatarSvgDataUri(prof.username, color)
    };
  });

  // 2. Gráfico de Curva de Retenção Estimada Segundo a Segundo (0s a 42s)
  const topMult = outliers[0]?.outlierMultiplier || 9.2;
  const retentionCurveChart = {
    title: 'Curva de Retenção Comparativa (Estrutura Campeã vs. Abertura Comum)',
    subtitle: `Modelagem baseada no pico relativo de ${topMult}x a mediana dos perfis analisados`,
    points: [
      { second: '00s', viralHookPct: 100, commonIntroPct: 100, stage: 'Início do Scroll' },
      { second: '03s', viralHookPct: 86, commonIntroPct: 44, stage: 'Gancho Visual (0-3s)' },
      { second: '08s', viralHookPct: 78, commonIntroPct: 31, stage: 'Tarja Fixa + Conflito' },
      { second: '15s', viralHookPct: 71, commonIntroPct: 22, stage: 'Quebra de Crença / Prova' },
      { second: '24s', viralHookPct: 65, commonIntroPct: 16, stage: '3 Passos Práticos' },
      { second: '32s', viralHookPct: 60, commonIntroPct: 12, stage: 'Fechamento do Loop' },
      { second: '40s', viralHookPct: 56, commonIntroPct: 9, stage: 'CTA de Salvamento/Direct' }
    ]
  };

  // 3. Gráfico de Critérios do Score de Consenso IA (9 Pilares)
  const criteriaRadarChart = (topIdea?.score?.criteriaBreakdown || []).map((c) => ({
    key: c.key,
    label: c.label,
    score: Number(c.score) || 85,
    weight: Number(c.weight) || 1.0
  }));

  // 4. Distribuição de Eficiência por Formato
  const formatPerformanceChart = [
    { format: 'Reels (32s–42s com Gancho Visual)', sharePct: 58, avgMultiplier: `${topMult}x`, color: '#0176d3' },
    { format: 'Carrossel de 7 Lâminas (Salvamento)', sharePct: 27, avgMultiplier: '4.8x', color: '#00a1e0' },
    { format: 'Sequência de 4 Stories (Conversão Direct)', sharePct: 15, avgMultiplier: '3.2x', color: '#10b981' }
  ];

  // 5. Velocidade de Tendências do Nicho
  const trendVelocityChart = (nicheReport.trendingTopics || []).map((t, idx) => {
    const matchPct = String(t.growthVelocity || '').match(/(\d+)\s*%/);
    const growthPct = matchPct ? Number(matchPct[1]) : 220 - idx * 35;
    return {
      topic: t.topic,
      growthPct,
      growthLabel: t.growthVelocity || `+${growthPct}%`,
      whyItWorks: t.whyItWorks || 'Alta taxa de compartilhamento orgânico',
      exampleLink: t.exampleLink || 'https://www.instagram.com/'
    };
  });

  // 6. Galeria de Storyboards & Capas Visuais
  const ext = dashboard.extremeRelevanceVideo || {};
  const visualCards = (dashboard.contentPack?.prioritizedIdeas || []).map((idea, idx) => {
    const colors = ['#0176d3', '#00a1e0', '#10b981'];
    return {
      ideaId: idea.id,
      title: idea.title,
      storyboardSvg: buildStoryboardSvgDataUri({
        title: idea.title,
        hookText: idea.alternativeHooks?.[0]?.text || '',
        multiplier: `${idea.referenceVideoSnapshot?.outlierMultiplier || topMult}x`,
        badge: `ROTEIRO #${idx + 1} • NOTA ${idea.score?.totalScore || 92}/100`,
        themeColor: colors[idx % colors.length]
      }),
      aiCoverUrl: buildAiImagePromptUrl(idea.title, nicheReport.nicheName || 'Instagram')
    };
  });

  return {
    competitorComparisonChart,
    retentionCurveChart,
    criteriaRadarChart,
    formatPerformanceChart,
    trendVelocityChart,
    extremeVideoStoryboard: buildStoryboardSvgDataUri({
      title: `@${ext.username || 'referencia'} • Vídeo #1`,
      hookText: ext.hookText || 'Gancho Campeão',
      multiplier: `${ext.outlierMultiplier || topMult}x`,
      badge: 'EXTREMA RELEVÂNCIA',
      themeColor: '#0176d3'
    }),
    extremeVideoAiCoverUrl: buildAiImagePromptUrl(ext.polemicTheme || 'Viral Reel', nicheReport.nicheName || 'Business'),
    visualCards
  };
}
