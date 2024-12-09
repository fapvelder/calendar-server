import { BookingModel } from "../models/booking.js";
import moment from "moment";
import nodemailer from "nodemailer";
import { createOTPAndSendSMS, generateOTP } from "./otp.js";

export const getBookings = async (req, res) => {
  try {
    const bookings = await BookingModel.find().select(
      "-representative -email -name -group -phone"
    );
    res.status(200).send(bookings);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export const createBooking = async (req, res) => {
  try {
    const { visitDate, timeSlot, location, phone } = req.body.data;
    const today = new Date(); // Get the current date
    today.setHours(0, 0, 0, 0); // Normalize to the start of the day

    const bookingDate = new Date(visitDate);
    if (bookingDate < today) {
      return res
        .status(400)
        .send({ message: "Cannot create a booking in the past." });
    }
    const existingBooking = await BookingModel.findOne({
      visitDate: visitDate,
      timeSlot: timeSlot,
      location: location,
      status: { $nin: ["cancelled", "available"] },
    });

    if (existingBooking) {
      return res
        .status(400)
        .send({ message: "This time slot is already booked." });
    }
    const otp = generateOTP();
    const newBooking = new BookingModel({
      ...req.body.data,
      otp,
      lastOTPSent: Date.now(),
    });
    console.log(new Date());
    const result = await createOTPAndSendSMS(newBooking._id, phone, otp);
    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }
    const savedBooking = await newBooking.save();
    // setTimeout(async () => {
    //   const currentBooking = await BookingModel.findById(savedBooking._id);
    //   if (currentBooking && currentBooking.status === "waiting") {
    //     await BookingModel.findByIdAndUpdate(savedBooking._id, {
    //       status: "available",
    //     });
    //   }
    // }, 5 * 60 * 1000);
    setTimeout(async () => {
      try {
        // Fetch the latest status of the booking
        const bookingToCheck = await BookingModel.findById(savedBooking._id);
        if (bookingToCheck && bookingToCheck.status === "waiting") {
          // Update the status if it is still "waiting"
          await BookingModel.findByIdAndUpdate(savedBooking._id, {
            status: "available",
          });
          console.log(
            `Booking ${savedBooking._id} status updated to "available".`
          );
        } else {
          console.log(
            `Booking ${savedBooking._id} status is ${bookingToCheck.status}`
          );
        }
      } catch (error) {
        console.error(
          `Error during scheduled status check for booking ${savedBooking._id}:`,
          error.message
        );
      }
    }, 5 * 60 * 1000);
    return res
      .status(200)
      .json({ success: true, message: result.message, data: savedBooking });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export const sendBookingConfirmationEmail = async (email, representative) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `Acecook Việt Nam <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Chúng tôi đã nhận được yêu cầu thăm nhà máy của bạn",
    html: `
      <p>Chào ${representative},</p>
      <p>Cảm ơn bạn đã liên hệ với chúng tôi. Chúng tôi xin xác nhận đã nhận được yêu cầu của bạn về việc thăm nhà máy. Chúng tôi rất vui mừng được chào đón bạn đến tham quan và tìm hiểu thêm về quy trình sản xuất của chúng tôi.</p>
      <p>Chúng tôi sẽ xem xét lịch trình và liên hệ với bạn trong thời gian sớm nhất để xác nhận thời gian và ngày cụ thể cho chuyến thăm.</p>
      <p>Nếu bạn có bất kỳ câu hỏi nào thêm, xin vui lòng cho chúng tôi biết.</p>
      <p>Trân trọng,</p>
      <p>Acecook Việt Nam</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Error sending email:", err.message);
    throw new Error("Failed to send email");
  }
};

export const getTimeSlots = async (req, res) => {
  try {
    const location = req.query.location;
    // Fetch all existing bookings from today onward
    const today = new Date();
    const bookings = await BookingModel.find({
      location,
      visitDate: { $gte: today },
    });

    // Generate all time slots for the next 3 months
    const allSlots = generateTimeSlots(today, 3, bookings);

    // Send response with both booked and available time slots
    res.status(200).json(allSlots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateBookings = async (req, res) => {
  const bookingId = req.params.id;
  const { visitDate, timeSlot, status } = req.body;

  try {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (visitDate) {
      booking.visitDate = visitDate;
    }
    if (timeSlot) {
      if (!["morning", "afternoon"].includes(timeSlot)) {
        return res.status(400).json({ message: "Invalid time slot" });
      }
      booking.timeSlot = timeSlot;
    }
    if (status) {
      if (!["waiting", "confirmed", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      booking.status = status;
    }

    await booking.save();
    res.status(200).json({ message: "Booking updated successfully", booking });
  } catch (error) {
    res.status(500).json({ message: "Error updating booking", error });
  }
};

const generateTimeSlots = (startDate, months, existingSlots) => {
  const timeSlots = ["morning", "afternoon"];
  const result = [];
  let currentDate = new Date(startDate);

  // Iterate through the days for the next 3 months
  while (currentDate <= addMonths(new Date(startDate), months)) {
    // For each day, iterate over time slots (morning, afternoon)
    timeSlots.forEach((slot) => {
      const daySlots = existingSlots.filter(
        (existingSlot) =>
          new Date(existingSlot.visitDate).toDateString() ===
            currentDate.toDateString() && existingSlot.timeSlot === slot
      );
      // Determine status based on existing bookings
      let status = "available"; // Default status
      if (daySlots.length > 0) {
        console.log(daySlots[0].status);
        status = daySlots[0].status;
      }

      // Push the time slot with the determined status
      result.push({
        date: currentDate.toISOString().split("T")[0],
        timeSlot: slot,
        status,
      });
    });

    // Move to the next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return result;
};

// Helper function to add months
const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};
