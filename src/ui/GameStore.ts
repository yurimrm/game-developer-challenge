import { create } from 'zustand';

export type GameScreen = 'main_menu' | 'options' | 'ranking' | 'playing' | 'paused' | 'game_over' | 'match_history';

export interface RankingItem {
  name: string;
  score: number;
  date: string;
}

export interface MatchRecord {
  id: string;
  playerName: string;
  score: number;
  timeSurvived: string;
  enemiesDefeated: number;
  date: string;
}

// Chaves para o LocalStorage
const STORAGE_KEYS = {
  RANKINGS: 'pirate_rankings',
  OPTIONS: 'pirate_game_options',
};

interface GameState {
  currentScreen: GameScreen;
  openedFromPause: boolean; // Flag direta
  setScreen: (screen: GameScreen, openedFromPause?: boolean) => void;
  
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

  matchHistory: MatchRecord[];
  addMatchRecord: (record: Omit<MatchRecord, 'id' | 'date'>) => void;

}

export const useGameStore = create<GameState>((set, get) => ({
  currentScreen: 'main_menu',
  openedFromPause: false, 

  setScreen: (screen, openedFromPause = false) => {
    set({ currentScreen: screen, openedFromPause });
  },

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
  },

  // Carrega o histórico do LocalStorage
  matchHistory: (() => {
    const saved = localStorage.getItem('pirate_match_history');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  })(),

  addMatchRecord: (recordData) => {
    const newRecord: MatchRecord = {
      id: Math.random().toString(36).substring(2, 9),
      date: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      ...recordData,
    };

    const updatedHistory = [newRecord, ...get().matchHistory]; // As mais recentes primeiro
    set({ matchHistory: updatedHistory });
    localStorage.setItem('pirate_match_history', JSON.stringify(updatedHistory));
  },
}));
