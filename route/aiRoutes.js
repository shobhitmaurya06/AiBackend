import express from 'express'
import { generateArticle } from '../controller/aiController.js';
import { auth } from '../middleware/auth.js';
const aiRouter=express.Router();
aiRouter.post("/generate-article",auth,generateArticle);
export default aiRouter;