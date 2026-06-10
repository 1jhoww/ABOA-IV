import dotenv from "dotenv";
import mongoose from "mongoose";
import Estabelecimento from "../models/Estabelecimento.js";

dotenv.config();

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const PAUSA_MS = 1100;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodificarEndereco(endereco) {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("countrycodes", "br");
  url.searchParams.set("q", endereco);

  const resp = await fetch(url, {
    headers: {
      "User-Agent": "ABOA-backfill-location/1.0",
      "Accept-Language": "pt-BR"
    }
  });

  if (!resp.ok) {
    throw new Error(`Nominatim respondeu com status ${resp.status}`);
  }

  const data = await resp.json();
  const primeiro = data?.[0];
  const lat = Number(primeiro?.lat);
  const lon = Number(primeiro?.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return {
    type: "Point",
    coordinates: [lon, lat]
  };
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI nao encontrada no .ENV.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB conectado.");

  const estabelecimentos = await Estabelecimento.find({
    $or: [
      { location: { $exists: false } },
      { "location.coordinates": { $exists: false } },
      { "location.coordinates.0": { $exists: false } }
    ]
  });

  console.log(`Encontrados ${estabelecimentos.length} estabelecimentos sem location.`);

  let atualizados = 0;
  let falhas = 0;

  for (let i = 0; i < estabelecimentos.length; i++) {
    const est = estabelecimentos[i];

    if (!est.endereco?.trim()) {
      falhas++;
      console.log(`[FALHA] ${est.nome}: endereco vazio.`);
      continue;
    }

    try {
      console.log(`[${i + 1}/${estabelecimentos.length}] Buscando: ${est.nome} - ${est.endereco}`);

      const location = await geocodificarEndereco(est.endereco);

      if (!location) {
        falhas++;
        console.log(`[FALHA] ${est.nome}: coordenadas nao encontradas.`);
      } else {
        est.location = location;
        await est.save();
        atualizados++;
        console.log(
          `[OK] ${est.nome}: ${location.coordinates[1]}, ${location.coordinates[0]}`
        );
      }
    } catch (err) {
      falhas++;
      console.log(`[FALHA] ${est.nome}: ${err.message}`);
    }

    if (i < estabelecimentos.length - 1) {
      await sleep(PAUSA_MS);
    }
  }

  console.log("");
  console.log("Resumo final:");
  console.log(`Atualizados: ${atualizados}`);
  console.log(`Falhas: ${falhas}`);
  console.log(`Ignorados por ja terem location: nao consultados pelo script`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Erro ao executar script:", err);
  await mongoose.disconnect();
  process.exit(1);
});
