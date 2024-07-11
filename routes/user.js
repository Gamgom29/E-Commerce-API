const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const User = require('../model/user');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const verifyToken = require('../middlewares/verify_token_middleware');
const dotenv = require('dotenv');
dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET_KET;

// Get all users
router.get('/', asyncHandler(async (req, res) => {
    try {
        const users = await User.find();
        res.json({ success: true, message: "Users retrieved successfully.", data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));


router.post('/login', async (req, res) => {
    console.log('Imported SECRET_KEY:', SECRET_KEY);
    const { email, password } = req.body;

    try {
        // Check if the user exists
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }
        // Check if the password is correct
        if (user.password !== password) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        // Generate a token without an expiration time
        const token = jwt.sign({ id: user._id, email: user.email, isAdmin: user.isAdmin }, SECRET_KEY);

        // Authentication successful
        res.status(200).json({
            success: true,
            message: "Login successful.",
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                isAdmin: user.isAdmin,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                password: user.password,
                token: token,
                __v: user.__v
            },


        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// Get a user by ID
router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const userID = req.params.id;
        const user = await User.findById(userID);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        res.json({ success: true, message: "User retrieved successfully.", data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

router.post('/register', asyncHandler(async (req, res) => {
    const { email, name, password, phone, isAdmin } = req.body;
    if (!email || !name || !password || !phone) {
        return res.status(400).json({ success: false, message: "Email, name, password, and phone are required." });
    }

    try {
        // Check if a user with the given email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already exists." });
        }

        // Create and save the new user
        const user = new User({ email, name, password, phone, isAdmin });
        const newUser = await user.save();
        res.json({ success: true, message: "User created successfully.", data: null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));
// Update a user
router.put('/:id', verifyToken, asyncHandler(async (req, res) => {
    try {
        const userID = req.params.id;
        const { email, name, password, phone, isAdmin } = req.body;

        if (!name || !password || !email || !phone) {
            return res.status(400).json({ success: false, message: "Name, email, password, and phone are required." });
        }

        // Check if a user with the given email already exists, excluding the current user
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser._id.toString() !== userID) {
            return res.status(400).json({ success: false, message: "Email already exists." });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userID,
            { email, name, password, phone, isAdmin },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        res.json({ success: true, message: "User updated successfully.", data: updatedUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));
// Delete a user
router.delete('/:id', verifyToken, asyncHandler(async (req, res) => {
    try {
        const userID = req.params.id;
        const deletedUser = await User.findByIdAndDelete(userID);
        if (!deletedUser) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        res.json({ success: true, message: "User deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

module.exports = router;
