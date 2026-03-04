# Salebiz Brand Guidelines

**Brand:** Salebiz.com.au

## Colors

Professional palette derived from primary forest green (OKLCH hue 155). Use CSS variables in app; hex below for reference (e.g. emails).

| Name       | Usage                                      |
|------------|--------------------------------------------|
| Primary    | CTAs, links, focus ring, main emphasis     |
| Secondary  | Secondary buttons, subtle surfaces, badges  |
| Accent     | Hover states, active nav, highlights      |
| Success    | Confirmations, positive states (green)     |
| Warning    | Caution, pending (amber)                   |
| Destructive| Errors, remove actions (red)              |
| Info       | Informational (blue)                      |

- **Primary** (forest green): main actions — Submit, Sign in, primary buttons. In app: `var(--primary)`.
- **Secondary** (sage): secondary actions, pills (e.g. Under Management). In app: `var(--secondary)`.
- Ensure sufficient contrast on backgrounds (min 4.5:1 for text).

## Logo

- **Location:** Vercel Blob storage — `Salebiz.png`. Used app-wide (header, auth, sidebars, emails).
- **Minimum size:** 120px width for header; 32px height for favicon/small use.
- **Backgrounds:** Logo is used across light and dark UI; for dark backgrounds consider an inverted/white variant if needed.

## Tailwind / CSS

All colors are defined in `app/globals.css` (light and dark). Use theme tokens:

- `bg-primary`, `text-primary`, `border-primary`, etc.
- `bg-secondary`, `text-secondary`, `accent`, `muted`, `destructive`, `success`, `warning`, `info`
- Or `var(--primary)`, `var(--secondary)` for custom use.
