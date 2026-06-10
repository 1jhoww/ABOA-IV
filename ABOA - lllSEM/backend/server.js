import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import estabelecimentoRoutes from "./routes/estabelecimentoRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import cardapioRoutes from "./routes/cardapioRoutes.js";



dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL
].filter(Boolean);

// conexão Mongo
connectDB();

// middlewares globais
app.use(
  cors({
    origin: allowedOrigins,
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// arquivos estáticos (fotos)
app.use("/uploads", express.static("uploads"));

// rotas
app.use("/api/auth", authRoutes);
app.use("/api/estabelecimentos", estabelecimentoRoutes);

app.listen(PORT, () =>
  console.log(`Backend rodando na porta ${PORT} ✔`)
);

app.use("/api/cardapio", cardapioRoutes);
