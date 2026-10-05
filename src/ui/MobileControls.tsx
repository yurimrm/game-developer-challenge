// src/ui/MobileControls.tsx
import React, { useState, useRef, useEffect } from 'react';

interface MobileControlsProps {
  onJoystickMove: (angle: number | null, isMoving: boolean) => void;
  onFireFront: () => void;
  onFireLeft: () => void;
  onFireRight: () => void;
  onPause: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onJoystickMove,
  onFireFront,
  onFireLeft,
  onFireRight,
  onPause,
}) => {
  const [touchPos, setTouchPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);

  // Referências para controlar o toque globalmente
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

  // Efeito para escutar o movimento e o fim do toque em toda a janela (evita que o joystick "cole")
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
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      padding: '50px',
      boxSizing: 'border-box',
    }}>
      {/* ⏸️ BOTÃO DE PAUSE */}
      <button
        className='buttonBg'
        onClick={onPause}
        style={{
          ...buttonStyle,
          position: 'absolute',
          top: '20px',
          right: '20px',
          pointerEvents: 'auto',
          width: '50px',
          height: '50px',
        }}
      >
        <img src="assets/ui/buttons/icon_pause.png" className='buttonImg' alt="Pause" />
      </button>

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
        gap: '5px',
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
          style={{ ...buttonStyle, width: '80px', height: '80px' }}
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
  );
};

const buttonStyle: React.CSSProperties = {
  width: '60px',
  height: '60px',
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