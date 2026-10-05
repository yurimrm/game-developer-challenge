import React from 'react';
import { useGameStore } from './GameStore';
import { RankingBoard } from './RankingBoard';

interface ScoreboardProps {
  isGameOver?: boolean;
}

export const ScoreboardScreen: React.FC<ScoreboardProps> = ({ isGameOver }) => {
  const { currentScore, setScreen } = useGameStore();
  const openedFromPause = useGameStore((state) => state.openedFromPause);

  const handleBack = () => {
    if (openedFromPause) {
      setScreen('paused');
    } else {
      setScreen('main_menu');
    }
  };

  return (
    <div className="overlay">
      <div className="containerMenuBig">

        <h2>{isGameOver && <span>GAME OVER</span>} | CAPITAIN'S LOG</h2>
        {isGameOver && (
          <p className='gameOvertext'>Sua pontuação nessa partida foi: <strong>{currentScore} pontos</strong></p>
        )}

        {/* Insere o miolo da tabela de forma limpa */}
        <RankingBoard />
        
        {/* Botão de Retorno:
          - Se aberto do pause: exibe somente o botão "Voltar" (para retornar ao pause).
          - Se aberto do menu principal: exibe somente o botão "Voltar ao Menu".
        */}
        <div style={{ marginTop: '10px', textAlign: 'center' }}>
          {openedFromPause ? (
            <button className="primaryButton" onClick={handleBack}>Back</button>
          ) : (
            <div>
              <button className="primaryButton" onClick={() => setScreen('main_menu')}>Main Menu</button>
              <button className="primaryButton" onClick={() => setScreen('match_history')}>Match History</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};