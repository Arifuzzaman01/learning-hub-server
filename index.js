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
    const bookingCollection = db.collection("booking");
    const reviewCollection = db.collection("review");
    const notesCollection = db.collection("notes");
    const materialsCollection = db.collection("materials");

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
      const reviews = await reviewCollection.find({ sessionId: id }).toArray();

      // Calculate average rating
      const averageRating =
        reviews.length > 0
          ? (
              reviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
              reviews.length
            ).toFixed(1)
          : null;
      //
      res.send({ session, reviews, averageRating });
    });

    // Tutor all session by email
    app.get("/tutor-sessions", async (req, res) => {
      const email = req.query.email;
      const sessions = await sessionCollection
        .find({ tutorEmail: email })
        .toArray();
      res.send(sessions);
    });
    //resend request
    app.patch("/session/resend-request/:id", async (req, res) => {
      const id = req.params.id;
      const result = await sessionCollection.updateOne(
        { _id: new ObjectId(id), status: "rejected" },
        { $set: { status: "pending", updatedAt: new Date().toISOString() } }
      );
      res.send(result);
    });

    // GET: All approved sessions by this tutor
    app.get("/approved-sessions", async (req, res) => {
      const email = req.query.email;
      const sessions = await sessionCollection
        .find({ tutorEmail: email, status: "approved" })
        .toArray();
      res.send(sessions);
    });

    //  📚 booking collection

    // GET /bookings?email=student@email.com
    app.get("/bookings", async (req, res) => {
      const email = req.query.email;
      // console.log(email);
      const result = await bookingCollection
        .find({ studentEmail: email })
        .toArray();
      // console.log(result);
      res.send(result);
    });

    // POST /bookings
    app.post("/bookings", async (req, res) => {
      try {
        const booking = req.body;
        booking.bookedAt = new Date().toISOString(); // timestamp

        const result = await bookingCollection.insertOne(booking);
        res.status(201).send(result);
      } catch (err) {
        console.error("Booking error:", err);
        res.status(500).send({ error: "Booking failed" });
      }
    });

    // review and rating
    // POST /reviews
    app.post("/reviews", async (req, res) => {
      const review = req.body; // { sessionId, studentEmail, rating, comment }
      review.createdAt = new Date().toISOString();
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    // GET /reviews/:sessionId
    app.get("/reviews/:sessionId", async (req, res) => {
      const sessionId = req.params.sessionId;
      const result = await reviewCollection
        .find({ sessionId: sessionId })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    //🚀 NOTE
    // POST /notes
    app.post("/notes", async (req, res) => {
      const note = req.body; // { email, title, description }
      note.createdAt = new Date().toISOString();
      const result = await notesCollection.insertOne(note);
      res.send(result);
    });
    // manage and view all notes
    // GET notes by email
    app.get("/notes", async (req, res) => {
      const email = req.query.email;
      const notes = await notesCollection
        .find({ email })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(notes);
    });

    // DELETE a note
    app.delete("/notes/:id", async (req, res) => {
      const id = req.params.id;
      const result = await notesCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // PATCH (update) a note
    app.patch("/notes/:id", async (req, res) => {
      const id = req.params.id;
      const updateData = req.body; // { title, description }
      const result = await notesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...updateData, updatedAt: new Date().toISOString() } }
      );
      res.send(result);
    });
    // ⚒ Materials api
    // ger materials by id
    app.get("/materials/session/:id", async (req, res) => {
      const sessionId = req.params.id;
      const result = await materialsCollection.find({ sessionId }).toArray();
      res.send(result);
    });

    // POST: Upload new material
    app.post("/materials", async (req, res) => {
      const material = req.body; // { title, sessionId, tutorEmail, imageURL, driveLink }
      material.createdAt = new Date().toISOString();
      const result = await materialsCollection.insertOne(material);
      res.send(result);
    });
    // Get all materials by tutor email
    app.get("/materials", async (req, res) => {
      const email = req.query.email;
      const result = await materialsCollection
        .find({ tutorEmail: email })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    // Delete material
    app.delete("/materials/:id", async (req, res) => {
      const id = req.params.id;
      const result = await materialsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // Update material
    app.patch("/materials/:id", async (req, res) => {
      const id = req.params.id;
      const updated = req.body;
      const result = await materialsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...updated, updatedAt: new Date().toISOString() } }
      );
      res.send(result);
    });
    // ADMIN
    // get user with search filter
    app.get("/usersForAdmin", async (req, res) => {
      const search = req.query.search || "";
      const query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };

      const result = await usersCollection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });
    // update user role
    app.patch("/users/role/:id", async (req, res) => {
      const id = req.params.id;
      const { role } = req.body;

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role } }
      );

      res.send(result);
    });

    // end
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
