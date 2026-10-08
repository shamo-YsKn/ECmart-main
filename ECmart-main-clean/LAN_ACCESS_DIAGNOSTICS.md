# LAN Access Diagnostics

## What was checked

The application itself does not contain a route guard or middleware that blocks LAN page access. Both `next dev` and `next start` are configured to bind to `0.0.0.0`.

The previous hydration compatibility fallback runs only after HTML has already reached the browser, so it cannot cause a TCP/HTTP connection failure from another device.

## Changes in this revision

1. `npm run dev:network` now explicitly uses Webpack and `0.0.0.0:3000`.
   - This avoids introducing the production-build requirement during normal LAN development.
   - It also avoids Turbopack-specific HMR/client-runtime differences while diagnosing mobile LAN behavior.
2. `next.config.mjs` automatically adds the PC's active non-loopback IPv4 addresses to `allowedDevOrigins` in development.
   - No LAN IP is hard-coded.
   - If DHCP changes the address, restarting Next.js recalculates the allow-list.
3. Added `GET /api/health` as a minimal no-cache reachability endpoint.
4. Added `npm run network:doctor`.
   - Shows the PC's current LAN IPv4 addresses.
   - Checks whether port 3000 is reachable through localhost and each LAN address.
   - Prints the exact URLs to try from another device.

## Recommended test

Terminal 1:

```powershell
npm run dev:network
```

Terminal 2:

```powershell
npm run network:doctor
```

The important result is that the active LAN address reports `LISTENING`.

On Windows, also run:

```powershell
netstat -ano | findstr :3000
```

A LAN-capable listener should look like `0.0.0.0:3000` (or `[::]:3000`). If only `127.0.0.1:3000` is listening, other devices cannot connect.

From the other device, first open:

```text
http://<CURRENT_PC_IPV4>:3000/api/health
```

If that JSON endpoint does not open, the failure is below the React/application layer. Check the current IPv4 address, Windows Defender Firewall, Wi-Fi client/AP isolation, VPN/security software, and whether the URL was upgraded to `https://` by the browser.

If `/api/health` opens but the normal page does not behave correctly, then test:

```text
http://<CURRENT_PC_IPV4>:3000/?compat=1
```

That distinguishes transport/LAN problems from React hydration problems.
