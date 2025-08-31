import OpenAI from "openai";
import sql from "../config/Database.js";
import { clerkClient } from "@clerk/express";

const AI = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

export const generateArticle = async (req, res) => {
  console.log("enter in the controller");

  try {
    const { userId } = req.auth();  // ✅ fixed
    const { prompt, length } = req.body;

    const plan = req.plan;
    const free_usage = req.free_usage;

    // Rate-limit free users
    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Limit reached. Upgrade to continue."
      });
    }

    // Call Gemini (OpenAI-compatible)
    const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: length
    });

    const content = response.choices[0].message?.content || "No content generated";

    // Save to DB (✅ fixed table name)
     console.log(content);
    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${prompt}, ${content}, 'article')
    `;
    // Update free usage count for non-premium users
    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1
        }
      });
    }
    return res.json({ success: true, content });

  } catch (error) {
    console.error("Generate Article Error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
