const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Signup Logic
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.send("User already exists!");

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'student'
        });

        await newUser.save();
        res.redirect('/login');
    } catch (err) {
        res.status(500).send("Error creating account");
    }
});

// Login Logic
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.send("User not found!");

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.send("Invalid Password!");

        // Set session
        req.session.user = {
            id: user._id,
            name: user.name,
            role: user.role
        };

        // Redirect based on role
        if (user.role === 'volunteer') return res.redirect('/volunteer/dashboard');
        if (user.role === 'admin') return res.redirect('/admin/dashboard');
        res.redirect('/student/dashboard');

    } catch (err) {
        res.status(500).send("Login Error");
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;