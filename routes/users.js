const router = express.Router();
import express from "express";
import {
  getUser,
  getUsers,
  updateUser,
} from "../controllers/users.js";
import { verifyToken } from "../middlleware/auth.js";

/* READ */
router.get("/", verifyToken, getUsers);
router.get("/:id", verifyToken, getUser);

/*UPDATE USER */
router.put("/:id", verifyToken, updateUser);



export default router;
