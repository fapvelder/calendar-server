import express from "express";
import {
  createOTPAndSendSMS,
  resendOTP,
  verifyOTP,
} from "../controllers/otp.js";

const router = express.Router();

router.post("/send", createOTPAndSendSMS);
router.post("/resend", resendOTP);
router.post("/verify", verifyOTP);

export default router;
