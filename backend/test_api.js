require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];

  for (const modelName of models) {
    console.log(`\n--- Testing Model: ${modelName} ---`);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Hello, strictly reply with 'OK' only.");
      const response = await result.response;
      console.log(`Result from ${modelName}:`, response.text());
    } catch (err) {
      console.error(`Error with ${modelName}:`, err.message);
      if (err.status) console.error(`Status: ${err.status}`);
    }
  }
}

testModels();
