const express = require('express')
const app = express()
const cors=require('cors');
const port = 3000
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(cors())
app.use(express.json())
const jwt = require("jsonwebtoken");
require('dotenv').config();

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


// Create a MongoClient with a MongoClientOptions object to set the Stable API version

  function createToken(user) {
    const token = jwt.sign(
      {
        email: user.email,
      },
      "secret",
      { expiresIn: "7d" }
    );
    return token;
  }
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });


  function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send("Authorization header missing");
    }
    const token = authHeader.split(" ")[1];
    try {
      const verify = jwt.verify(token, "secret");
      if (!verify?.email) {
        return res.status(401).send("You are not authorized");
      }
      req.user = verify.email;
      next();
    } catch (err) {
      return res.status(401).send("Invalid token");
    }
  }
  
  async function run() {
    try {
      await client.connect();
      const database = client.db("LandMark");
      const flat_collection = database.collection("flat_collection");
      const user_collection=database.collection("user_collection"); 

      app.post("/user", async (req, res) => {
        const user = req.body;
  
        const token = createToken(user);
        const isUserExist = await user_collection.findOne({ email: user?.email });
        if (isUserExist?._id) {
          return res.send({
            statu: "success",
            message: "Login success",
            token,
          });
        }
        await user_collection.insertOne(user);
        return res.send({ token });
      });

      app.get("/userlist/:email", async (req, res) => {
        const email = req.params.email;
        const result = await user_collection.findOne({ email });
        res.send(result);
      });

      app.get('/userlist',async(req,res)=>{
        const users=user_collection.find();
        const result= await users.toArray();
        res.send(result)
      })

      app.get("/userlist/get/:id", async (req, res) => {
        const id = req.params.id;
        const result = await user_collection.findOne({ _id: new ObjectId(id) });
        res.send(result);
      });


      app.patch("/userlist/:email",verifyToken, async (req, res) => {
        const email = req.params.email;
        const userData = req.body;
        const result = await user_collection.updateOne(
          { email },
          { $set: userData },
          { upsert: true }
        );
        res.send(result);
      });

      app.get("/search", async (req, res) => {
        try {
          const query = req.query.q;
          const properties = await flat_collection.find({
            $or: [
              { title: { $regex: query, $options: "i" } },
              { category: { $regex: query, $options: "i" } },
            ],
          }).toArray();
          res.json(properties);
        } catch (error) {
          console.error("Error fetching search results:", error);
          res.status(500).json({ error: "Server error" });
        }
      });
      



      app.post('/flatlist',verifyToken,async(req,res)=>{
        const flats=req.body;
        const result= await flat_collection.insertOne(flats);
        res.send(result)
      })

      app.get('/flatlist',async(req,res)=>{
        const flats=flat_collection.find();
        const result= await flats.toArray();
        res.send(result)
      })

      
    

      app.get("/flatlist/:id", async (req, res) => { 
        const id= req.params.id;
        const flats=await flat_collection.findOne({_id:new ObjectId(id)});
        res.send(flats);
    });

    app.patch("/flatlist/:id", verifyToken,async (req, res) => { 
        
        const id= req.params.id;
        const updateData=req.body;
        const flat=await flat_collection.updateOne(
            {_id:new ObjectId(id)},
            {$set:updateData}
        );
        res.send(flat);
    });

    app.delete("/flatlist/:id",verifyToken, async (req, res) => { 
        const id= req.params.id;
        const result = await flat_collection.deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 1) {
            res.send({ acknowledged: true, message: 'Property successfully deleted' });
          } else {
            res.status(404).send({ acknowledged: false, message: 'Property not found' });
          }
      } 
    )




      console.log("DB is connected!");
    } finally {
      // Optionally close the connection here
      // await client.close();
    }
  }
  
  run().catch(console.dir);
  
app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})