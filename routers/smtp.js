import express from "express";
import {
  createSMTP,
  deleteSMTP,
  getSMTP,
  updateSMTP,
} from "../controllers/smtp.js";

const router = express.Router();

router.get("/", getSMTP);
router.post("/", createSMTP);
router.put("/:id", updateSMTP);
router.delete("/:id", deleteSMTP);

export default router;
