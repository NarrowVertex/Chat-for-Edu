const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

router.post('/ask', async (req, res) => {
    const { prompt } = req.body;
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
        });
        res.json({ answer: response.choices[0].message.content });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
