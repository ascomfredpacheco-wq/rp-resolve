import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_WEIGHTS = {
  hookStrength: 1.25,
  audienceFit: 1.15,
  formatEvidence: 1.2,
  originality: 1.0,
  shareability: 1.2,
  promiseClarity: 1.1,
  productionEase: 0.9,
  lowSaturation: 1.0,
  positioningFit: 1.2,
  preferredFormats: {},
  preferredHookTypes: {}
};

export function createDefaultState() {
  return {
    userProfile: null,
    selectedNiche: 'marketing',
    competitors: [],
    analyzedLibrary: [],
    generatedScripts: [],
    editorialCalendar: [],
    publishedResults: [],
    manualCorrections: {},
    learnedWeights: { ...DEFAULT_WEIGHTS },
    chatHistory: [
      {
        role: 'assistant',
        timestamp: new Date().toISOString(),
        text: 'Olá! Sou seu Estrategista de Crescimento no Instagram. Digite seu @perfil atual e os @perfis concorrentes (ou escolha seu nicho) para eu comparar seu perfil, desmontar os Reels que mais viralizaram e criar seus próximos roteiros com ganchos e links de referência!'
      }
    ]
  };
}

export function loadDatabase(dbPath, ipKey = 'default') {
  try {
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf-8');
      const parsed = JSON.parse(raw);

      if (parsed && typeof parsed.sessionsByIp === 'object' && parsed.sessionsByIp !== null) {
        const ipState = parsed.sessionsByIp[ipKey];
        if (ipState) {
          return {
            ...createDefaultState(),
            ...ipState,
            learnedWeights: {
              ...DEFAULT_WEIGHTS,
              ...(ipState.learnedWeights || {})
            }
          };
        }
        return createDefaultState();
      }

      if (ipKey === 'default') {
        return {
          ...createDefaultState(),
          ...parsed,
          learnedWeights: {
            ...DEFAULT_WEIGHTS,
            ...(parsed.learnedWeights || {})
          }
        };
      }
    }
  } catch {
    // Se corrompido, retorna estado limpo
  }
  const initial = createDefaultState();
  saveDatabase(dbPath, initial, ipKey);
  return initial;
}

export function saveDatabase(dbPath, state, ipKey = 'default') {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let sessionsByIp = {};
  try {
    if (fs.existsSync(dbPath)) {
      const existing = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      if (existing && typeof existing.sessionsByIp === 'object' && existing.sessionsByIp !== null) {
        sessionsByIp = existing.sessionsByIp;
      }
    }
  } catch {
    sessionsByIp = {};
  }

  sessionsByIp[ipKey] = state;

  const payloadToWrite = ipKey === 'default'
    ? { ...state, sessionsByIp }
    : { sessionsByIp };

  fs.writeFileSync(dbPath, JSON.stringify(payloadToWrite, null, 2), 'utf-8');
  return state;
}
