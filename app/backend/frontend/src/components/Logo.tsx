// Investec crosshair/target mark recreated as crisp inline SVG (razor-sharp at
// any size) + the Sentinel lockup. Used for a spectacular hero on the landing
// page and a compact mark in the top bar.

export function Crosshair({ size = 40, color = "#c9a24b" }: { size?: number; color?: string }) {
  const c = size / 2;
  const r = size * 0.34;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden>
      <circle cx="50" cy="50" r="34" stroke={color} strokeWidth="6" />
      <circle cx="50" cy="50" r="12" fill={color} />
      <line x1="50" y1="2" x2="50" y2="30" stroke={color} strokeWidth="6" />
      <line x1="50" y1="70" x2="50" y2="98" stroke={color} strokeWidth="6" />
      <line x1="2" y1="50" x2="30" y2="50" stroke={color} strokeWidth="6" />
      <line x1="70" y1="50" x2="98" y2="50" stroke={color} strokeWidth="6" />
    </svg>
  );
}

// Large hero lockup for the landing page.
export function HeroLogo() {
  return (
    <div className="hero-logo">
      <div className="hero-glow" />
      <div className="hero-inner">
        <Crosshair size={54} color="#c9a24b" />
        <div className="hero-wordmark">
          <span className="hero-investec">Investec</span>
          <span className="hero-divider" />
          <span className="hero-sentinel">Sentinel</span>
        </div>
      </div>
      <div className="hero-tag">CDP &amp; Financial Crime Intelligence Platform</div>
    </div>
  );
}

// Compact mark for the top bar.
export function BrandMark() {
  return (
    <div className="brandmark">
      <Crosshair size={26} color="#c9a24b" />
      <span className="brandmark-text"><b>Investec</b> Sentinel</span>
    </div>
  );
}
