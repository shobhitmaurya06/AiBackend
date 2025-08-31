import express from 'express'
import { generateArticle, generateBlogTitle, generateImage } from '../controller/aiController.js';
import { auth } from '../middleware/auth.js';
const aiRouter=express.Router();
aiRouter.post("/generate-article",auth,generateArticle);
aiRouter.post('/generate-blog-title',auth,generateBlogTitle);
aiRouter.post("/generate-image",auth,generateImage);
export default aiRouter;