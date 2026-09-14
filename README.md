# InsightnWisdom — Phase-1 Website (Raw HTML/CSS)

Static, dependency-free site built from `InsightnWisdom_Website_Design_Guide_AI_Agent_v2.docx`.
No build step, no framework — plain HTML/CSS/JS, ready to deploy to Cloudflare Pages.

## Structure

```
index.html                              Home
services/ai-agentic-ai.html             AI & Agentic AI Services
services/ai-agent-use-cases.html        AI Agent Use Cases
services/it-digital-solutions.html      IT Services & Digital Solutions
services/managed-it.html                Managed IT Services
services/data-center-maintenance.html   IT & Data Center Maintenance
services/professional-project-services.html   Professional & Project Services
projects/index.html                     Projects / Case Studies
insights/index.html                     Insights
about/index.html                        About / Locations
contact/index.html                      Contact / RFQ
assets/styles.css                       Shared design system (all pages)
assets/main.js                          Mobile nav + form UX (no backend)
_headers                                Cloudflare Pages security headers
robots.txt, sitemap.xml                 Basic SEO
```

All internal links and asset paths are root-absolute (`/services/...`, `/assets/...`),
so the site must be deployed at the domain root (`https://www.insnwiz.com/`), not a subpath.

## Design tokens (Section 3 of the guide)

| Token | Value | Use |
|---|---|---|
| Primary | Deep Navy `#101827` | Hero, footer, key bands |
| Accent | Electric Cyan `#18B6D9` | CTAs, links, diagrams |
| Secondary | Signal Green `#2FBF9F` | Operational status/success |
| Surface | Ice `#EEF4F7` | Cards / technical sections |
| Type | Inter (UI/body) + IBM Plex Sans/Mono | loaded from Google Fonts |

All tokens are CSS custom properties at the top of `assets/styles.css` — change them once,
they propagate everywhere. (The guide names "Aptos" as an option; Aptos isn't available as a
free web font, so Inter is used as the primary typeface with IBM Plex Sans/Mono as the
technical/secondary voice.)

## Deploying to Cloudflare Pages

1. Push this folder to a Git repo (or upload it directly via the Cloudflare dashboard's
   "Direct Upload" option under Workers & Pages → Create → Pages).
2. Build command: none. Build output directory: `/` (project root).
3. Cloudflare Pages will pick up `_headers`, `robots.txt` and `sitemap.xml` automatically.
4. Point the `www.insnwiz.com` custom domain at the new Pages project once you're ready to cut over.

## What must be replaced before this goes live

The guide is explicit: **do not publish SLA response times, 24/7 availability,
certifications, partner status, customer logos, AI capabilities, geographic coverage or
quantitative claims unless contractually and factually verified.** Every page that touches
this is marked with a visible amber "Template" placeholder box in the HTML — search for
`placeholder-note` or `[bracketed text]` to find every spot that needs real content:

- **Case studies** (`projects/index.html` and the "Proof" section on each service page) —
  currently structural templates only. Fill in only client-approved, verified details.
- **Certifications / partnerships** (`about/index.html`) — none are listed; add only what's
  currently accredited.
- **Contact details** (`contact/index.html`) — placeholder email/phone; add real, monitored
  ones.
- **Office addresses** (`about/index.html`) — placeholder text for Seoul and Hong Kong.
- **SLA / response-time figures** — intentionally left as qualitative ("where contracted")
  rather than invented numbers; add real figures only once contracted.

## Wiring the contact form

`contact/index.html` (`#rfq-form`) currently only shows a status message on submit — it does
not send anywhere. To make it functional, either:
- Point the `<form>` at a Cloudflare Pages Function (`/functions/api/contact.ts`) that emails
  or forwards submissions, or
- Use a form backend (e.g. a forms API you already run) and update the JS in `assets/main.js`.

## Note on the AI positioning

Per the guide, the AI section is framed as a **business-process / enterprise-automation
service** (use-case discovery → agents → integration → governance → operation), not as GPU or
data-center infrastructure — that framing is intentional throughout `services/ai-agentic-ai.html`
and `services/ai-agent-use-cases.html`.

## Not yet in this build

Bilingual (English/Korean) content, a CMS layer, and analytics/conversion tracking are called
out as build requirements in the guide (Section 7) but are integration decisions best made
once the platform (Cloudflare Pages + Functions vs. a CMS) is settled — the HTML structure
here doesn't block adding any of them later.
