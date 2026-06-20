import Restaurant from "../models/Restaurant.js";

function parseTags(tags, keepMissing = false) {
  if (tags === undefined || tags === null || tags === "") {
    return keepMissing ? undefined : [];
  }

  if (Array.isArray(tags)) return tags.filter(Boolean);

  if (typeof tags === "string") {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (error) {
      return tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
  }

  return keepMissing ? undefined : [];
}

function mapRestaurantInput(body = {}, keepMissing = false) {
  return {
    nome: body.nome,
    endereco: body.endereco,
    telefone: body.telefone,
    descricao: body.descricao,
    categoria: body.categoria,
    tags: parseTags(body.tags, keepMissing)
  };
}

export async function listRestaurants() {
  return Restaurant.find();
}

export async function getRestaurantById(id) {
  return Restaurant.findById(id);
}

export async function createRestaurant(body, ownerId, fotoUrl = null) {
  return Restaurant.create({
    ...mapRestaurantInput(body),
    fotoUrl,
    donoId: ownerId
  });
}

export async function updateRestaurant(id, body, fotoUrl) {
  const payload = { ...mapRestaurantInput(body, true) };

  if (typeof fotoUrl === "string") {
    payload.fotoUrl = fotoUrl;
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });

  return Restaurant.findByIdAndUpdate(id, payload, { new: true });
}

export async function removeRestaurant(id) {
  return Restaurant.findByIdAndDelete(id);
}

export async function findRestaurantByOwner(ownerId) {
  return Restaurant.findOne({ donoId: ownerId });
}

export async function updateRestaurantByOwner(ownerId, body, fotoUrl) {
  const payload = { ...mapRestaurantInput(body, true) };

  if (typeof fotoUrl === "string") {
    payload.fotoUrl = fotoUrl;
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });

  return Restaurant.findOneAndUpdate({ donoId: ownerId }, payload, { new: true });
}

export async function updateRestaurantPhotoByOwner(ownerId, fotoUrl) {
  return Restaurant.findOneAndUpdate({ donoId: ownerId }, { fotoUrl }, { new: true });
}