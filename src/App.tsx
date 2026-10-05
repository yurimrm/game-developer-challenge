import './App.css';
import './css/uiMenus.css';
import { PixiStage } from './components/PixiStage';
import { useGameStore } from './ui/GameStore';
import { MainMenu } from './ui/MainMenu';
import { OptionsScreen } from './ui/OptionScreen';
import { ScoreboardScreen } from './ui/RankingScreen'; 
import { PauseMenu } from './ui/PauseMenu';
import { MatchHistoryBoard } from './ui/MatchHistory'

export function App() {
  const currentScreen = useGameStore((state) => state.currentScreen);
  const openedFromPause = useGameStore((state) => state.openedFromPause);

  // O PixiStage só aparece se estiver jogando, pausado, em game over,
  // ou se abriu o ranking/histórico vindo de dentro do jogo pausado.
  const showPixiStage = 
    currentScreen === 'playing' || 
    currentScreen === 'paused' || 
    currentScreen === 'game_over' || 
    ((currentScreen === 'ranking' || currentScreen === 'match_history') && openedFromPause);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      
      {showPixiStage && <PixiStage />}

      {currentScreen === 'main_menu' && <MainMenu />}
      {currentScreen === 'options' && <OptionsScreen />}
      {currentScreen === 'ranking' && <ScoreboardScreen />}
      {currentScreen === 'game_over' && <ScoreboardScreen isGameOver={true} />}
      {currentScreen === 'paused' && <PauseMenu />}
      {currentScreen === 'match_history' && <MatchHistoryBoard />}

    </div>
  );
}