# Implementation Contract: Sunharvest API Client — React Native Service Layer

## Objective

Implement a typed API client layer in an existing React Native/TypeScript codebase. Use Zod for runtime response validation and organize services by resource in a `services/` folder. This layer handles all communication with the Sunharvest REST API.

---

## API Base URL

```
Production: https://api.sunharvest.com.br/api/v1
Development: http://localhost:3000/api/v1
```

---

## Target Structure

```
src/
└── services/
    ├── api.ts                  # Shared fetch client, token management, error handling
    ├── auth/
    │   ├── auth.schemas.ts     # Zod schemas for auth request/response
    │   ├── auth.service.ts     # register, login, refresh
    │   └── auth.types.ts       # Inferred types (re-exported for convenience)
    ├── farms/
    │   ├── farm.schemas.ts     # Zod schemas for farm request/response
    │   ├── farm.service.ts     # create, list, getById, update, delete
    │   └── farm.types.ts
    └── alerts/
        ├── alert.schemas.ts    # Zod schemas for alert request/response
        ├── alert.service.ts    # listByFarm, getById, acknowledge, delete
        └── alert.types.ts
```

---

## Shared API Client (`services/api.ts`)

A thin wrapper around `fetch` that:

- Injects `Authorization: Bearer <token>` from secure storage (e.g. `expo-secure-store`)
- Handles token refresh transparently on 401 responses
- Parses JSON and validates responses with Zod schemas
- Throws typed `ApiError` on failures

```typescript
import { ZodSchema } from "zod";
import * as SecureStore from "expo-secure-store";

const BASE_URL = __DEV__
  ? "http://localhost:3000/api/v1"
  : "https://api.sunharvest.com.br/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("accessToken");
}

async function setTokens(access: string, refresh: string): Promise<void> {
  await SecureStore.setItemAsync("accessToken", access);
  await SecureStore.setItemAsync("refreshToken", refresh);
}

async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync("accessToken");
  await SecureStore.deleteItemAsync("refreshToken");
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await SecureStore.getItemAsync("refreshToken");
  if (!refreshToken)
    throw new ApiError(401, "NO_REFRESH_TOKEN", "No refresh token available");

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    await clearTokens();
    throw new ApiError(401, "REFRESH_FAILED", "Session expired");
  }

  const data = await res.json();
  await setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    schema?: ZodSchema<T>;
    auth?: boolean;
  } = {},
): Promise<T> {
  const { method = "GET", body, schema, auth = true } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Transparent token refresh on 401
  if (res.status === 401 && auth) {
    try {
      const newToken = await refreshAccessToken();
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(
        401,
        "SESSION_EXPIRED",
        "Session expired, please login again",
      );
    }
  }

  if (res.status === 204) return undefined as T;

  const json = await res.json();

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json.code ?? "API_ERROR",
      json.error ?? "Request failed",
    );
  }

  if (schema) return schema.parse(json);
  return json as T;
}

export { setTokens, clearTokens, getToken };
```

---

## Auth Resource (`services/auth/`)

### `auth.schemas.ts`

```typescript
import { z } from "zod";

// --- Request Schemas (client-side validation before sending) ---

export const RegisterInputSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  displayName: z.string().min(1, "Nome é obrigatório").max(100),
});

export const LoginInputSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

// --- Response Schemas (runtime validation of API responses) ---

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
});

export const AuthResponseSchema = z.object({
  user: UserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const TokenRefreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
```

### `auth.types.ts`

```typescript
import type { z } from "zod";
import type {
  RegisterInputSchema,
  LoginInputSchema,
  UserSchema,
  AuthResponseSchema,
} from "./auth.schemas";

export type RegisterInput = z.infer<typeof RegisterInputSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
export type User = z.infer<typeof UserSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
```

### `auth.service.ts`

```typescript
import { apiRequest, setTokens, clearTokens } from "../api";
import {
  RegisterInputSchema,
  LoginInputSchema,
  AuthResponseSchema,
} from "./auth.schemas";
import type { RegisterInput, LoginInput, AuthResponse } from "./auth.types";

export const authService = {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const validated = RegisterInputSchema.parse(input);
    const response = await apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: validated,
      schema: AuthResponseSchema,
      auth: false,
    });
    await setTokens(response.accessToken, response.refreshToken);
    return response;
  },

  async login(input: LoginInput): Promise<AuthResponse> {
    const validated = LoginInputSchema.parse(input);
    const response = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: validated,
      schema: AuthResponseSchema,
      auth: false,
    });
    await setTokens(response.accessToken, response.refreshToken);
    return response;
  },

  async logout(): Promise<void> {
    await clearTokens();
  },
};
```

---

## Farms Resource (`services/farms/`)

### `farm.schemas.ts`

