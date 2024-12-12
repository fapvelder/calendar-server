import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema({
  sectionType: {
    type: String,
    required: true,
  },
  content: {
    type: mongoose.Schema.Types.Mixed, // Allows for flexible content structure
    required: true,
  },
});

const pageSchema = new mongoose.Schema({
  language: {
    type: String,
    required: true,
    enum: ["vi", "jp", "en"],
  },
  sections: [sectionSchema],
});

export const PageModel = mongoose.model("Page", pageSchema);
