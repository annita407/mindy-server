import express from "express";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";

const app = express();
app.use(express.json());

// 🔐 OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 📦 Multer setup (temp file storage)
const upload = multer({ dest: "uploads/" });

// ----------------------------
// HEALTH CHECK
// ----------------------------
app.get("/", (req, res) => {
  res.send("Mindy AI server running 🚀");
});

// ----------------------------
// TEXT (your old one)
// ----------------------------
app.post("/analyze-text", async (req, res) => {
  try {
    const { text } = req.body;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `Convert this into a reminder, note, or calendar event: ${text}`,
    });

    res.json({ result: response.output_text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Text analysis failed" });
  }
});

// ----------------------------
// IMAGE ANALYSIS CORE FUNCTION
// ----------------------------
async function analyzeImageWithAI(base64Image) {
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `
You are a smart food analysis AI.

Step 1: classify image:
- food
- food_label
- non_food
- unclear

Step 2:
If food_label:
- extract cooking instructions if visible

If food:
- identify food and give cooking guidance

If non_food:
- say it's not food

If unclear:
- say unclear

Return ONLY JSON in this format:

{
  "category": "...",
  "detectedItem": "...",
  "confidence": 0.0,
  "source": "...",
  "hasCookingInstructions": false,
  "cookingGuidance": "...",
  "message": "..."
}

DO NOT GUESS RANDOM FOOD.
If unsure → use "unclear" or "non_food".
`
          },
          {
            type: "input_image",
            image_base64: base64Image,
          },
        ],
      },
    ],
  });

  return response.output_text;
}

// ----------------------------
// FOOD PHOTO
// ----------------------------
app.post("/analyze-food-photo", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    // read image
    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = imageBuffer.toString("base64");

    console.log("📸 Image received:", req.file.originalname);

    const aiResult = await analyzeImageWithAI(base64Image);

    // delete temp file
    fs.unlinkSync(req.file.path);

    let parsed;
    try {
      parsed = JSON.parse(aiResult);
    } catch (e) {
      return res.status(500).json({
        error: "AI returned invalid JSON",
        raw: aiResult,
      });
    }

    res.json(parsed);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Food analysis failed" });
  }
});

// ----------------------------
// LABEL PHOTO (same logic for now)
// ----------------------------
app.post("/analyze-label-photo", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = imageBuffer.toString("base64");

    console.log("🏷️ Label image received");

    const aiResult = await analyzeImageWithAI(base64Image);

    fs.unlinkSync(req.file.path);

    let parsed;
    try {
      parsed = JSON.parse(aiResult);
    } catch (e) {
      return res.status(500).json({
        error: "AI returned invalid JSON",
        raw: aiResult,
      });
    }

    res.json(parsed);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Label analysis failed" });
  }
});

// ----------------------------
// START SERVER
// ----------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
