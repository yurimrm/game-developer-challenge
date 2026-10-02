// src/components/PixiStage.tsx
import React, { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';
import { AssetManager } from '../core/AssetManager';
import { GameScene } from '../scenes/GameScene';

// Resolução de design base (Proporção 16:9)
const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;

export const PixiStage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const initPixi = async () => {
      if (!containerRef.current) return;

      // 1. Cria a instância da Aplicação PixiJS v8
      const app = new Application();
      appRef.current = app;

      await app.init({
        resizeTo: window, // Faz o Pixi acompanhar o tamanho real da janela
        backgroundColor: 0x111111,
        width: DESIGN_WIDTH,
        height: DESIGN_HEIGHT,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (isCancelled) {
        app.destroy(true, { children: true });
        return;
      }

      // Anexa o elemento canvas gerado pelo Pixi ao nosso container DOM
      containerRef.current.appendChild(app.canvas);

      // 2. Carrega os Assets (Atlas XML e JSON) usando o AssetManager
      const assetManager = AssetManager.getInstance();
      try {
        await assetManager.loadGameAssets();
      } catch (error) {
        console.error("Erro ao carregar os assets do jogo:", error);
        return;
      }

      if (isCancelled) return;

      // 3. Função de redimensionamento responsivo (Letterbox / Mantém proporção 16:9)
      const handleResize = () => {
        if (!containerRef.current || !appRef.current) return;

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        const scaleX = windowWidth / DESIGN_WIDTH;
        const scaleY = windowHeight / DESIGN_HEIGHT;
        const scale = Math.min(scaleX, scaleY);

        const targetWidth = Math.floor(DESIGN_WIDTH * scale);
        const targetHeight = Math.floor(DESIGN_HEIGHT * scale);

        app.renderer.resize(targetWidth, targetHeight);
        app.stage.scale.set(scale);
      };

      handleResize();
      window.addEventListener('resize', handleResize);

      // 4. Inicializa a cena principal do jogo
      const scene = new GameScene(app);

      return () => {
        window.removeEventListener('resize', handleResize);
        scene.destroy();
        app.destroy(true, { children: true });
      };
    };

    let cleanup: (() => void) | undefined;
    initPixi().then((fn) => {
      cleanup = fn;
    });

    return () => {
      isCancelled = true;
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: '#000000'
      }} 
    />
  );
};