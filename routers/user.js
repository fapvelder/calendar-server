import express from "express";
import {
  createUser,
  updateUser,
  deleteUser,
  loginUser,
} from "../controllers/user.js";
import { isAdmin } from "../utils.js";

const router = express.Router();

router.post("/", isAdmin, createUser); // Create Admin User
router.post("/login", loginUser); // Create Admin User
// router.get("/", getAllUsers); // Get All Admin Users
router.put("/:id", isAdmin, updateUser); // Update Admin User
router.delete("/:id", isAdmin, deleteUser); // Delete Admin User

export default router;
