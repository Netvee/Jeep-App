export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#1d1f21" />
      <path d="M5 29 L15 15 L21 23 L25 18 L35 29 Z" fill="#d8cbb0" />
      <path d="M21 23 L25 18 L35 29 L27 29 Z" fill="#6f8047" />
      <circle cx="30" cy="11" r="3" fill="#d9692b" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span className="leading-none">
        <span className="block text-lg font-bold tracking-tight">שטח</span>
        <span className="block text-[11px] text-charcoal-400 -mt-0.5">הגראז׳ שלך לשטח</span>
      </span>
    </span>
  );
}
