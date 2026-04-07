require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAI() {
  console.log("--- Testing OpenAI API Connection ---");
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Say 'API OK' if you can hear me." }],
      max_tokens: 10
    });
    console.log("Response from OpenAI:", response.choices[0].message.content);
    console.log("✅ API Key is working!");
  } catch (err) {
    console.error("❌ OpenAI API Error:", err.message);
    if (err.status === 401) console.error("원인: API 키가 잘못되었거나 만료되었습니다.");
    if (err.status === 429) console.error("원인: 잔액이 부족하거나 할당량이 초과되었습니다 (Insufficient quota).");
  }
}

testOpenAI();
