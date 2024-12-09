import mongoose from "mongoose";
const Schema = mongoose.Schema;

const otpSchema = new mongoose.Schema({
  bookingID: { type: Schema.Types.ObjectId, ref: "Booking" },
  phone: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});
export const OTPModel = mongoose.model("OTP", otpSchema);
