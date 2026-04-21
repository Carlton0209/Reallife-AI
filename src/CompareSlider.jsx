import { useRef, useEffect, useCallback, useState } from 'react'

/**
 * Draggable before/after compare.
 *
 * Props:
 *   before, after       — JSX for the two layers (SVG, <img>, <video>, anything)
 *   aspectRatio         — CSS aspect-ratio string, e.g. '16 / 9', '4 / 5'
 *   labelBefore, labelAfter — optional text chips in the corners
 *   initialPosition     — 0–100, default 50
 *   size                — 'xs' (28px) | 'sm' (38px) | 'md' (44px) | 'lg' (52px)
 *   rounded             — CSS border-radius, default '14px'. Pass '0' for Swiss / sharp corners.
 *   accentOnEnd         — when true, the After label flips to ink bg + white text near 100%,
 *                         and the Before label flips at 0%. Default false.
 *   className           — extra classes for the outer container
 *
 * The after layer is clipped via CSS clip-path based on the current position.
 */
export default function CompareSlider({
  before,
  after,
  aspectRatio = '16 / 9',
  labelBefore,
  labelAfter,
  initialPosition = 50,
  size = 'md',
  rounded = '14px',
  accentOnEnd = false,
  className = '',
}) {
  const containerRef = useRef(null)
  const [position, setPosition] = useState(initialPosition)
  const [dragging, setDragging] = useState(false)

  const updatePosition = useCallback((clientX) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    setPosition(ratio)
  }, [])

  useEffect(() => {
    if (!dragging) return
    const move = (e) => {
      const x = e.touches ? e.touches[0].clientX : e.clientX
      updatePosition(x)
    }
    const end = () => setDragging(false)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', end)
    window.addEventListener('touchmove', move, { passive: false })
    window.addEventListener('touchend', end)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', end)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', end)
    }
  }, [dragging, updatePosition])

  const onStart = (e) => {
    setDragging(true)
    const x = e.touches ? e.touches[0].clientX : e.clientX
    updatePosition(x)
  }

  const handleSize = size === 'xs' ? 28 : size === 'sm' ? 38 : size === 'lg' ? 52 : 44
  const iconScale = size === 'xs' ? 0.6 : size === 'sm' ? 0.78 : size === 'lg' ? 1.1 : 1

  // Accent thresholds — fires within 5% of the edge.
  const atEnd = accentOnEnd && position >= 95
  const atStart = accentOnEnd && position <= 5

  const labelBase =
    'absolute top-3 px-2.5 py-1 rounded-full text-[11px] font-medium pointer-events-none transition-colors duration-200'
  const labelIdle = 'bg-white/90 text-ink'
  const labelHot = 'bg-ink text-white'

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-ink select-none cursor-ew-resize ${className}`}
      style={{ aspectRatio, borderRadius: rounded }}
      onMouseDown={onStart}
      onTouchStart={onStart}
    >
      <div className="absolute inset-0">{before}</div>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${position}%)` }}>
        {after}
      </div>

      <div
        className="absolute top-0 bottom-0 w-px bg-white pointer-events-none"
        style={{ left: `${position}%` }}
      />

      <div
        className="absolute bg-white rounded-full flex items-center justify-center pointer-events-none"
        style={{
          left: `${position}%`,
          top: '50%',
          width: handleSize,
          height: handleSize,
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }}
      >
        <svg
          width={16 * iconScale}
          height={13 * iconScale}
          viewBox="0 0 16 13"
          fill="none"
        >
          <path
            d="M 5 2 L 2 6.5 L 5 11 M 11 2 L 14 6.5 L 11 11"
            stroke="#0A0A0A"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {labelBefore && (
        <div className={`${labelBase} left-3 ${atStart ? labelHot : labelIdle}`}>{labelBefore}</div>
      )}
      {labelAfter && (
        <div className={`${labelBase} right-3 ${atEnd ? labelHot : labelIdle}`}>{labelAfter}</div>
      )}
    </div>
  )
}
