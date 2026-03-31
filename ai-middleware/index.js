import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/generate', async (req, res) => {
  // TODO: Receive prompts and inputs, interface with OpenAI API, and return responses
  res.json({ success: true, message: 'Connected to AI Middleware' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log("AI Middleware Server listening on port ");
});
