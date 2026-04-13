const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

// Get all events for the landing page
router.get('/events', async (req, res) => {
    try {
        const events = await Event.find().sort({ date: 1 });
        res.json(events);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;