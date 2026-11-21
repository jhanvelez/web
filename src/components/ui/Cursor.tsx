/** Cursor de terminal parpadeante. */
export function Cursor({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`term-cursor ml-0.5 inline-block h-[1em] w-[0.55em] translate-y-[0.15em] bg-[#7dffb2] ${className}`} />
}
