import React, { useState, useRef } from 'react';

interface MobileControlsProps {
  onMove: (direction: 'forward' | 'backward' | 'stop') => void;
  onSteer: (steer: number) => void; // -1 para esquerda, 1 para direita, 0 para centro
  onFireFront: () => void;
  onFireLeft: () => void;
  onFireRight: () => void;
  onPause: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onMove,
  onSteer,
  onFireFront,
  onFireLeft,
  onFireRight,
  onPause,
}) => {
  
  // Estados para o Joystick Simples
  const [touchPos, setTouchPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleTouchMove(e);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging && e.type !== 'touchstart' && e.type !== 'mousedown') return;
    if (!joystickRef.current) return;

    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.min(rect.width / 2, Math.sqrt(dx * dx + dy * dy));
    const angle = Math.atan2(dy, dx);

    const limitedX = Math.cos(angle) * distance;
    const limitedY = Math.sin(angle) * distance;

    setTouchPos({ x: limitedX, y: limitedY });

    // Normaliza para o leme e aceleração
    const steerVal = limitedX / (rect.width / 2); // -1 a 1
    const moveVal = -limitedY / (rect.height / 2); // -1 (trás) a 1 (frente)

    onSteer(steerVal);
    if (moveVal > 0.3) {
      onMove('forward');
    } else if (moveVal < -0.3) {
      onMove('backward');
    } else {
      onMove('stop');
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTouchPos({ x: 0, y: 0 });
    onSteer(0);
    onMove('stop');
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none', // Deixa cliques passarem para o jogo onde não há botões
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      padding: '100px',
      boxSizing: 'border-box',
    }}>
      {/* ⏸️ BOTÃO DE PAUSE (Topo Direito absoluto) */}
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
        <img src="/assets/ui/buttons/icon_pause.png" className='buttonImg' alt="Pause" />
      </button>

      {/* 🕹️ JOYSTICK VIRTUAL (Lado Esquerdo) */}
      <div
        ref={joystickRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
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

      {/* 🎯 BOTÕES DE DISPARO (Lado Direito) */}
      <div style={{
        pointerEvents: 'auto',
        display: 'flex',
        gap: '5px',
        alignItems: 'flex-end',
      }}>
        <button
          className='buttonBg'
          onClick={onFireLeft}
          style={buttonStyle}
        >
          <img src="/assets/ui/buttons/icon_fire_left.png" className='buttonImg' alt="Fire Left" />
        </button>

        <button
          className='buttonBg'
          onClick={onFireFront}
          style={{ ...buttonStyle, width: '80px', height: '80px' }}
        >
          <img src="/assets/ui/buttons/icon_fire_front.png" className='buttonImg' alt="Fire Front" />
        </button>

        <button
          className='buttonBg'
          onClick={onFireRight}
          style={buttonStyle}
        >
          <img src="/assets/ui/buttons/icon_fire_right.png" className='buttonImg' alt="Fire Right" />
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