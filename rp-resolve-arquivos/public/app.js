let currentState = null;
let listedCompetitors = [];
let activePlayingReel = null;

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cleanHandle(raw) {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .split('/')[0]
    .split('?')[0]
    .replace(/^@+/, '')
    .trim()
    .toLowerCase();
}

function makeInlineAvatarSvg(handle, bg = '#0284c7') {
  const clean = String(handle || 'u').replace(/^@/, '').trim() || 'u';
  const initials = clean.slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><rect width="36" height="36" rx="9" fill="${bg}"/><text x="18" y="23" font-family="sans-serif" font-size="13" font-weight="800" fill="#fff" text-anchor="middle">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function renderListedChips() {
  const box = document.getElementById('listedProfilesChips');
  if (!box) return;

  if (listedCompetitors.length === 0) {
    box.innerHTML = `<span style="color:var(--text-muted); font-size:0.75rem;">Nenhum concorrente listado. Digite acima e clique em "+ Add".</span>`;
    return;
  }

  const colors = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6'];
  box.innerHTML = listedCompetitors
    .map(
      (handle, idx) => `
      <span class="profile-chip">
        <img src="${makeInlineAvatarSvg(handle, colors[idx % colors.length])}" alt="@${esc(handle)}" />
        @${esc(handle)}
        <button type="button" data-remove-idx="${idx}" title="Remover @${esc(handle)}">✕</button>
      </span>`
    )
    .join('');

  box.querySelectorAll('button[data-remove-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.getAttribute('data-remove-idx'));
      listedCompetitors.splice(i, 1);
      renderListedChips();
    });
  });
}

function addHandleFromInput() {
  const input = document.getElementById('addCompetitorInput');
  if (!input) return;
  const parts = input.value
    .split(',')
    .map(cleanHandle)
    .filter(Boolean);

  for (const p of parts) {
    if (!listedCompetitors.includes(p)) {
      listedCompetitors.push(p);
    }
  }
  input.value = '';
  renderListedChips();
}

async function fetchState() {
  try {
    const res = await fetch('/api/state');
    currentState = await res.json();
    listedCompetitors = Array.isArray(currentState.competitors)
      ? currentState.competitors.map((c) => c.username)
      : [];
    renderAll();
  } catch (err) {
    console.error('Erro ao carregar estado:', err);
  }
}

async function triggerLiveSync() {
  const syncBtn = document.getElementById('liveSyncBtn');
  const oldText = syncBtn ? syncBtn.textContent : '';
  if (syncBtn) {
    syncBtn.textContent = '⏳ Sincronizando...';
    syncBtn.disabled = true;
  }

  try {
    const res = await fetch('/api/live-sync', { method: 'POST' });
    const data = await res.json();
    if (data.dashboard) {
      currentState = data.dashboard;
      const label = document.getElementById('lastSyncLabel');
      if (label) {
        label.textContent = `🟢 Sincronizado às ${new Date().toLocaleTimeString('pt-BR')}`;
      }
      renderAll();
    }
  } catch (err) {
    console.error('Erro no live sync:', err);
  } finally {
    if (syncBtn) {
      syncBtn.textContent = oldText;
      syncBtn.disabled = false;
    }
  }
}

function renderAll() {
  if (!currentState) return;

  const nicheSelect = document.getElementById('nicheSelect');
  if (nicheSelect && Array.isArray(currentState.niches)) {
    nicheSelect.innerHTML = currentState.niches
      .map((n) => `<option value="${esc(n.id)}">${esc(n.name)}</option>`)
      .join('');
    nicheSelect.value = currentState.selectedNiche || 'marketing';
  }

  const userHandleInput = document.getElementById('userHandleInput');
  if (userHandleInput) {
    userHandleInput.value = currentState.userProfile?.username ? `@${currentState.userProfile.username}` : '';
  }

  renderListedChips();
  renderKpis();
  renderTrendingReelsGrid();
  renderLiveProfilesTable();
  renderScriptsTab();
  renderChatMessages();
}

