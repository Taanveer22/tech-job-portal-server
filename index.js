// required packages
require("dotenv").config();
const express = require("express");
const cors = require("cors");

//App Setup
const app = express();
const PORT = process.env.PORT || 5000;

//Middleware Setup
app.use(cors());
app.use(express.json());

// Database Setup
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.89rnkti.mongodb.net/?appName=Cluster0`;
// console.log(uri);
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    console.log("mongodb connected");
    // ###########################################################
    const database = client.db("jobsDB");
    const jobsCollection = database.collection("jobsColl");

    app.get("/jobs", async (req, res) => {
      const cursor = jobsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // ###########################################################
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } catch (error) {
    console.log(error);
  }
}
run();

//Root Route
app.get("/", (req, res) => {
  res.send("server is running");
});

//Server Start
app.listen(PORT, () => {
  console.log(`this sever is running on port no : ${PORT}`);
});
