import Joi from "joi";

export const verifyOTPSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      "string.empty": "Phone number is required",
      "string.pattern.base": "Phone number must be exactly 10 digits",
    }),
  otp: Joi.string()
    .length(6) // OTP must be exactly 6 digits
    .required()
    .messages({
      "string.empty": "OTP is required",
      "string.length": "OTP must be 6 digits",
    }),
});
export const otpSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^[0-9]{10}$/) // Matches exactly 10 digits
    .required()
    .messages({
      "string.empty": "Phone number is required",
      "string.pattern.base": "Phone number must be exactly 10 digits",
    }),
});
