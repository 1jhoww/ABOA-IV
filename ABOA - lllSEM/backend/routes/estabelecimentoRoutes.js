import express from "express";
import multer from "multer";
import Estabelecimento from "../models/Estabelecimento.js";
import { authRequired } from "../middleware/auth.js";
import Usuario from "../models/Usuario.js";

function levenshtein(a, b) {
  if (!a || !b) return 99;

  a = a.toLowerCase();
  b = b.toLowerCase();

  const matrix = [];

  let i, j;
  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

const geocodeCache = new Map();

function getGeoParams(query) {
  const lat = Number(query.lat);
  const lng = Number(query.lng);
  const raioKm = Number(query.raioKm || 10);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    raioKm: Number.isFinite(raioKm) && raioKm > 0 ? raioKm : 10
  };
}

function comDistanciaKm(est) {
  if (typeof est.distanciaMetros !== "number") return est;

  return {
    ...est,
    distanciaKm: Number((est.distanciaMetros / 1000).toFixed(1))
  };
}

async function geocodificarEndereco(endereco) {
  if (!endereco?.trim()) return null;

  const chave = endereco.trim().toLowerCase();
  if (geocodeCache.has(chave)) return geocodeCache.get(chave);

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "0");
    url.searchParams.set("countrycodes", "br");
    url.searchParams.set("q", endereco);

    const resp = await fetch(url, {
      headers: {
        "User-Agent": "ABOA-localizacao/1.0",
        "Accept-Language": "pt-BR"
      }
    });

    if (!resp.ok) return null;

    const data = await resp.json();
    const primeiro = data?.[0];
    const lat = Number(primeiro?.lat);
    const lon = Number(primeiro?.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    const location = {
      type: "Point",
      coordinates: [lon, lat]
    };

    geocodeCache.set(chave, location);
    return location;
  } catch (err) {
    console.error("Erro ao geocodificar endereco:", err);
    return null;
  }
}

async function buscarPorRaio({ lat, lng, raioKm }, query = {}) {
  const dados = await Estabelecimento.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [lng, lat]
        },
        distanceField: "distanciaMetros",
        maxDistance: raioKm * 1000,
        spherical: true,
        query
      }
    }
  ]);

  return dados.map(comDistanciaKm);
}


const router = express.Router();

// Config upload (somente JPG)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 9999);
    cb(null, unique + ".jpg");
  }
});

function fileFilter(req, file, cb) {
  if (file.mimetype === "image/jpeg") cb(null, true);
  else cb(new Error("Apenas JPG permitido"));
}

const upload = multer({ storage, fileFilter });

