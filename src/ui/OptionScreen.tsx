import React, { useState } from 'react';
import { useGameStore } from './GameStore';

export const OptionsScreen: React.FC = () => {
  
  // Pega os valores atuais da store
  const matchDuration = useGameStore((state) => state.matchDuration);
  const maxEnemies = useGameStore((state) => state.maxEnemies);
  const spawnRate = useGameStore((state) => state.spawnRate);
  const setGameConfig = useGameStore((state) => state.setGameConfig);
  const setScreen = useGameStore((state) => state.setScreen);

  // Estados locais temporários para os inputs da tela
  const [duration, setDuration] = useState(matchDuration);
  const [enemies, setEnemies] = useState(maxEnemies);
  const [rate, setRate] = useState(spawnRate);

  const handleSave = () => {
    // Salva de fato na store e no LocalStorage
    setGameConfig({
      matchDuration: Number(duration),
      maxEnemies: Number(enemies),
      spawnRate: Number(rate),
    });

    // Retorna para o menu principal após salvar
    setScreen('main_menu');
  };

  return (

    <div className='overlay'>
    
      <div className='containerMenu'>

        <h2>Configurações da Batalha</h2>

        <div className='listaInputs'>
        
          <div className='formGroup'>
            <label className='label'>Tempo Total de Jogo (segundos):</label>
            <input 
              type="number" 
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))} 
              className='inputTextClass'
            />
          </div>

          <div className='formGroup'>
            <label className='label'>Máximo de Inimigos Simultâneos:</label>
            <input 
              type="number" 
              value={enemies}
              onChange={(e) => setEnemies(Number(e.target.value))} 
              className='inputTextClass'
            />
          </div>

          <div className='formGroup'>
            <label className='label'>Taxa de Respawn:</label>
            <input 
              type="number" 
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))} 
              className='inputTextClass'
            />
          </div>

        </div>

        <div className="buttonContainer">

          <button className="primaryButton" onClick={handleSave}>
            Salvar
          </button>
          
          <button className="primaryButton" onClick={() => setScreen('main_menu')}>
            Cancelar
          </button>

        </div>

      </div>
    </div>
  );
};