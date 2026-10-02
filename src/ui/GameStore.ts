import { create } from 'zustand';

export type GameScreen = 'main_menu' | 'options' | 'ranking' | 'playing' | 'paused' | 'game_over';

export interface RankEntry {
  position: number;
  name: string;
  timeSpent: string;
  enemiesDefeated: number;
}

interface GameState {
  currentScreen: GameScreen;
  setScreen: (screen: GameScreen) => void;
  
  // Configurações (Ajustáveis na tela de opções)
  matchDuration: number; // ex: 180 segundos
  maxEnemies: number;    // ex: 4
  spawnRate: number;     // tempo ou taxa de spawn
  setGameConfig: (config: { matchDuration?: number; maxEnemies?: number; spawnRate?: number }) => void;

  // Dados da partida atual (para o Game Over / Ranking)
  currentScore: number;
  currentTimeLeft: number;
  setCurrentGameStats: (score: number, timeLeft: number) => void;

  // Mock de Ranking
  rankings: RankEntry[];
}

export const useGameStore = create<GameState>((set) => ({
  currentScreen: 'main_menu',
  setScreen: (screen) => set({ currentScreen: screen }),

  matchDuration: 180,
  maxEnemies: 4,
  spawnRate: 2,
  setGameConfig: (config) => set((state) => ({ ...state, ...config })),

  currentScore: 0,
  currentTimeLeft: 180,
  setCurrentGameStats: (score, timeLeft) => set({ currentScore: score, currentTimeLeft: timeLeft }),

  rankings: [
    { position: 1, name: 'Capitão Yuri', timeSpent: '02:45', enemiesDefeated: 15 },
    { position: 2, name: 'Marujo Drake', timeSpent: '02:10', enemiesDefeated: 11 },
    { position: 3, name: 'Pirata Morgan', timeSpent: '01:30', enemiesDefeated: 7 },
  ],
}));