# Taha’s Mix Delight

A bilingual (Bangla/English) storefront for a Bangladesh-based bakery and gift shop. The React, TypeScript, and Vite frontend talks to a Python standard-library API backed by SQLite. The API validates checkout totals, stock, variants, delivery areas, and coupons; API credentials are not used in the browser.

## Included

- Responsive product catalog, category navigation, product variants, search, wishlist, and shopping bag.
- Guest checkout and customer accounts, order history, and phone-verified order tracking.
- Cash-on-delivery order placement with server-calculated prices, delivery, discounts, and inventory.
- Owner dashboard for editing product details, prices, variants and stock; editing categories; and managing homepage/about copy, hero imagery, delivery zones, and coupons.
- Verified-purchase reviews that stay hidden until an owner approves them.
- Bangla/English interface and sample products clearly marked as demo content.

## Requirements

- Node.js 18+ and npm.
- Python 3.10+.

## Run locally

1. Copy `.env.example` to `.env`. Set a unique `TAHA_ADMIN_EMAIL`, a password of at least 14 characters, and a long random `SESSION_SECRET`.
2. Start the API from the project directory:

   ```powershell
   python server.py
   ```

   The API listens on `http://127.0.0.1:8000` and initializes the SQLite database at `DATABASE_PATH`.

3. In a second terminal, install dependencies and start Vite:

   ```powershell
   npm install
   npm run dev
   ```

4. Open the Vite URL, create a customer account, and sign in with the configured owner email/password to open the store dashboard. Use **Products** to edit or hide listings and **Settings → Storefront content** to change the bilingual homepage announcement, hero, category/featured/gift sections, About page, newsletter copy, and hero image.

The first database initialization seeds sample categories, 12 demo products with purchasable sample variants, delivery zones, and a `DEMO10` coupon. These records are labeled as samples where applicable. Replace or deactivate them and verify every price, image, ingredient, allergen, preparation, and delivery detail before accepting real orders.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8000` | Local API port. |
| `DATABASE_PATH` | `./taha-store.sqlite3` | SQLite database file. |
| `TAHA_ADMIN_EMAIL` | unset | Email for the owner account created/promoted during API startup. |
| `TAHA_ADMIN_PASSWORD` | unset | Owner password; at least 14 characters. Keep it secret. |
| `SESSION_SECRET` | unset | Long random secret used to protect stored session-token hashes. Set it in production. |
| `PUBLIC_ORIGIN` | unset | Set to the public HTTPS origin to enable the secure session-cookie flag. |
| `ALLOWED_ORIGIN` | `http://localhost:5173` | Allowed browser origin for state-changing requests. Set to the production site origin when deployed. |

The frontend proxies `/api` requests to `http://127.0.0.1:8000` in development. Do not put credentials in frontend environment variables or source code.

## Production deployment

Build the frontend with `npm run build`, serve the generated `dist/` directory, and route `/api/*` to the Python API over a private network. Terminate TLS at a trusted reverse proxy, set `PUBLIC_ORIGIN` and `ALLOWED_ORIGIN` to the exact HTTPS site origin, use strong unique owner credentials and `SESSION_SECRET`, and persist and back up the SQLite database. The built-in server is intended for a small single-instance deployment; use a production-grade WSGI/ASGI server and managed database for higher traffic.

## Business integrations and launch checklist

- Checkout currently supports **cash on delivery only**. No bKash, Nagad, card, or other payment is collected or simulated. Integrate a merchant payment gateway on the server before advertising online payments.
- Newsletter signups are stored locally in SQLite; there is no email campaign provider integration.
- Custom-cake requests are stored for the owner to review and quote. Quotes are not emailed or automatically accepted; contact the customer and confirm availability and delivery details before treating a quote as an order.
- Product photos are HTTPS URLs. Replace sample listings and remote images with business-approved content before launch.
- Configure real delivery zones, fees, contact information, privacy/retention terms, business hours, and support processes. The current sample catalog and delivery information are not verified business claims.
- Add email verification and password recovery, operational monitoring, database migrations/backups, and stronger production rate limiting before opening registration to the public.
