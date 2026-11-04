# Raw Bacon Robotics #8743 website

Static site for FIRST Tech Challenge team 8743 (Iowa City High School). No build step: everything in `public/` is served by Cloudflare Workers static assets (see `wrangler.jsonc`). Every push to `main` redeploys.

## Layout

- `public/*.html`: index, about, season, history, contact, 404
- `public/styles.css`: all styles (colors and spacing are variables at the top)
- `public/js/site.js`: rail pin, reveals, counters, countdown, photo hotspots
- `public/js/holes.js`: hero hole-grid canvas
- `public/assets/`: robot photo, social card, Archivo variable font (SIL OFL, license included)

## Common edits

- **Add a result:** copy an `<li>` inside the `ol.board` in `season.html` and edit the rank, event, record and stats.
- **Next-match countdown:** the schedule is the `data-events` list on `#odo` in `index.html`. It picks the next date automatically.
- **Past seasons:** add a `<details>` block in `history.html`.

## Preview locally

    cd public && python3 -m http.server 8000

The previous design is in git history at commit 8242c5e if you ever want to roll back.
