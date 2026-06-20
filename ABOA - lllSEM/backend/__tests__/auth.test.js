import request from "supertest";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

const mockFindOne = jest.fn();
const mockCompare = jest.fn();

await jest.unstable_mockModule("../models/Usuario.js", () => ({
  default: {
    findOne: mockFindOne
  }
}));

await jest.unstable_mockModule("bcryptjs", () => ({
  default: {
    compare: mockCompare,
    hash: jest.fn()
  }
}));

const { default: createApp } = await import("../app.js");

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 and a JWT token", async () => {
    mockFindOne.mockResolvedValue({
      _id: "user-1",
      email: "teste@aboa.com",
      senhaHash: "hashed-password",
      nome: "Teste",
      tipo: "user"
    });
    mockCompare.mockResolvedValue(true);

    const response = await request(createApp())
      .post("/api/auth/login")
      .send({ email: "teste@aboa.com", senha: "123456" });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();
    expect(response.body.token.split(".")).toHaveLength(3);
  });
});