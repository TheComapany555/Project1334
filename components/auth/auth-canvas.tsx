/**
 * Animated backdrop for the auth split-screen.
 *
 * Pure CSS/SVG — no canvas, no rAF, no JS on the main thread. Every moving
 * layer animates only `transform` / `opacity`, and the whole thing freezes
 * under `prefers-reduced-motion` (see `.auth-*` keyframes in globals.css).
 */
export function AuthCanvas() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Base wash — deep neutral, not black, so the green reads as light */}
      <div className="absolute inset-0 bg-[#08090c]" />

      {/* Perspective floor grid, drifting toward the horizon */}
      <div className="auth-grid-mask absolute inset-x-0 bottom-0 top-1/3">
        <div className="auth-grid absolute inset-0" />
      </div>

      {/* Aurora — two counter-drifting brand-green blooms */}
      <div className="auth-aurora-a absolute -left-[15%] top-[8%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.30),transparent_68%)] blur-3xl" />
      <div className="auth-aurora-b absolute -right-[10%] top-[38%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.22),transparent_70%)] blur-3xl" />

      {/* Horizon glow where the grid vanishes */}
      <div className="absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-transparent via-emerald-400/45 to-transparent" />
      <div className="absolute inset-x-0 top-1/3 h-40 -translate-y-1/2 bg-[radial-gradient(60%_100%_at_50%_50%,rgba(52,211,153,0.16),transparent_70%)]" />

      {/* Scanning beam sweeping down the panel */}
      <div className="auth-scan absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />

      {/*
        Constellation of connected nodes — the "network of buyers" motif.

        Confined to the upper third (above the horizon) so it never crosses the
        headline below; a trace running through the copy reads as strikethrough.
      */}
      <svg
        className="absolute inset-x-0 top-0 h-1/3 w-full"
        viewBox="0 0 400 200"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <g stroke="rgba(52,211,153,0.26)" strokeWidth="0.75">
          <path className="auth-trace auth-trace-1" d="M50 60 L140 34 L245 78 L340 42" />
          <path className="auth-trace auth-trace-2" d="M30 150 L130 118 L240 158 L355 126" />
          <path className="auth-trace auth-trace-3" d="M140 34 L130 118" />
          <path className="auth-trace auth-trace-4" d="M245 78 L240 158" />
          <path className="auth-trace auth-trace-5" d="M340 42 L355 126" />
        </g>
        <g fill="rgb(52,211,153)">
          {[
            [50, 60], [140, 34], [245, 78], [340, 42],
            [30, 150], [130, 118], [240, 158], [355, 126],
          ].map(([cx, cy], i) => (
            <circle
              key={`${cx}-${cy}`}
              className="auth-node"
              cx={cx}
              cy={cy}
              r="2.5"
              style={{ animationDelay: `${(i % 6) * 0.55}s` }}
            />
          ))}
        </g>
      </svg>

      {/* Vignette — pulls focus to the centered copy */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_35%,rgba(0,0,0,0.65))]" />

      {/* Film grain, so the large flat areas never band */}
      <div className="auth-grain absolute inset-0 opacity-[0.035]" />
    </div>
  );
}
