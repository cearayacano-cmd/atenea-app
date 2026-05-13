import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

async function test() {
  const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });

  try {
    console.log(`Testing model: gemini-3.1-flash-lite`);
    const response = await genAI.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [{ role: 'user', parts: [{ text: "Hi" }] }],
    });
    console.log(`Success!`, response.text);
  } catch (error) {
    console.log(`Failed:`, error.message);
  }
}

test();
