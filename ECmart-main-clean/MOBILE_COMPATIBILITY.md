# Mobile compatibility notes

This project keeps Next.js 16 / React 19 while degrading safely on older or weaker mobile browsers.

## What changed

- The server renders a lightweight SVG robot first.
- 3D loads only after hydration and a WebGL2 capability check succeeds.
- A React error boundary keeps a Three.js failure from taking down the rest of the page.
- Mobile/coarse-pointer devices use a lighter 3D renderer configuration.
- Non-interactive robot canvases do not accept pointer events.
- Main site navigation uses real links (`?tab=...`) with React enhancement. If hydration fails, those links still reload the requested page.
- Client-heavy packages are listed in `transpilePackages`.
- `browserslist` targets Chrome/Edge/Firefox 90+ and Safari/iOS Safari 14+ as a best-effort compatibility target.
- Legacy hex color fallbacks are declared before OKLCH theme colors.

## Important limit

Next.js 16 officially supports Chrome 111+, Edge 111+, Firefox 111+, and Safari 16.4+. The wider targets above are best-effort rather than an upstream support guarantee.

Three.js WebGLRenderer requires WebGL2. Devices without WebGL2 automatically keep the SVG robot instead of attempting the 3D renderer.

## 2026-07 mobile interaction hardening

The application no longer creates or restores a Supabase auth client during initial hydration.
Account auth is initialized only after an explicit account action. This prevents auth/storage
initialization on plain HTTP LAN origins from blocking React event attachment for the rest of
the application.

Authentication uses `@supabase/supabase-js` directly with `sessionStorage` and the client-side
implicit flow. The UI intentionally starts signed out after a fresh page/application entry;
there is no automatic account fetch spinner at startup. A manually requested session recovery
is still available for the current browser tab.

For deployment beyond LAN testing, HTTPS remains recommended.
