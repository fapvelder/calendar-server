import mongoose from "mongoose";

const surveySchema = new mongoose.Schema({
  response: {
    type: String,
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

export const SurveyModel = mongoose.model("Survey", surveySchema);
