import express from "express";
import multer from "multer";
import * as RestaurantController from "../controllers/RestaurantController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + Math.round(Math.random() * 9999) + ".jpg")
});

const upload = multer({ storage });

router.get("/meu", authMiddleware, RestaurantController.mine);
router.put("/meu", authMiddleware, upload.single("foto"), RestaurantController.updateMine);
router.put("/foto", authMiddleware, upload.single("foto"), RestaurantController.updatePhoto);
router.get("/", RestaurantController.list);
router.get("/:id", RestaurantController.getById);
router.post("/", authMiddleware, upload.single("foto"), RestaurantController.create);
router.put("/:id", authMiddleware, upload.single("foto"), RestaurantController.update);
router.delete("/:id", authMiddleware, RestaurantController.remove);

export default router;