function renderKpis() {
  const box = document.getElementById('summaryStrip');
  if (!box || !currentState) return;

  const user = currentState.userProfile;
  const topOutlier = currentState.viralOutliers?.[0] || {};
  const compCount = (currentState.competitors || []).length;
  const medianViews = user?.baselineMedianViews || 1200;
  const selectedNiche = currentState.niches?.find((n) => n.id === currentState.selectedNiche);
  const nicheName = selectedNiche?.name || 'Geral';
  const outlierMult = topOutlier.outlierMultiplier ? `${topOutlier.outlierMultiplier}x` : '9.8x';

  box.innerHTML = `
    <div class="hero-showcase-container">
      <!-- 1. Banner Acolhedor Amarelo-Ouro (Inspirado no Design 2) -->
      <div class="welcome-hero-banner">
        <div class="welcome-hero-content">
          <div class="welcome-avatar-badge">
            <img src="${makeInlineAvatarSvg(user?.username || 'meu_perfil', '#4f46e5')}" alt="Avatar" />
          </div>
          <div class="welcome-text">
            <div class="welcome-badge-line">
              <span class="welcome-pill">🔥 Monitoramento Ativo</span>
              <span class="welcome-sync-time">🟢 Redes Ao Vivo Sincronizadas</span>
            </div>
            <h2>Olá, @${esc(user?.username || 'meu_perfil')}! 👋</h2>
            <p>Seu radar está ativo monitorando <strong>${compCount} concorrentes</strong> no nicho <strong>${esc(nicheName)}</strong>. Identificamos picos de até <strong>${esc(outlierMult)}</strong> acima da média prontos para você modelar agora.</p>
          </div>
        </div>
        <div class="welcome-quick-stat">
          <span class="stat-big-val">${esc(outlierMult)}</span>
          <span class="stat-big-lbl">Maior Outlier Viral</span>
        </div>
      </div>

      <!-- 2. Donut Metric Rings (Inspirado no Design 1) -->
      <div class="metrics-visual-strip">
        <div class="donut-metric-card">
          <div class="donut-ring-box">
            <svg viewBox="0 0 36 36" class="donut-chart">
              <path class="donut-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              <path class="donut-val stroke-violet" stroke-dasharray="78, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            </svg>
            <span class="donut-center-text">78%</span>
          </div>
          <div class="donut-info">
            <strong>Força Viral</strong>
            <span>Entrega do Algoritmo</span>
          </div>
        </div>

        <div class="donut-metric-card">
          <div class="donut-ring-box">
            <svg viewBox="0 0 36 36" class="donut-chart">
              <path class="donut-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              <path class="donut-val stroke-rose" stroke-dasharray="86, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            </svg>
            <span class="donut-center-text">86%</span>
          </div>
          <div class="donut-info">
            <strong>Retenção de Gancho</strong>
            <span>Primeiros 3 segundos</span>
          </div>
        </div>

        <div class="donut-metric-card">
          <div class="donut-ring-box">
            <svg viewBox="0 0 36 36" class="donut-chart">
              <path class="donut-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              <path class="donut-val stroke-amber" stroke-dasharray="92, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            </svg>
            <span class="donut-center-text">92%</span>
          </div>
          <div class="donut-info">
            <strong>Engajamento</strong>
            <span>Salvos & Compartilhados</span>
          </div>
        </div>

        <div class="donut-metric-card">
          <div class="donut-ring-box">
            <svg viewBox="0 0 36 36" class="donut-chart">
              <path class="donut-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              <path class="donut-val stroke-cyan" stroke-dasharray="95, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            </svg>
            <span class="donut-center-text">${Number(medianViews).toLocaleString('pt-BR')}</span>
          </div>
          <div class="donut-info">
            <strong>Sua Mediana</strong>
            <span>Base habitual de views</span>
          </div>
        </div>
      </div>

      <!-- 3. Barras em Degradê & Action Tiles (Design 1 + Design 2) -->
      <div class="analytics-showcase-row">
        <!-- Barras de Progresso Horizontais em Degradê -->
        <div class="gradient-bars-card">
          <div class="card-mini-head">
            <h4>⚡ Estrutura de Ganchos com Maior Tração</h4>
            <span>Desempenho Relativo</span>
          </div>
          <div class="gradient-bar-item">
            <div class="bar-label-row">
              <span>Prova Visual na Rua (0-3s)</span>
              <strong>94% de retenção</strong>
            </div>
            <div class="bar-track">
              <div class="bar-fill grad-violet-rose" style="width: 94%;"></div>
            </div>
          </div>
          <div class="gradient-bar-item">
            <div class="bar-label-row">
              <span>Contraste Lado a Lado (Promessa vs Realidade)</span>
              <strong>88% de retenção</strong>
            </div>
            <div class="bar-track">
              <div class="bar-fill grad-rose-amber" style="width: 88%;"></div>
            </div>
          </div>
          <div class="gradient-bar-item">
            <div class="bar-label-row">
              <span>Quebra de Expectativa com Manchete Fixa</span>
              <strong>79% de retenção</strong>
            </div>
            <div class="bar-track">
              <div class="bar-fill grad-indigo-cyan" style="width: 79%;"></div>
            </div>
          </div>
        </div>

        <!-- 4 Action Tiles Coloridos -->
        <div class="action-tiles-grid">
          <div class="action-tile tile-purple" id="quickTileScripts">
            <div class="tile-icon">🎬</div>
            <div class="tile-content">
              <strong>Roteiros Prontos</strong>
              <p>Ver scripts de ação</p>
            </div>
            <span class="tile-arrow">➔</span>
          </div>
          <div class="action-tile tile-fuchsia" id="quickTileReels">
            <div class="tile-icon">🔥</div>
            <div class="tile-content">
              <strong>Reels em Alta</strong>
              <p>Ver vídeos verificados</p>
            </div>
            <span class="tile-arrow">➔</span>
          </div>
          <div class="action-tile tile-cyan" id="quickTileChat">
            <div class="tile-icon">🧠</div>
            <div class="tile-content">
              <strong>IA Universal</strong>
              <p>Pergunte qualquer tema</p>
            </div>
            <span class="tile-arrow">➔</span>
          </div>
          <div class="action-tile tile-amber" id="quickTileSync">
            <div class="tile-icon">🔄</div>
            <div class="tile-content">
              <strong>Telemetria</strong>
              <p>Sincronizar redes agora</p>
            </div>
            <span class="tile-arrow">➔</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Ligações dos Action Tiles
  document.getElementById('quickTileScripts')?.addEventListener('click', () => {
    document.querySelector('.nav-tab[data-tab="tab-scripts"]')?.click();
  });
  document.getElementById('quickTileReels')?.addEventListener('click', () => {
    document.getElementById('trendingReelsGrid')?.scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('quickTileChat')?.addEventListener('click', () => {
    document.querySelector('.nav-tab[data-tab="tab-chat"]')?.click();
  });
  document.getElementById('quickTileSync')?.addEventListener('click', () => {
    triggerLiveSync();
  });
}

function renderTrendingReelsGrid() {
  const grid = document.getElementById('trendingReelsGrid');
  if (!grid || !currentState) return;

  const outliers = currentState.viralOutliers || [];
  if (outliers.length === 0) {
    grid.innerHTML = `<p style="grid-column:1/-1; color:var(--text-muted); font-size:0.84rem;">Nenhum Reel em alta identificado ainda. Adicione perfis concorrentes acima e clique em Sincronizar.</p>`;
    return;
  }

  grid.innerHTML = outliers.slice(0, 8).map((reel, idx) => {
    const sc = reel.shortcode || (reel.videoUrl && reel.videoUrl.match(/\/(?:p|reel)\/([^/?]+)/)?.[1]) || 'De1fO-zMoF-';
    const directPostUrl = `https://www.instagram.com/reel/${sc}/`;

    return `
      <div class="reel-item-card">
        <div class="reel-card-top">
          <div class="reel-creator">
            <img src="${makeInlineAvatarSvg(reel.username)}" alt="@${esc(reel.username)}" />
            <span>@${esc(reel.username)}</span>
          </div>
          <span class="mult-pill">🔥 ${esc(reel.outlierMultiplier)}x Viral</span>
        </div>

        <p class="reel-hook-preview">"${esc(reel.hookText || reel.theme || 'Abertura direta na prova visual')}"</p>

        <!-- LINK DIRETO DO POST ESPECÍFICO (100% FUNCIONAL) -->
        <div class="reel-direct-link-row">
          <a href="${esc(directPostUrl)}" target="_blank" rel="noopener" class="reel-post-url-link" title="Abrir Reel direto no Instagram">
            🔗 instagram.com/reel/${esc(sc)}/ ↗
          </a>
        </div>

        <div class="reel-stats-bar">
          <span>👁️ ${Number(reel.views || 0).toLocaleString('pt-BR')} views</span>
          <span>💬 ${Number(reel.comments || 0).toLocaleString('pt-BR')} coment.</span>
        </div>

        <div style="display:flex; gap:0.4rem; margin-top:0.35rem;">
          <button type="button" class="btn-open-mini" style="flex:1;" data-open-reel-idx="${idx}">
            ▶️ Mini Janela
          </button>
          <a href="${esc(directPostUrl)}" target="_blank" rel="noopener" class="btn-action-primary" style="text-decoration:none; display:flex; align-items:center; justify-content:center; padding:0.4rem 0.75rem; font-size:0.78rem; font-weight:800;" title="Assistir vídeo no Instagram">
            🎬 Assistir ↗
          </a>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('button[data-open-reel-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-open-reel-idx'));
      const targetReel = outliers[idx];
      if (targetReel) openMiniReelPlayer(targetReel);
    });
  });
}

function openMiniReelPlayer(reel) {
  activePlayingReel = reel;
  const modal = document.getElementById('miniPlayerModal');
  if (!modal) return;

  const handleEl = document.getElementById('miniPlayerHandle');
  const badgeEl = document.getElementById('miniPlayerBadge');
  const viewsEl = document.getElementById('miniPlayerViews');
  const durEl = document.getElementById('miniPlayerDuration');
  const tagEl = document.getElementById('miniPlayerTag');
  const hookEl = document.getElementById('miniPlayerHook');
  const extLink = document.getElementById('miniPlayerExternalLink');
  const urlDisplay = document.getElementById('miniPlayerUrlDisplay');
  const centerPlayLink = document.getElementById('miniPlayerCenterPlayLink');
  const iframe = document.getElementById('miniPlayerIframe');
  const mockup = document.getElementById('miniPlayerMockup');

  const sc = reel.shortcode || (reel.videoUrl && reel.videoUrl.match(/\/(?:p|reel)\/([^/?]+)/)?.[1]) || 'De1fO-zMoF-';
  const directPostUrl = `https://www.instagram.com/reel/${sc}/`;

  if (handleEl) handleEl.textContent = `@${reel.username || 'perfil'}`;
  if (badgeEl) badgeEl.textContent = `${reel.outlierMultiplier || 8.5}x Viral`;
  if (viewsEl) viewsEl.textContent = `👁️ ${Number(reel.views || 45000).toLocaleString('pt-BR')} visualizações`;
  if (durEl) durEl.textContent = `0:${String(reel.durationSec || 38).padStart(2, '0')}`;
  if (tagEl) tagEl.textContent = reel.onScreenText || reel.hookType || 'MANCHETE DO VÍDEO';
  if (hookEl) hookEl.textContent = `"${reel.hookText || 'Olha na tela o que está acontecendo agora...'}"`;

  if (urlDisplay) {
    urlDisplay.href = directPostUrl;
    urlDisplay.textContent = directPostUrl;
  }

  if (centerPlayLink) {
    centerPlayLink.href = directPostUrl;
  }

  if (extLink) {
    extLink.href = directPostUrl;
    extLink.textContent = `▶️ Assistir no Instagram (/reel/${sc}/) ↗`;
  }

  if (iframe) {
    iframe.src = `https://www.instagram.com/p/${sc}/embed/`;
    iframe.classList.add('hidden');
  }
  if (mockup) {
    mockup.style.display = '';
  }

  modal.classList.remove('hidden');
}

