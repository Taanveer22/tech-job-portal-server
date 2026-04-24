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
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const applicationsCollection = database.collection("applicationsColl");

    // ######################### JOBS ##################################
    app.get("/jobs", async (req, res) => {
      const cursor = jobsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/jobs/details/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    // ######################### APPLICATIONS ###############################
    app.get("/applications/me", async (req, res) => {
      const query = { applicant_email: req.query.email };
      const cursor = applicationsCollection.find(query);
      const result = await cursor.toArray();
      // aggregate data via loop
      for (const applicationItem of result) {
        // console.log(applicationItem.job_id);
        const loopQuery = { _id: new ObjectId(applicationItem.job_id) };
        const loopResult = await jobsCollection.findOne(loopQuery);
        if (loopResult) {
          applicationItem.title = loopResult.title;
          applicationItem.company = loopResult.company;
          applicationItem.company_logo = loopResult.company_logo;
          applicationItem.jobType = loopResult.jobType;
          applicationItem.location = loopResult.location;
        }
      }
      res.send(result);
    });

    app.post("/applications/apply/:id", async (req, res) => {
      const doc = req.body;
      const result = await applicationsCollection.insertOne(doc);
      res.send(result);
    });

    app.delete("/applications/me/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const result = await applicationsCollection.deleteOne(query);
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
