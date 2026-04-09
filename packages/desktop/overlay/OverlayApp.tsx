import { useState, useEffect, useRef } from 'react';
import { parseOverlayCommands, type OverlayCommand, type ArrowCommand, type CircleCommand } from '../src/lib/parsePointing';

declare global {
  interface Window {
    clippy: {
      onChatChunk: (cb: (chunk: any) => void) => () => void;
      onPointAt: (cb: (data: any) => void) => () => void;
      onHighlight: (cb: (data: any) => void) => () => void;
      onClearOverlay: (cb: () => void) => () => void;
    };
  }
}

interface PointerState {
  x: number;
  y: number;
  label: string;
  visible: boolean;
  entering: boolean;
}

interface HighlightState {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

interface ArrowState {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
}

interface CircleState {
  x: number;
  y: number;
  radius: number;
  label: string;
}

const ACCENT = '#00d4ff';
const ACCENT_GLOW = 'rgba(0, 212, 255, 0.4)';

export function OverlayApp() {
  const [pointer, setPointer] = useState<PointerState>({
    x: 0, y: 0, label: '', visible: false, entering: false,
  });
  const [highlights, setHighlights] = useState<HighlightState[]>([]);
  const [arrows, setArrows] = useState<ArrowState[]>([]);
  const [circles, setCircles] = useState<CircleState[]>([]);
  const processedRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!window.clippy) return;

    const cleanupChunk = window.clippy.onChatChunk((chunk) => {
      if (chunk.fullText) {
        const commands = parseOverlayCommands(chunk.fullText);
        const newCommands = commands.slice(processedRef.current);
        processedRef.current = commands.length;

        for (const cmd of newCommands) {
          executeCommand(cmd);
        }
      }

      if (chunk.done) {
        processedRef.current = 0;
        hideTimerRef.current = setTimeout(clearAll, 6000);
      }
    });

    const cleanupClear = window.clippy.onClearOverlay(clearAll);

    return () => {
      cleanupChunk();
      cleanupClear();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const clearAll = () => {
    setPointer((p) => ({ ...p, visible: false }));
    setHighlights([]);
    setArrows([]);
    setCircles([]);
  };

  const executeCommand = (cmd: OverlayCommand) => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    switch (cmd.type) {
      case 'point':
        setPointer({ x: cmd.x, y: cmd.y, label: cmd.label, visible: true, entering: true });
        setTimeout(() => setPointer((p) => ({ ...p, entering: false })), 500);
        break;

      case 'highlight':
        setHighlights((prev) => [...prev, {
          x: cmd.x, y: cmd.y, width: cmd.width, height: cmd.height, label: cmd.label,
        }]);
        break;

      case 'arrow':
        setArrows((prev) => [...prev, {
          x1: cmd.x1, y1: cmd.y1, x2: cmd.x2, y2: cmd.y2, label: (cmd as ArrowCommand).label,
        }]);
        break;

      case 'circle':
        setCircles((prev) => [...prev, {
          x: cmd.x, y: cmd.y, radius: (cmd as CircleCommand).radius, label: cmd.label,
        }]);
        break;
    }
  };

  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    whiteSpace: 'nowrap',
    background: 'rgba(10, 10, 15, 0.92)',
    backdropFilter: 'blur(12px)',
    color: '#e4e4ef',
    fontSize: 12,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontWeight: 500,
    padding: '4px 10px',
    borderRadius: 8,
    border: '1px solid rgba(0, 212, 255, 0.2)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
    animation: 'fade-in-up 0.3s ease-out',
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>

