import express from "express";
import {
  createPage,
  getPageByLanguage,
  updatePage,
} from "../controllers/page.js";
import { isAdmin } from "../utils.js";

const router = express.Router();
router.get("/", isAdmin, getPageByLanguage);
router.post("/", isAdmin, createPage);
router.put("/:id", isAdmin, updatePage);

export default router;
