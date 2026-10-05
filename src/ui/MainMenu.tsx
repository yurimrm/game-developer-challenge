import React, { useState } from 'react';
import { useGameStore } from './GameStore';

export const MainMenu: React.FC = () => {
  const setScreen = useGameStore((state) => state.setScreen);
  const playerName = useGameStore((state) => state.playerName);
  const setPlayerName = useGameStore((state) => state.setPlayerName);

  const [nameInput, setNameInput] = useState(playerName);

  const handleStartGame = () => {
    // Salva o nome antes de entrar na partida
    setPlayerName(nameInput);
    // Muda a tela para o jogo
    setScreen('playing');
  };

  return (
    <div className="overlay_main">
      <div className="containerMenu">
        
      <img src="/assets/ui/title_pirate_battle.png" alt="Pirate Battle" className='logo' />

        <div className="optionField" style={{ margin: '20px 0' }}>
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
        
      </div>
    </div>
  );
};