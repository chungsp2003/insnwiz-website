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
insights/index.html                     Insights
about/index.html                        About / Location
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

## Content status

The site contains no visible case-study templates or placeholder contact details. The
Insights page currently explains that articles will be published when available. Add
client names, results, certifications, office addresses, service levels, and coverage
claims only after they are verified and cleared for publication.

## Contact form

`contact/index.html` (`#rfq-form`) posts via `assets/main.js` to FormSubmit
(`https://formsubmit.co/ajax/ben@insnwiz.com`), which emails each submission to ben@insnwiz.com.
The first submission sends an activation email to that inbox — click the confirmation link once.
To change the recipient, edit `ENDPOINT` in `assets/main.js`. The CSP in `_headers` allows
`connect-src https://formsubmit.co`. For a self-hosted option, replace it with a Cloudflare Pages
Function plus an email provider.

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

## Google Drive file portal

The shareable page is `https://insnwiz.com/upload/`. Approved accounts can upload,
browse subfolders, and download files within the configured shared folder. Uploads accept
one file per submission, up to 20 MB, and save into the main folder. Downloads
are streamed; Google Docs, Slides, and Drawings export as PDF, Sheets as XLSX.
Shortcuts are excluded so they cannot expose files outside this folder.
The visitor needs an approved email and website password, but no Google login.
Files remain private; authenticated users can see the shared folder contents.
Credentials are held in browser memory only and cleared on sign-out/reload.

Set these **encrypted secrets** in the Cloudflare Pages project's Settings →
Variables and Secrets, then redeploy. The current project uses direct deployment,
not Git auto-deployment:

- `DRIVE_FOLDER_ID`: `1lXllWrzvPQv_U98HKoTamzn8DEaT702i`.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: Google OAuth client credentials.
- `GOOGLE_REFRESH_TOKEN`: offline OAuth refresh token for the account with write
  access to that folder; enable the Drive API and authorize the Drive scope.
  Use a production OAuth consent configuration for a lasting connection.
- `UPLOAD_USERS_JSON`: email-to-password-hash mapping generated using
  `python3 scripts/upload_account.py EMAIL /private/tmp/upload-users.json`.
  The script prompts privately for a password and adds or updates that account.
  Paste the resulting JSON into this encrypted secret. Send each password to its
  user privately. Remove an email and update the secret to revoke access.

Use a dedicated folder for incoming files. The destination cannot be selected
by visitors. Configure a Cloudflare rate-limit rule for all three portal API routes if sharing
with a broad audience. Use long unique passwords. Password hashes use salted PBKDF2-SHA256 (100,000 iterations). Do not commit
credentials or place them in browser JavaScript. The existing photo-note app's
OAuth credentials can be reused only with the owner's authorization.

No build step is required. Static dashboard drag-and-drop deployments do not
compile Pages Functions; deploy through the connected Git repository or Wrangler.
Run endpoint tests with `node --test tests/upload.test.mjs`.

## Private Kiwoom Stock area

`/stock/` is a private, read-only Korean stock quote page. A Cloudflare Pages
Function checks HTTP Basic credentials before serving the page or quote API.
The page is served by the Function rather than a static HTML file, so a static
deployment cannot expose it accidentally. It uses Kiwoom's official OAuth token
endpoint and `ka10001` stock-information API server-side, following the
[official Kiwoom REST API repository](https://github.com/Kiwoom-Securities/Kiwoom-REST-API).
No trading endpoint is
implemented. Keep this path out of public navigation and search indexing.

Set these encrypted Cloudflare Pages secrets before deploying:

- `STOCK_USERS_JSON`: a separate email/password-hash mapping generated with
  `python3 scripts/upload_account.py ben@insnwiz.com /private/tmp/stock-users.json`.
  Put only approved Stock users in this secret; it is independent of the file portal.
- `KIWOOM_APP_KEY` and `KIWOOM_APP_SECRET`: keys from the Kiwoom OpenAPI portal.
- `KIWOOM_MODE`: `demo` for mock investment or `real` for the live environment.
  Use keys for the matching mode. The default is deliberately unset, so this
  integration fails closed until an environment is explicitly chosen.

Do not put Kiwoom keys, passwords, or tokens in Git or browser code. This is a
Pages Functions feature, so publish through Git integration or Wrangler rather
than static direct upload. Configure a Cloudflare rate-limit rule for `/stock/*`
before broad use. The browser may remember HTTP Basic credentials until closed;
use a private browser session on shared computers.

