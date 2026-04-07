require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testLatestModel() {
    console.log("=== Gemini 2.5 Flash 가용성 정밀 테스트 시작 ===");
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // 테스트할 최신 모델 목록
        const testModels = [
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-flash"
        ];
        
        for (const modelName of testModels) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello, are you Gemini 2.5 Flash?");
                const response = await result.response;
                console.log(`[PASS] ${modelName}: 응답 성공!`);
                console.log(`응답 일부: ${response.text().substring(0, 50)}...`);
            } catch (err) {
                console.log(`[FAIL] ${modelName}: ${err.message}`);
            }
        }
        
    } catch (err) {
        console.error("Critical Error during test:", err.message);
    }
}

testLatestModel();
