import React from 'react';
import { useGameStore } from './GameStore';

export const RankingBoard: React.FC = () => {
  const rankings = useGameStore((state) => state.rankings); // Puxa direto da store

  return (
    <div className="containerTable">
      <table className='tableRanking label'>
        <thead>
          <tr>
            <th>Pos</th>
            <th>Name</th>
            <th>Time</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((row) => (
            <tr key={row.position}>
              <td>{row.position}º</td>
              <td>{row.name}</td>
              <td>{row.timeSpent}</td>
              <td>{row.enemiesDefeated}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};