import React from 'react';
import { useGameStore } from './GameStore';

export const OptionsScreen: React.FC = () => {
  const { matchDuration, maxEnemies, spawnRate, setGameConfig, setScreen } = useGameStore();

  return (

    <div className='overlay'>
    
      <div className='containerMenu'>

        <h2>Configurações da Batalha</h2>

        <div className='listaInputs'>
        
          <div className='formGroup'>
            <label className='label'>Tempo Total de Jogo (segundos):</label>
            <input 
              type="number" 
              value={matchDuration} 
              onChange={(e) => setGameConfig({ matchDuration: Number(e.target.value) })}
              className='inputTextClass'
            />
          </div>

          <div className='formGroup'>
            <label className='label'>Máximo de Inimigos Simultâneos:</label>
            <input 
              type="number" 
              value={maxEnemies} 
              onChange={(e) => setGameConfig({ maxEnemies: Number(e.target.value) })}
              className='inputTextClass'
            />
          </div>

          <div className='formGroup'>
            <label className='label'>Taxa de Respawn:</label>
            <input 
              type="number" 
              value={spawnRate} 
              onChange={(e) => setGameConfig({ spawnRate: Number(e.target.value) })}
              className='inputTextClass'
            />
          </div>

        </div>

        <button className='primaryButton' onClick={() => setScreen('main_menu')}>
          Voltar
        </button>

      </div>
    </div>
  );
};