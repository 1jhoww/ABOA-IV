import request from "supertest";
import createApp from "../app.js";

describe("Health check", () => {
  it("returns 200 on GET /api/health", async () => {
    const app = createApp();
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, message: "ABOA API online" });
  });
});