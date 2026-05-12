const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// AI 모델 설정 로드
const modelsConfigPath = path.join(__dirname, 'ai-models.json');
let availableModels = [];
if (fs.existsSync(modelsConfigPath)) {
  availableModels = JSON.parse(fs.readFileSync(modelsConfigPath, 'utf8'));
}

/**
 * Google Gemini Provider
 */
class GoogleProvider {
  constructor(config) {
    this.config = config;
    const apiKey = process.env[config.apiKeyEnv];
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: config.endpoint,
      generationConfig: {
        temperature: config.temperature || 0.7
      }
    });
  }

  fileToGenerativePart(filePath, mimeType) {
    return {
      inlineData: {
        data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
        mimeType,
      },
    };
  }

  async generateResponse({ prompt, history = [], imagePath, mimeType }) {
    // History format conversion: { role, content } -> { role, parts: [{ text }] }
    // Google uses "model" instead of "assistant"
    const contents = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const currentParts = [{ text: prompt }];
    if (imagePath && fs.existsSync(imagePath)) {
      currentParts.push(this.fileToGenerativePart(imagePath, mimeType || 'image/jpeg'));
    }

    contents.push({
      role: 'user',
      parts: currentParts
    });

    const result = await this.model.generateContent({ contents });
    const response = await result.response;
    return response.text();
  }
}

/**
 * OpenAI Provider (Skeleton)
 */
class OpenAIProvider {
  constructor(config) {
    this.config = config;
    // OpenAI SDK should be installed: npm install openai
    try {
      const OpenAI = require('openai');
      this.client = new OpenAI({
        apiKey: process.env[config.apiKeyEnv]
      });
    } catch (e) {
      console.warn("OpenAI SDK is not installed. Please run 'npm install openai'");
    }
  }

  async generateResponse({ prompt, history = [], imagePath, mimeType }) {
    if (!this.client) {
      throw new Error("OpenAI SDK가 설치되어 있지 않습니다.");
    }

    const messages = history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Handle image for OpenAI (Vision models)
    if (imagePath && fs.existsSync(imagePath)) {
      const base64Image = Buffer.from(fs.readFileSync(imagePath)).toString("base64");
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType || 'image/jpeg'};base64,${base64Image}`
            }
          }
        ]
      });
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    const response = await this.client.chat.completions.create({
      model: this.config.endpoint,
      messages: messages,
      temperature: this.config.temperature || 0.7,
    });

    return response.choices[0].message.content;
  }
}

/**
 * Custom HTTP Provider for generic AI APIs
 */
class CustomHttpProvider {
  constructor(config) {
    this.config = config;
    this.apiKey = process.env[config.apiKeyEnv];
  }

  async generateResponse({ prompt, history = [], imagePath, mimeType }) {
    const url = this.config.url;
    if (!url) throw new Error("Custom API URL이 설정되지 않았습니다.");

    // Basic body structure following OpenAI-like format as default
    const body = {
      model: this.config.endpoint,
      messages: [
        ...history.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: prompt }
      ],
      temperature: this.config.temperature || 0.7
    };

    const headers = {
      'Content-Type': 'application/json',
      ...this.config.headers
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // Use configured response path or default to OpenAI-like path
      const responsePath = this.config.responsePath || 'choices[0].message.content';
      return responsePath.split(/[.[\]]+/).filter(Boolean).reduce((acc, part) => acc && acc[part], data);
    } catch (error) {
      console.error("Custom AI API Error:", error);
      throw new Error(`Custom AI API 호출 실패: ${error.message}`);
    }
  }
}

/**
 * AI Service Factory
 */
const getProvider = (modelId) => {
  const config = availableModels.find(m => m.id === modelId) || availableModels[0];
  if (!config) throw new Error("사용 가능한 AI 모델 설정이 없습니다.");

  switch (config.provider) {
    case 'google':
      return new GoogleProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'custom':
      return new CustomHttpProvider(config);
    default:
      throw new Error(`지원하지 않는 제공자입니다: ${config.provider}`);
  }
};

const generateResponse = async (modelId, options) => {
  const provider = getProvider(modelId);
  return await provider.generateResponse(options);
};

module.exports = {
  generateResponse,
  availableModels
};
