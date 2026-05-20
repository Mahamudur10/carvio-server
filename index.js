const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const express = require('express')
const dotenv = require('dotenv')
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
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

const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

let carsCollection, usersCollection, bookingsCollection;

async function run() {
    try {
        await client.connect();
        console.log("Connected to MongoDB!");

        const db = client.db("carvio")
        carsCollection = db.collection("cars")
        usersCollection = db.collection("users")
        bookingsCollection = db.collection("bookings")

        // =============== AUTH ROUTES ===============

        // REGISTER
        app.post('/api/auth/register', async (req, res) => {
            try {
                const { name, email, photoURL, password } = req.body;

                // Check if user exists
                const existingUser = await usersCollection.findOne({ email });
                if (existingUser) {
                    return res.status(400).json({ success: false, message: "User already exists" });
                }

                // Hash password
                const hashedPassword = await bcrypt.hash(password, 10);

                // Create user
                const result = await usersCollection.insertOne({
                    name,
                    email,
                    photoURL,
                    password: hashedPassword,
                    role: "user",
                    createdAt: new Date()
                });

                res.json({ success: true, message: "User registered successfully" });

            } catch (error) {
                console.error("Registration error:", error);
                res.status(500).json({ success: false, message: "Registration failed" });
            }
        });

        // LOGIN
        app.post('/api/auth/login', async (req, res) => {
            try {
                const { email, password } = req.body;

                // Find user
                const user = await usersCollection.findOne({ email });
                if (!user) {
                    return res.status(401).json({ success: false, message: "Invalid email or password" });
                }

                // Check password
                const isValidPassword = await bcrypt.compare(password, user.password);
                if (!isValidPassword) {
                    return res.status(401).json({ success: false, message: "Invalid email or password" });
                }

                res.json({
                    success: true,
                    message: "Login successful",
                    user: {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        photoURL: user.photoURL
                    }
                });

            } catch (error) {
                console.error("Login error:", error);
                res.status(500).json({ success: false, message: "Login failed" });
            }
        });

        // =============== CAR ROUTES ===============

        // GET all cars
        app.get('/explore-cars', async (req, res) => {
            try {
                const result = await carsCollection.find().toArray()
                res.json(result)
            } catch (error) {
                res.status(500).json({ error: "Failed to fetch cars" })
            }
        })

        // GET single car by ID
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

        // POST add new car
        app.post('/cars', async (req, res) => {
            try {
                const carData = req.body
                console.log("Received car data:", carData)
                const result = await carsCollection.insertOne(carData)
                res.json({ success: true, message: "Car added successfully", carId: result.insertedId })
            } catch (error) {
                console.error("Error adding car:", error)
                res.status(500).json({ error: "Failed to add car" })
            }
        })

        // GET my added cars (by owner email)
        app.get('/api/my-cars', async (req, res) => {
            try {
                const { email } = req.query;
                if (!email) {
                    return res.status(400).json({ error: "Email is required" });
                }

                const myCars = await carsCollection.find({ ownerEmail: email }).toArray()
                res.json(myCars)
            } catch (error) {
                console.error("Error fetching my cars:", error);
                res.status(500).json({ error: "Failed to fetch your cars" })
            }
        })

        // UPDATE car
        app.put('/api/cars/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const updateData = req.body;
                const result = await carsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updateData }
                )
                if (result.matchedCount === 0) {
                    return res.status(404).json({ error: "Car not found" })
                }
                res.json({ success: true, message: "Car updated successfully" })
            } catch (error) {
                console.error("Error updating car:", error);
                res.status(500).json({ error: "Failed to update car" })
            }
        })

        // DELETE car
        app.delete('/api/cars/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const result = await carsCollection.deleteOne({ _id: new ObjectId(id) })
                if (result.deletedCount === 0) {
                    return res.status(404).json({ error: "Car not found" })
                }
                res.json({ success: true, message: "Car deleted successfully" })
            } catch (error) {
                console.error("Error deleting car:", error);
                res.status(500).json({ error: "Failed to delete car" })
            }
        })

        // =============== BOOKING ROUTES ===============

        // POST create booking
        app.post('/api/bookings', async (req, res) => {
            try {
                const bookingData = req.body
                
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

                res.json({ success: true, message: "Booking confirmed", bookingId: result.insertedId })
            } catch (error) {
                console.error("Booking error:", error)
                res.status(500).json({ error: "Failed to create booking" })
            }
        })

        // GET my bookings (by user email)
        app.get('/api/my-bookings', async (req, res) => {
            try {
                const { email } = req.query;
                if (!email) {
                    return res.status(400).json({ error: "Email is required" });
                }

                const myBookings = await bookingsCollection.find({ userEmail: email }).toArray()
                res.json(myBookings)
            } catch (error) {
                console.error("Error fetching bookings:", error);
                res.status(500).json({ error: "Failed to fetch bookings" })
            }
        })

        console.log("All routes are ready!");

    } catch (error) {
        console.error("Database connection failed:", error)
    }
}

run().catch(console.dir);

// Root route
app.get('/', (req, res) => {
    res.send("Server is running fine!")
})

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})