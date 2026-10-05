import React, { useState } from 'react';
import { useGameStore } from './GameStore';

export const RankingBoard: React.FC = () => {
  const rankings = useGameStore((state) => state.rankings);

  // Estados para controle da paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Cálculos da paginação
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRankings = rankings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(rankings.length / itemsPerPage) || 1;

  return (
    <div style={{ width: '100%' }}>

      <div className="containerTable" style={{ margin: '15px 0' }}>
        <table className="tableRanking label" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Pos</th>
              <th>Nome</th>
              <th>Data</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {currentRankings.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                  Nenhum recorde registrado ainda.
                </td>
              </tr>
            ) : (
              currentRankings.map((row, index) => {
                const absolutePosition = indexOfFirstItem + index + 1;
                return (
                  <tr key={index}>
                    <td>{absolutePosition}º</td>
                    <td>{row.name}</td>
                    <td>{row.date}</td>
                    <td><strong>{row.score}</strong></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Controles de Paginação */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
          <button 
            className="secondaryButton" 
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </button>
          <span>Página {currentPage} de {totalPages}</span>
          <button 
            className="secondaryButton" 
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Próxima
          </button>
        </div>
      )}

    </div>
  );
};