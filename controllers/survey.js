import { SurveyModel } from "../models/survey";

export const getAllSurveys = async (req, res) => {
  const surveys = await SurveyModel.find({});
  res.send(surveys);
};
export const submitSurvey = async (req, res) => {
  try {
    const { response } = req.body;
    const newResponse = new SurveyModel({ response });
    const savedSurvey = await newResponse.save();
    if (savedSurvey) {
      return res.status(200).send({ message: "Thank you for your response!" });
    }
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