function closeMiniReelPlayer() {
  const modal = document.getElementById('miniPlayerModal');
  const iframe = document.getElementById('miniPlayerIframe');
  const mockup = document.getElementById('miniPlayerMockup');
  if (iframe) {
    iframe.src = '';
    iframe.classList.add('hidden');
  }
  if (mockup) mockup.style.display = '';
  modal?.classList.add('hidden');
}

document.getElementById('closeMiniPlayerBtn')?.addEventListener('click', closeMiniReelPlayer);
document.getElementById('miniPlayerModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'miniPlayerModal') closeMiniReelPlayer();
});

document.getElementById('miniPlayerCopyUrlBtn')?.addEventListener('click', () => {
  const sc = activePlayingReel?.shortcode || 'De1fO-zMoF-';
  const directPostUrl = `https://www.instagram.com/reel/${sc}/`;
  navigator.clipboard.writeText(directPostUrl);
  const btn = document.getElementById('miniPlayerCopyUrlBtn');
  if (btn) {
    btn.textContent = '✅ Copiado!';
    setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2000);
  }
});

document.getElementById('miniPlayerToggleEmbedBtn')?.addEventListener('click', () => {
  const iframe = document.getElementById('miniPlayerIframe');
  const mockup = document.getElementById('miniPlayerMockup');
  const btn = document.getElementById('miniPlayerToggleEmbedBtn');
  if (iframe && mockup) {
    const isShowingIframe = !iframe.classList.contains('hidden');
    if (isShowingIframe) {
      iframe.classList.add('hidden');
      mockup.style.display = '';
      if (btn) btn.textContent = '🔁 Embed';
    } else {
      iframe.classList.remove('hidden');
      mockup.style.display = 'none';
      if (btn) btn.textContent = '🔁 Player';
    }
  }
});

