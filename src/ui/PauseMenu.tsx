import React from 'react';
import { useGameStore } from './GameStore';

export const PauseMenu: React.FC = () => {
  const setScreen = useGameStore((state) => state.setScreen);

  return (

    <div className='overlay'>
    
      <div className='containerMenu'>

        <h2>JOGO PAUSADO</h2>
        
        <div className='buttonContainer'>
          <button className='primaryButton' onClick={() => setScreen('playing')}>Resume</button>
          <button className='primaryButton' onClick={() => setScreen('ranking', true)}>Ranking</button>
          <button className='primaryButton' onClick={() => setScreen('main_menu')}>Main Menu</button>
        </div>

      </div>
    
    </div>

  );
};