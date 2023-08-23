import express from "express";
import {
  forgotpassword,
  login,
  resetPassword,
  register,
  updateProPic,
} from "../controllers/auth.js";

const router = express.Router();

router.post("/register", register)
router.post("/login", login);
router.post("/forgot-password", forgotpassword);
router.put("/reset-password", resetPassword);
router.put("/update",updateProPic)



export default router;