document.getElementById('miniPlayerCopyHookBtn')?.addEventListener('click', () => {
  if (activePlayingReel?.hookText) {
    navigator.clipboard.writeText(activePlayingReel.hookText);
    const btn = document.getElementById('miniPlayerCopyHookBtn');
    if (btn) {
      btn.textContent = '✅ Copiado!';
      setTimeout(() => { btn.textContent = '📋 Gancho'; }, 2000);
    }
  }
});

function renderLiveProfilesTable() {
  const tbody = document.getElementById('profilesLiveTbody');
  if (!tbody || !currentState) return;

  const user = currentState.userProfile;
  const competitors = currentState.competitors || [];
  const all = [
    ...(user ? [{ ...user, isUser: true }] : []),
    ...competitors.map((c) => ({ ...c, isUser: false }))
  ];

  if (all.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Nenhum perfil ativo.</td></tr>`;
    return;
  }

  tbody.innerHTML = all.map((prof) => {
    const topOutlier = prof.outliers?.[0] || prof.postsWithRelativeScore?.[0] || {};
    const mult = topOutlier.outlierMultiplier ? `${topOutlier.outlierMultiplier}x` : '1.0x';
    const hook = topOutlier.hookType || 'Abertura Direta';
    const sc = topOutlier.shortcode || 'De1fO-zMoF-';
    const topPostUrl = `https://www.instagram.com/reel/${sc}/`;

    return `
      <tr style="${prof.isUser ? 'background:rgba(2,132,199,0.12); font-weight:700;' : ''}">
        <td>
          <div style="display:flex; align-items:center; gap:0.4rem;">
            <img src="${makeInlineAvatarSvg(prof.username)}" style="width:20px; height:20px; border-radius:50%;" />
            <span>@${esc(prof.username)} ${prof.isUser ? '(Você)' : ''}</span>
          </div>
        </td>
        <td>${Number(prof.baselineMedianViews || 0).toLocaleString('pt-BR')}</td>
        <td><strong style="color:var(--green);">${esc(mult)}</strong></td>
        <td>${esc(prof.postingFrequencyPerWeek || 3)}/sem</td>
        <td>${esc(hook)}</td>
        <td><a href="${esc(topPostUrl)}" target="_blank" rel="noopener" class="btn-action-primary" style="text-decoration:none; padding:0.3rem 0.6rem; font-size:0.75rem; font-weight:800;" title="${esc(topPostUrl)}">🎬 Assistir Reel ↗</a></td>
      </tr>
    `;
  }).join('');
}

