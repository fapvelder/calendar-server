import { BookingModel } from "../models/booking.js";
import moment from "moment";
import nodemailer from "nodemailer";
import { createOTPAndSendSMS, generateOTP } from "./otp.js";

export const getBookings = async (req, res) => {
  try {
    const bookings = await BookingModel.find().sort({ createdAt: -1 });
    // .select(
    //   "-representative -email -name -group -phone"
    // );
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
    const result = await createOTPAndSendSMS(newBooking._id, phone, otp);
    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }
    const savedBooking = await newBooking.save();

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

export const sendBookingConfirmationEmail = async (
  email,
  representative,
  location
) => {
  const locationMap = {
    HCM: "Hồ Chí Minh",
    VL: "Vĩnh Long",
    DN: "Đà Nẵng",
  };
  const bookingLocation = locationMap[location] || "Unknown Location";

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
    subject: `Chúng tôi đã nhận được yêu cầu thăm nhà máy của bạn tại ${bookingLocation}`,
    html: `
      <p>Xin chào ${representative},</p>
      <p>Cảm ơn bạn đã liên hệ với chúng tôi. Chúng tôi xin xác nhận đã nhận được yêu cầu của bạn về việc thăm nhà máy tại ${bookingLocation}. Chúng tôi rất vui mừng được chào đón bạn đến tham quan và tìm hiểu thêm về quy trình sản xuất của chúng tôi.</p>
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

// export const updateBookings = async (req, res) => {
//   const bookingId = req.params.id;
//   const { data } = req.body;

//   try {
//     const booking = await BookingModel.findById(bookingId);
//     if (!booking) {
//       return res.status(404).json({ message: "Booking not found" });
//     }

//     await booking.save();
//     res.status(200).json({ message: "Booking updated successfully", booking });
//   } catch (error) {
//     res.status(500).json({ message: "Error updating booking", error });
//   }
// };

export const updateBookings = async (req, res) => {
  const bookingId = req.params.id;
  const { data } = req.body; // Assuming 'data' is the updated booking data sent in the request body

  try {
    // Find the booking by ID
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Update the booking fields with the new data
    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined) {
        booking[key] = data[key]; // Update each field if the data exists
      }
    });

    // Save the updated booking
    await booking.save();

    // Return the updated booking in the response
    res.status(200).json({
      message: "Booking updated successfully",
      booking,
    });
  } catch (error) {
    // Handle any errors that occur during the update
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

export const deleteBooking = async (req, res) => {
  try {
    const deletedBooking = await BookingModel.findByIdAndDelete(req.params.id);
    if (!deletedBooking) {
      return res.status(404).send({ message: "Booking not found" });
    }
    res.status(200).send({ message: "Booking deleted successfully" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
