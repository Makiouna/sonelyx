'use client';

import { useRef, useState, useLayoutEffect } from 'react';

interface SignaturePadProps {
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
}

export default function SignaturePad({ onChange, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasContent = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  // Sync canvas internal resolution to its actual CSS rendered size.
  // This eliminates any scaleX/scaleY mismatch that causes the drawing offset.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sync = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  function getXY(e: React.MouseEvent | React.TouchEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    const me = e as React.MouseEvent;
    return { x: me.clientX - rect.left, y: me.clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    if (disabled) return;
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getXY(e);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current || disabled || !lastPos.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getXY(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1d1d1f';
    ctx.stroke();
    lastPos.current = { x, y };
    if (!hasContent.current) {
      hasContent.current = true;
      setEmpty(false);
    }
  }

  function stopDraw() {
    if (!drawing.current) return;
    drawing.current = false;
    lastPos.current = null;
    if (hasContent.current && canvasRef.current) {
      onChange(canvasRef.current.toDataURL('image/png'));
    }
  }

  function clear() {
    const canvas = canvasRef.current!;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    hasContent.current = false;
    setEmpty(true);
    onChange('');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '160px',
            border: empty ? '1.5px dashed rgba(0,0,0,.18)' : '1.5px solid rgba(0,0,0,.12)',
            borderRadius: '12px',
            cursor: disabled ? 'default' : 'crosshair',
            touchAction: 'none',
            backgroundColor: disabled ? '#f5f5f7' : '#fafaf9',
            display: 'block',
          }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        {empty && !disabled && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', color: '#c7c7cc',
            fontSize: '13px', fontStyle: 'italic',
          }}>
            Signez ici avec votre doigt ou votre souris
          </div>
        )}
      </div>
      {!empty && !disabled && (
        <button
          type="button"
          onClick={clear}
          style={{ alignSelf: 'flex-start', padding: '4px 12px', borderRadius: '980px', border: '1px solid rgba(239,68,68,.4)', background: 'transparent', fontSize: '12px', cursor: 'pointer', color: '#ef4444', fontWeight: 600, fontFamily: 'inherit' }}
        >
          Effacer la signature
        </button>
      )}
    </div>
  );
}
