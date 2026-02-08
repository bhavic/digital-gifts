# Automated Star Registry + WebAR Blueprint

This repository contains a full-stack starter implementation for an automated "buy a star" funnel:

1. **Marketing homepage** with deep-space styling, interactive starfield, live certificate preview, detailed sales sections, Shopify-ready plan selector, and configurable media gallery.
2. **Shopify Liquid template** that captures recipient metadata in line-item properties.
3. **Firebase webhook backend** that assigns unique stars, creates a unique subdomain certificate page per order, stores registry data, and emails the buyer.
4. **Celestial math engine** that converts RA/Dec to Alt/Az from user location and UTC time.
5. **WebAR viewer** built with A-Frame + AR.js to guide users to their assigned star.

## Repository Layout

- `src/web/`: Homepage sales funnel + certificate sample page.
- `shopify/templates/`: Liquid product template for metadata capture.
- `functions/`: Firebase Cloud Function webhook automation.
- `src/shared/`: Coordinate conversion logic.
- `src/view/`: QR-linked WebAR viewer + per-order certificate page UI.
- `tests/`: Math engine tests.
- `data/stars.json`: Sample star catalog.

## Running checks

```bash
npm test
```

## Homepage media gallery (Shopify-managed)

In `src/web/index.html`, the gallery can be fed in two ways:

1. **JSON script block** (`#shopifyMediaConfig`) with `type`, `url`, and `title`.
2. **Runtime injection** via `window.SHOPIFY_HOMEPAGE_MEDIA` (for Shopify theme settings/metafields rendering).

Supported media types:

- `image`
- `video`

## Deployment Notes

- Host `src/web` and `src/view` on Firebase Hosting or any static host.
- Deploy `functions/index.js` as Firebase Functions (v2 HTTPS).
- Configure secrets/environment:
  - `SHOPIFY_WEBHOOK_SECRET`
  - `SENDGRID_API_KEY`
  - `FROM_EMAIL`
  - `ROOT_DOMAIN` (e.g. `yourdomain.com` for generated order subdomains)
- Replace Shopify placeholders in `src/web/app.js` with real Storefront credentials and product variant IDs.

## Updated fulfillment flow

- On `orders/paid`, backend allocates a star and stores a registry record.
- Backend generates a unique subdomain URL for the order (example: `star-1234-hr7001.yourdomain.com`).
- User opens that page and can generate/download certificate PDF from the page itself (browser print to PDF).
