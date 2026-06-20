import request from "supertest";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockFind = jest.fn();

await jest.unstable_mockModule("../models/Restaurant.js", () => ({
  default: {
    find: mockFind,
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn()
  }
}));

const { default: createApp } = await import("../app.js");

describe("GET /api/restaurants", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 and an array", async () => {
    mockFind.mockResolvedValue([
      {
        _id: "restaurant-1",
        nome: "Restaurante Teste"
      }
    ]);

    const response = await request(createApp()).get("/api/restaurants");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);
  });
});