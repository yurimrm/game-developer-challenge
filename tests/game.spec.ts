// e2e/game.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Pirate Game E2E Tests', () => {
  test('Deve carregar a página inicial e iniciar o jogo', async ({ page }) => {
    // Acede à aplicação
    await page.goto('https://martuccelli.com.br/pirate/');

    // Tenta encontrar e clicar no botão de iniciar se ele existir, aguardando um pouco por ele
    const startButton = page.locator('button:has-text("Play"), button:has-text("Jogar")');
    try {
      await startButton.waitFor({ state: 'visible', timeout: 3000 });
      await startButton.click();
    } catch (e) {
      // Se não houver botão inicial e o jogo carregar direto, prossegue
    }

    // Valida se o canvas do PixiJS apareceu no DOM
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });
  });

  test('Deve abrir o menu de pausa ao clicar no botão de pausa', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Se houver ecrã inicial, passa por ele primeiro para entrar no modo 'playing'
    const startButton = page.locator('button:has-text("Play"), button:has-text("PLAY")');
    try {
      await startButton.waitFor({ state: 'visible', timeout: 2000 });
      await startButton.click();
    } catch (e) {}

    // Aguarda o botão de pause aparecer no canto superior direito (conforme implementado nos controlos mobile)
    const pauseButton = page.locator('button img[alt="Pause"]').locator('..'); 
    await pauseButton.waitFor({ state: 'visible', timeout: 5000 });
    await pauseButton.click();
    
    // Verifica se a tela/menu de pausa apareceu com o botão de continuar ou voltar
    const resumeButton = page.locator('button', { hasText: /resume/i });
    await expect(resumeButton.first()).toBeVisible({ timeout: 5000 });
  });
});