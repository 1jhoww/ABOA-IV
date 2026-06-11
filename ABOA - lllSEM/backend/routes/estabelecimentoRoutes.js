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
const TIPOS_GEOCODE_GENERICOS = new Set([
  "city",
  "town",
  "village",
  "municipality",
  "state",
  "region",
  "county",
  "postcode",
  "suburb",
  "neighbourhood",
  "neighborhood",
  "quarter",
  "locality"
]);
const NOMES_ESTADOS_BR = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapa",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceara",
  DF: "Distrito Federal",
  ES: "Espirito Santo",
  GO: "Goias",
  MA: "Maranhao",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Para",
  PB: "Paraiba",
  PR: "Parana",
  PE: "Pernambuco",
  PI: "Piaui",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondonia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "Sao Paulo",
  SE: "Sergipe",
  TO: "Tocantins"
};

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

function normalizarTexto(texto = "") {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escaparRegex(texto = "") {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function criarRegexBuscaTextual(termo = "") {
  const mapaAcentos = {
    a: "[aáàãâä]",
    c: "[cç]",
    e: "[eéèêë]",
    i: "[iíìîï]",
    o: "[oóòõôö]",
    u: "[uúùûü]"
  };

  const termoNormalizado = normalizarTexto(termo);
  const padrao = [...termoNormalizado]
    .map((char) => {
      if (/\s/.test(char)) return "\\s+";
      return mapaAcentos[char] || escaparRegex(char);
    })
    .join("");

  return new RegExp(padrao, "i");
}

function limparEspacos(texto = "") {
  return texto.replace(/\s+/g, " ").trim();
}

function trocarHifensSeparadores(endereco) {
  return limparEspacos(endereco.replace(/\s+-\s+/g, ", "));
}

function expandirAbreviacoes(endereco) {
  return limparEspacos(
    endereco
      .replace(/\bAv\.\s*/gi, "Avenida ")
      .replace(/\bDr\.\s*/gi, "Doutor ")
      .replace(/\bR\.\s*/gi, "Rua ")
      .replace(/\bRod\.\s*/gi, "Rodovia ")
  );
}

function extrairNumero(endereco) {
  const semCep = endereco.replace(/\b\d{5}-?\d{3}\b/g, " ");
  return semCep.match(/\b\d{1,6}\b/)?.[0] || null;
}

function extrairCidade(endereco) {
  const matchComUf = endereco.match(/,\s*([^,\-]+?)\s*(?:-|,)\s*[A-Z]{2}\b/i);
  if (matchComUf?.[1]) return limparEspacos(matchComUf[1]);

  const partes = trocarHifensSeparadores(endereco)
    .split(",")
    .map((parte) => limparEspacos(parte))
    .filter(Boolean);

  const indiceUf = partes.findIndex((parte) => /^[A-Z]{2}$/i.test(parte));
  if (indiceUf > 0) return partes[indiceUf - 1];

  return null;
}

function extrairEstado(endereco) {
  return endereco.match(/(?:-|,)\s*([A-Z]{2})\b/i)?.[1]?.toUpperCase() || null;
}

function extrairCep(endereco) {
  return endereco.match(/\b\d{5}-?\d{3}\b/)?.[0] || null;
}

function extrairBairro(endereco) {
  const partes = trocarHifensSeparadores(endereco)
    .split(",")
    .map((parte) => limparEspacos(parte))
    .filter(Boolean);
  const indiceUf = partes.findIndex((parte) => /^[A-Z]{2}$/i.test(parte));
  const indiceCep = partes.findIndex((parte) => /\b\d{5}-?\d{3}\b/.test(parte));
  const indiceCidade = indiceUf > 0 ? indiceUf - 1 : indiceCep > 1 ? indiceCep - 2 : -1;

  if (indiceCidade > 1) return partes[indiceCidade - 1];

  return null;
}

function extrairTermoRua(endereco, numero) {
  const primeiraParte = trocarHifensSeparadores(endereco).split(",")[0] || endereco;
  const semNumero = numero
    ? primeiraParte.replace(new RegExp(`\\b${numero}\\b`), " ")
    : primeiraParte;
  const palavrasIgnoradas = new Set([
    "av",
    "avenida",
    "dr",
    "doutor",
    "r",
    "rua",
    "rod",
    "rodovia",
    "estrada",
    "travessa"
  ]);

  const palavras = normalizarTexto(semNumero)
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((palavra) => palavra.length >= 4 && !palavrasIgnoradas.has(palavra));

  return palavras[0] || null;
}

function removerBairro(endereco) {
  const normalizado = trocarHifensSeparadores(endereco);
  const partes = normalizado
    .split(",")
    .map((parte) => limparEspacos(parte))
    .filter(Boolean);

  if (partes.length < 5) return normalizado;

  const indiceCep = partes.findIndex((parte) => /\b\d{5}-?\d{3}\b/.test(parte));
  const indiceUf = partes.findIndex((parte) => /^[A-Z]{2}$/i.test(parte));
  const indiceCidade = indiceUf > 0 ? indiceUf - 1 : indiceCep > 0 ? indiceCep - 2 : -1;

  if (indiceCidade < 2) return normalizado;

  const inicio = partes.slice(0, 2);
  const fim = partes.slice(indiceCidade);
  return limparEspacos([...inicio, ...fim].join(", "));
}

function gerarTentativasGeocode(endereco) {
  const original = limparEspacos(endereco);
  const comVirgulas = trocarHifensSeparadores(original);
  const semBairro = removerBairro(comVirgulas);
  const expandido = expandirAbreviacoes(original);
  const combinado = expandirAbreviacoes(removerBairro(comVirgulas));
  const numero = extrairNumero(original);
  const tentativas = [];

  for (const query of [original, comVirgulas, semBairro, expandido, combinado]) {
    if (!query || tentativas.includes(query)) continue;
    if (numero && !query.includes(numero)) continue;
    tentativas.push(query);
    if (tentativas.length === 5) break;
  }

  return tentativas;
}

function cepProximo(cepOriginal, displayName) {
  if (!cepOriginal) return false;

  const cepResultado = displayName.match(/\b\d{5}-?\d{3}\b/)?.[0];
  if (!cepResultado) return false;

  const originalNormalizado = cepOriginal.replace(/\D/g, "");
  const resultadoNormalizado = cepResultado.replace(/\D/g, "");

  return originalNormalizado.slice(0, 5) === resultadoNormalizado.slice(0, 5);
}

function validarResultadoGeocode(resultado, contexto) {
  const displayName = resultado?.display_name || "";
  const displayNormalizado = normalizarTexto(displayName);
  const lat = Number(resultado?.lat);
  const lon = Number(resultado?.lon);
  const tipo = normalizarTexto(resultado?.type || "");
  const tipoEndereco = normalizarTexto(resultado?.addresstype || "");

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { valido: false, motivo: "resultado sem lat/lon validos" };
  }

  if (!displayNormalizado.includes("brasil")) {
    return { valido: false, motivo: "display_name nao contem Brasil" };
  }

  if (TIPOS_GEOCODE_GENERICOS.has(tipo) || TIPOS_GEOCODE_GENERICOS.has(tipoEndereco)) {
    return {
      valido: false,
      motivo: `resultado generico (${tipo || tipoEndereco})`
    };
  }

  if (contexto.cidade && !displayNormalizado.includes(normalizarTexto(contexto.cidade))) {
    return { valido: false, motivo: `display_name nao contem cidade ${contexto.cidade}` };
  }

  if (contexto.estado) {
    const estadoNome = NOMES_ESTADOS_BR[contexto.estado];
    const estadoBate = displayNormalizado.includes(normalizarTexto(contexto.estado)) ||
      (estadoNome && displayNormalizado.includes(normalizarTexto(estadoNome)));

    if (!estadoBate) {
      return { valido: false, motivo: `display_name nao contem estado ${contexto.estado}` };
    }
  }

  if (contexto.termoRua && !displayNormalizado.includes(normalizarTexto(contexto.termoRua))) {
    return { valido: false, motivo: `display_name nao contem termo da rua ${contexto.termoRua}` };
  }

  if (contexto.numero && !displayNormalizado.includes(contexto.numero)) {
    const bairroBate = contexto.bairro &&
      displayNormalizado.includes(normalizarTexto(contexto.bairro));
    const cepBate = cepProximo(contexto.cep, displayName);

    if (bairroBate || cepBate) {
      return {
        valido: true,
        aproximadoSemNumero: true,
        motivo: "Resultado aceito sem numero exato. Coordenada aproximada pela rua"
      };
    }

    return {
      valido: false,
      motivo: `display_name nao contem numero ${contexto.numero}, bairro ou CEP proximo`
    };
  }

  return { valido: true, motivo: "resultado confiavel" };
}

async function geocodificarEndereco(endereco) {
  if (!endereco?.trim()) {
    console.warn("[GEOCODE] Endereco vazio. Estabelecimento ficara sem location.");
    return null;
  }

  const chave = endereco.trim().toLowerCase();
  if (geocodeCache.has(chave)) return geocodeCache.get(chave);

  try {
    const contexto = {
      cidade: extrairCidade(endereco),
      numero: extrairNumero(endereco),
      estado: extrairEstado(endereco),
      bairro: extrairBairro(endereco),
      cep: extrairCep(endereco),
      termoRua: extrairTermoRua(endereco, extrairNumero(endereco))
    };
    const tentativas = gerarTentativasGeocode(endereco);

    for (let i = 0; i < tentativas.length; i++) {
      const query = tentativas[i];
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "1");
      url.searchParams.set("addressdetails", "0");
      url.searchParams.set("countrycodes", "br");
      url.searchParams.set("q", query);

      console.log(`[GEOCODE] Tentativa ${i + 1}/${tentativas.length}: ${query}`);
      console.log(`[GEOCODE] URL: ${url.toString()}`);

      const resp = await fetch(url, {
        headers: {
          "User-Agent": "ABOA-localizacao/1.0",
          "Accept-Language": "pt-BR"
        }
      });

      console.log(`[GEOCODE] Status HTTP: ${resp.status}`);

      if (!resp.ok) {
        console.warn(
          `[GEOCODE] Tentativa rejeitada: Nominatim retornou status ${resp.status}.`
        );
        continue;
      }

      const data = await resp.json();
      const primeiro = data?.[0];

      if (!primeiro) {
        console.warn("[GEOCODE] Tentativa sem resultado.");
        continue;
      }

      console.log(`[GEOCODE] Primeiro resultado: ${primeiro.display_name || "sem display_name"}`);

      const validacao = validarResultadoGeocode(primeiro, contexto);
      if (!validacao.valido) {
        console.warn(`[GEOCODE] Resultado rejeitado: ${validacao.motivo}.`);
        continue;
      }

      const lat = Number(primeiro.lat);
      const lon = Number(primeiro.lon);
      const location = {
        type: "Point",
        coordinates: [lon, lat]
      };

      if (validacao.aproximadoSemNumero) {
        console.log("[GEOCODE] Resultado aceito sem número exato. Coordenada aproximada pela rua.");
      } else {
        console.log(`[GEOCODE] Resultado aceito: ${validacao.motivo}.`);
      }
      geocodeCache.set(chave, location);
      return location;
    }

    console.warn(
      `[GEOCODE] Nao foi possivel geocodificar com precisao suficiente. Endereco: ${endereco}`
    );
    return null;
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
      if (!location) {
        console.warn(
          `[GEOCODE] Estabelecimento "${nome}" sera salvo sem location. Endereco: ${endereco || "vazio"}`
        );
      }

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
      else {
        console.warn(
          `[GEOCODE] Edicao do estabelecimento sera salva sem atualizar location. Endereco: ${req.body.endereco}`
        );
      }
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

    const termo = normalizarTexto(q);
    const regexBusca = criarRegexBuscaTextual(q);
    const filtroBusca = {
      $or: [
        { nome: regexBusca },
        { descricao: regexBusca },
        { categoria: regexBusca },
        { tags: regexBusca }
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

      const nome = normalizarTexto(est.nome || "");
      const desc = normalizarTexto(est.descricao || "");
      const cat = normalizarTexto(est.categoria || "");
      const tags = (est.tags || []).map(t => normalizarTexto(t));

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
