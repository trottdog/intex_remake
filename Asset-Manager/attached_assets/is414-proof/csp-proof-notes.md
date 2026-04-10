# CSP Proof Notes

## Browser / DevTools proof

The frontend CSP is sent as an HTTP response header from Vercel via [`Asset-Manager/vercel.json`](../../vercel.json). Because it is a response header, it is visible in Chrome or Edge DevTools under:

`DevTools -> Network -> <document request> -> Headers -> Response Headers -> Content-Security-Policy`

The live site already returns the header in raw HTTP responses, as captured in [`frontend-https-headers.txt`](./frontend-https-headers.txt).

## Allowed sources and why they are needed

Frontend policy in [`Asset-Manager/vercel.json`](../../vercel.json):

`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`

- `default-src 'self'`: default deny posture; same-origin only unless a narrower directive allows more.
- `script-src 'self'`: the Vite bundle is served from the same origin; no third-party scripts are used.
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`: local CSS is served from self, Google Fonts CSS is loaded from `fonts.googleapis.com`, and inline style attributes are used throughout the React app for charts, widths, colors, and layout state.
- `img-src 'self' data:`: page images are bundled local assets, and `data:` remains allowed for Vite-inlined image assets.
- `font-src 'self' https://fonts.gstatic.com`: the app loads Inter from Google Fonts and otherwise serves local assets from self.
- `connect-src 'self'`: in production the frontend uses relative `/api/...` calls, not a direct Azure origin, so requests stay same-origin and flow through the Vercel rewrite.
- `object-src 'none'`: no plugins or object/embed content are used.
- `base-uri 'self'`: prevents hostile `<base>` tag changes.
- `form-action 'self'`: forms only post back to the site itself.
- `frame-ancestors 'none'`: prevents clickjacking by disallowing framing.
- `upgrade-insecure-requests`: pushes mixed-content HTTP requests up to HTTPS.

## Source references

- Google Fonts stylesheet load: [`Asset-Manager/artifacts/beacon/index.html`](../../artifacts/beacon/index.html), [`Asset-Manager/artifacts/beacon/src/index.css`](../../artifacts/beacon/src/index.css)
- Same-origin production API calls: [`Asset-Manager/artifacts/beacon/src/main.tsx`](../../artifacts/beacon/src/main.tsx), [`Asset-Manager/artifacts/beacon/src/services/api.ts`](../../artifacts/beacon/src/services/api.ts)
- Local bundled images/social feed assets: [`Asset-Manager/artifacts/beacon/src/lib/social-feed.ts`](../../artifacts/beacon/src/lib/social-feed.ts), [`Asset-Manager/artifacts/beacon/src/pages/AboutPage.tsx`](../../artifacts/beacon/src/pages/AboutPage.tsx)
- Inline style attribute usage justifying `style-src 'unsafe-inline'`: [`Asset-Manager/artifacts/beacon/src/pages/donor/ImpactPage.tsx`](../../artifacts/beacon/src/pages/donor/ImpactPage.tsx), [`Asset-Manager/artifacts/beacon/src/pages/admin/AdminDashboard.tsx`](../../artifacts/beacon/src/pages/admin/AdminDashboard.tsx)
