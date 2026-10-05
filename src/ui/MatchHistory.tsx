import React, { useState } from 'react';
import { useGameStore } from './GameStore';

export const MatchHistoryBoard: React.FC = () => {

  const matchHistory = useGameStore((state) => state.matchHistory);
  const playerName = useGameStore((state) => state.playerName); // Pega o nome do capitão atual
  const setScreen = useGameStore((state) => state.setScreen);
  const openedFromPause = useGameStore((state) => state.openedFromPause);

  // Filtra o histórico para mostrar apenas as partidas do jogador atual
  const playerHistory = matchHistory.filter((record) => record.playerName === playerName);

  // Estados para controle da paginação baseada nos registros filtrados
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentHistory = playerHistory.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(playerHistory.length / itemsPerPage) || 1;

  const handleBack = () => {
    if (openedFromPause) {
      setScreen('paused');
    } else {
      setScreen('main_menu');
    }
  };

  return (
    <div className="overlay">
      <div className="containerMenu" style={{ width: '650px' }}>
        <h2>MATCH HISTORY</h2>

        <div className="containerTable" style={{ margin: '15px 0' }}>
          <table className="tableRanking label" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Capitain</th>
                <th>Time Survived</th>
                <th>Enemies Defeated</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {currentHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                    Nenhuma partida registrada ainda.
                  </td>
                </tr>
              ) : (
                currentHistory.map((row) => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td>{row.playerName}</td>
                    <td>{row.timeSurvived}</td>
                    <td>{row.enemiesDefeated}</td>
                    <td><strong>{row.score}</strong></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Controles de Paginação */}
        {totalPages > 1 && (
          <div className='paginationHistory'>
            <button 
              className="buttonBg" 
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <img src="assets/ui/buttons/icon_turn_left.png" className='buttonImg' alt="Anterior" />
            </button>
            <span className='textPagination'>Page {currentPage} de {totalPages}</span>
            <button 
              className="buttonBg" 
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <img src="assets/ui/buttons/icon_turn_right.png" className='buttonImg' alt="Próxima" />
            </button>
          </div>
        )}

        {/* Botão de Retorno dinâmico */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          {openedFromPause ? (
            <button className="primaryButton" onClick={handleBack}>
              Back
            </button>
          ) : (
            <button className="primaryButton" onClick={handleBack}>
              Main Menu
            </button>
          )}
        </div>

      </div>
    </div>
  );
};