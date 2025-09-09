import OpenAI from "openai";
import sql from "../config/Database.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'
import pdf from 'pdf-parse/lib/pdf-parse.js'

const AI = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

export const generateArticle = async (req, res) => {


  try {
    const { userId } = req.auth();  // ✅ fixed
    const { prompt, length } = req.body;

    const plan = req.plan;
    const free_usage = req.free_usage;

    // Rate-limit free users
    if (plan !== "premium" && free_usage >= 20) {
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
   
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
export const generateBlogTitle = async (req, res) => {

  try {
    const { userId } = req.auth(); 
    const { prompt} = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;
    if (plan !== "premium" && free_usage >= 20) {
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
   
    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${prompt}, ${content}, 'blog-title')
    `;
    // Update free usage count for non-premium users
    // if (plan !== "premium") {
    //   await clerkClient.users.updateUserMetadata(userId, {
    //     privateMetadata: {
    //       free_usage: free_usage + 1
    //     }
    //   });
    // }
    return res.json({ success: true, content });

  } catch (error) {
  
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
export const generateImage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, publish } = req.body;
    const plan = req.plan;
    // check plan
    // if (plan !== "premium") {
    //   return res.json({
    //     success: false,
    //     message: "This feature is only available for premium subscriptions"
    //   });
    // }
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
   

    // save to db
    await sql`
      INSERT INTO creations (user_id, prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})
    `;

    return res.json({ success: true, content: secure_url });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const removeImageBackground = async (req, res) => {

  try {
    const { userId } = req.auth();
    const image=req.file;
    const plan = req.plan;
    // check plan
    // if (plan !== "premium") {
    //   return res.json({
    //     success: false,
    //     message: "This feature is only available for premium subscriptions"
    //   });
    // }
    // prepare form data
  
    // upload to cloudinary
    // const { secure_url } = await cloudinary.uploader.upload(image.path,{
    //   transformation:[
    //     {
    //       effect:'background-removal',
    //       background_removal:'remove_the_background'

    //     }
    //   ]
    // })
    const { secure_url } = await cloudinary.uploader.upload(image.path, {
  background_removal: "cloudinary_ai" // or "remove_the_background" if enabled on your account
});


    // save to db
    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId},'Remove background from image', ${secure_url}, 'image')
    `;
    return res.json({ success: true, content: secure_url });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const removeImageObject = async (req, res) => {
  try {
    const { userId } = req.auth();
    const {object}=req.body;
    const {image}=req.file;
    const plan = req.plan;
    // check plan
    // if (plan !== "premium") {
    //   return res.json({
    //     success: false,
    //     message: "This feature is only available for premium subscriptions"
    //   });
    // }
    
    // upload to cloudinary
    const {public_id} = await cloudinary.uploader.upload(image.path);
    const imageURl=cloudinary.url(public_id,{
      transformation:[{effect:`gen-remove:${object}`}],
      resource_type:'image'
    })

    // save to db
    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId},${`Removed ${object} from image`}, ${imageURl}, 'image')
    `;
    return res.json({ success: true, content:imageURl});
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const resumeReview = async (req, res) => {
  try {
    const { userId } = req.auth();
    const resume=req.file;
    const plan = req.plan;
    // check plan
    // if (plan !== "premium") {
    //   return res.json({
    //     success: false,
    //     message: "This feature is only available for premium subscriptions"
    //   });
    // }
    //check file size
    if(resume.size>10*1024*1024){
      return res.json({
        success:false,
        message:"Resume file size exceeds  allowed size  10MB"
      })
    }
    const dataBuffer=fs.readFileSync(resume.path);
    const pdfData=await pdf(dataBuffer);
    const prompt=`Review the following resume and provide constructive feedback on its strengths ,weakness, and areas for improvement  and calculate ATS score.show the overall ATS score in the last. Resume content:\n\n${pdfData.text}`;
     const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens:1000
    });
    // save to db
    const content=response.choices[0].message.content;
    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId},'Review the uploaded resume', ${content}, 'resume-review')
    `;
    return res.json({ success: true, content:content});
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

