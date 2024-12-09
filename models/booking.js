import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    group: { type: String, required: true },
    representative: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    // address: { type: String, required: true },
    participants: { type: Number, required: true },
    visitDate: { type: Date, required: true },
    timeSlot: { type: String, enum: ["morning", "afternoon"], required: true },
    arrival: {
      type: String,
      enum: ["self-arrival", "company"],
      required: true,
    },
    status: {
      type: String,
      enum: ["waiting", "confirmed", "cancelled"],
      default: "waiting",
    },
    location: { type: String, required: true },
    otp: { type: String },
    lastOTPSent: { type: Date },
    notes: String,
  },
  { timestamps: true }
);
export const BookingModel = mongoose.model("Booking", bookingSchema);
