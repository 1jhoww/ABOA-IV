import express from "express";
import multer from "multer";
import * as MenuController from "../controllers/MenuController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + Math.round(Math.random() * 9999) + ".jpg")
});

function fileFilter(req, file, cb) {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Arquivo inválido"));
}

const upload = multer({ storage, fileFilter });

router.get("/meus", authMiddleware, MenuController.mine);
router.get("/restaurante/:restauranteId", MenuController.listByRestaurant);
router.get("/", MenuController.list);
router.get("/:id", MenuController.getById);
router.post("/", authMiddleware, upload.single("foto"), MenuController.create);
router.put("/:id", authMiddleware, upload.single("foto"), MenuController.update);
router.delete("/:id", authMiddleware, MenuController.remove);

export default router;