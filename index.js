const express = require('express');
const cors = require('cors');
const jwt = require("jsonwebtoken")
const cookieParser = require("cookie-parser")
require("dotenv").config();
const port = process.env.PORT || 3000
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");


// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token

  if(!token){
   return res.status(401).send({message: "Unauthorized Access!"});
  }

  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if(error){
     return res.status(401).send({ message: "Unauthorized Access!" });
    }
    req.user = decoded
    next()
  })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zt90y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const jobCollection = client.db("Job-Portal-DB").collection("jobs");
    const applicationCollection = client.db("Job-Portal-DB").collection("applications");

    // Auth related apis
    app.post("/jwt", async(req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, {expiresIn: "1h"});
      res
      .cookie("token", token, {
        httpOnly: true,
        secure: false
      })
      .send({success: true})
    })

    // Job related apis
    app.get("/jobs", async(req, res) => {
      const email = req.query.email;

      let query = {}
      if(email){
        query = {hr_email : email}
      }
        const cursor = jobCollection.find(query);
        const result = await cursor.toArray();
        res.send(result)
    })

    app.get("/jobs/:id", async(req, res) => {
        const id = req.params.id;
        const query = {_id : new ObjectId(id)};
        const result = await jobCollection.findOne(query);
        res.send(result)
    })

    app.post("/jobs", async(req, res) => {
      const newJob = req.body;
      const result = await jobCollection.insertOne(newJob);
      res.send(result)
    })

    // Application related apis
    app.get("/applications", async(req, res) => {
        const result = await applicationCollection.find().toArray();
        res.send(result)
    })

    app.get("/applications/jobs/:job_id", async(req, res) => {
      const jobId = req.params.job_id;
      const query = {job_id : jobId};
      const result = await applicationCollection.find(query).toArray();
      res.send(result)
    })

    app.get("/application", verifyToken, async(req, res) => {
        const email = req.query.email;
        const query = {applicant_email : email};

        if(req.user.email !== email){
          return res.status(403).send({message: "Forbidden!"})
        }

        const result = await applicationCollection.find(query).toArray();

        for(const application of result){
            const query1 = { _id: new ObjectId(application.job_id) };
            const job = await jobCollection.findOne(query1);

            if(job){
                application.title = job.title;
                application.company_logo = job.company_logo;
                application.company = job.company;
                application.location = job.location;
                application.company = job.company;
                application.jobType = job.jobType;
                application.salaryRange = job.salaryRange;
            }
        }
        res.send(result)
    })

    app.post("/applications", async(req, res) => {
        const application = req.body;
        const result = await applicationCollection.insertOne(application);
        res.send(result)
    })

    app.patch("/applications/:job_id", async(req, res) => {
      const id = req.params.job_id;
      const data = req.body;
      const filter = {_id : new ObjectId(id)}
      const updatedDoc = {
        $set: {
          status: data.status
        }
      }
      const result = await applicationCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get("/", (req, res) => {
    res.send("The server is running successfully!")
})

app.listen(port, () => {
    console.log("The server is running on port", port)
})