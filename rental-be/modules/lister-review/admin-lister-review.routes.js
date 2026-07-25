import { Router } from "express";

import { adminDeleteListerReviewController } from "./controllers/index.js";

const router = Router();

router.delete("/:reviewId", adminDeleteListerReviewController);

export default router;
