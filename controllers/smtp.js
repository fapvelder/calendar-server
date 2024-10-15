import { SMTPModel } from "../models/smtp.js";
import crypto from "crypto";
const secretKey = "thisisasecretkey";
const key = crypto.scryptSync(secretKey, "salt", 32); // Derive a key from the passphrase

// Function to encrypt text
export function encrypt(text) {
  const iv = crypto.randomBytes(16); // Generate a random initialization vector
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Return a single string containing IV and encrypted data
  return `${iv.toString("hex")}:${encrypted}`;
}
export const getSMTP = async (req, res) => {
  try {
    const smtp = await SMTPModel.findOne();
    const modifiedSMTP = {
      ...smtp.toObject(), // Convert Mongoose document to plain object
      password: encrypt(smtp.password), // Change the password here as needed
    };
    res.status(200).send(smtp);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
export const createSMTP = async (req, res) => {
  try {
    const newSMTP = new SMTPModel(req.body);
    await newSMTP.save();
    res.status(201).send(newSMTP);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
export const updateSMTP = async (req, res) => {
  try {
    const updatedSMTP = await SMTPModel.findByIdAndUpdate(
      req.params.id,
      { ...req.body, password: encrypt(req.body.password) },
      { new: true }
    );

    if (!updatedSMTP) {
      return res.status(404).send({ message: "SMTP not found" });
    }

    res.status(200).send(updatedSMTP);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
};

// Delete an SMTP entry by ID
export const deleteSMTP = async (req, res) => {
  try {
    const deletedSMTP = await SMTPModel.findByIdAndDelete(req.params.id);

    if (!deletedSMTP) {
      return res.status(404).send({ message: "SMTP not found" });
    }

    res.status(200).send({ message: "SMTP deleted successfully" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
