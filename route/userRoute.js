import express from 'express'
import { auth } from '../middleware/auth.js'
import { getPublishCreation, getUserCreation, toggleLikeCreations } from '../controller/userController.js'
const UserRouter=express.Router()
UserRouter.get('/get-user-creations',auth,getUserCreation);
UserRouter.get('/get-published-creations',auth,getPublishCreation);
UserRouter.post('/toggle-like-creation',auth,toggleLikeCreations);
export default UserRouter;

