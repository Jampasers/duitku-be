# Backend NestJS — Duitku QRIS Dynamic Only

## Run
```bash
cd backend-nestjs
cp .env.example .env
npm install
npm run start:dev
```

## Endpoints
- `POST /payments/qris` create QRIS invoice (returns `qrString`)
- `GET /payments/status/:merchantOrderId` check status
- `POST /payments/duitku/callback` handle callback (x-www-form-urlencoded)

> IMPORTANT: set `DUITKU_QRIS_METHOD` to the QRIS method enabled in your Duitku merchant (commonly `SP`).
