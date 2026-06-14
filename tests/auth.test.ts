import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../src/app";

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.alert.deleteMany();
  await prisma.farm.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/v1/auth/register", () => {
  it("should register a new user and return tokens", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: "novo@fazenda.com.br",
        password: "Senha@Forte1",
        displayName: "João Silva",
      })
      .expect(201);

    expect(res.body.user).toHaveProperty("id");
    expect(res.body.user.email).toBe("novo@fazenda.com.br");
    expect(res.body.user.displayName).toBe("João Silva");
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it("should return 400 when fields are missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "incompleto@fazenda.com.br" })
      .expect(400);

    expect(res.body.error).toMatch(/required/i);
  });

  it("should return 409 for duplicate email", async () => {
    await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: "duplicado@fazenda.com.br",
        password: "Senha@Forte1",
        displayName: "Maria Santos",
      })
      .expect(201);

    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: "duplicado@fazenda.com.br",
        password: "OutraSenha1",
        displayName: "Maria Santos 2",
      })
      .expect(409);

    expect(res.body.error).toMatch(/already registered/i);
  });
});

describe("POST /api/v1/auth/login", () => {
  beforeAll(async () => {
    await request(app).post("/api/v1/auth/register").send({
      email: "login@fazenda.com.br",
      password: "Senha@Login1",
      displayName: "Carlos Pereira",
    });
  });

  it("should login with valid credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "login@fazenda.com.br",
        password: "Senha@Login1",
      })
      .expect(200);

    expect(res.body.user.email).toBe("login@fazenda.com.br");
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it("should return 401 for wrong password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "login@fazenda.com.br",
        password: "SenhaErrada",
      })
      .expect(401);

    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it("should return 401 for non-existent user", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "naoexiste@fazenda.com.br",
        password: "QualquerSenha1",
      })
      .expect(401);

    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it("should return 400 when fields are missing", async () => {
    await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "login@fazenda.com.br" })
      .expect(400);
  });
});

describe("POST /api/v1/auth/refresh", () => {
  let refreshToken: string;

  beforeAll(async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "login@fazenda.com.br",
      password: "Senha@Login1",
    });
    refreshToken = res.body.refreshToken;
  });

  it("should return new tokens with valid refresh token", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it("should return 400 when refreshToken is missing", async () => {
    await request(app).post("/api/v1/auth/refresh").send({}).expect(400);
  });

  it("should return 401 for invalid refresh token", async () => {
    await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: "token-invalido" })
      .expect(401);
  });
});
