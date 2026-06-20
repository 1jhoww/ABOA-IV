import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import swaggerUi from "swagger-ui-express";
import authRoutes from "./routes/authRoutes.js";
import estabelecimentoRoutes from "./routes/estabelecimentoRoutes.js";
import cardapioRoutes from "./routes/cardapioRoutes.js";
import restaurantRoutes from "./routes/restaurantRoutes.js";
import menuRoutes from "./routes/menuRoutes.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL
].filter(Boolean);

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "ABOA API",
    version: "1.0.0",
    description: "API mínima para autenticação, restaurantes e cardápios"
  },
  servers: [{ url: "/" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    }
  },
  paths: {
    "/api/auth/login": { post: { summary: "Login" } },
    "/api/auth/register": { post: { summary: "Cadastro" } },
    "/api/restaurants": {
      get: { summary: "Lista restaurantes" },
      post: { summary: "Cria restaurante", security: [{ bearerAuth: [] }] }
    },
    "/api/restaurants/{id}": {
      get: { summary: "Busca restaurante por id" },
      put: { summary: "Atualiza restaurante", security: [{ bearerAuth: [] }] },
      delete: { summary: "Remove restaurante", security: [{ bearerAuth: [] }] }
    },
    "/api/cardapios": {
      get: { summary: "Lista cardápios" },
      post: { summary: "Cria item do cardápio", security: [{ bearerAuth: [] }] }
    },
    "/api/cardapios/{id}": {
      put: { summary: "Atualiza item do cardápio", security: [{ bearerAuth: [] }] },
      delete: { summary: "Remove item do cardápio", security: [{ bearerAuth: [] }] }
    }
  }
};

export default function createApp() {
  const app = express();

  app.use(
    cors({
      origin: allowedOrigins,
      methods: "GET,POST,PUT,DELETE",
      allowedHeaders: ["Content-Type", "Authorization"]
    })
  );
  app.use(express.json());

  // Observabilidade: log estruturado de cada requisição HTTP (método, rota, status, tempo de resposta)
  app.use(
    morgan(
      ':date[iso] :method :url :status :res[content-length] - :response-time ms'
    )
  );

  app.use("/uploads", express.static("uploads"));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  app.get("/api/health", (req, res) => {
    const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];
    const dbStatus = dbStates[mongoose.connection.readyState] || "unknown";

    res.status(200).json({
      ok: true,
      message: "ABOA API online",
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: dbStatus
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/restaurants", restaurantRoutes);
  app.use("/api/cardapios", menuRoutes);
  app.use("/api/estabelecimentos", estabelecimentoRoutes);
  app.use("/api/cardapio", cardapioRoutes);

  app.use(errorMiddleware);

  return app;
}