const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seatNo: { type: String, required: true },
    ticketID: { type: String, unique: true }, // For the QR code
    isUsed: { type: Boolean, default: false }, // Tracks if the student has entered
    scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // The volunteer who scanned it
    scannedAt: { type: Date },
    purchaseDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ticket', ticketSchema);