// POST cadastro
router.post(
  "/",
  authRequired,
  upload.fields([
    { name: "foto", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const {
        nome,
        endereco,
        telefone,
        descricao,
        categoria,
        tags
      } = req.body;

      const location = await geocodificarEndereco(endereco);

      const novo = await Estabelecimento.create({
        nome,
        endereco,
        telefone,
        descricao,
        categoria,
        ...(location ? { location } : {}),
        tags: JSON.parse(tags || "[]"),
        fotoUrl: req.files?.foto
          ? `/uploads/${req.files.foto[0].filename}`
          : null,
        donoId: req.usuario.id
      });

      console.log("Estabelecimento criado:", novo);

      await Usuario.findByIdAndUpdate(req.usuario.id, { tipo: "restaurante" });

      const usuarioAtualizado =
        await Usuario.findById(req.usuario.id).select("-senhaHash");

      return res.status(201).json({
        estabelecimento: novo,
        usuario: usuarioAtualizado
      });

    } catch (err) {
      console.error("Erro ao cadastrar estabelecimento:", err);
      return res.status(500).json({ erro: "Erro ao cadastrar estabelecimento" });
    }
  }
);

// GET listar
router.get("/", async (req, res) => {
  try {
    const geo = getGeoParams(req.query);

    if (geo) {
      const temCoordenadas = await Estabelecimento.exists({
        "location.coordinates.0": { $exists: true }
      });

      if (!temCoordenadas) {
        const dados = await Estabelecimento.find();
        return res.json(dados);
      }

      const dados = await buscarPorRaio(geo);
      return res.json(dados);
    }

    const dados = await Estabelecimento.find();
    res.json(dados);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar" });
  }
});

router.get("/meu", authRequired, async (req, res) => {
  try {
    const est = await Estabelecimento.findOne({ donoId: req.usuario.id });

    if (!est) {
      return res.status(404).json({ erro: "Nenhum estabelecimento encontrado" });
    }

    res.json(est);

  } catch (err) {
    console.error("Erro ao buscar estabelecimento:", err);
    res.status(500).json({ erro: "Erro ao buscar estabelecimento" });
  }
});

router.put("/meu", authRequired, async (req, res) => {
  try {
    const dadosAtualizados = { ...req.body };

    if (req.body.endereco) {
      const location = await geocodificarEndereco(req.body.endereco);
      if (location) dadosAtualizados.location = location;
    }

    const atualizado = await Estabelecimento.findOneAndUpdate(
      { donoId: req.usuario.id },
      dadosAtualizados,
      { new: true }
    );
    res.json(atualizado);
  } catch (err) {
    console.error("Erro ao atualizar perfil:", err);
    res.status(500).json({ erro: "Erro ao atualizar perfil" });
  }
});

router.put(
  "/foto",
  authRequired,
  upload.fields([{ name: "foto", maxCount: 1 }]),
  async (req, res) => {
    try {
      if (!req.files?.foto) {
        return res.status(400).json({ erro: "Envie uma foto JPG" });
      }

      const fotoUrl = `/uploads/${req.files.foto[0].filename}`;

      const atualizado = await Estabelecimento.findOneAndUpdate(
        { donoId: req.usuario.id },
        { fotoUrl },
        { new: true }
      );

      res.json(atualizado);

    } catch (err) {
      console.error("Erro ao atualizar foto:", err);
      res.status(500).json({ erro: "Erro ao atualizar foto" });
    }
  }
);

router.get("/buscar", async (req, res) => {
  try {
    const q = req.query.q?.trim();
    if (!q) return res.json([]);

    const termo = q.toLowerCase();
    const filtroBusca = {
      $or: [
        { nome: new RegExp(termo, "i") },
        { descricao: new RegExp(termo, "i") },
        { categoria: new RegExp(termo, "i") },
        { tags: new RegExp(termo, "i") }
      ]
    };

    const geo = getGeoParams(req.query);
    let resultados;

    if (geo) {
      const temCoordenadas = await Estabelecimento.exists({
        ...filtroBusca,
        "location.coordinates.0": { $exists: true }
      });

      resultados = temCoordenadas
        ? await buscarPorRaio(geo, filtroBusca)
        : await Estabelecimento.find(filtroBusca);
    } else {
      resultados = await Estabelecimento.find(filtroBusca);
    }

    function calcularRelevancia(est) {
      let score = 0;

      const nome = est.nome?.toLowerCase() || "";
      const desc = est.descricao?.toLowerCase() || "";
      const cat = est.categoria?.toLowerCase() || "";
      const tags = (est.tags || []).map(t => t.toLowerCase());

      // PESOS DIRETOS (exatos)
      if (nome.includes(termo)) score += 50;
      if (cat.includes(termo)) score += 40;
      if (tags.some(t => t.includes(termo))) score += 30;
      if (desc.includes(termo)) score += 20;

      // BUSCA LEVENSHTEIN — tolerância ao erro
      const campos = [nome, desc, cat, ...tags];

      campos.forEach(c => {
        const dist = levenshtein(c, termo);

        if (dist <= 2) score += 40; // MUITO parecido
        else if (dist <= 4) score += 20; // parecido
        else if (dist <= 6) score += 10; // próximo
      });

      return score;
    }

    // ORDENAR PELO SCORE (maior = mais relevante)
    const ordenados = resultados
      .map(est => {
        const dados = est._doc || est;

        return {
          ...dados,
          score: calcularRelevancia(dados)
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.distanciaKm || 0) - (b.distanciaKm || 0);
      });

    res.json(ordenados);

  } catch (err) {
    console.error("Erro ao buscar:", err);
    res.status(500).json({ erro: "Erro ao buscar" });
  }
});


export default router;
