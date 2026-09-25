# Buildora

Online stores and a WhatsApp inbox for small and home businesses.

**V1 flow:** create business → pick category → create store → add products → connect WhatsApp →
receive customer messages in the admin inbox → reply by hand.

There is no AI, no auto-reply, no payments and no automation in V1.

```
buildora/
├── buildora-backend/    Node + Express + MongoDB API, Meta WhatsApp Cloud API integration
└── buildora-frontend/   React + Vite + Tailwind admin dashboard and public storefront
```

---

## 1. Run locally

Requirements: Node 20+ and MongoDB (local, or a free MongoDB Atlas cluster).

### Backend

```bash
cd buildora-backend
cp .env.example .env        # then fill in MONGO_URI and the META_* values
npm install
npm run dev                 # http://localhost:5000  (nodemon)
# npm start                 # production
```

Check it: `curl http://localhost:5000/api/health` → `{"success":true,"status":"ok","db":"connected"}`

### Frontend

```bash
cd buildora-frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5174
```

In development the frontend calls `/api/...`, and Vite forwards those requests to `VITE_DEV_API_PROXY`
(default `http://localhost:5000`), so you don't need any CORS setup.

> **Port note:** your existing Buildora WhatsApp test project uses ports 5000 and 5173. To run both
> at once, set `PORT=5050` in the backend `.env` and `VITE_DEV_API_PROXY=http://localhost:5050` in the
> frontend `.env`. The new frontend already uses 5174.

---

## 2. MongoDB setup

**Local:** install MongoDB Community, then use `MONGO_URI=mongodb://127.0.0.1:27017/buildora`.

**MongoDB Atlas (production):**
1. Create a free M0 cluster at https://cloud.mongodb.com.
2. Go to *Database Access* and add a database user with a password.
3. Go to *Network Access* and allow your server's IP. `0.0.0.0/0` also works for Render/Railway,
   because they have no fixed outbound IP on free plans.
4. Click *Connect → Drivers* and copy the URI, then add the database name `buildora`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/buildora?retryWrites=true&w=majority`
5. Put that URI in `MONGO_URI`. Collections and indexes are created automatically on first run.

---

## 3. Meta credentials: where they go

Buildora uses **one Meta app for all businesses**. Business owners never see Meta IDs, tokens or the
webhook URL: they click **Connect WhatsApp**, finish Meta's Embedded Signup window, and are connected.
Each business's own token is stored encrypted in MongoDB and never sent to the browser.

The platform values go **only** in `buildora-backend/.env` (or the backend host's environment). Never
in the frontend: anything prefixed `VITE_` is shipped to the browser.

| Variable | Where to find it |
|---|---|
| `META_APP_ID` | Meta Developer → your app → App settings → Basic → App ID |
| `META_APP_SECRET` | App settings → Basic → App secret. Used for the code exchange and webhook signature checks. |
| `META_ES_CONFIG_ID` | Your app → Facebook Login for Business → Configurations → the WhatsApp Embedded Signup configuration's ID |
| `META_VERIFY_TOKEN` | Any random string **you make up**. You enter the same string in Meta's webhook config. |
| `META_API_VERSION` | e.g. `v23.0` |
| `TOKEN_ENCRYPTION_KEY` | `openssl rand -hex 32`. Encrypts business tokens at rest. Back it up: losing it means every business must reconnect. |
| `PUBLIC_BACKEND_URL` | Public URL of this backend (used for deployment only). |
| `META_ACCESS_TOKEN`, `META_PHONE_NUMBER_ID`, `META_WABA_ID` | *Optional, legacy/dev.* Only used for businesses connected before Embedded Signup. |

What happens on **Connect WhatsApp** (`POST /api/whatsapp/connect`): the browser sends Meta's 30-second
code → the backend exchanges it for a business token → checks with `debug_token` which WhatsApp
Business Account the token was granted for (browser-supplied IDs are never trusted) → subscribes the
Buildora app to that account's webhooks → registers the number for Cloud API messaging → saves the
connection. Run `npm run test:whatsapp` to exercise this whole flow against a local mock of the Graph API.

## 4. Configure the Meta webhook

Meta must be able to reach the backend over public HTTPS, so `localhost` won't work. Either deploy
the backend (section 6) or expose your local one with a tunnel, e.g. `ngrok http 5000`.

1. Meta Developer → your app → **WhatsApp → Configuration → Webhook → Edit**
2. **Callback URL:** `https://YOUR-NEW-BUILDORA-BACKEND.com/api/webhooks/whatsapp`
3. **Verify token:** the exact value of `META_VERIFY_TOKEN`
4. Click **Verify and save**. The backend log prints `[webhook] verified by Meta`.
5. Under **Webhook fields**, subscribe to **`messages`**. This single field carries both incoming
   messages and delivery/read statuses.
6. Business owners then connect from **Dashboard → WhatsApp → Connect WhatsApp** (Embedded Signup).
   Buildora subscribes the app to each connected account's webhooks automatically.

### ⚠️ Your existing test project

The webhook callback URL is set **per Meta app**. When you change it in step 2, your existing
Buildora WhatsApp test backend stops receiving events. Pick one of these:

- **Switch when you're ready (simplest):** keep the old URL until the new backend is deployed, then
  switch. You can switch back at any time. Nothing in the old project changes.
- **Keep both running:** Meta supports *webhook overrides*, which send one WABA's or one phone
  number's events to a different callback URL while the app-level URL stays the same. See Meta's
  docs under "Webhooks → Override callback URL", e.g.
  ```bash
  curl -X POST "https://graph.facebook.com/v23.0/$META_WABA_ID/subscribed_apps" \
    -H "Authorization: Bearer $META_ACCESS_TOKEN" -H "Content-Type: application/json" \
    -d '{"override_callback_uri":"https://YOUR-NEW-BUILDORA-BACKEND.com/api/webhooks/whatsapp","verify_token":"YOUR_META_VERIFY_TOKEN"}'
  ```
  This only makes sense if the old and new projects use **different** numbers or WABAs. One number
  can only deliver its webhooks to one place.

