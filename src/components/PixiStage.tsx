// src/components/PixiStage.tsx
import React, { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';
import { AssetManager } from '../managers/AssetManager';
import { GameScene } from '../scenes/GameScene';
import { useGameStore } from '../ui/GameStore';
import { MobileControls } from '../ui/MobileControls';

const DESIGN_WIDTH = 1650;
const DESIGN_HEIGHT = 720;

export const PixiStage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const sceneRef = useRef<GameScene | null>(null);
  
  const currentScreen = useGameStore((state) => state.currentScreen);

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

      // Inicializamos sem o resizeTo para gerenciar o letterbox manualmente com precisão total
      await app.init({
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

        // O renderer preenche a janela inteira
        app.renderer.resize(windowWidth, windowHeight);

        const scaleX = windowWidth / DESIGN_WIDTH;
        const scaleY = windowHeight / DESIGN_HEIGHT;
        const scale = Math.min(scaleX, scaleY);

        // Escala e centraliza o stage perfeitamente sem cortes nas pontas
        app.stage.scale.set(scale);
        app.stage.x = (windowWidth - DESIGN_WIDTH * scale) / 2;
        app.stage.y = (windowHeight - DESIGN_HEIGHT * scale) / 2;
      };

      handleResize();
      window.addEventListener('resize', handleResize);

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
      style={{ 
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        backgroundColor: '#000000',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      {/* Container do Canvas PixiJS */}
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }} 
      />

      {/* Controlos Mobile sobrepostos apenas quando o jogo estiver a rolar */}
      {currentScreen === 'playing' && (
        <MobileControls
          onMove={(dir) => sceneRef.current?.setMobileMovement(dir)}
          onSteer={(val) => sceneRef.current?.setMobileSteer(val)}
          onFireFront={() => sceneRef.current?.fireCannonMobile()}
          onFireLeft={() => sceneRef.current?.firePlayerBroadsideMobile('left')}
          onFireRight={() => sceneRef.current?.firePlayerBroadsideMobile('right')}
          onPause={() => useGameStore.getState().setScreen('paused')}
        />
      )}
    </div>
  );
};