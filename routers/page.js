import express from "express";
import {
  createPage,
  getPageByLanguage,
  updatePage,
} from "../controllers/page.js";

const router = express.Router();
router.get("/", getPageByLanguage);
router.post("/", createPage);
router.put("/:id", updatePage);

export default router;
