import mongoose from "mongoose";

const smtpSchema = new mongoose.Schema({
  host: { type: String, required: true },
  secure: { type: String },
  port: { type: Number },
  username: { type: String },
  password: { type: String },
  disableLogs: { type: Boolean },
});
export const SMTPModel = mongoose.model("SMTP", smtpSchema);
