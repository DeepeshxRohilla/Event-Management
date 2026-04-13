const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');

// Volunteer Scans the QR (AJAX Call)
router.post('/verify-scan', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'volunteer') {
        return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    try {
        const { ticketId } = req.body;
        const ticket = await Ticket.findById(ticketId).populate('event student');

        if (!ticket) return res.json({ success: false, message: "Invalid Pass!" });

        if (ticket.isUsed) {
            return res.json({ 
                success: false, 
                message: "ALREADY USED!", 
                student: ticket.student.name 
            });
        }

        // Mark as used
        ticket.isUsed = true;
        ticket.scannedBy = req.session.user.id;
        ticket.scannedAt = new Date();
        await ticket.save();

        res.json({ 
            success: true, 
            message: "ACCESS GRANTED ✅", 
            student: ticket.student.name, 
            seat: ticket.seatNo 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

module.exports = router;