# Aerathe Rajeev Nair — portfolio

Static site in plain HTML, CSS and JavaScript. No build step.

## Structure
- `index.html` — homepage
- `problems.html` (Approach), `about.html`, `writing.html`
- Case studies: `studio.html`, `jk-cement.html`, `capacityos.html`, `gates.html`
- `style.css`, `site.js` — shared styles and behaviour for every page
- `api/writing.js` — Vercel serverless function that reads the Medium and Substack feeds for the Writing page
- `img/` — images, logos and thumbnails
- `films/` — film clips, stills and `films.json` (the list shown under Outside work)

## Deploy
Import the repository in Vercel. Framework preset: **Other**. Leave the build command and output directory empty.
Vercel serves the files as they are and runs `api/writing.js` automatically.

## Run locally
`python3 -m http.server 8000`, then open http://localhost:8000
(The Writing page's live feed needs Vercel; locally it shows the built-in article list.)
