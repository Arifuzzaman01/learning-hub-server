const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = process.env.DB_MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("learning-hub");
    const usersCollection = db.collection("users");
    const sessionCollection = db.collection("session");

    // 🚀  User collection
    // Example: Add user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const email = user.email;

      // Check if user already exists (case-insensitive)
      const existsUser = await usersCollection.findOne({
        email: { $regex: `^${email}$`, $options: "i" },
      });
      if (!!existsUser) {
        const result = await usersCollection.updateOne(
          { email },
          {
            $set: {
              lastLoggedAt: new Date().toISOString(),
            },
          }
        );
        return res.send(result);
      }
      if (existsUser) {
        return res
          .status(409)
          .send({ message: "User already exists", existsUser });
      }

      // Insert new user
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // 👁️‍🗨️ Example: Get all users
    app.get("/users", async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });

    //   📝Session Collection
    //   getAll Session
    app.get("/all-sessions", async (req, res) => {
      const result = await sessionCollection.find().toArray();
      res.send(result);
    });

    //  create a post  session
    app.post("/session", async (req, res) => {
      try {
        const session = req.body;
        session.createdAt = new Date().toISOString();
        session.status = session.status || "pending"; // default value if not sent

        const result = await sessionCollection.insertOne(session);
        res.status(201).send(result);
      } catch (error) {
        console.error("❌ Error inserting session:", error);
        res.status(500).send({ error: "Failed to create session" });
      }
    });
    //   get single session form sessionCollection
    // Assuming you have a `sessionCollection` and `reviewsCollection`

    app.get("/session/:id", async (req, res) => {
        const id = req.params.id;
        // console.log(id);
      const query = { _id: new ObjectId(id) };

        const session = await sessionCollection.findOne(query);
        // console.log(session);
      //   const reviews = await reviewsCollection.find({ sessionId: id }).toArray();

      // Calculate average rating
      //   const averageRating =
      //     reviews.length > 0
      //       ? (
      //           reviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
      //           reviews.length
      //         ).toFixed(1)
      //       : null;
      //, reviews, averageRating
      res.send({session});
    });
  } catch (err) {
    console.error("❌ MongoDB Error:", err);
  }
}

run();

// Root
app.get("/", (req, res) => {
  res.send("📚 Collaborative Study Platform Server is running!");
});

// Listen
app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});
