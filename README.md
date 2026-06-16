# Camila Grimaldi — Portfolio Website

Production build of the portfolio design. Plain **HTML / CSS / vanilla JS** — no
framework, no build step, no dependencies. Recreated 1:1 from the Claude Design
handoff prototype (which ran React via in-browser Babel).

## Run it

It's a static site. Any of these work:

- **Just open it** — double-click `index.html` (works from `file://`; no server needed).
- **Local server** (nicer URLs, recommended) — from this folder run any static server, e.g.
  `python -m http.server 4599` or `npx http-server -c-1`, then open the printed URL.

## Structure

```
index.html              Page shell — loads the CSS + JS, holds <div id="root">
css/colors_and_type.css Design-system tokens (color, type scale, spacing) + type classes
css/kit.css             All component styles
js/data.js              Content: CG_PROJECTS (5 works) + CG_RESEARCH (3 items)
js/app.js               The app — routing, views, carousel/lightbox, nav, contact form
img/                    Project, research and profile photography
files/                  Camila Grimaldi CV.pdf (linked from the Profile page)
```

## How it works

- **Routing** is hash-based, so pages are bookmarkable and the browser back/forward
  buttons work: `#/` · `#/projects` · `#/project/<id>` · `#/research` ·
  `#/research/<id>` · `#/about` · `#/contact`.
- **Views** are rendered by `app.js` from the data in `data.js`. To change content
  (titles, descriptions, locations, images), edit `data.js`.
- **Images** — each project/research item lists its image filenames in `data.js`;
  drop replacements into `img/` and update the names there.
- **Contact form** is delivered by [Web3Forms](https://web3forms.com) (no server to
  run). It needs a one-time **access key** — see below. Until a key is set, the form
  falls back to opening the visitor's own mail client addressed to `arq.cgrimaldi@gmail.com`.

## Activate the contact form (one-time)

Submissions only reach your inbox once a Web3Forms access key is in place:

1. Go to **https://web3forms.com**.
2. Enter **arq.cgrimaldi@gmail.com** and click **Create Access Key**.
3. Web3Forms emails you a key — a long id like `a1b2c3d4-1234-5678-9abc-1234567890ab`.
4. Open `js/app.js`, find `WEB3FORMS_ACCESS_KEY` near the top, and paste the key
   between the quotes, replacing `YOUR-ACCESS-KEY-HERE`.
5. Re-deploy (or just re-open the file locally). Send yourself a test message and
   confirm it lands in your Gmail.

How it works once the key is set: the form POSTs to `https://api.web3forms.com/submit`;
Web3Forms validates the key and emails the enquiry to the address the key is tied to.
A hidden honeypot field blocks basic spam bots, and the visitor sees a
"Message sent ✓" confirmation. No data passes through any server of your own.

## Deploy

Upload the whole `portfolio-site/` folder to any static host — Netlify, Vercel,
GitHub Pages, Cloudflare Pages, or plain web hosting. No build command required;
the publish directory is this folder.

## Editing content quickly

- **Projects / research text & images** → `js/data.js`
- **About / Profile copy, CV, education & experience** → `profileHTML()` in `js/app.js`
- **Contact details, footer links, phone/email/LinkedIn** → `contactHTML()` / `footerHTML()` in `js/app.js`
- **Colors, fonts, spacing** → `css/colors_and_type.css`
