import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../src/app";

const prisma = new PrismaClient();

let accessToken: string;
let userId: string;

const mockFarm = {
  name: "Fazenda Sol Nascente",
  latitude: -15.7801,
  longitude: -47.9292,
  altitudeMeters: 1172,
  cropType: "café",
  soilType: "latossolo-vermelho",
  areaHectares: 45.0,
  irrigationEfficiency: 0.9,
  solarPanelCapacityW: 8000,
  pumpPowerW: 4500,
  tiltDegrees: 18,
  azimuthDegrees: 0,
  performanceRatio: 0.82,
  iotDeviceId: "IOT-BSB-001",
};

beforeAll(async () => {
  await prisma.alert.deleteMany();
  await prisma.farm.deleteMany();
  await prisma.user.deleteMany();

  const res = await request(app).post("/api/v1/auth/register").send({
    email: "fazendeiro@teste.com.br",
    password: "Senha@Farm1",
    displayName: "Pedro Oliveira",
  });

  accessToken = res.body.accessToken;
  userId = res.body.user.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/v1/farms", () => {
  it("should create a farm with all fields", async () => {
    const res = await request(app)
      .post("/api/v1/farms")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(mockFarm)
      .expect(201);

    expect(res.body.name).toBe("Fazenda Sol Nascente");
    expect(res.body.userId).toBe(userId);
    expect(res.body.latitude).toBe(-15.7801);
    expect(res.body.longitude).toBe(-47.9292);
    expect(res.body.cropType).toBe("café");
    expect(res.body.iotDeviceId).toBe("IOT-BSB-001");
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  });

  it("should create a farm with only required fields", async () => {
    const res = await request(app)
      .post("/api/v1/farms")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Fazenda Minimalista",
        latitude: -22.9068,
        longitude: -43.1729,
        altitudeMeters: 11,
        cropType: "cana-de-açúcar",
        soilType: "argissolo",
        areaHectares: 100,
        irrigationEfficiency: 0.75,
        solarPanelCapacityW: 10000,
        pumpPowerW: 5000,
      })
      .expect(201);

    expect(res.body.tiltDegrees).toBeNull();
    expect(res.body.azimuthDegrees).toBeNull();
    expect(res.body.performanceRatio).toBeNull();
    expect(res.body.iotDeviceId).toBeNull();
  });

  it("should return 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/v1/farms")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Incompleta" })
      .expect(400);

    expect(res.body.error).toMatch(/missing required/i);
  });

  it("should return 401 without auth token", async () => {
    await request(app).post("/api/v1/farms").send(mockFarm).expect(401);
  });
});

describe("GET /api/v1/farms", () => {
  it("should list all farms for the authenticated user", async () => {
    const res = await request(app)
      .get("/api/v1/farms")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body[0].userId).toBe(userId);
  });

  it("should not list farms from other users", async () => {
    const otherUser = await request(app).post("/api/v1/auth/register").send({
      email: "outro@fazenda.com.br",
      password: "Senha@Outra1",
      displayName: "Ana Costa",
    });

    const res = await request(app)
      .get("/api/v1/farms")
      .set("Authorization", `Bearer ${otherUser.body.accessToken}`)
      .expect(200);

    expect(res.body).toHaveLength(0);
  });

  it("should return 401 without auth token", async () => {
    await request(app).get("/api/v1/farms").expect(401);
  });
});

describe("GET /api/v1/farms/:id", () => {
  let farmId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/v1/farms")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        ...mockFarm,
        name: "Fazenda Para Busca",
        iotDeviceId: "IOT-GET-001",
      });
    farmId = res.body.id;
  });

  it("should return a farm by id", async () => {
    const res = await request(app)
      .get(`/api/v1/farms/${farmId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.id).toBe(farmId);
    expect(res.body.name).toBe("Fazenda Para Busca");
  });

  it("should return 404 for non-existent farm", async () => {
    await request(app)
      .get("/api/v1/farms/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404);
  });

  it("should return 404 when accessing another user farm", async () => {
    const otherUser = await request(app).post("/api/v1/auth/register").send({
      email: "intruso@fazenda.com.br",
      password: "Senha@Intr1",
      displayName: "Intruso Silva",
    });

    await request(app)
      .get(`/api/v1/farms/${farmId}`)
      .set("Authorization", `Bearer ${otherUser.body.accessToken}`)
      .expect(404);
  });
});

describe("PATCH /api/v1/farms/:id", () => {
  let farmId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/v1/farms")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...mockFarm, name: "Fazenda Para Atualizar" });
    farmId = res.body.id;
  });

  it("should update allowed fields", async () => {
    const res = await request(app)
      .patch(`/api/v1/farms/${farmId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Fazenda Atualizada", areaHectares: 60 })
      .expect(200);

    expect(res.body.name).toBe("Fazenda Atualizada");
    expect(res.body.areaHectares).toBe(60);
    expect(res.body.cropType).toBe("café");
  });

  it("should ignore disallowed fields", async () => {
    const res = await request(app)
      .patch(`/api/v1/farms/${farmId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ userId: "hacker-id", latitude: 99 })
      .expect(200);

    expect(res.body.userId).toBe(userId);
    expect(res.body.latitude).toBe(-15.7801);
  });

  it("should return 404 for non-existent farm", async () => {
    await request(app)
      .patch("/api/v1/farms/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Nope" })
      .expect(404);
  });
});

describe("DELETE /api/v1/farms/:id", () => {
  let farmId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/v1/farms")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...mockFarm, name: "Fazenda Para Deletar" });
    farmId = res.body.id;
  });

  it("should delete a farm", async () => {
    await request(app)
      .delete(`/api/v1/farms/${farmId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(204);

    await request(app)
      .get(`/api/v1/farms/${farmId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404);
  });

  it("should return 404 for already deleted farm", async () => {
    await request(app)
      .delete(`/api/v1/farms/${farmId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404);
  });
});
