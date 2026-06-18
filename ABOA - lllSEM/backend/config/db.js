import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      "mongodb://127.0.0.1:27017/aboa";

    if (!mongoUri) {
      console.warn(
        "MONGO_URI nao definida. Configure backend/.env com MONGO_URI=<sua_string_de_conexao> para ativar o banco."
      );
      return;
    }

    if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
      console.warn(
        "MONGO_URI nao encontrada. Usando Mongo local em mongodb://127.0.0.1:27017/aboa."
      );
    }

    await mongoose.connect(mongoUri);
    console.log("MongoDB conectado ✔");
  } catch (err) {
    console.error("Erro ao conectar no Mongo:", err);
    process.exit(1);
  }
};
