import request from "supertest";
import app from "../src/app";

export interface TestUser {
  id: string;
  email: string;
  displayName: string;
  accessToken: string;
  refreshToken: string;
}

export async function createTestUser(overrides?: {
  email?: string;
  password?: string;
  displayName?: string;
}): Promise<TestUser> {
  const payload = {
    email: overrides?.email || `test-${Date.now()}@sunharvest.io`,
    password: overrides?.password || "TestPass123!",
    displayName: overrides?.displayName || "Test User",
  };

  const res = await request(app)
    .post("/api/v1/auth/register")
    .send(payload)
    .expect(201);

  return {
    id: res.body.user.id,
    email: res.body.user.email,
    displayName: res.body.user.displayName,
    accessToken: res.body.accessToken,
    refreshToken: res.body.refreshToken,
  };
}

export const mockFarm = {
  name: "Fazenda Teste",
  latitude: -23.5505,
  longitude: -46.6333,
  altitudeMeters: 760,
  cropType: "soja",
  soilType: "latossolo",
  areaHectares: 25.0,
  irrigationEfficiency: 0.88,
  solarPanelCapacityW: 6000,
  pumpPowerW: 3000,
  tiltDegrees: 20,
  azimuthDegrees: 0,
  performanceRatio: 0.8,
  iotDeviceId: "IOT-TST-001",
};

export { app };
