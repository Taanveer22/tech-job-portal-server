// required packages
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

//App Instance
const app = express();
const PORT = process.env.PORT || 5000;

//Middleware Setup
app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://tech-job-portal-45406.web.app',
      'https://tech-job-portal-45406.firebaseapp.com',
    ],
    credentials: true,
  })
);

const verifyToken = (req, res, next) => {
  // console.log('cookies', req.cookies);
  const token = req?.cookies?.token;
  console.log('token', token);
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized Access' });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      // console.log('verify token error', error);
      return res.status(401).send({ message: 'Unauthorized Access' });
    }
    // console.log('verify token decoded', decoded);
    req.user = decoded;
    next();
  });
};

// Database Setup
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.89rnkti.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log('Checked mongodb connection');
    await client.db('admin').command({ ping: 1 });
    console.log('Pinged your deployment');

    //✅✅✅ #################    DB    ##################
    const database = client.db('jobsDB');
    const jobsCollection = database.collection('jobsColl');
    const applicationsCollection = database.collection('applicationsColl');

    // ✅✅✅ ############    JWT    ##################
    //creating Token
    app.post('/jwt/login', (req, res) => {
      const { email } = req.body;
      if (!email) {
        return res.status(400).send({ message: 'Email required' });
      }
      //get payload/data
      const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '7d',
      });
      console.log('payload token', token);
      // set cookie securely
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        .send({ success: true });
    });

    // deleting token
    app.post('/jwt/logout', (req, res) => {
      res
        .clearCookie('token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        })
        .send({ success: true });
    });

    // ✅✅✅ ##############     JOBS     ###############
    app.get('/jobs', async (req, res) => {
      let email = req.query.email;
      let query = {};
      if (email) {
        query = {
          hr_email: email,
        };
      }
      const cursor = jobsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post('/jobs/add', async (req, res) => {
      const doc = req.body;
      const result = await jobsCollection.insertOne(doc);
      res.send(result);
    });

    app.get('/jobs/details/:id', async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    app.delete('/jobs/remove/:id', async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const result = await jobsCollection.deleteOne(query);
      res.send(result);
    });

    // ✅✅✅ ##############     APPLICATIONS    #################
    app.get('/applications/me', verifyToken, async (req, res) => {
      const query = { applicant_email: req.query.email };
      // console.log('cuk cuk', req.cookies);
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      // console.log('Token Email:', req.user.email);
      // console.log('Query Email:', req.query.email);
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

    app.get('/applications/review/:jobId', async (req, res) => {
      const query = { job_id: req.params.jobId };
      const result = await applicationsCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/applications/apply/:id', async (req, res) => {
      const doc = req.body;
      const result = await applicationsCollection.insertOne(doc);
      // aggregate applicationCount data
      const query = { _id: new ObjectId(doc.job_id) };
      const result2 = await jobsCollection.findOne(query);
      // console.log(result2);
      let count = 0;
      if (result2.applicationCount) {
        count = result2.applicationCount + 1;
      } else {
        count = 1;
      }
      const queryAgain = { _id: new ObjectId(doc.job_id) };
      const updateDoc = {
        $set: {
          applicationCount: count,
        },
      };
      const result3 = await jobsCollection.updateOne(queryAgain, updateDoc);
      console.log(result3);
      // ⚡ FIXED: Send 'result' (the application insert metadata)
      res.send(result);
    });

    app.patch('/applications/status/:id', async (req, res) => {
      const doc = req.body;
      const query = { _id: new ObjectId(req.params.id) };
      const updateDoc = {
        $set: {
          status: doc.status,
        },
      };
      const result = await applicationsCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.delete('/applications/remove/:id', async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const result = await applicationsCollection.deleteOne(query);
      res.send(result);
    });
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}
run();

//Root Route
app.get('/', (req, res) => {
  res.send('server is running');
});

// Server Start
app.listen(PORT, () => {
  console.log(`this sever is running on port no : ${PORT}`);
});
