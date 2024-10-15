import { BookingModel } from "../models/booking.js";
import moment from "moment";
import nodemailer from "nodemailer";

export const getBookings = async (req, res) => {
  try {
    const bookings = await BookingModel.find();
    res.status(200).send(bookings);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export const createBooking = async (req, res) => {
  try {
    const { visitDate, timeSlot, email, representative } = req.body.data;

    const existingBooking = await BookingModel.findOne({
      visitDate: visitDate,
      timeSlot: timeSlot,
      status: { $ne: "cancelled" },
    });

    if (existingBooking) {
      return res
        .status(400)
        .send({ message: "This time slot is already booked." });
    }

    const newBooking = new BookingModel(req.body.data);
    const savedBooking = await newBooking.save();

    if (savedBooking) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS,
        },
      });

      const mailOptions = {
        from: process.env.GMAIL_USER,
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

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log("Error occurred: " + error.message);
          return res.status(400).send({ message: "Mail sent failed" });
        } else {
          console.log("Email sent: " + info.response);
          return res.status(201).send(savedBooking);
        }
      });
    }
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// export const getTimeSlots = async (req, res) => {
//   try {
//     const today = moment();
//     const threeMonthsLater = moment().add(3, "months");

//     const bookings = await BookingModel.find();

//     let timeSlots = [];

//     for (
//       let d = today.clone();
//       d.isBefore(threeMonthsLater) || d.isSame(threeMonthsLater);
//       d.add(1, "days")
//     ) {
//       const availableSlots = ["morning", "afternoon"];

//       const dateStr = d.format("YYYY-MM-DD");
//       const dayBookings = bookings.filter((booking) =>
//         moment(booking.visitDate).isSame(dateStr, "day")
//       );

//       dayBookings.forEach((booking) => {
//         const index = availableSlots.indexOf(booking.timeSlot);
//         if (index > -1) {
//           availableSlots.splice(index, 1);
//         }
//       });

//       if (availableSlots.length > 0) {
//         timeSlots.push({
//           date: d.format("YYYY-MM-DD"),
//           slotsAvailable: availableSlots,
//         });
//       }
//     }
//     return res.status(200).send(timeSlots);
//   } catch (err) {
//     res.status(500).send({ message: err.message });
//   }
// };
export const getTimeSlots = async (req, res) => {
  try {
    // Fetch all existing bookings from today onward
    const today = new Date();
    const bookings = await BookingModel.find({
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
