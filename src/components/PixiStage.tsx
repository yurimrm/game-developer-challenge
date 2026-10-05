// src/components/PixiStage.tsx
import React, { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';
import { AssetManager } from '../core/AssetManager';
import { GameScene } from '../scenes/GameScene';
import { useGameStore } from '../ui/GameStore'; // 👈 Importa a store

const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;

export const PixiStage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const sceneRef = useRef<GameScene | null>(null); // 👈 Referência para a cena
  
  // Pega o estado atual da tela do Zustand
  const currentScreen = useGameStore((state) => state.currentScreen);

  // Efeito para gerenciar o Pause/Play com base no Zustand
  useEffect(() => {
    if (sceneRef.current) {
      if (currentScreen === 'paused') {
        sceneRef.current.setPaused(true);
      } else if (currentScreen === 'playing') {
        sceneRef.current.setPaused(false);
      }
    }
  }, [currentScreen]);

  useEffect(() => {
    let isCancelled = false;

    const initPixi = async () => {
      if (!containerRef.current) return;

      const app = new Application();
      appRef.current = app;

      await app.init({
        resizeTo: window,
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

      containerRef.current.appendChild(app.canvas);

      const assetManager = AssetManager.getInstance();
      try {
        await assetManager.loadGameAssets();
      } catch (error) {
        console.error("Erro ao carregar os assets do jogo:", error);
        return;
      }

      if (isCancelled) return;

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

      // Inicializa a cena principal e guarda na ref
      sceneRef.current = new GameScene(app);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (sceneRef.current) {
          sceneRef.current.destroy();
        }
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