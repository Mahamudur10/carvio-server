const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const express = require('express')
const dotenv = require('dotenv')
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
dotenv.config()
const uri = process.env.MONGODB_URI;

const app = express()
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}))
app.use(express.json())

// MongoDB Client
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Database collections
let carsCollection;
let bookingsCollection;

async function run() {
    try {
        await client.connect();
        console.log("Connected to MongoDB!");

        const db = client.db("carvio")
        carsCollection = db.collection("cars")
        bookingsCollection = db.collection("bookings")

        // =============== CAR ROUTES ===============

        // GET /explore-cars - Get all cars
        app.get('/explore-cars', async (req, res) => {
            try {
                const result = await carsCollection.find().toArray()
                res.json(result)
            } catch (error) {
                res.status(500).json({ error: "Failed to fetch cars" })
            }
        })

        // GET /cars/:id - Get single car by ID
        app.get('/cars/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const result = await carsCollection.findOne({ _id: new ObjectId(id) })
                if (!result) {
                    return res.status(404).json({ error: "Car not found" })
                }
                res.json(result)
            } catch (error) {
                res.status(500).json({ error: "Failed to fetch car" })
            }
        })

        // POST /cars - Add new car
        app.post('/cars', async (req, res) => {
            try {
                const carData = req.body
                console.log("Received car data:", carData)
                const result = await carsCollection.insertOne(carData)

                res.json({
                    success: true,
                    message: "Car added successfully",
                    carId: result.insertedId
                })
            } catch (error) {
                console.error("Error adding car:", error)
                res.status(500).json({ error: "Failed to add car" })
            }
        })

        // =============== BOOKING ROUTES ===============

        // POST /api/bookings - Create new booking
        app.post('/api/bookings', async (req, res) => {
            try {
                const bookingData = req.body
                console.log("Booking data:", bookingData)

                // Add booking date if not present
                if (!bookingData.bookingDate) {
                    bookingData.bookingDate = new Date().toISOString()
                }

                const result = await bookingsCollection.insertOne(bookingData)

                // Increase booking count for the car
                await carsCollection.updateOne(
                    { _id: new ObjectId(bookingData.carId) },
                    { $inc: { booking_count: 1 } }
                )

                res.json({
                    success: true,
                    message: "Booking confirmed successfully",
                    bookingId: result.insertedId
                })
            } catch (error) {
                console.error("Error creating booking:", error)
                res.status(500).json({ error: "Failed to create booking" })
            }
        })

        // GET /api/bookings/my-bookings - Get user's bookings (temporary - without auth)
        app.get('/api/bookings/my-bookings', async (req, res) => {
            try {
                // Temporary - send all bookings (will add user filter later with JWT)
                const result = await bookingsCollection.find().toArray()
                res.json(result)
            } catch (error) {
                res.status(500).json({ error: "Failed to fetch bookings" })
            }
        })

        console.log("All routes are ready!");

    } catch (error) {
        console.error("Database connection failed:", error)
    }
}

run().catch(console.dir);

// =============== ROOT ROUTE ===============
app.get('/', (req, res) => {
    res.send("Server is running fine!")
})

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})