      {/* ── Pointer ── */}
      {pointer.visible && (
        <div style={{
          position: 'absolute', left: pointer.x, top: pointer.y,
          transform: 'translate(-50%, -50%)',
          transition: 'left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          zIndex: 9999,
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            background: `radial-gradient(circle, ${ACCENT} 0%, #0066ff 100%)`,
            boxShadow: `0 0 20px ${ACCENT_GLOW}, 0 0 40px rgba(0, 212, 255, 0.2)`,
            animation: 'pulse-pointer 2s ease-in-out infinite',
          }} />
          {pointer.entering && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 60, height: 60, borderRadius: '50%',
              border: `2px solid rgba(0, 212, 255, 0.5)`,
              animation: 'ripple 0.6s ease-out forwards',
            }} />
          )}
          <div style={{ ...labelStyle, top: -36, left: '50%', transform: 'translateX(-50%)' }}>
            {pointer.label}
          </div>
        </div>
      )}

      {/* ── Highlights ── */}
      {highlights.map((h, i) => (
        <div key={`h-${i}`} style={{
          position: 'absolute', left: h.x, top: h.y, width: h.width, height: h.height,
          borderRadius: 8,
          border: `2px solid rgba(0, 212, 255, 0.6)`,
          boxShadow: `0 0 16px ${ACCENT_GLOW}, inset 0 0 16px rgba(0, 212, 255, 0.05)`,
          animation: 'highlight-in 0.4s ease-out',
        }}>
          {h.label && (
            <div style={{ ...labelStyle, top: -28, left: 0 }}>{h.label}</div>
          )}
        </div>
      ))}

      {/* ── Arrows (SVG) ── */}
      {arrows.length > 0 && (
        <svg style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          pointerEvents: 'none', overflow: 'visible',
        }}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={ACCENT} />
            </marker>
            <filter id="arrow-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {arrows.map((a, i) => (
            <g key={`a-${i}`}>
              {/* Glow line */}
              <line
                x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
                stroke={ACCENT} strokeWidth={4} opacity={0.3}
                filter="url(#arrow-glow)"
              />
              {/* Main line */}
              <line
                x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
                stroke={ACCENT} strokeWidth={2}
                markerEnd="url(#arrowhead)"
                strokeDasharray="800"
                strokeDashoffset="800"
                style={{ animation: 'draw-arrow 0.6s ease-out forwards' }}
              />
            </g>
          ))}
        </svg>
      )}

      {/* Arrow labels (HTML, positioned at midpoint) */}
      {arrows.map((a, i) => (
        <div key={`al-${i}`} style={{
          ...labelStyle,
          position: 'absolute',
          left: (a.x1 + a.x2) / 2,
          top: (a.y1 + a.y2) / 2 - 24,
          transform: 'translateX(-50%)',
        }}>
          {a.label}
        </div>
      ))}

      {/* ── Circles (SVG) ── */}
      {circles.length > 0 && (
        <svg style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          pointerEvents: 'none', overflow: 'visible',
        }}>
          {circles.map((c, i) => (
            <g key={`c-${i}`}>
              {/* Glow */}
              <circle cx={c.x} cy={c.y} r={c.radius}
                fill="none" stroke={ACCENT} strokeWidth={4} opacity={0.2}
                filter="url(#arrow-glow)"
              />
              {/* Main circle */}
              <circle cx={c.x} cy={c.y} r={c.radius}
                fill="none" stroke={ACCENT} strokeWidth={2}
                strokeDasharray={2 * Math.PI * c.radius}
                strokeDashoffset={2 * Math.PI * c.radius}
                style={{ animation: 'draw-circle 0.8s ease-out forwards' }}
              />
            </g>
          ))}
        </svg>
      )}

      {/* Circle labels */}
      {circles.map((c, i) => (
        <div key={`cl-${i}`} style={{
          ...labelStyle,
          position: 'absolute',
          left: c.x,
          top: c.y - c.radius - 28,
          transform: 'translateX(-50%)',
        }}>
          {c.label}
        </div>
      ))}

      {/* ── Animations ── */}
      <style>{`
        @keyframes pulse-pointer {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px ${ACCENT_GLOW}; }
          50% { transform: scale(1.2); box-shadow: 0 0 30px rgba(0, 212, 255, 0.6); }
        }
        @keyframes ripple {
          from { width: 20px; height: 20px; opacity: 1; }
          to { width: 80px; height: 80px; opacity: 0; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes highlight-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes draw-arrow {
          to { stroke-dashoffset: 0; }
        }
        @keyframes draw-circle {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
