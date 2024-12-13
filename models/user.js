import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "User", enum: ["User", "Admin"] },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model("User", userSchema);
