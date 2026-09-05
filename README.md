# Stack Duel

Hot-seat tower stacking duel — web MVP (casual bright).

Two players, one device. Take turns dropping blocks. Whoever topples the tower loses.

## Play

Open `index.html` in a browser, or:

```bash
python3 -m http.server 8080
```

Then visit http://localhost:8080

Works on phone (portrait) and desktop. Touch or click / Space to drop.

## Screens

1. **Title** — names + Play  
2. **Gameplay** — tower, moving block, turn, Height, Tap to drop  
3. **Game over** — winner / who toppled + Play again / Change names  

## Stack

Vanilla HTML / CSS / JS. No build step.

## Issue

MVP tracked in #1.

## Retention (MVP+)

- **Win streak** — saved in `localStorage`, shown on title + game over; resets for the loser
- **Vendetta** — optional "Guarda → Vendetta" on game over; web uses a **mock rewarded ad** (1.5s then "Ad watched"); rematch keeps names and shows a REVENGE banner
- Ads are always optional — Play again works without watching

