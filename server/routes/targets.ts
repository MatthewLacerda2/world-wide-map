import { Router } from "express";
import { getAllTargets } from "../controllers/targetsController.js";

const router = Router();

router.get("/", getAllTargets);

export default router;
