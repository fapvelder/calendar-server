import express from "express";
import {
  getBookings,
  createBooking,
  getTimeSlots,
  updateBookings,
  deleteBooking,
} from "../controllers/booking.js"; // Adjust the path

const router = express.Router();

router.get("/", getBookings); // Route to get all bookings
router.post("/", createBooking); // Route to create a booking
router.get("/time-slots", getTimeSlots);
router.put("/:id", updateBookings);
router.delete("/:id", deleteBooking);

export default router;