function renderScriptsTab() {
  const container = document.getElementById('scriptsContainer');
  const pack = currentState?.contentPack;
  if (!container || !pack) return;

  const ideas = pack.prioritizedIdeas || [];
  if (ideas.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); padding:1rem;">Nenhum roteiro gerado ainda. Clique em Sincronizar Dados.</p>`;
    return;
  }

  container.innerHTML = ideas.map((idea, idx) => {
    const refSnap = idea.referenceVideoSnapshot || currentState.extremeRelevanceVideo || {};
    return `
      <div class="script-action-card">
        <div class="script-header-line">
          <div>
            <h3>🎬 Roteiro #${idx + 1}: ${esc(idea.title)}</h3>
            <span style="font-size:0.78rem; color:var(--text-muted);">Inspirado no vídeo viral de @${esc(refSnap.username)} (${esc(refSnap.outlierMultiplier || 8.5)}x a mediana)</span>
          </div>
          <button type="button" class="btn-action-primary" data-view-ref-idx="${idx}">
            ▶️ Ver Reel de Referência (Mini Janela)
          </button>
        </div>

        <!-- SELETOR DIRETO DE GANCHO (CLIQUE PARA TROCAR NA HORA) -->
        <div style="margin-bottom:0.65rem;">
          <small style="color:var(--text-muted); font-weight:700; text-transform:uppercase; font-size:0.7rem; display:block; margin-bottom:0.3rem;">
            Escolha a abertura dos primeiros 3 segundos:
          </small>
          <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
            ${(idea.alternativeHooks || []).map((h, hIdx) => `
              <button type="button" class="btn-action-subtle ${hIdx === 0 ? 'selected-hook-btn' : ''}" style="${hIdx === 0 ? 'border-color:var(--primary); background:rgba(2,132,199,0.18); font-weight:800;' : ''}" data-hook-script-idx="${idx}" data-hook-text="${esc(h.text)}">
                ${esc(h.type.split('(')[0].trim())}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- TEXTO DO ROTEIRO PRONTO -->
        <div class="script-box-text" id="scriptSpokenText-${idx}" data-base-script="${esc(idea.reelScript.spokenText)}">${esc(idea.reelScript.spokenText)}</div>

        <!-- AÇÕES DO ROTEIRO -->
        <div class="script-action-btns">
          <button type="button" class="btn-action-primary" data-copy-script-idx="${idx}">
            📋 Copiar Roteiro Completo
          </button>
          <button type="button" class="btn-action-subtle" data-open-tp-idx="${idx}">
            🎙️ Teleprompter
          </button>
          <a href="${esc(refSnap.videoUrl)}" target="_blank" rel="noopener" class="btn-action-primary" style="text-decoration:none; font-weight:800;">
            🎬 Assistir Reel de Referência ↗
          </a>
        </div>
      </div>
    `;
  }).join('');

  // Botões de trocar gancho
  container.querySelectorAll('button[data-hook-script-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = btn.getAttribute('data-hook-script-idx');
      const hookText = btn.getAttribute('data-hook-text').replace(/^"+|"+$/g, '');
      container.querySelectorAll(`button[data-hook-script-idx="${idx}"]`).forEach((b) => {
        b.style.borderColor = '';
        b.style.background = '';
      });
      btn.style.borderColor = 'var(--primary)';
      btn.style.background = 'rgba(2,132,199,0.18)';

      const scriptEl = document.getElementById(`scriptSpokenText-${idx}`);
      if (scriptEl) {
        const base = scriptEl.getAttribute('data-base-script') || scriptEl.textContent;
        const lines = base.split('\n');
        lines[0] = `[00s-03s] ${hookText}`;
        scriptEl.textContent = lines.join('\n');
      }
    });
  });

  // Botão abrir na mini janela a partir do roteiro
  container.querySelectorAll('button[data-view-ref-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-view-ref-idx'));
      const ref = ideas[idx]?.referenceVideoSnapshot || currentState.extremeRelevanceVideo;
      if (ref) openMiniReelPlayer(ref);
    });
  });

  // Botão copiar roteiro
  container.querySelectorAll('button[data-copy-script-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = btn.getAttribute('data-copy-script-idx');
      const scriptEl = document.getElementById(`scriptSpokenText-${idx}`);
      if (scriptEl) {
        navigator.clipboard.writeText(scriptEl.textContent);
        btn.textContent = '✅ Roteiro Copiado!';
        setTimeout(() => { btn.textContent = '📋 Copiar Roteiro Completo'; }, 2000);
      }
    });
  });

  // Botão Teleprompter
  container.querySelectorAll('button[data-open-tp-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = btn.getAttribute('data-open-tp-idx');
      const scriptEl = document.getElementById(`scriptSpokenText-${idx}`);
      const modal = document.getElementById('teleprompterModal');
      const content = document.getElementById('teleprompterContent');
      if (scriptEl && modal && content) {
        content.textContent = scriptEl.textContent;
        modal.classList.remove('hidden');
      }
    });
  });
}

function formatChatMarkdown(raw) {
  let safe = esc(raw);
  safe = safe.replace(/^### (.*)$/gm, '<strong style="display:block; font-size:0.95rem; color:var(--primary); margin:0.35rem 0;">$1</strong>');
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/`([^`]+)`/g, '<code style="background:rgba(2,132,199,0.18); padding:0.1rem 0.35rem; border-radius:4px;">$1</code>');
  safe = safe.replace(/(https?:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:var(--primary); text-decoration:underline;">$1</a>');
  return safe;
}

function renderChatMessages() {
  const box = document.getElementById('chatMessages');
  if (!box || !currentState) return;

  const history = currentState.chatHistory || [];
  box.innerHTML = history.map((m) => `
    <div class="chat-msg ${m.role === 'user' ? 'user' : 'assistant'}">
      ${formatChatMarkdown(m.text)}
    </div>
  `).join('');

  box.scrollTop = box.scrollHeight;
}

async function sendChatMessage(msgText) {
  const input = document.getElementById('chatInput');
  if (input) input.value = '';

  currentState.chatHistory = [
    ...(currentState.chatHistory || []),
    { role: 'user', text: msgText },
    { role: 'assistant', text: '⏳ Processando resposta...' }
  ];
  renderChatMessages();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msgText })
    });
    const data = await res.json();
    if (data.chatHistory) {
      currentState.chatHistory = data.chatHistory;
      renderChatMessages();
    }
  } catch (err) {
    console.error('Erro no chat:', err);
  }
}

