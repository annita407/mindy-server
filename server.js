import express from "express";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";

const app = express();
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const upload = multer({ dest: "uploads/" });

app.get("/", (req, res) => {
  res.send("Mindy AI server running 🚀");
});

app.post("/analyze-text", async (req, res) => {
  try {
    const { text } = req.body;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `Convert this into a reminder, note, or calendar event: ${text}`,
    });

    res.json({ result: response.output_text });
  } catch (error) {
    console.error("Text analysis failed:", error);
    res.status(500).json({ error: "Text analysis failed" });
  }
});

async function analyzeImageWithAI(base64Image) {
  console.log("Sending image to OpenAI...");

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

First classify the image as one of:
- food
- food_label
- non_food
- unclear

Rules:
- If the image is not food or food packaging, return non_food
- If the image is blurry or uncertain, return unclear
- Do not guess random food
- If label instructions are visible, prioritize them
- If the image is food but no visible instructions, return estimated cooking guidance

Return ONLY valid JSON in this exact format:

{
  "category": "food | food_label | non_food | unclear",
  "detectedItem": "string or null",
  "confidence": 0.0,
  "source": "label | image_estimate | none",
  "instructionsFound": false,
  "labelInstructions": [],
  "mainGuidance": "string",
  "safetyNote": "string or null",
  "message": "string"
}
`,
          },
          {
            type: "input_image",
            image_url: `data:image/jpeg;base64,${base64Image}`,
          },
        ],
      },
    ],
  });

  console.log("Raw AI output:", response.output_text);
  return response.output_text;
}

app.post("/analyze-food-photo", upload.single("image"), async (req, res) => {
  try {
    console.log("Food photo route hit");

    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    console.log("Image received:", req.file.originalname || req.file.filename);
    console.log("Image size:", req.file.size);

    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = imageBuffer.toString("base64");

    const aiResult = await analyzeImageWithAI(base64Image);

    fs.unlinkSync(req.file.path);

    let parsed;
    try {
      parsed = JSON.parse(aiResult);
    } catch (parseError) {
      console.error("AI JSON parse failed:", parseError);
      console.error("Raw AI result:", aiResult);
      return res.status(500).json({
        error: "AI returned invalid JSON",
      });
    }

    res.json(parsed);
  } catch (error) {
    console.error("Food analysis route failed:", error);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Food analysis failed" });
  }
});

app.post("/analyze-label-photo", upload.single("image"), async (req, res) => {
  try {
    console.log("Label photo route hit");

    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    console.log("Label image received:", req.file.originalname || req.file.filename);
    console.log("Image size:", req.file.size);

    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = imageBuffer.toString("base64");

    const aiResult = await analyzeImageWithAI(base64Image);

    fs.unlinkSync(req.file.path);

    let parsed;
    try {
      parsed = JSON.parse(aiResult);
    } catch (parseError) {
      console.error("AI JSON parse failed:", parseError);
      console.error("Raw AI result:", aiResult);
      return res.status(500).json({
        error: "AI returned invalid JSON",
      });
    }

    res.json(parsed);
  } catch (error) {
    console.error("Label analysis route failed:", error);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Label analysis failed" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
