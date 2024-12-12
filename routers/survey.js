import express from "express";

import { submitSurvey } from "../controllers/survey.js";

const router = express.Router();
router.post("/", submitSurvey);

export default router;
