import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import createApp from "./app.js";

dotenv.config();
const PORT = process.env.PORT || 5000;

const app = createApp();

// conexão Mongo
connectDB();

app.listen(PORT, () =>
  console.log(`Backend rodando na porta ${PORT} ✔`)
);