Buildora never changes your Meta configuration by itself.

### Test without WhatsApp

```bash
cd buildora-backend
npm run simulate -- <phoneNumberId-of-a-connected-business> "Hi, I am interested in Blue Saree." 919000000001 Priya
```

This posts a Meta-format webhook (signed with `META_APP_SECRET` if set) to your local backend.
The message shows up in the inbox within a few seconds.

**Note on replies:** WhatsApp allows free-form replies only within **24 hours** of the customer's
last message. After that, Meta rejects the message (error 131047). Buildora shows a warning in the
composer and a clear error if a send fails. Template messages are out of scope for V1. If your
number is still a Meta *test number*, you can only message recipients added to its allowed list.

---

## 5. API

All responses use the format `{ "success": true, "data": ... }` or `{ "success": false, "error": "message" }`.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | DB status |
| GET | `/api/categories` | The 10 categories (data-driven, `src/config/categories.js`) |
| POST | `/api/businesses` | `{ name, category, phone, description?, location?, logo? }` |
| GET | `/api/businesses` | Demo business picker (V1 has no auth) |
| GET | `/api/businesses/:id` | |
| PUT | `/api/businesses/:id` | Details, `slug`, `store: { published, tagline, themeColor }` |
| GET | `/api/businesses/:id/stats` | Products, customers, unread messages, WhatsApp status |
| GET | `/api/businesses/slug/:slug` | Public store and available products |
| POST | `/api/products` | `{ businessId, name, price, description?, image?, category?, available? }` |
| GET | `/api/products/business/:businessId` | |
| GET/PUT/DELETE | `/api/products/:id` | |
| GET | `/api/customers/business/:businessId` | Sorted by last message |
| PUT | `/api/customers/:id/read` | `{ businessId }` required. Reset unread count |
| GET | `/api/messages/business/:businessId` | `?limit=` |
| GET | `/api/messages/customer/:customerId` | `?businessId=` required. Chronological, `?before=&limit=` |
| GET | `/api/whatsapp/config` | Public Embedded Signup config (`available`, `appId`, `configId`). No secrets. |
| GET | `/api/whatsapp/status/:businessId` | `{ connected, displayPhoneNumber, verifiedName, needsReconnect }` only |
| POST | `/api/whatsapp/connect` | `{ businessId, code, event?, wabaId?, phoneNumberId? }` from Embedded Signup |
| POST | `/api/whatsapp/disconnect` | `{ businessId }` |
| POST | `/api/whatsapp/send` | `{ businessId, customerPhone, message }` |
| GET | `/api/webhooks/whatsapp` | Meta verification (`hub.challenge`) |
| POST | `/api/webhooks/whatsapp` | Incoming messages and statuses. Never auto-replies. |

Run the end-to-end API test against a running backend. It creates its own data and cleans up afterwards:

```bash
cd buildora-backend
API_URL=http://localhost:5000 npm run test:api
```

---

## 6. Deploy

**Backend → Render** (Railway works the same way)
- New Web Service → root directory `buildora-backend`
- Build: `npm install` · Start: `npm start` · Health check path: `/api/health`
- Environment: `MONGO_URI`, all `META_*`, `PUBLIC_BACKEND_URL=https://<service>.onrender.com`,
  `CORS_ORIGINS=https://<your-frontend>.vercel.app`, `NODE_ENV=production`
- `PORT` is provided by the platform automatically.

**Frontend → Vercel**
- Import the repo → root directory `buildora-frontend` → framework Vite
- Environment: `VITE_API_URL=https://<service>.onrender.com`
- `vercel.json` already rewrites all routes to `index.html`, so `/store/:slug` links work.

Then set the Meta callback URL to `https://<service>.onrender.com/api/webhooks/whatsapp` (section 4).

---

## Architecture notes

- **Multi-business.** Every Product, Customer and Message has a `businessId`. Customers are unique
  per `(businessId, phone)`. Incoming webhooks are routed by `metadata.phone_number_id` →
  `Business.whatsapp.phoneNumberId`, which is unique across businesses. This gives
  Business A → Inbox A, Business B → Inbox B. Events for an unknown number are logged and ignored.
- **Credentials.** Each business has its own Embedded Signup token, AES-256-GCM encrypted in
  `Business.whatsapp.accessTokenEncrypted` (`select: false`). `services/whatsapp.service.js` is the only
  code that decrypts it. API responses only ever include `connected`, the display number and name.
- **Webhook reliability.** Messages are stored idempotently (unique `whatsappMessageId`), so Meta
  retries don't create duplicates. Status updates never go backwards (a late "delivered" won't
  overwrite "read"). If MongoDB is down, the webhook returns 503 so Meta retries later.
- **Auth.** V1 uses a demo business picker, and the selected business is remembered in the browser.
  `middleware/loadBusiness.js` is where an ownership check goes once login exists. Until then,
  **anyone who can reach the API can read and change any business**, so don't share a production
  URL publicly before adding auth.
- **Images.** Logos and product photos are resized in the browser and stored as small data URLs in
  MongoDB, so V1 needs no file storage service. Move them to S3/Cloudinary when needed.
- **Inbox updates** by polling (every 4–5 s). WebSockets can replace this later.
- **Categories** live in `buildora-backend/src/config/categories.js`. To add a category, add an entry
  there. Its `icon` is a lucide-react icon name, mapped in `buildora-frontend/src/data/categoryIcons.js`
  (unknown names fall back to a store icon).
