import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";
import { register } from "./controllers/auth.js";
import { updateProPic } from "./controllers/auth.js";
import { createPost } from "./controllers/posts.js";
import { verifyToken } from "./middlleware/auth.js";
import { createServer } from "http";
import connectDB from "./config/db.js";

// CONFIGURATIONS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
const app = express();
const httpServer = createServer(app);
app.use(cors({
  origin: 'https://blog-app-client-omega.vercel.app'
}));


app.use(express.json());

app.use(morgan("common"));
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());
app.use("/assets", express.static(path.join(__dirname, "public/assets")));

// // FILE STORAGE
const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    cb(null, file.originalname + Date.now());
  },
});
const upload = multer({ storage });

// ROUTES WITH FILE
app.post("/auth/register", upload.single("picture"), register);
app.put("/auth/update", verifyToken, upload.single("picture"), updateProPic);
app.post("/posts", verifyToken, upload.single("picture"), createPost);

// ROUTES
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/posts", postRoutes);

// MONGOOSE SETUP
connectDB();
const PORT = 5000 || 5001;
httpServer.listen(PORT, () => console.log(`Server Running Port:${PORT}`));