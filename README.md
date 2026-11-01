# Raw Bacon Robotics #8743

Website for FIRST Tech Challenge team #8743 at Iowa City High School.

Plain HTML and CSS. There is no build step.

## Layout

- `public/` is the whole site. Cloudflare serves this folder.
  - `index.html`, `about.html`, `season.html`, `history.html`, `contact.html`
  - `styles.css` holds every style
  - `assets/` is for logos and photos
- `wrangler.jsonc` tells Cloudflare to serve `public/`.

## Deploying

Cloudflare is connected to this repo. Every push to `main` redeploys the site. Pushes to other branches get a preview link.

## Updating results

Add a new row to the 2025–26 table in `public/season.html` (or the current season's table). When a season ends, move its highlights to `public/history.html`. Each row copies the pattern of the rows already there. Add the same row to the "Recent results" table in `public/index.html` if it is one of the four newest.

## Preview locally

```
cd public
python3 -m http.server 8000
```

Then open http://localhost:8000.
