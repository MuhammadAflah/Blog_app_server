import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import crypto from "crypto";
import resetTokenModel from "../models/ResetToken.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
dotenv.config();

// REGISTER USER
export const register = async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "ProfileImage",
    });
    const { username, email, password} = req.body;

    // Add input validation rules
    await Promise.all([
      body("username")
        .matches(/^[a-z0-9A-Z]+$/)
        .withMessage(
          "Username must contain only lowercase letters, uppercase, and numbers "
        )
        .run(req),
      body("email").isEmail().withMessage("Invalid email address").run(req),
      body("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long")
        .run(req),
    ]);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map((error) => error.msg);
      return res.status(400).json({ error: errorMessages });
    }

    const sameUsername = await User.findOne({ username });
    if (sameUsername) {
      return res.status(409).json({ error: ["User Name Already Exists!"] });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: ["User Already Exists!"] });
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      name: "",
      email,
      password: passwordHash,
      picturePath: result.secure_url,
    });

    // Save user to database
    const savedUser = await newUser.save();

    // Return success message with user data
    return res.status(200).json({
      status: "Pending",
      message: "User registration successful",
      user: savedUser._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};


// LOGGING IN
export const login = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
    });
    if (!user) return res.status(400).json({ msg: "User does not exist. " });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid Password. " });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    delete user.password;
    res.status(200).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE PROFILE PHOTO
export const updateProPic = async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "ProfileImage",
    });
    const picturePath = result.secure_url;
    const { id } = req.user;
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { picturePath },
      { new: true }
    );
    res.status(201).json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: "Error Occured" });
  }
};

// FORGOT PASSWORD
export const forgotpassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    const token = await resetTokenModel.findOne({ seller: user._id });

    if (token) {
      return res.status(400).json({ message: "After one hour you can try!" });
    }
    const RandomTxt = crypto.randomBytes(20).toString("hex");
    const resetToken = new resetTokenModel({
      seller: user._id,
      token: RandomTxt,
    });
    await resetToken.save();
    const transport = nodemailer.createTransport({
      host: "sandbox.smtp.mailtrap.io",
      port: 2525,
      auth: {
        user: process.env.NODEMAIL_USER,
        pass: process.env.NODEMAIL_PASS,
      },
    });
    transport.sendMail({
      from: "blogspot@gmail.com",
      to: user.email,
      subject: "Reset Password",
      html: `http://localhost:3000/reset-password/?token=${RandomTxt}&_id=${user._id}`,
    });
    return res
      .status(200)
      .json({ message: "Check your email to reset password" });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// RESET PASSWORD
export const resetPassword = async (req, res) => {
  try {
    const { token, _id } = req.query;
    if (!token || !_id) {
      return res.status(400).json({ message: "Invalid request" });
    }
    const user = await User.findOne({ _id });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    const resetToken = await resetTokenModel.findOne({ seller: user._id });
    if (!resetToken) {
      return res.status(400).json({ message: "Reset token is not found" });
    }
    const matchToken = await bcrypt.compare(token, resetToken.token);
    if (!matchToken) {
      return res.status(400).json({ message: "Token is not valid" });
    }

    await Promise.all([
      body("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long")
        .matches(/[A-Z]/)
        .withMessage("Password must contain at least one uppercase letter")
        .run(req),
    ]);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map((error) => error.msg);
      return res.status(400).json({ error: errorMessages });
    }

    const { password } = req.body;
    const hashPass = await bcrypt.hash(password, 10);
    user.password = hashPass;
    await user.save();
    const transport = nodemailer.createTransport({
      host: "smtp.mailtrap.io",
      port: 2525,
      auth: {
        user: process.env.NODEMAIL_USER,
        pass: process.env.NODEMAIL_PASS,
      },
    });
    transport.sendMail({
      from: "socialmedia@gmail.com",
      to: user.email,
      subject: "Your password reset successfully",
      html: `Now you can login with new password`,
    });
    return res.status(200).json({ message: "Email has been send" });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GOOGLE SIGNUP

const CLIENT_ID = process.env.CLIENT_ID;
const  verify = async(client_id, jwtToken)=> {
  const client = new OAuth2Client(client_id);
  // Call the verifyIdToken to
  // varify and decode it
  const ticket = await client.verifyIdToken({
      idToken: jwtToken,
      audience: client_id,
  });
  // Get the JSON with all the user info
  const payload = ticket.getPayload();
  // This is a JSON object that contains
  // all the user info
  return payload;
}

export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    const data = await verify(CLIENT_ID, token);
    const { name, email, picture } = await verify(
      CLIENT_ID,
      token
    );
    const user = await User.findOne({ email: email });
    if (user) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      res.status(200).json({ token, user });
    } else {
      const newUser = new User({
        username: name,
        email: email,
        picturePath: picture,
      });

      const svedUser = await newUser.save();
      const token = jwt.sign({ id: svedUser._id }, process.env.JWT_SECRET);
      res.status(200).json({ token, user: svedUser });
    }
  } catch (error) {
    console.log(error);
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};