```typescript
import { z } from "zod";

// --- Request Schemas ---

export const CreateFarmInputSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitudeMeters: z.number().min(0),
  cropType: z.string().min(1, "Tipo de cultura é obrigatório"),
  soilType: z.string().min(1, "Tipo de solo é obrigatório"),
  areaHectares: z.number().positive("Área deve ser positiva"),
  irrigationEfficiency: z.number().min(0).max(1),
  solarPanelCapacityW: z.number().positive(),
  pumpPowerW: z.number().positive(),
  tiltDegrees: z.number().min(0).max(90).optional(),
  azimuthDegrees: z.number().min(0).max(360).optional(),
  performanceRatio: z.number().min(0).max(1).optional(),
  iotDeviceId: z.string().optional(),
});

export const UpdateFarmInputSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  cropType: z.string().min(1).optional(),
  soilType: z.string().min(1).optional(),
  areaHectares: z.number().positive().optional(),
  irrigationEfficiency: z.number().min(0).max(1).optional(),
  solarPanelCapacityW: z.number().positive().optional(),
  pumpPowerW: z.number().positive().optional(),
  altitudeMeters: z.number().min(0).optional(),
});

// --- Response Schemas ---

export const FarmSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  altitudeMeters: z.number(),
  cropType: z.string(),
  soilType: z.string(),
  areaHectares: z.number(),
  irrigationEfficiency: z.number(),
  solarPanelCapacityW: z.number(),
  pumpPowerW: z.number(),
  tiltDegrees: z.number().nullable(),
  azimuthDegrees: z.number().nullable(),
  performanceRatio: z.number().nullable(),
  iotDeviceId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const FarmListSchema = z.array(FarmSchema);
```

### `farm.types.ts`

```typescript
import type { z } from "zod";
import type {
  CreateFarmInputSchema,
  UpdateFarmInputSchema,
  FarmSchema,
} from "./farm.schemas";

export type CreateFarmInput = z.infer<typeof CreateFarmInputSchema>;
export type UpdateFarmInput = z.infer<typeof UpdateFarmInputSchema>;
export type Farm = z.infer<typeof FarmSchema>;
```

### `farm.service.ts`

```typescript
import { apiRequest } from "../api";
import {
  CreateFarmInputSchema,
  UpdateFarmInputSchema,
  FarmSchema,
  FarmListSchema,
} from "./farm.schemas";
import type { CreateFarmInput, UpdateFarmInput, Farm } from "./farm.types";

export const farmService = {
  async create(input: CreateFarmInput): Promise<Farm> {
    const validated = CreateFarmInputSchema.parse(input);
    return apiRequest<Farm>("/farms", {
      method: "POST",
      body: validated,
      schema: FarmSchema,
    });
  },

  async list(): Promise<Farm[]> {
    return apiRequest<Farm[]>("/farms", {
      schema: FarmListSchema,
    });
  },

  async getById(farmId: string): Promise<Farm> {
    return apiRequest<Farm>(`/farms/${farmId}`, {
      schema: FarmSchema,
    });
  },

  async update(farmId: string, input: UpdateFarmInput): Promise<Farm> {
    const validated = UpdateFarmInputSchema.parse(input);
    return apiRequest<Farm>(`/farms/${farmId}`, {
      method: "PATCH",
      body: validated,
      schema: FarmSchema,
    });
  },

  async delete(farmId: string): Promise<void> {
    await apiRequest<void>(`/farms/${farmId}`, {
      method: "DELETE",
    });
  },
};
```

---

## Alerts Resource (`services/alerts/`)

### `alert.schemas.ts`

```typescript
import { z } from "zod";

// --- Request Schemas ---

export const AlertQuerySchema = z.object({
  severity: z.enum(["low", "medium", "high"]).optional(),
  acknowledged: z.boolean().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const AcknowledgeInputSchema = z.object({
  acknowledged: z.boolean(),
});

// --- Response Schemas ---

export const AlertSchema = z.object({
  id: z.string().uuid(),
  farmId: z.string().uuid(),
  severity: z.enum(["low", "medium", "high"]),
  message: z.string(),
  acknowledged: z.boolean(),
  createdAt: z.string().datetime(),
});

export const AlertListSchema = z.array(AlertSchema);
```

### `alert.types.ts`

```typescript
import type { z } from "zod";
import type {
  AlertQuerySchema,
  AcknowledgeInputSchema,
  AlertSchema,
} from "./alert.schemas";

export type AlertQuery = z.infer<typeof AlertQuerySchema>;
export type AcknowledgeInput = z.infer<typeof AcknowledgeInputSchema>;
export type Alert = z.infer<typeof AlertSchema>;
```

### `alert.service.ts`

