require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const morgan = require('morgan');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/event');
const ticketRoutes = require('./routes/ticket');
const Event = require('./models/Event');
const Ticket = require('./models/Ticket');
const User = require('./models/User');

const app = express();

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🔌 Connected to MongoDB Successfully!"))
    .catch(err => console.log("❌ MongoDB Connection Error:", err.message));

app.set('view engine', 'ejs');
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'festpulse_secret_2026',
    resave: false,
    saveUninitialized: false
}));

// Global variables for EJS (Available in all views)
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// ====================== PUBLIC ROUTES ======================

// Landing Page: Shows all shows to everyone (Guest + Logged In)
app.get('/', async (req, res) => {
    try {
        const events = await Event.find();
        res.render('index', { events });
    } catch (err) {
        res.render('index', { events: [] });
    }
});

app.get('/login', (req, res) => res.render('login'));
app.get('/signup', (req, res) => res.render('signup'));

// Utility to create initial admin
app.get('/create-admin-account', async (req, res) => {
    try {
        const adminEmail = "admin@festpulse.com";
        const adminPassword = "AdminPassword@2026";

        const exists = await User.findOne({ email: adminEmail });
        if (exists) return res.send("Admin already exists!");

        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const adminUser = new User({
            name: "Deepesh Admin",
            email: adminEmail,
            password: hashedPassword,
            role: "admin"
        });

        await adminUser.save();
        res.send(`<h1>Admin Created!</h1><p>Email: ${adminEmail}</p><p>Password: ${adminPassword}</p>`);
    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
});

// Modular Routes
app.use('/', authRoutes);
app.use('/', eventRoutes);
app.use('/', ticketRoutes);

// ====================== ADMIN ROUTES ======================

app.get('/admin/dashboard', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/login');
        const events = await Event.find();
        res.render('admin/dashboard', { events });
    } catch (err) {
        res.status(500).send("Admin Error");
    }
});

app.post('/admin/add-event', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/login');

        const { singerName, eventTitle, date, price, totalSeats, image, venue } = req.body;

        const newEvent = new Event({
            singerName,
            eventTitle,
            date,
            price,
            totalSeats,
            venue: venue || "College Main Arena",
            image: image || "https://images.unsplash.com/photo-1459749411177-04218006d396?q=80&w=1200"
        });

        await newEvent.save();
        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error adding concert");
    }
});

app.get('/admin/delete-event/:id', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/login');
        await Event.findByIdAndDelete(req.params.id);
        await Ticket.deleteMany({ event: req.params.id });
        res.redirect('/admin/dashboard');
    } catch (err) {
        res.status(500).send("Delete Error");
    }
});

// ====================== STUDENT ROUTES ======================

app.get('/student/dashboard', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'student') return res.redirect('/login');
    const events = await Event.find();
    res.render('student/dashboard', { events });
});

// Updated Booking Route: Checks for login before allowing access
app.get('/book/:eventId', async (req, res) => {
    try {
        if (!req.session.user) {
            // If not logged in, redirect to login page
            return res.redirect('/login');
        }
        const event = await Event.findById(req.params.eventId);
        if (!event) return res.send("Event not found");
        res.render('student/book', { event });
    } catch (err) {
        res.status(500).send("Error loading booking page");
    }
});

app.post('/confirm-booking', async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');
        const { eventId, ticketType } = req.body;
        
        const randomNum = Math.floor(Math.random() * 500) + 1;
        const assignedSeat = ticketType === 'Premium' ? `P-${randomNum}` : `N-${randomNum}`;
        const ticketID = 'FP-' + Math.random().toString(36).substr(2, 9).toUpperCase();

        const newTicket = new Ticket({
            event: eventId,
            student: req.session.user.id,
            seatNo: assignedSeat, 
            ticketID,
            isUsed: false
        });

        await newTicket.save();
        await Event.findByIdAndUpdate(eventId, { $inc: { bookedSeats: 1 } });
        res.redirect('/student/my-tickets');
    } catch (err) {
        res.status(500).send("Booking failed");
    }
});

app.get('/student/my-tickets', async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');
        const tickets = await Ticket.find({ student: req.session.user.id }).populate('event');
        const ticketsWithQR = await Promise.all(tickets.map(async (t) => {
            const qr = await QRCode.toDataURL(t._id.toString());
            return { ...t._doc, qrImage: qr };
        }));
        res.render('student/my-tickets', { tickets: ticketsWithQR });
    } catch (err) {
        res.status(500).send("Error loading tickets");
    }
});

// ====================== VOLUNTEER ROUTES ======================

app.get('/volunteer/dashboard', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'volunteer') return res.redirect('/login');
    res.render('volunteer/dashboard');
});

app.get('/volunteer/scanner', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'volunteer') return res.redirect('/login');
    res.render('volunteer/scanner');
});

app.post('/verify-scan', async (req, res) => {
    try {
        const { ticketId } = req.body;
        const ticket = await Ticket.findById(ticketId).populate('student event');
        if (!ticket) return res.json({ success: false, message: "Invalid Ticket!" });
        if (ticket.isUsed) return res.json({ success: false, message: "ALREADY SCANNED!", student: ticket.student.name });

        ticket.isUsed = true;
        ticket.scannedAt = new Date();
        await ticket.save();

        res.json({ 
            success: true, message: "Access Granted", 
            student: ticket.student.name, seat: ticket.seatNo, event: ticket.event.singerName
        });
    } catch (err) { res.json({ success: false, message: "Scanner Error" }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 FestPulse Pro: http://localhost:${PORT}`));