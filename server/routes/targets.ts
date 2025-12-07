import { Router } from "express";
import { addTargets, getAllTargets } from "../controllers/targetsController.js";
import { validate } from "../middleware/validation.js";
import { createHopsArraySchema } from "../schemas/hopSchema.js";

const router = Router();

router.get("/", getAllTargets);
router.post("/", validate(createHopsArraySchema), addTargets);

export default router;
