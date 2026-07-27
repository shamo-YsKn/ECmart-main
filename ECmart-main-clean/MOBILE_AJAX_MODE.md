# Mobile Ajax mode

The phone UI is still server-rendered and fully functional without React hydration.
`public/mobile-enhance.js` progressively enhances the server UI:

- Same-origin links are fetched and only `[data-mobile-shell]` is replaced.
- GET forms update without a full browser reload.
- Mobile POST actions request JSON and then refresh only the shell.
- Login, cart, favorites, logout and robot save never expose `/api/mobile/*` during normal Ajax operation.
- Browser back/forward is supported through `history.pushState` / `popstate`.
- If fetch or JavaScript fails, ordinary links/forms remain the fallback.

This keeps the compatibility benefit of the mobile server-rendered mode while removing most full-page reloads.
