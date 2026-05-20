const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const express = require('express')
const dotenv = require('dotenv')
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require('mongodb');
dotenv.config()
const uri = process.env.MONGODB_URI;

const app = express()
const PORT = process.env.PORT;
app.use(cors())
app.use(express.json())

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();

        const db = client.db("carvio")
        const carsCollection = db.collection("cars")

        app.get('/explore-cars',async (req, res) => {
            const result = await carsCollection.find().toArray()
            res.json(result)
        })

        app.post('/cars', async (req, res) => {
            const carData = req.body
            console.log(carData)
            const result = await carsCollection.insertOne(carData)

            res.json({
                success: true,
                message: "Car added successfully",
                carId: result.insertedId
            })
        })

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Server is running fine!")
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})