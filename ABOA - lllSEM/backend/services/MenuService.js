import Menu from "../models/Menu.js";

function toBool(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

export async function listMenuItems() {
  return Menu.find();
}

export async function getMenuItemById(id) {
  return Menu.findById(id);
}

export async function listMenuByRestaurant(restauranteId) {
  return Menu.find({ restauranteId: String(restauranteId) });
}

export async function listMenuByOwner(ownerId) {
  return Menu.find({ restauranteId: String(ownerId) });
}

export async function createMenuItem(body, ownerId, fotoUrl = null) {
  return Menu.create({
    restauranteId: String(body.restauranteId || ownerId),
    nome: body.nome,
    descricao: body.descricao,
    preco: Number(body.preco),
    disponivel: toBool(body.disponivel),
    emPromocao: toBool(body.emPromocao),
    precoPromocional: body.precoPromocional ? Number(body.precoPromocional) : null,
    textoPromocao: body.textoPromocao || "",
    tipo: body.tipo || "principal",
    fotoUrl
  });
}

export async function updateMenuItem(id, body, fotoUrl) {
  const payload = {
    nome: body.nome,
    descricao: body.descricao,
    preco: body.preco !== undefined ? Number(body.preco) : undefined,
    disponivel: body.disponivel !== undefined ? toBool(body.disponivel) : undefined,
    emPromocao: body.emPromocao !== undefined ? toBool(body.emPromocao) : undefined,
    precoPromocional:
      body.precoPromocional !== undefined && body.precoPromocional !== ""
        ? Number(body.precoPromocional)
        : body.precoPromocional === "" || body.precoPromocional === null
          ? null
          : undefined,
    textoPromocao: body.textoPromocao,
    tipo: body.tipo,
    fotoUrl
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });

  return Menu.findByIdAndUpdate(id, payload, { new: true });
}

export async function removeMenuItem(id) {
  return Menu.findByIdAndDelete(id);
}