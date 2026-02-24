# Salebiz Brand Guidelines

**Brand:** Salebiz.com.au

## Colors

| Name       | Hex       | Usage                          |
|------------|-----------|--------------------------------|
| Primary    | `#024424` | CTAs, links, key UI emphasis   |
| Secondary  | `#005c00` | Secondary buttons, accents    |

- Use primary for main actions (Submit, Sign in, primary buttons).
- Use secondary for secondary actions and highlight pills (e.g. Under Management, Long Lease).
- Ensure sufficient contrast on backgrounds (min 4.5:1 for text).

## Logo

- **Location:** `public/brand/logo.png` or `public/brand/logo.svg`
- **Minimum size:** 120px width for header; 32px height for favicon/small use.
- **Backgrounds:** Use on white or light neutral; on dark use inverted/white logo.

## Tailwind / CSS

Brand colors are available as:

- `--color-primary: #024424`
- `--color-secondary: #005c00`

Use `var(--color-primary)` or Tailwind theme tokens that map to these in `globals.css`.
