import { UserModel } from "../models/user.js";
import bcrypt from "bcrypt";
import { generateToken } from "../utils.js";

// Create Admin User
export const createUser = async (req, res) => {
  try {
    const { fullname, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new UserModel({
      fullname,
      email,
      password: hashedPassword,
      role,
    });
    await newUser.save();
    return res
      .status(201)
      .json({ message: "User created successfully", user: newUser });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error creating user", error });
  }
};

// Update Admin User
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedUser = await UserModel.findByIdAndUpdate(id, updates, {
      new: true,
    });
    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });

    res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error });
  }
};

// Delete Admin User
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedUser = await UserModel.findByIdAndDelete(id);
    if (!deletedUser)
      return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error });
  }
};
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate access token
    const accessToken = generateToken(user);

    res.status(200).json({ accessToken });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error });
  }
};
