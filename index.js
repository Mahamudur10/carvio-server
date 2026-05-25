const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// CORS - All your URLs added
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://carvio.vercel.app',
        'https://carvio-three.vercel.app'  // 👈 এইটা যোগ করো
    ],
    credentials: true
}));
app.use(express.json());

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

let carsCollection, usersCollection, bookingsCollection;

async function connectDB() {
    try {
        await client.connect();
        console.log("Connected to MongoDB!");
        const db = client.db("carvio");
        carsCollection = db.collection("cars");
        usersCollection = db.collection("users");
        bookingsCollection = db.collection("bookings");
    } catch (error) {
        console.error("MongoDB connection error:", error);
    }
}
connectDB();

// =============== ROOT ROUTE ===============
app.get('/', (req, res) => {
    res.send("Server is running fine!");
});

// =============== CAR ROUTES ===============

// GET all cars
app.get('/explore-cars', async (req, res) => {
    try {
        if (!carsCollection) await connectDB();
        const cars = await carsCollection.find({}).toArray();
        res.json(cars);
    } catch (error) {
        console.error("Error fetching cars:", error);
        res.status(500).json({ error: "Failed to fetch cars" });
    }
});

// GET single car by ID
app.get('/cars/:id', async (req, res) => {
    try {
        if (!carsCollection) await connectDB();
        const car = await carsCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (!car) return res.status(404).json({ error: "Car not found" });
        res.json(car);
    } catch (error) {
        console.error("Error fetching car:", error);
        res.status(500).json({ error: "Failed to fetch car" });
    }
});

// POST add new car
app.post('/cars', async (req, res) => {
    try {
        if (!carsCollection) await connectDB();
        const carData = req.body;
        console.log("Adding car:", carData.carName);
        const result = await carsCollection.insertOne(carData);
        res.status(201).json({ success: true, message: "Car added successfully", carId: result.insertedId });
    } catch (error) {
        console.error("Error adding car:", error);
        res.status(500).json({ error: "Failed to add car" });
    }
});

// GET my added cars
app.get('/api/my-cars', async (req, res) => {
    try {
        if (!carsCollection) await connectDB();
        const { email } = req.query;
        console.log("Fetching cars for email:", email);
        if (!email) return res.status(400).json({ error: "Email required" });
        const myCars = await carsCollection.find({ ownerEmail: email }).toArray();
        res.json(myCars);
    } catch (error) {
        console.error("Error fetching my cars:", error);
        res.status(500).json({ error: "Failed to fetch cars" });
    }
});

// UPDATE car
app.put('/api/cars/:id', async (req, res) => {
    try {
        if (!carsCollection) await connectDB();
        await carsCollection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: req.body }
        );
        res.json({ success: true, message: "Car updated successfully" });
    } catch (error) {
        console.error("Error updating car:", error);
        res.status(500).json({ error: "Failed to update car" });
    }
});

// DELETE car
app.delete('/api/cars/:id', async (req, res) => {
    try {
        if (!carsCollection) await connectDB();
        await carsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.json({ success: true, message: "Car deleted successfully" });
    } catch (error) {
        console.error("Error deleting car:", error);
        res.status(500).json({ error: "Failed to delete car" });
    }
});

// =============== AUTH ROUTES ===============

// Register - POST
app.post('/api/auth/register', async (req, res) => {
    try {
        if (!usersCollection) await connectDB();
        const { name, email, photoURL, password } = req.body;
        
        console.log("Register attempt:", email);
        
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        await usersCollection.insertOne({
            name,
            email,
            photoURL,
            password: hashedPassword,
            role: "user",
            createdAt: new Date()
        });
        
        res.status(201).json({ success: true, message: "User registered successfully" });
        
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ success: false, message: "Registration failed" });
    }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
    try {
        if (!usersCollection) await connectDB();
        const { email, password } = req.body;
        console.log("Login attempt:", email);
        
        const user = await usersCollection.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }
        
        const { password: _, ...userWithoutPassword } = user;
        res.json({
            success: true,
            message: "Login successful",
            user: userWithoutPassword
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Login failed" });
    }
});

// =============== BOOKING ROUTES ===============

// POST create booking
app.post('/api/bookings', async (req, res) => {
    try {
        if (!bookingsCollection) await connectDB();
        const bookingData = req.body;
        console.log("Creating booking for:", bookingData.carName);
        
        if (!bookingData.bookingDate) {
            bookingData.bookingDate = new Date().toISOString();
        }
        
        const result = await bookingsCollection.insertOne(bookingData);
        
        if (carsCollection) {
            await carsCollection.updateOne(
                { _id: new ObjectId(bookingData.carId) },
                { $inc: { booking_count: 1 } }
            );
        }
        
        res.status(201).json({ success: true, message: "Booking confirmed", bookingId: result.insertedId });
    } catch (error) {
        console.error("Booking error:", error);
        res.status(500).json({ success: false, error: "Failed to create booking" });
    }
});

// GET my bookings
app.get('/api/my-bookings', async (req, res) => {
    try {
        if (!bookingsCollection) await connectDB();
        const { email } = req.query;
        console.log("Fetching bookings for email:", email);
        if (!email) return res.status(400).json({ error: "Email required" });
        const myBookings = await bookingsCollection.find({ userEmail: email }).toArray();
        res.json(myBookings);
    } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ error: "Failed to fetch bookings" });
    }
});

// Vercel serverless function export
module.exports = app;