```typescript
import { apiRequest } from "../api";
import {
  AlertListSchema,
  AlertSchema,
  AcknowledgeInputSchema,
} from "./alert.schemas";
import type { AlertQuery, AcknowledgeInput, Alert } from "./alert.types";

export const alertService = {
  async listByFarm(farmId: string, query?: AlertQuery): Promise<Alert[]> {
    const params = new URLSearchParams();
    if (query?.severity) params.set("severity", query.severity);
    if (query?.acknowledged !== undefined)
      params.set("acknowledged", String(query.acknowledged));
    if (query?.limit) params.set("limit", String(query.limit));
    if (query?.offset) params.set("offset", String(query.offset));

    const qs = params.toString();
    const path = `/farms/${farmId}/alerts${qs ? `?${qs}` : ""}`;

    return apiRequest<Alert[]>(path, {
      schema: AlertListSchema,
    });
  },

  async getById(alertId: string): Promise<Alert> {
    return apiRequest<Alert>(`/alerts/${alertId}`, {
      schema: AlertSchema,
    });
  },

  async acknowledge(alertId: string, input: AcknowledgeInput): Promise<Alert> {
    const validated = AcknowledgeInputSchema.parse(input);
    return apiRequest<Alert>(`/alerts/${alertId}/acknowledge`, {
      method: "PATCH",
      body: validated,
      schema: AlertSchema,
    });
  },

  async delete(alertId: string): Promise<void> {
    await apiRequest<void>(`/alerts/${alertId}`, {
      method: "DELETE",
    });
  },
};
```

---

## Usage Examples (in React Native components/hooks)

```typescript
// In a screen or custom hook
import { farmService } from "@/services/farms/farm.service";
import { alertService } from "@/services/alerts/alert.service";
import { authService } from "@/services/auth/auth.service";

// Login
const { user } = await authService.login({ email, password });

// List farms
const farms = await farmService.list();

// Create farm
const newFarm = await farmService.create({
  name: "Fazenda Boa Vista",
  latitude: -23.55,
  longitude: -46.63,
  altitudeMeters: 760,
  cropType: "café",
  soilType: "latossolo",
  areaHectares: 50,
  irrigationEfficiency: 0.9,
  solarPanelCapacityW: 10000,
  pumpPowerW: 5000,
});

// Get alerts with filters
const alerts = await alertService.listByFarm(farm.id, {
  severity: "high",
  acknowledged: false,
});

// Acknowledge alert
await alertService.acknowledge(alertId, { acknowledged: true });
```

---

## Implementation Checklist

1. [ ] Ensure `zod` and `expo-secure-store` are installed in the RN project
2. [ ] Create `src/services/api.ts` — shared fetch client with token management
3. [ ] Create `src/services/auth/auth.schemas.ts`
4. [ ] Create `src/services/auth/auth.types.ts`
5. [ ] Create `src/services/auth/auth.service.ts`
6. [ ] Create `src/services/farms/farm.schemas.ts`
7. [ ] Create `src/services/farms/farm.types.ts`
8. [ ] Create `src/services/farms/farm.service.ts`
9. [ ] Create `src/services/alerts/alert.schemas.ts`
10. [ ] Create `src/services/alerts/alert.types.ts`
11. [ ] Create `src/services/alerts/alert.service.ts`
12. [ ] Wire services into existing screens/hooks
13. [ ] Test against running API (`npm run dev` in sunharvest-api)

---

## Constraints

- **Zod validates both directions**: input schemas validate user data before sending; response schemas validate API responses at runtime.
- **No `axios`** — use native `fetch` (available in React Native).
- **Token storage** — use `expo-secure-store` (or `react-native-keychain` if not using Expo).
- **Transparent refresh** — the `apiRequest` function retries once on 401 after refreshing the token. If refresh fails, throw so the app can redirect to login.
- **Error messages in pt-BR** — Zod validation messages should be in Portuguese for user-facing errors.
- **No UI logic in services** — services return data or throw `ApiError`. Components/hooks handle UI state (loading, error display).
- **Re-export types from each resource folder** for clean imports: `import type { Farm } from '@/services/farms/farm.types'`

---

## API Endpoints Reference

| Method | Path                      | Auth | Description                                                     |
| ------ | ------------------------- | ---- | --------------------------------------------------------------- |
| POST   | `/auth/register`          | No   | Register new user                                               |
| POST   | `/auth/login`             | No   | Login                                                           |
| POST   | `/auth/refresh`           | No   | Refresh tokens                                                  |
| POST   | `/farms`                  | Yes  | Create farm                                                     |
| GET    | `/farms`                  | Yes  | List user's farms                                               |
| GET    | `/farms/:id`              | Yes  | Get farm by ID                                                  |
| PATCH  | `/farms/:id`              | Yes  | Update farm                                                     |
| DELETE | `/farms/:id`              | Yes  | Delete farm                                                     |
| GET    | `/farms/:farmId/alerts`   | Yes  | List farm alerts (query: severity, acknowledged, limit, offset) |
| GET    | `/alerts/:id`             | Yes  | Get alert by ID                                                 |
| PATCH  | `/alerts/:id/acknowledge` | Yes  | Acknowledge/unacknowledge alert                                 |
| DELETE | `/alerts/:id`             | Yes  | Delete alert                                                    |
