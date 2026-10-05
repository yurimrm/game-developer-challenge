import axios from 'axios';

// =================================================================
// MOCK
// =================================================================

// Cria uma instância do axios apontando para a sua futura API no VPS
const api = axios.create({
  baseURL: 'https://pirateServer/api', 
  timeout: 5000,
});

// Mock em memória para simular o banco de dados temporário
let mockToken = 'mock-jwt-token-abc123xyz';
let mockRanking: { playerName: string; score: number; date: string }[] = [
  { playerName: 'Capitão Morgan', score: 125, date: '2026-10-01' },
  { playerName: 'Yuri', score: 98, date: '2026-10-04' }
];

// Simulador de requisições Axios (Fallback para Mock local se falhar ou para testes)
export const pirateApi = {
  // Simula o login e obtenção do Token JWT
  login: async (playerName: string) => {
    try {
      // Tenta chamar o backend real se estiver rodando
      const response = await api.post('/login', { playerName });
      return response.data.token;
    } catch (error) {
      console.warn("⚠️ Servidor VPS offline. Usando mock local do Axios com JWT simulado.");
      // Retorna o token mockado após um pequeno delay simulando rede (500ms)
      await new Promise((resolve) => setTimeout(resolve, 500));
      return mockToken;
    }
  },

  // Simula o envio de recorde de partida
  saveMatchRecord: async (recordData: { playerName: string; score: number; timeSurvived: string; enemiesDefeated: number }, token: string) => {
    try {
      const response = await api.post('/matches', recordData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.warn("⚠️ Salvando partida no mock local (Axios interceptado).");
      await new Promise((resolve) => setTimeout(resolve, 400));
      
      // Adiciona ao mock local
      mockRanking.push({
        playerName: recordData.playerName,
        score: recordData.score,
        date: new Date().toISOString().split('T')[0]
      });

      return { success: true, message: 'Partida salva com sucesso via Mock!' };
    }
  },

  // Simula a busca do Ranking global
  getRanking: async () => {
    try {
      const response = await api.get('/ranking');
      return response.data;
    } catch (error) {
      console.warn("⚠️ Buscando ranking do mock local.");
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockRanking.sort((a, b) => b.score - a.score);
    }
  }
};