# Online multiplayer — design note (spike)

**Status:** design only. No backend, no client online code until PM gives an explicit go (issue #5).

## Goal

Same Stack Duel rules over the network: two players, one room, turn-based drops. Keep the hot-seat loop feel (~30–60s matches).

## Room code

- Host taps **Create room** → server returns a short code (e.g. 4–6 chars, A–Z / 2–9).
- Guest taps **Join** and enters the code.
- Both must set a display name (reuse title-screen names).
- Lobby: show code + “waiting for opponent…” then auto-start when both ready.

## Turns

- Same alternate turns as hot-seat.
- Server is authority for: whose turn, block placement result, collapse / winner.
- Client sends `drop` intent; server validates and broadcasts state snapshot (tower + turn + height).

## Timer (60s)

- Each turn has a **60 second** clock.
- If the active player does not drop in time: auto-drop at current X (or forfeit turn — prefer auto-drop for pace).
- Both clients show the countdown; server owns the deadline (avoid desync).

## Sync / reconnect (MVP sketch)

- WebSocket (or similar) per room.
- On reconnect with same room + player token: resume if match still live.
- Out of scope for first spike: ranked, chat, spectators, cross-play accounts.

## Monetization note

Online does not change ads policy: Vendetta remains optional rewarded only; no IAP.

## Next (when PM says go)

1. Tiny backend (room create/join + turn relay + 60s timer).
2. Minimal client UI: Create / Join + in-game connection badge.
3. Keep casual-bright UI; no extra chrome.
