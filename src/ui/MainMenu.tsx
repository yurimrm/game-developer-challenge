import React from 'react';
import { useGameStore } from './GameStore';

export const MainMenu: React.FC = () => {
  const setScreen = useGameStore((state) => state.setScreen);

  return (

    <div className='overlay'>
      
      <div className='containerMenu'>

        <img src="/assets/ui/title_pirate_battle.png" alt="Pirate Battle" className='logo' />

        <div className='buttonContainer'>
          <button className='primaryButton' onClick={() => setScreen('playing')}>Play</button>
          <button className='primaryButton' onClick={() => setScreen('options')}>Options</button>
          <button className='primaryButton' onClick={() => setScreen('ranking')}>Ranking</button>
        </div>

      </div>

    </div>
    
  );
};
