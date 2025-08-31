import OpenAI from "openai";
import sql from "../config/Database.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import {v2 as cloudinary} from 'cloudinary'

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
export const generateBlogTitle = async (req, res) => {
  console.log("enter in the controller");

  try {
    const { userId } = req.auth(); 
    const { prompt} = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;
    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Limit reached. Upgrade to continue."
      });
    } 
    const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens:100,
    });

    const content = response.choices[0].message?.content || "No content generated";
    // Save to DB 
     console.log(content);
    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${prompt}, ${content}, 'blog-title')
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
    console.error("Generate blog-title Error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
export const generateImage = async (req, res) => {
  console.log("enter in the controller");
  try {
    const { userId } = req.auth();
    const { prompt, publish } = req.body;
    const plan = req.plan;
    // check plan
    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only available for premium subscriptions"
      });
    }
    // prepare form data
    const formData = new FormData();
    formData.append("prompt", prompt);

    // send request to ClipDrop
    const { data } = await axios.post(
      "https://clipdrop-api.co/text-to-image/v1",
      formData,
      {
        headers: {
          "x-api-key": process.env.CLIP_DROP_API_KEY,
        },
        responseType: "arraybuffer",
      }
    );

    // convert binary to base64
    const base64Image = `data:image/png;base64,${Buffer.from(data).toString("base64")}`;
    // upload to cloudinary
    const { secure_url } = await cloudinary.uploader.upload(base64Image, {
      folder: "creations", // optional: keep images organized
    });
    console.log(secure_url);

    // save to db
    await sql`
      INSERT INTO creations (user_id, prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})
    `;

    return res.json({ success: true, content: secure_url });

  } catch (error) {
    console.error("Generate Image Error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

