// src/ui/MobileControls.tsx
import React, { useState, useRef, useEffect } from 'react';

interface MobileControlsProps {
  playerHp: number;
  playerMaxHp: number;
  score: number;
  remainingTime: number; // em segundos
  onJoystickMove: (angle: number | null, isMoving: boolean) => void;
  onFireFront: () => void;
  onFireLeft: () => void;
  onFireRight: () => void;
  onPause: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  playerHp,
  playerMaxHp,
  score,
  remainingTime,
  onJoystickMove,
  onFireFront,
  onFireLeft,
  onFireRight,
  onPause,
}) => {
  const [touchPos, setTouchPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isDragging) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setIsDragging(true);
    updateJoystickPosition(touch.clientX, touch.clientY);
  };

  const updateJoystickPosition = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;

    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.min(rect.width / 2, Math.sqrt(dx * dx + dy * dy));
    const angle = Math.atan2(dy, dx);

    const limitedX = Math.cos(angle) * distance;
    const limitedY = Math.sin(angle) * distance;

    setTouchPos({ x: limitedX, y: limitedY });

    const deadzone = 10;
    if (Math.sqrt(dx * dx + dy * dy) > deadzone) {
      onJoystickMove(angle, true);
    } else {
      onJoystickMove(null, false);
    }
  };

  useEffect(() => {
    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchIdRef.current) {
          updateJoystickPosition(touch.clientX, touch.clientY);
          break;
        }
      }
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (!isDragging) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchIdRef.current) {
          setIsDragging(false);
          setTouchPos({ x: 0, y: 0 });
          touchIdRef.current = null;
          onJoystickMove(null, false);
          break;
        }
      }
    };

    if (isDragging) {
      window.addEventListener('touchmove', handleGlobalTouchMove, { passive: true });
      window.addEventListener('touchend', handleGlobalTouchEnd);
      window.addEventListener('touchcancel', handleGlobalTouchEnd);
    }

    return () => {
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('touchcancel', handleGlobalTouchEnd);
    };
  }, [isDragging]);

  const hpPercentage = Math.max(0, Math.min(100, (playerHp / playerMaxHp) * 100));
  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '25px 40px',
      boxSizing: 'border-box',
    }}>
      {/* --- TOPO: HUD DE VIDA, PLACAR, TEMPO E PAUSE --- */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        pointerEvents: 'auto',
      }}>
        {/* Esquerda: Barra de Vida + Placar + Tempo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
          
          {/* Barra de Vida */}
          <div className='healthBar'>
            <img src="assets/ui/hud/icon_heart.png" alt="Heart" className='healthIcon' />
            <div className='barraVida'>
              <div style={{
                width: `${hpPercentage}%`,
                height: '100%',
                backgroundColor: hpPercentage >= 75 ? '#2ecc71' : hpPercentage >= 30 ? '#f1c40f' : '#e74c3c',
                transition: 'width 0.2s ease, background-color 0.3s ease',
              }} />
              <span style={{
                position: 'absolute',
                top: 10,
                left: 0,
                width: '100%',
                height: '100%',
                fontSize: '16px',
                color: '#fff',
                fontWeight: 'bold',
                fontFamily: 'sans-serif',
                textAlign: 'center',
                lineHeight: '18px',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
              }}>
                {Math.round(playerHp)} / {playerMaxHp}
              </span>
            </div>
          </div>

          {/* Placar (Score) */}
          <div className='scoreBar'>
            <img src="assets/ui/hud/icon_score.png" alt="Score" className='scoreIcon' />
            <span>{score}</span>
          </div>

          {/* Temporizador */}
          <div className='timeBar'>
            <img src="assets/ui/hud/icon_time.png" alt="Time" className='timeIcon' />
            <span>{formattedTime}</span>
          </div>

        </div>

        {/* Direita: Botão de Pause */}
        <button
          className='buttonBg'
          onClick={onPause}
          style={{
            ...buttonStyle,
            width: '45px',
            height: '45px',
          }}
        >
          <img src="assets/ui/buttons/icon_pause.png" className='buttonImg' alt="Pause" />
        </button>
      </div>

      {/* --- PARTE INFERIOR: JOYSTICK E BOTÕES DE TIRO --- */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        width: '100%',
        pointerEvents: 'none',
      }}>
        {/* 🕹️ JOYSTICK VIRTUAL LIVRE (Lado Esquerdo) */}
        <div
          ref={joystickRef}
          onTouchStart={handleTouchStart}
          style={{
            pointerEvents: 'auto',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            border: '2px solid rgba(255, 255, 255, 0.5)',
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            touchAction: 'none',
          }}
        >
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            transform: `translate(${touchPos.x}px, ${touchPos.y}px)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease',
          }} />
        </div>

        {/* 🎯 BOTÕES DE DISPARO INDEPENDENTES (Lado Direito) */}
        <div style={{
          pointerEvents: 'auto',
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-end',
          touchAction: 'none',
        }}>
          <button
            className='buttonBg'
            onTouchStart={(e) => { e.stopPropagation(); onFireLeft(); }}
            style={buttonStyle}
          >
            <img src="assets/ui/buttons/icon_fire_left.png" className='buttonImg' alt="Fire Left" />
          </button>

          <button
            className='buttonBg'
            onTouchStart={(e) => { e.stopPropagation(); onFireFront(); }}
            style={{ ...buttonStyle, width: '75px', height: '75px' }}
          >
            <img src="assets/ui/buttons/icon_fire_front.png" className='buttonImg' alt="Fire Front" />
          </button>

          <button
            className='buttonBg'
            onTouchStart={(e) => { e.stopPropagation(); onFireRight(); }}
            style={buttonStyle}
          >
            <img src="assets/ui/buttons/icon_fire_right.png" className='buttonImg' alt="Fire Right" />
          </button>
        </div>
      </div>
    </div>
  );
};

const buttonStyle: React.CSSProperties = {
  width: '55px',
  height: '55px',
  borderRadius: '50%',
  color: 'white',
  fontWeight: 'bold',
  fontSize: '14px',
  cursor: 'pointer',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  outline: 'none',
  userSelect: 'none',
  touchAction: 'manipulation',
};