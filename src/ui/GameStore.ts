import { create } from 'zustand';

export type GameScreen = 'main_menu' | 'options' | 'ranking' | 'playing' | 'paused' | 'game_over';

export interface RankingItem {
  name: string;
  score: number;
  date: string;
}


// Chaves para o LocalStorage
const STORAGE_KEYS = {
  RANKINGS: 'pirate_rankings',
  OPTIONS: 'pirate_game_options',
};

interface GameState {
  currentScreen: GameScreen;
  setScreen: (screen: GameScreen) => void;
  
  // Configurações persistidas
  playerName: string;
  setPlayerName: (name: string) => void;
  
  matchDuration: number; 
  maxEnemies: number;    
  spawnRate: number;     
  setGameConfig: (config: { matchDuration?: number; maxEnemies?: number; spawnRate?: number }) => void;

  // Dados da partida atual e rankings...
  currentScore: number;
  currentTimeLeft: number;
  setCurrentGameStats: (score: number, timeLeft: number) => void;

  rankings: RankingItem[];
  addRanking: (name: string, score: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentScreen: 'main_menu',
  setScreen: (screen) => set({ currentScreen: screen }),

  playerName: localStorage.getItem('pirate_player_name') || 'Capitão Sem Nome',
  setPlayerName: (name) => {
    const finalName = name.trim() || 'Capitão Sem Nome';
    set({ playerName: finalName });
    localStorage.setItem('pirate_player_name', finalName);
  },

  // Carrega as opções salvas no LocalStorage ou usa os padrões
  matchDuration: (() => {
    const saved = localStorage.getItem(STORAGE_KEYS.OPTIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.matchDuration ?? 180;
      } catch (e) { console.error(e); }
    }
    return 180;
  })(),

  maxEnemies: (() => {
    const saved = localStorage.getItem(STORAGE_KEYS.OPTIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.maxEnemies ?? 4;
      } catch (e) { console.error(e); }
    }
    return 4;
  })(),

  spawnRate: (() => {
    const saved = localStorage.getItem(STORAGE_KEYS.OPTIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.spawnRate ?? 2;
      } catch (e) { console.error(e); }
    }
    return 2;
  })(),

  setGameConfig: (config) => {
    set((state) => {
      const newState = { ...state, ...config };
      
      // Salva o objeto de opções atualizado no LocalStorage
      const optionsToSave = {
        matchDuration: newState.matchDuration,
        maxEnemies: newState.maxEnemies,
        spawnRate: newState.spawnRate,
      };
      localStorage.setItem(STORAGE_KEYS.OPTIONS, JSON.stringify(optionsToSave));

      return newState;
    });
  },

  currentScore: 0,
  currentTimeLeft: 180,
  setCurrentGameStats: (score, timeLeft) => set({ currentScore: score, currentTimeLeft: timeLeft }),

  // Carrega do LocalStorage ou inicia com uma lista vazia (ou valores iniciais)
  rankings: (() => {
    const saved = localStorage.getItem('pirate_rankings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Erro ao carregar rankings do localStorage", e);
      }
    }
    return [];
  })(),

  addRanking: (name, score) => {
    const finalName = name && name.trim() !== '' ? name : 'Capitão Anônimo';
    
    const newEntry: RankingItem = {
      name: finalName,
      score,
      date: new Date().toLocaleDateString('pt-BR')
    };

    const updatedRankings = [...get().rankings, newEntry]
      .sort((a, b) => b.score - a.score) // Ordena do maior para o menor score
      .slice(0, 10); // Mantém apenas os 10 melhores

    set({ rankings: updatedRankings });
    localStorage.setItem('pirate_rankings', JSON.stringify(updatedRankings));
  }
}));
