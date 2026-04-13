import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("Mindy server is running");
});

app.post("/analyze-text", async (req, res) => {
  try {
    const { text } = req.body;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `Convert this into a reminder, note, or calendar event: ${text}`,
    });

    res.json({
      result: response.output_text,
    });

  } catch (error) {
    res.status(500).json({ error: "Error processing request" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running");
});
