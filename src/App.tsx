import './App.css';
import './css/uiMenus.css';
import { PixiStage } from './components/PixiStage';
import { useGameStore } from './ui/GameStore';
import { MainMenu } from './ui/MainMenu';
import { OptionsScreen } from './ui/OptionScreen';
import { ScoreboardScreen } from './ui/RankingScreen'; 
import { PauseMenu } from './ui/PauseMenu';

export function App() {
  const currentScreen = useGameStore((state) => state.currentScreen);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {(currentScreen === 'playing' || currentScreen === 'paused') && (
        <PixiStage />
      )}

      {currentScreen === 'main_menu' && <MainMenu />}
      {currentScreen === 'options' && <OptionsScreen />}
      {currentScreen === 'ranking' && <ScoreboardScreen />}
      {currentScreen === 'game_over' && <ScoreboardScreen isGameOver={true} />}
      {currentScreen === 'paused' && <PauseMenu />}

    </div>
  );
}