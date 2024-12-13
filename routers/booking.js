import express from "express";
import {
  getBookings,
  createBooking,
  getTimeSlots,
  updateBookings,
  deleteBooking,
  createBookingForAdmin,
} from "../controllers/booking.js"; // Adjust the path
import { isAdmin } from "../utils.js";

const router = express.Router();

router.get("/", isAdmin, getBookings); // Route to get all bookings
router.post("/", createBooking); // Route to create a booking
router.post("/admin", isAdmin, createBookingForAdmin); // Route to create a booking
router.get("/time-slots", getTimeSlots);
router.put("/:id", isAdmin, updateBookings);
// router.delete("/:id", deleteBooking);

export default router;
