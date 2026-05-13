import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

async function listModels() {
  const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });
  
  try {
    const models = await genAI.models.list();
    console.log("Models Response:", JSON.stringify(models, null, 2));
  } catch (e) {
    console.error("Error listing models:", e);
  }
}

listModels();
