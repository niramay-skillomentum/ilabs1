require("dotenv").config();
const { generateTutorResponse } = require("./src/engine/tutorAI");

(async () => {
  try {
    console.log("Testing generateTutorResponse...");
    const res = await generateTutorResponse("Hello", "SETTLEMENT", null, []);
    console.log("Response:", res);
  } catch (e) {
    console.error("Error:", e);
  }
})();
