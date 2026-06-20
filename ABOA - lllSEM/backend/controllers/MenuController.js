import * as MenuService from "../services/MenuService.js";

export async function list(req, res, next) {
  try {
    const items = await MenuService.listMenuItems();
    return res.json(items);
  } catch (error) {
    return next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const item = await MenuService.getMenuItemById(req.params.id);

    if (!item) {
      return res.status(404).json({ erro: "Item não encontrado." });
    }

    return res.json(item);
  } catch (error) {
    return next(error);
  }
}

export async function listByRestaurant(req, res, next) {
  try {
    const items = await MenuService.listMenuByRestaurant(req.params.restauranteId);
    return res.json(items);
  } catch (error) {
    return next(error);
  }
}

export async function mine(req, res, next) {
  try {
    const items = await MenuService.listMenuByOwner(req.usuario.id);
    return res.json(items);
  } catch (error) {
    return next(error);
  }
}

export async function create(req, res, next) {
  try {
    const item = await MenuService.createMenuItem(
      req.body,
      req.usuario.id,
      req.file ? `/uploads/${req.file.filename}` : null
    );

    return res.status(201).json(item);
  } catch (error) {
    return next(error);
  }
}

export async function update(req, res, next) {
  try {
    const item = await MenuService.updateMenuItem(
      req.params.id,
      req.body,
      req.file ? `/uploads/${req.file.filename}` : undefined
    );

    if (!item) {
      return res.status(404).json({ erro: "Item não encontrado." });
    }

    return res.json(item);
  } catch (error) {
    return next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const item = await MenuService.removeMenuItem(req.params.id);

    if (!item) {
      return res.status(404).json({ erro: "Item não encontrado." });
    }

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
}