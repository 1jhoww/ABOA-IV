import * as RestaurantService from "../services/RestaurantService.js";

export async function list(req, res, next) {
  try {
    const restaurants = await RestaurantService.listRestaurants();
    return res.json(restaurants);
  } catch (error) {
    return next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const restaurant = await RestaurantService.getRestaurantById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({ erro: "Restaurante não encontrado." });
    }

    return res.json(restaurant);
  } catch (error) {
    return next(error);
  }
}

export async function create(req, res, next) {
  try {
    const restaurant = await RestaurantService.createRestaurant(
      req.body,
      req.usuario.id,
      req.file ? `/uploads/${req.file.filename}` : null
    );

    return res.status(201).json(restaurant);
  } catch (error) {
    return next(error);
  }
}

export async function update(req, res, next) {
  try {
    const restaurant = await RestaurantService.updateRestaurant(
      req.params.id,
      req.body,
      req.file ? `/uploads/${req.file.filename}` : undefined
    );

    if (!restaurant) {
      return res.status(404).json({ erro: "Restaurante não encontrado." });
    }

    return res.json(restaurant);
  } catch (error) {
    return next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const restaurant = await RestaurantService.removeRestaurant(req.params.id);

    if (!restaurant) {
      return res.status(404).json({ erro: "Restaurante não encontrado." });
    }

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
}

export async function mine(req, res, next) {
  try {
    const restaurant = await RestaurantService.findRestaurantByOwner(req.usuario.id);

    if (!restaurant) {
      return res.status(404).json({ erro: "Nenhum restaurante encontrado." });
    }

    return res.json(restaurant);
  } catch (error) {
    return next(error);
  }
}

export async function updateMine(req, res, next) {
  try {
    const restaurant = await RestaurantService.updateRestaurantByOwner(
      req.usuario.id,
      req.body,
      req.file ? `/uploads/${req.file.filename}` : undefined
    );

    if (!restaurant) {
      return res.status(404).json({ erro: "Nenhum restaurante encontrado." });
    }

    return res.json(restaurant);
  } catch (error) {
    return next(error);
  }
}

export async function updatePhoto(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ erro: "Envie uma foto." });
    }

    const restaurant = await RestaurantService.updateRestaurantPhotoByOwner(
      req.usuario.id,
      `/uploads/${req.file.filename}`
    );

    if (!restaurant) {
      return res.status(404).json({ erro: "Nenhum restaurante encontrado." });
    }

    return res.json(restaurant);
  } catch (error) {
    return next(error);
  }
}