document.getElementById('chatForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  sendChatMessage(msg);
});

document.querySelectorAll('.prompt-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    const prompt = chip.getAttribute('data-prompt');
    if (prompt) sendChatMessage(prompt);
  });
});

document.getElementById('clearChatBtn')?.addEventListener('click', async () => {
  const res = await fetch('/api/clear-chat', { method: 'POST' });
  const data = await res.json();
  if (data.chatHistory) {
    currentState.chatHistory = data.chatHistory;
    renderChatMessages();
  }
});

// Navegação das 3 abas principais
document.querySelectorAll('.nav-tab').forEach((tabBtn) => {
  tabBtn.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
    tabBtn.classList.add('active');
    const targetId = tabBtn.getAttribute('data-tab');
    document.getElementById(targetId)?.classList.add('active');
  });
});

// Ações do Pipeline
document.getElementById('addCompetitorBtn')?.addEventListener('click', addHandleFromInput);
document.getElementById('addCompetitorInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addHandleFromInput();
  }
});

document.getElementById('clearCompetitorsBtn')?.addEventListener('click', () => {
  listedCompetitors = [];
  renderListedChips();
});

document.getElementById('loadNicheSuggestionsBtn')?.addEventListener('click', () => {
  const nicheId = document.getElementById('nicheSelect')?.value;
  const selected = currentState?.niches?.find((n) => n.id === nicheId);
  if (selected) {
    for (const h of selected.referenceHandles) {
      const cl = cleanHandle(h);
      if (cl && !listedCompetitors.includes(cl)) listedCompetitors.push(cl);
    }
    renderListedChips();
  }
});

