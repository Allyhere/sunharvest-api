import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../src/app";

const prisma = new PrismaClient();

let accessToken: string;
let farmId: string;

beforeAll(async () => {
  await prisma.alert.deleteMany();
  await prisma.farm.deleteMany();
  await prisma.user.deleteMany();

  const userRes = await request(app).post("/api/v1/auth/register").send({
    email: "alertas@fazenda.com.br",
    password: "Senha@Alerta1",
    displayName: "Roberto Almeida",
  });

  accessToken = userRes.body.accessToken;

  const farmRes = await request(app)
    .post("/api/v1/farms")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "Fazenda Alertas",
      latitude: -23.5505,
      longitude: -46.6333,
      altitudeMeters: 760,
      cropType: "milho",
      soilType: "latossolo",
      areaHectares: 30,
      irrigationEfficiency: 0.85,
      solarPanelCapacityW: 7000,
      pumpPowerW: 3500,
    });

  farmId = farmRes.body.id;

  // Seed alerts directly via Prisma
  await prisma.alert.createMany({
    data: [
      { farmId, severity: "high", message: "Pressão da bomba acima do limite" },
      {
        farmId,
        severity: "medium",
        message: "Eficiência do painel solar abaixo de 70%",
      },
      {
        farmId,
        severity: "low",
        message: "Sensor de umidade com leitura instável",
      },
      {
        farmId,
        severity: "high",
        message: "Vazamento detectado na tubulação principal",
        acknowledged: true,
      },
    ],
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/v1/farms/:farmId/alerts", () => {
  it("should list all alerts for a farm", async () => {
    const res = await request(app)
      .get(`/api/v1/farms/${farmId}/alerts`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(4);
  });

  it("should filter alerts by severity", async () => {
    const res = await request(app)
      .get(`/api/v1/farms/${farmId}/alerts?severity=high`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.length).toBe(2);
    res.body.forEach((alert: { severity: string }) => {
      expect(alert.severity).toBe("high");
    });
  });

  it("should filter alerts by acknowledged status", async () => {
    const res = await request(app)
      .get(`/api/v1/farms/${farmId}/alerts?acknowledged=false`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.length).toBe(3);
    res.body.forEach((alert: { acknowledged: boolean }) => {
      expect(alert.acknowledged).toBe(false);
    });
  });

  it("should support limit and offset", async () => {
    const res = await request(app)
      .get(`/api/v1/farms/${farmId}/alerts?limit=2&offset=0`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.length).toBe(2);
  });

  it("should return 404 for non-existent farm", async () => {
    await request(app)
      .get("/api/v1/farms/00000000-0000-0000-0000-000000000000/alerts")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404);
  });

  it("should return 401 without auth", async () => {
    await request(app).get(`/api/v1/farms/${farmId}/alerts`).expect(401);
  });
});

describe("GET /api/v1/alerts/:id", () => {
  let alertId: string;

  beforeAll(async () => {
    const alerts = await prisma.alert.findMany({ where: { farmId }, take: 1 });
    alertId = alerts[0].id;
  });

  it("should return a single alert by id", async () => {
    const res = await request(app)
      .get(`/api/v1/alerts/${alertId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.id).toBe(alertId);
    expect(res.body.farmId).toBe(farmId);
    expect(res.body.message).toBeDefined();
  });

  it("should return 404 for non-existent alert", async () => {
    await request(app)
      .get("/api/v1/alerts/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404);
  });

  it("should not allow access from another user", async () => {
    const otherUser = await request(app).post("/api/v1/auth/register").send({
      email: "outro-alerta@fazenda.com.br",
      password: "Senha@Out1",
      displayName: "Fernanda Lima",
    });

    await request(app)
      .get(`/api/v1/alerts/${alertId}`)
      .set("Authorization", `Bearer ${otherUser.body.accessToken}`)
      .expect(404);
  });
});

describe("PATCH /api/v1/alerts/:id/acknowledge", () => {
  let alertId: string;

  beforeAll(async () => {
    const alerts = await prisma.alert.findMany({
      where: { farmId, acknowledged: false },
      take: 1,
    });
    alertId = alerts[0].id;
  });

  it("should acknowledge an alert", async () => {
    const res = await request(app)
      .patch(`/api/v1/alerts/${alertId}/acknowledge`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ acknowledged: true })
      .expect(200);

    expect(res.body.acknowledged).toBe(true);
  });

  it("should un-acknowledge an alert", async () => {
    const res = await request(app)
      .patch(`/api/v1/alerts/${alertId}/acknowledge`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ acknowledged: false })
      .expect(200);

    expect(res.body.acknowledged).toBe(false);
  });

  it("should return 400 when acknowledged field is missing", async () => {
    await request(app)
      .patch(`/api/v1/alerts/${alertId}/acknowledge`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({})
      .expect(400);
  });

  it("should return 404 for non-existent alert", async () => {
    await request(app)
      .patch("/api/v1/alerts/00000000-0000-0000-0000-000000000000/acknowledge")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ acknowledged: true })
      .expect(404);
  });
});

describe("DELETE /api/v1/alerts/:id", () => {
  let alertId: string;

  beforeAll(async () => {
    const alert = await prisma.alert.create({
      data: {
        farmId,
        severity: "low",
        message: "Alerta para deletar em teste",
      },
    });
    alertId = alert.id;
  });

  it("should delete an alert", async () => {
    await request(app)
      .delete(`/api/v1/alerts/${alertId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(204);

    await request(app)
      .get(`/api/v1/alerts/${alertId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404);
  });

  it("should return 404 for already deleted alert", async () => {
    await request(app)
      .delete(`/api/v1/alerts/${alertId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404);
  });
});
