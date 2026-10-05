import React, { useState } from 'react';
import { useGameStore } from './GameStore';

export function requestFullScreenAndLandscape() {
  const elem = document.documentElement;
  
  if (elem.requestFullscreen) {
    elem.requestFullscreen().catch(() => {});
  } else if ((elem as any).webkitRequestFullscreen) {
    (elem as any).webkitRequestFullscreen();
  }

  const orientation = screen.orientation as any;
  if (orientation && orientation.lock) {
    orientation.lock('landscape').catch(() => {});
  }
}

export const MainMenu: React.FC = () => {
  const setScreen = useGameStore((state) => state.setScreen);
  const playerName = useGameStore((state) => state.playerName);
  const setPlayerName = useGameStore((state) => state.setPlayerName);

  const [nameInput, setNameInput] = useState(playerName);

  const handleStartGame = () => {
    // Salva o nome antes de entrar na partida
    setPlayerName(nameInput);
    // Muda a tela para o jogo
    // 1. Ativa a tela cheia e o modo paisagem
    requestFullScreenAndLandscape();
    setScreen('playing');
  };

  return (
    <div className="overlay_main">
      <div className="containerMenu">
        
      <img src="assets/ui/title_pirate_battle.png" alt="Pirate Battle" className='logo' />

        <div className="optionField" style={{ marginBottom: '20px' }}>
          <input 
            type="text" 
            value={nameInput} 
            onChange={(e) => setNameInput(e.target.value)} 
            placeholder="Captain's Name"
            maxLength={15}
            style={{ padding: '8px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
        
        <div className="buttonContainer">
          <button className="primaryButton" onClick={handleStartGame}>Play</button>
          <button className="primaryButton" onClick={() => setScreen('options')}>Options</button>
          <button className="primaryButton" onClick={() => setScreen('ranking')}>Ranking</button>
        </div>

        <div id="rotate-warning">
          <img src="assets/ui/buttons/icon_restart.png" alt="Virar Celular" style={{ width: '64px', marginBottom: '16px', animation: 'bounce 1s infinite' }} />
          <h2>Por favor, vire o seu celular!</h2>
          <p>Este jogo foi desenhado para ser jogado no modo paisagem (horizontal).</p>
        </div>
        
      </div>
    </div>
  );
};