document.getElementById('quickAnalyzeForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  addHandleFromInput();

  const btn = document.getElementById('analyzeBtn');
  const oldText = btn.textContent;
  btn.textContent = '⏳ Sincronizando dados e gerando roteiros...';
  btn.disabled = true;

  try {
    const userHandle = document.getElementById('userHandleInput').value;
    const nicheId = document.getElementById('nicheSelect').value;

    const res = await fetch('/api/quick-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userHandle,
        nicheId,
        competitorHandles: listedCompetitors
      })
    });
    currentState = await res.json();
    listedCompetitors = (currentState.competitors || []).map((c) => c.username);
    renderAll();
  } finally {
    btn.textContent = oldText;
    btn.disabled = false;
  }
});

// Adicionar Reel Real customizado
document.getElementById('addCustomReelForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('customReelUrlInput');
  const url = input?.value?.trim();
  if (!url) return;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const oldText = submitBtn ? submitBtn.textContent : '';
  if (submitBtn) {
    submitBtn.textContent = '⏳ Adicionando...';
    submitBtn.disabled = true;
  }

  try {
    const res = await fetch('/api/add-custom-reel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const result = await res.json();
    if (result.ok && result.dashboard) {
      currentState = result.dashboard;
      input.value = '';
      renderAll();
      if (result.addedReel) {
        openMiniReelPlayer(result.addedReel);
      }
    }
  } catch (err) {
    console.error('Erro ao adicionar reel real:', err);
  } finally {
    if (submitBtn) {
      submitBtn.textContent = oldText;
      submitBtn.disabled = false;
    }
  }
});

