# Demi Plank

Private, offline plank-workout web app (installs to the iPhone home screen). No ads, no accounts, no network calls at runtime.
All data stays on the phone (localStorage).

- `node tools/build-data.mjs` regenerates the Beginner/Intermediate/Advanced plans and Library from the vault spec.
- `node tools/test-engine.mjs` checks the plan engine (40-minute cap, rest days, caps, 140 levels).
- `node tools/build-sw.mjs` regenerates `sw.js` (run after ANY file change, or the offline cache goes stale).
- `node tools/serve.mjs` serves it locally on http://127.0.0.1:5173.
- Pictures: drop `pics/<move-id>.webp` (4:3, transparent) and it replaces the placeholder line figure automatically.
