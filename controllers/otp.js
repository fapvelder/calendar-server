import crypto from "crypto";
import { OTPModel } from "../models/otp.js";
import { otpSchema, verifyOTPSchema } from "../validate.js";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { BookingModel } from "../models/booking.js";
import { sendBookingConfirmationEmail } from "./booking.js";

export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};
export const createOTPAndSendSMS = async (bookingID, phone, otp) => {
  //   const { phone } = req.body.data;

  const { error } = otpSchema.validate({ phone });
  if (error) {
    return { error: error.details[0].message };
  }

  try {
    // const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const data = await sendSMS(phone, otp); // Wait for SMS to send successfully
    if (data.CodeResult !== "100") {
      return res
        .status(400)
        .json({ success: false, message: "Có lỗi xảy ra khi gửi OTP" });
    }

    const newOTP = new OTPModel({ bookingID, phone, otp, expiresAt });
    await newOTP.save();
    // For testing, send OTP in response (avoid this in production)
    return { message: "OTP sent successfully" };
  } catch (err) {
    return { error: "Failed to generate OTP" };
  }
};

export const verifyOTP = async (req, res) => {
  const { bookingID, phone, otp } = req.body;

  // Validate input
  const { error } = verifyOTPSchema.validate({ phone, otp });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const otpRecord = await OTPModel.findOne({
      bookingID: bookingID,
      phone,
    }).sort({
      expiresAt: -1,
    });

    if (!otpRecord) {
      return res.status(404).json({ valid: false, message: "OTP not found" });
    }

    if (otpRecord.expiresAt < Date.now()) {
      await OTPModel.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ valid: false, message: "OTP expired" });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ valid: false, message: "Invalid OTP" });
    }
    const booking = await BookingModel.findOne({ _id: bookingID, phone, otp });
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    const { representative, email, location } = booking;
    booking.status = "confirmed";
    booking.otp = undefined;
    await booking.save();
    await OTPModel.deleteOne({ _id: otpRecord._id });
    await sendBookingConfirmationEmail(email, representative, location);

    return res
      .status(200)
      .json({ valid: true, message: "OTP verified successfully" });
  } catch (err) {
    return res.status(400).json({ error: "Failed to verify OTP" });
  }
};
const sendSMS = async (phone, otp) => {
  try {
    const uniqueRequestId = `Monamedia-${uuidv4()}`;
    const sms = await axios.post(
      "https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/",
      {
        ApiKey: process.env.API_KEY_SMS,
        Content: `${otp} la ma xac minh dang ky Baotrixemay cua ban`,
        Phone: phone,
        SecretKey: process.env.SECRET_KEY_SMS,
        Brandname: "Baotrixemay",
        SmsType: "2",
        IsUnicode: "0",
        Sandbox: "0",
        RequestId: uniqueRequestId,
      }
    );
    return sms.data;
  } catch (err) {
    console.error("Failed to send SMS:", err.message);
    throw new Error("Failed to send SMS");
  }
};
export const resendOTP = async (req, res) => {
  try {
    const { bookingID, phone } = req.body;
    if (!bookingID) {
      return res
        .status(400)
        .json({ success: false, message: "Booking ID is required." });
    }

    const booking = await BookingModel.findById(bookingID);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found." });
    }

    const now = Date.now(); // Current time in milliseconds
    const lastOTPSent = new Date(booking.lastOTPSent).getTime(); // Convert to timestamp

    // Check if more than 2 minutes (120,000 milliseconds) have passed
    if (now - lastOTPSent < 2 * 60 * 1000) {
      const timeRemaining = Math.ceil(
        (2 * 60 * 1000 - (now - lastOTPSent)) / 1000
      );
      return res.status(400).json({
        message: `Please wait ${timeRemaining} seconds before requesting another OTP.`,
      });
    }

    const today = new Date(); // Get the current date
    today.setHours(0, 0, 0, 0); // Normalize to the start of the day

    const bookingDate = new Date(booking.visitDate);
    if (bookingDate < today) {
      return res
        .status(400)
        .send({ message: "Cannot resend OTP a booking in the past." });
    }
    if (booking.status === "confirmed") {
      return res.status(400).json({
        success: false,
        message: `Cannot resend OTP. Booking is already ${booking.status}.`,
      });
    }
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    booking.status = "waiting";
    booking.otp = otp;
    booking.lastOTPSent = Date.now();
    booking.phone = phone;
    await booking.save();
    const data = await sendSMS(booking.phone, otp);
    if (data.CodeResult !== "100") {
      return res
        .status(400)
        .json({ success: false, message: "Có lỗi xảy ra khi gửi OTP" });
    }

    const newOTP = new OTPModel({ bookingID, phone, otp, expiresAt });
    await newOTP.save();
    setTimeout(async () => {
      try {
        // Fetch the latest status of the booking
        const bookingToCheck = await BookingModel.findById(bookingID);
        if (bookingToCheck && bookingToCheck.status === "waiting") {
          // Update the status if it is still "waiting"
          await BookingModel.findByIdAndUpdate(bookingID, {
            status: "available",
          });
          console.log(`Booking ${bookingID} status updated to "available".`);
        } else {
          console.log(
            `Booking ${bookingID} status is ${bookingToCheck.status}`
          );
        }
      } catch (error) {
        console.error(
          `Error during scheduled status check for booking ${bookingID}:`,
          error.message
        );
      }
    }, 5 * 60 * 1000);

    // For testing, send OTP in response (avoid this in production)
    return res
      .status(200)
      .json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    return res.status(400).json({ error: "Failed to send OTP" });
  }
};
