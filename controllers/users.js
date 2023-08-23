import User from "../models/User.js";
import bcrypt from "bcrypt";

// const { Pool } = require('pg');
// const pool = new Pool({
//   user: 'your_username',
//   password: 'your_password',
//   host: 'your_host',
//   port: 'your_port',
//   database: 'your_database',
// });

/* READ */
export const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    res.status(200).json({
      user,

    });
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

// const getUser = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Connect to the database
//     const client = await pool.connect();

//     // Query the user by id
//     const query = 'SELECT * FROM users WHERE id = $1';
//     const values = [id];
//     const result = await client.query(query, values);

//     // Release the database connection
//     client.release();

//     // Get the first row from the result
//     const user = result.rows[0];

//     res.status(200).json({
//       user,
//     });
//   } catch (err) {
//     res.status(404).json({ message: err.message });
//   }
// };


export const getUsers = async (req, res) => {
  try {
    const user = await User.find({});
    res.status(200).json(user);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      username,
      email,
      bio,
      oldPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    let user = await User.findById(id);
    if (user) {
      user.username = username.trim() || user.username;
      user.name = name.trim() || user.name;
      user.bio = bio.trim() || user.bio;
      user.email = email.trim() || user.email;
      if (oldPassword) {
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch)
          return res.status(400).json({ error: "Invalid Old Password. " });

        if (newPassword == confirmPassword) {
          const salt = await bcrypt.genSalt();
          const passwordHash = await bcrypt.hash(confirmPassword, salt);
          user.password = passwordHash;
        } else {
          return res
            .status(400)
            .json({ error: "Old password not same to new password" });
        }
      }

      const updatedUser = await user.save(); // Save the changes to the user object
      res.status(200).json(updatedUser);
    }
  } catch (err) {
    res.status(404).json({ error: "Email or Username Already Exists!" });
  }
};
