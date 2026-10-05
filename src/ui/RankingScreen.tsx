import React from 'react';
import { useGameStore } from './GameStore';
import { RankingBoard } from './RankingBoard';

interface ScoreboardProps {
  isGameOver?: boolean;
}

export const ScoreboardScreen: React.FC<ScoreboardProps> = ({ isGameOver }) => {
  const { currentScore, setScreen } = useGameStore();

  return (
    <div className="overlay">
      <div className="containerMenuBig">
        {isGameOver && <h1>GAME OVER</h1>}
        <h2>CAPITAIN'S LOG</h2>

        {isGameOver && (
          <p className='gameOvertext'>Sua pontuação nessa partida foi: <strong>{currentScore} pontos</strong></p>
        )}

        {/* Insere o miolo da tabela de forma limpa */}
        <RankingBoard />

        <button className="primaryButton" onClick={() => setScreen('main_menu')}>Main Menu</button>
      </div>
    </div>
  );
};