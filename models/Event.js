const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    singerName: { type: String, required: true },
    eventTitle: { type: String, required: true },
    date: { type: String, required: true },
    venue: { type: String, default: 'College Main Ground' },
    price: { type: Number, required: true },
    totalSeats: { type: Number, required: true },
    bookedSeats: { type: Number, default: 0 },
    image: { type: String, default: 'https://via.placeholder.com/300x200?text=Concert' }
});

module.exports = mongoose.model('Event', eventSchema);