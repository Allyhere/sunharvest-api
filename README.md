# Sunharvest API

Solar-powered irrigation management API.

## Quick Start

```bash
# Start PostgreSQL
docker compose up -d

# Install dependencies
npm install

# Push schema to DB
npx prisma db push

# Seed the database
npm run seed

# Start dev server
npm run dev
```

API runs on `http://localhost:3000`.

---

## Test Credentials

All seeded users share the same password: **`Agro@2024`**

| User | Email | Role/Region |
|------|-------|-------------|
| João Carlos Silva | `joao.silva@agrosolar.com.br` | MG / SP — café, laranja |
| Maria Aparecida Santos | `maria.santos@verdecampo.com.br` | BA / GO — cacau, soja, mandioca |
| Pedro Henrique Oliveira | `pedro.oliveira@fazendasol.com.br` | RS / PR — arroz, erva-mate |

### Login Example

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"joao.silva@agrosolar.com.br","password":"Agro@2024"}'
```

Response:

```json
{
  "user": { "id": "...", "email": "joao.silva@agrosolar.com.br", "displayName": "João Carlos Silva" },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

Use the `accessToken` in subsequent requests:

```
Authorization: Bearer <accessToken>
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run seed` | Seed DB with mock data (pt-BR) |
| `npm test` | Run test suite (40 tests) |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled output |

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | No | Register |
| POST | `/api/v1/auth/login` | No | Login |
| POST | `/api/v1/auth/refresh` | No | Refresh tokens |
| POST | `/api/v1/farms` | Yes | Create farm |
| GET | `/api/v1/farms` | Yes | List farms |
| GET | `/api/v1/farms/:id` | Yes | Get farm |
| PATCH | `/api/v1/farms/:id` | Yes | Update farm |
| DELETE | `/api/v1/farms/:id` | Yes | Delete farm |
| GET | `/api/v1/farms/:farmId/alerts` | Yes | List alerts |
| GET | `/api/v1/alerts/:id` | Yes | Get alert |
| PATCH | `/api/v1/alerts/:id/acknowledge` | Yes | Acknowledge alert |
| DELETE | `/api/v1/alerts/:id` | Yes | Delete alert |
