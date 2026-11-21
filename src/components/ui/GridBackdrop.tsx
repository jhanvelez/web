const X_MARK =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><path d='M25 25l14 14M39 25L25 39' stroke='%235289AD' stroke-width='3.4' stroke-linecap='round'/></svg>\")"

/**
 * Fondo de la carga y del inicio: un piso de cruces con grandes diagonales, visto en perspectiva
 * y desvaneciéndose hacia el horizonte (como en bruno-simon.com).
 */
export function GridBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#141f27]" aria-hidden>
      <div
        className="absolute left-1/2 top-1/2 size-[320vmax]"
        style={{
          transform: 'translate(-50%, -42%) perspective(1000px) rotateX(63deg)',
          backgroundImage: [
            X_MARK,
            'linear-gradient(45deg, transparent 49.85%, rgba(172,188,191,0.28) 50%, transparent 50.15%)',
            'linear-gradient(-45deg, transparent 49.85%, rgba(172,188,191,0.28) 50%, transparent 50.15%)',
          ].join(','),
          backgroundSize: '64px 64px, 512px 512px, 512px 512px',
        }}
      />
      {/* Bruma del horizonte y viñeta */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#141f27_0%,rgba(20,31,39,0.55)_28%,rgba(20,31,39,0)_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(8,14,19,0.75)_100%)]" />
    </div>
  )
}
