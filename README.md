# Student Benefit Card (SBC)

A full WhatsApp-first student membership platform:

- **WhatsApp automation** — `hi` → image header + body + **Choose Service** flow CTA. Encrypted WhatsApp Flow with an 8:1 welcome banner, dynamic registration, plan selection, native WhatsApp Pay, auto-generated membership card, partner browsing and offer redemption.
- **User website** — register (with WhatsApp OTP + password), login, view card, usage & prizes.
- **Admin panel** — upload flow images/headers, edit plans & prices, add partners (auto-generates their login), manage students & prizes.
- **Partner panel** — dashboard with redeem QR, customers, usage log.

Design language: **Moonli** — white canvas, black type, one lime `#b8ff65` atmospheric accent, DM Sans, big rounded corners.

---

## Project layout

```
SBC/
├─ backend/     Node + Express + MongoDB + Cloudinary + WhatsApp Cloud API
└─ frontend/    Vite + React (user site + admin panel + partner panel)
```

---

## 1. Prerequisites

- Node.js 18+ (tested on Node 24)
- A MongoDB Atlas cluster (already wired in `backend/.env`)
- A Cloudinary account (already wired)
- A Meta WhatsApp Business app with Cloud API access (already wired)
- [ngrok](https://ngrok.com/download) for exposing the local webhook over HTTPS

---

## 2. Backend setup

```powershell
cd backend
npm install
npm run dev        # or: npm start
```

On first boot it:
- connects to MongoDB (`sbc` database)
- creates the admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD`, default `admin@sbc.com` / `Admin@123`)
- seeds Silver / Gold / Platinum plans
- creates the 15 flow-image slots

Backend runs on **http://localhost:5000**.

---

## 3. Frontend setup

```powershell
cd frontend
npm install
npm run dev        # http://localhost:5173
```

In dev, `/api/*` is proxied to the backend automatically (see `vite.config.js`).

| Area | URL |
|------|-----|
| User website | http://localhost:5173/ |
| Student register / login | `/register`, `/login`, `/dashboard` |
| Scanner (Use Card) | `/scan` |
| Admin panel | `/admin/login` → `/admin` |
| Partner panel | `/partner/login` → `/partner` |

---

## 4. Expose the webhook with ngrok

WhatsApp needs a public **HTTPS** URL for the webhook and the encrypted flow endpoint.

```powershell
ngrok http 5000
```

Copy the `https://xxxx.ngrok-free.app` URL and set it in `backend/.env`:

```
BACKEND_URL=https://xxxx.ngrok-free.app
```

Then print the exact values to paste into Meta:

```powershell
cd backend
npm run ngrok:info
```

It prints:

- **Callback URL:** `https://xxxx.ngrok-free.app/webhook`
- **Verify Token:** `sbc_verify_token_2026` (from `WEBHOOK_VERIFY_TOKEN`)
- **Flow Endpoint URI:** `https://xxxx.ngrok-free.app/api/flow-endpoint`

In **Meta → WhatsApp → Configuration**:
1. Edit the callback URL → paste the Callback URL + Verify Token, click Verify & Save.
2. Subscribe to the **messages** webhook field.

---

## 5. Create the WhatsApp Flow (one time)

```powershell
cd backend
npm run flow:keys          # generates RSA keys, writes FLOW_PRIVATE_KEY / FLOW_PUBLIC_KEY to .env
npm run flow:upload-key    # registers the public key with Meta
npm run flow:create        # creates + publishes the flow, writes WHATSAPP_FLOW_ID to .env
```

Restart the backend after `flow:create` so it picks up `WHATSAPP_FLOW_ID`.

If you later change the flow screens (`services/flowJson.js`), run:

```powershell
npm run flow:sync
```

> Until `WHATSAPP_FLOW_ID` is set, the bot falls back to plain reply buttons so `hi` still works.

---

## 6. Native payment (WhatsApp Pay)

Set up a payment configuration in **WhatsApp Manager → Payments** (Razorpay), then put its
configuration name in `backend/.env`:

```
WHATSAPP_PAYMENT_CONFIG=your_config_name
```

When a student confirms a plan in the flow, the backend sends an `order_details`
("Review and pay") message. On payment success (delivered via the `payment` webhook status),
the student is marked registered, a card is generated, and a success message with the card as the
header + **Choose Service** CTA is sent back.

If `WHATSAPP_PAYMENT_CONFIG` is empty, the bot falls back to a web payment link.

---

## 7. The end-to-end WhatsApp journey

1. **User sends `hi`** → image-header message + **Choose Service** flow CTA.
2. **Choose Service flow** opens with the 8:1 welcome banner.
   - New user sees: **Register**, **Our Partners**, **Contact**.
   - Registered user sees: **My Card**, **Use Card**, **Our Partners**, **Contact**.
3. **Register** → flow asks Name, WhatsApp number (locked), Phone, School/Institute, DOB → then
   plan (Silver/Gold/Platinum) → Confirm → native **Review and pay**.
4. **Payment success** → card generated → success message + Choose Service CTA.
5. **Our Partners** → partner list → pick one → shows details + "Redeemed X of 4".
6. **Use Card** → message with **Open Scanner** CTA → web scanner → scan partner QR →
   "Offer redeemed" message (or "limit reached" after 4).
7. **Contact** → image header + body + call / contact CTA.

---

## 8. Admin workflow

1. Log in at `/admin/login` (`admin@sbc.com` / `Admin@123`).
2. **Flow Images** — upload the message headers and flow banners (banners auto-crop to 8:1;
   changes are instant, no republish needed).
3. **Plans & Prices** — edit Silver/Gold/Platinum titles, descriptions, prices.
4. **Partners** — add a partner (name, description, location, 1:1 logo). A username + password are
   generated **once** — copy them for the partner. Each partner gets a redeem QR in their panel.
5. **Students** — view registered students; add/update prizes after payment.

## 9. Partner workflow

1. Log in at `/partner/login` with the generated credentials.
2. **Dashboard** — display the redeem QR at the counter; see scan/redemption/customer stats.
3. **Customers** — who redeemed and how many times.
4. **Usage** — full redemption log.

---

## Web ⇄ WhatsApp identity

The WhatsApp number is the single identity. Registering on the web (after WhatsApp OTP) and
registering on WhatsApp resolve to the same student record, so a user can log in on either side.
Plan selection + payment happen on WhatsApp (native pay) to activate the card.

---

## Environment variables (`backend/.env`)

All credentials (Meta, MongoDB, Cloudinary) are pre-filled. Key ones you set during setup:

| Variable | Purpose |
|----------|---------|
| `BACKEND_URL` | Your ngrok HTTPS URL |
| `WEBHOOK_VERIFY_TOKEN` | `sbc_verify_token_2026` |
| `WHATSAPP_FLOW_ID` | Set by `npm run flow:create` |
| `FLOW_PRIVATE_KEY` / `FLOW_PUBLIC_KEY` | Set by `npm run flow:keys` |
| `WHATSAPP_PAYMENT_CONFIG` | Meta payment configuration name |
| `CARD_SCAN_LIMIT` | Redemptions per partner (default 4) |

> **Security note:** `backend/.env` contains live secrets (Meta token, DB, Cloudinary). Do not
> commit it and rotate the tokens before going to production.
