import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { clerkMiddleware,requireAuth } from '@clerk/express'
import aiRouter from './route/aiRoutes.js';
import connectCloudinary from './config/cloudinary.js';
const app=express();
await connectCloudinary();
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());
app.get("/",(req,res)=>res.send("server is live"));
app.use(requireAuth());
app.use('/api/ai',aiRouter)
const port=process.env.PORT || 3000
app.listen(port,()=>{
    console.log(`sever is running at ${port}`);
})