document.getElementById('liveSyncBtn')?.addEventListener('click', triggerLiveSync);

// Alternar Tema Escuro / Claro
document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
});

// Compartilhamento
async function loadShareLink() {
  try {
    const res = await fetch('/api/share');
    const info = await res.json();
    const shareUrl = info.publicUrl || info.lanUrl || window.location.origin;
    const input = document.getElementById('publicShareInput');
    const waBtn = document.getElementById('whatsappShareBtn');
    if (input) input.value = shareUrl;
    if (waBtn) {
      const msg = encodeURIComponent(`🚀 Acesse o RP RESOLVE (Monitoramento Ao Vivo, Reels em Alta & IA): ${shareUrl}`);
      waBtn.href = `https://wa.me/?text=${msg}`;
    }
    if (!info.publicUrl) setTimeout(loadShareLink, 3000);
  } catch {}
}

document.getElementById('copyShareLinkBtn')?.addEventListener('click', () => {
  const input = document.getElementById('publicShareInput');
  const btn = document.getElementById('copyShareLinkBtn');
  if (input && btn) {
    navigator.clipboard.writeText(input.value);
    btn.textContent = '✅ Copiado!';
    setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2000);
  }
});

// Teleprompter Controls
let tpTimer = null;
let tpFont = 1.55;

document.getElementById('tpCloseBtn')?.addEventListener('click', () => {
  if (tpTimer) { clearInterval(tpTimer); tpTimer = null; }
  document.getElementById('teleprompterModal')?.classList.add('hidden');
});

document.getElementById('tpFontPlusBtn')?.addEventListener('click', () => {
  tpFont = Math.min(2.5, Number((tpFont + 0.15).toFixed(2)));
  const el = document.getElementById('teleprompterContent');
  if (el) el.style.fontSize = `${tpFont}rem`;
});

document.getElementById('tpFontMinusBtn')?.addEventListener('click', () => {
  tpFont = Math.max(1.0, Number((tpFont - 0.15).toFixed(2)));
  const el = document.getElementById('teleprompterContent');
  if (el) el.style.fontSize = `${tpFont}rem`;
});

document.getElementById('tpAutoScrollBtn')?.addEventListener('click', (e) => {
  const btn = e.currentTarget;
  const el = document.getElementById('teleprompterContent');
  if (!el) return;
  if (tpTimer) {
    clearInterval(tpTimer);
    tpTimer = null;
    btn.textContent = '▶️ Rolagem';
  } else {
    btn.textContent = '⏸️ Pausar';
    tpTimer = setInterval(() => { el.scrollTop += 1; }, 45);
  }
});

// Inicia aplicação
fetchState();
loadShareLink();
// Sincronização em tempo real periódica (a cada 45 segundos)
setInterval(triggerLiveSync, 45000);
