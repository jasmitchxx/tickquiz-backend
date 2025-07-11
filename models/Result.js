const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  name: { type: String, required: true },
  school: { type: String, required: true },
  score: { type: Number, required: true },
  total: { type: Number, default: 60 },
  subject: {
    type: String,
    required: true,
    enum: [
      // SHS Subjects
      "Physics", "Chemistry", "Biology", "CoreMaths", "AddMaths",
    "English", "SocialStudies", "Geography", "Economics",
    "ElectiveICT", "Accounting", "CostAccounting", "BusinessManagement"

      // JHS Subjects
      "EnglishLanguage", "Maths", "CoreScience", "SocialStudies",
    "CareerTech", "Computing", "RME", "French", "CreativeArtsAndDesign"

    ],
  },
  level: {
    type: String,
    enum: ["SHS", "JHS"],
    required: false,
  },
  code: {
    type: String,
    required: false,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Result', resultSchema);