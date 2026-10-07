# LAN interaction fix check report

## Symptom confirmed

The reported pattern matches a hydration/bootstrap failure on a LAN client:

- real `<a href>` navigation still works;
- React `onClick` buttons do not react;
- this can be reproduced conceptually when server HTML is visible but the client runtime does not attach events.

The existing `MOBILE_RUNTIME_DIAGNOSIS.md` already documented the same failure pattern and recommended production startup for LAN/mobile validation.

## Fix added

1. Mobile detection now also reads `sec-ch-ua-mobile`.
2. `?compat=1` explicitly selects the server-rendered compatibility UI on any device.
3. The React site writes `data-machinowa-hydrated=1` after its first client effect.
4. `/runtime-compat.js` watches the React site for 4.5 seconds.
5. If hydration never completes, the page reloads the same URL with `compat=1`.
6. Compatibility pages do not enter the watchdog loop.
7. `RUN_WINDOWS.md` now makes production startup the default recommendation for cross-device button testing.

## Runtime fallback unit check

- PASS dead React redirects to compat mode
- PASS hydrated React stays on React mode
- PASS already-compat page does not redirect again
- PASS server/mobile shell does not redirect

## Existing regression checks

- External AI assistant: 10/10 PASS
- Guest account: 29/29 PASS
- Custom item views: 11/11 PASS
- Robot idea assistant: 25 checks PASS
- `public/runtime-compat.js`: `node --check` PASS

## Recommended LAN startup

```powershell
npm install
npm run build
npm run start:network
```

Then open:

```text
http://<PC IPv4 address>:3000
```

Manual emergency compatibility URL:

```text
http://<PC IPv4 address>:3000/?compat=1
```
