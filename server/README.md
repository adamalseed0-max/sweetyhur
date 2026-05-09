# Backend Server (OTP + Shared Inventory)

## Setup
1. Copy `.env.example` from project root to `.env` in project root.
2. Fill these values:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_VERIFY_SERVICE_SID`

## Run
```bash
cd server
npm install
npm start
```

Server runs on `http://localhost:8787` by default.

## API
- `POST /api/admin-otp/start` with `{ "phone": "+972507209096" }`
- `POST /api/admin-otp/check` with `{ "phone": "+972507209096", "code": "1234" }`
- `GET /api/inventory` returns shared `{ customSweets, stockState }`
- `POST /api/inventory/sweets` with `{ id, name, price, desc, image }`
- `POST /api/inventory/stock` with `{ "stockState": { "item-id": true } }`

## Notes
- Shared inventory is persisted in `server/inventory-db.json`.
- Keep this server running on your hosted machine so all visitors see the same inventory updates.

## Production Deploy (Render example)
1. Push project to GitHub.
2. Create a new **Web Service** on Render.
3. Set:
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add env vars in Render:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_VERIFY_SERVICE_SID`
5. After deploy, copy your backend URL, for example:
   - `https://swetty-backend.onrender.com`
6. In frontend (`index.html`), set:
   - `window.SWETTY_API_BASE = "https://swetty-backend.onrender.com";`

## Real-time behavior
- Frontend loads shared inventory at startup.
- It auto-syncs every ~20 seconds and whenever the tab becomes active.
