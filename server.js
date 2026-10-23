const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const app = express();

// Trust Render's HTTPS reverse proxy
app.set("trust proxy", 1);

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

fs.mkdirSync(DATA_DIR, { recursive: true });

const starterServices = [
  {
    id: 1,
    name: "Home Cleaning",
    category: "Home",
    price: 799,
    duration: "2–3 hours",
    provider: "Sparkle Home Care",
    description: "Reliable home cleaning for apartments and houses.",
    rating: 4.8,
    reviews: 34,
    icon: "🧹"
  },
  {
    id: 2,
    name: "Plumbing Repair",
    category: "Repairs",
    price: 499,
    duration: "1 hour",
    provider: "QuickFix Plumbing",
    description: "Tap leaks, pipe repairs and bathroom fittings.",
    rating: 4.7,
    reviews: 28,
    icon: "🔧"
  },
  {
    id: 3,
    name: "Maths Tutoring",
    category: "Education",
    price: 599,
    duration: "1 hour",
    provider: "LearnWell Tutors",
    description: "One-to-one tutoring for school and college students.",
    rating: 4.9,
    reviews: 41,
    icon: "📚"
  },
  {
    id: 4,
    name: "Electrical Work",
    category: "Repairs",
    price: 399,
    duration: "1 hour",
    provider: "BrightWire Services",
    description:
      "Safe installation and troubleshooting for home electrical needs.",
    rating: 4.6,
    reviews: 19,
    icon: "💡"
  },
  {
    id: 5,
    name: "AC Service",
    category: "Home",
    price: 899,
    duration: "1–2 hours",
    provider: "CoolBreeze Experts",
    description: "AC inspection, filter cleaning and routine maintenance.",
    rating: 4.7,
    reviews: 25,
    icon: "❄️"
  },
  {
    id: 6,
    name: "Website Design",
    category: "Digital",
    price: 2499,
    duration: "Project-based",
    provider: "PixelCraft Studio",
    description:
      "Responsive landing pages and small business websites.",
    rating: 4.9,
    reviews: 16,
    icon: "💻"
  },
  {
    id: 7,
    name: "Appliance Repair",
    category: "Repairs",
    price: 549,
    duration: "1–2 hours",
    provider: "FixIt Appliance Care",
    description:
      "Initial diagnosis and repair for common home appliances.",
    rating: 4.5,
    reviews: 22,
    icon: "🛠️"
  },
  {
    id: 8,
    name: "Personal Fitness",
    category: "Wellness",
    price: 699,
    duration: "1 hour",
    provider: "MoveBetter Coaching",
    description:
      "Personalised fitness coaching for your goals and level.",
    rating: 4.8,
    reviews: 31,
    icon: "🏋️"
  }
];

// Initialize the JSON database if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(
      {
        users: [],
        services: starterServices,
        bookings: [],
        reviews: [],
        nextUserId: 1,
        nextBookingId: 1,
        nextReviewId: 1
      },
      null,
      2
    )
  );
}

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, "utf8"));

const writeDB = db =>
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

// Middleware
app.use(express.json());

app.use(
  session({
    name: "servicenest.sid",
    secret:
      process.env.SESSION_SECRET ||
      "development-only-secret-change-before-deployment",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

// Serve the frontend
app.use(express.static(path.join(__dirname, "public")));

const safeUser = user => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role
});

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      error: "Please log in to continue."
    });
  }

  next();
};

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Current logged-in user
app.get("/api/me", (req, res) => {
  try {
    const db = readDB();

    const user = db.users.find(
      u => u.id === req.session.userId
    );

    res.json({
      user: user ? safeUser(user) : null
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ error: "Unable to retrieve user." });
  }
});

// Register
app.post("/api/register", async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Name, email and password are required."
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters."
      });
    }

    const db = readDB();
    const normalizedEmail = String(email).trim().toLowerCase();

    if (db.users.some(u => u.email === normalizedEmail)) {
      return res.status(409).json({
        error: "An account with this email already exists."
      });
    }

    const user = {
      id: db.nextUserId++,
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(String(password), 10),
      role: role === "provider" ? "provider" : "customer",
      createdAt: new Date().toISOString()
    };

    db.users.push(user);
    writeDB(db);

    req.session.userId = user.id;

    req.session.save(error => {
      if (error) {
        console.error("Registration session save error:", error);
        return next(error);
      }

      res.status(201).json({
        user: safeUser(user)
      });
    });
  } catch (error) {
    next(error);
  }
});

// Login
app.post("/api/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const db = readDB();

    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    const user = db.users.find(
      u => u.email === normalizedEmail
    );

    if (
      !user ||
      !(await bcrypt.compare(
        String(password || ""),
        user.passwordHash
      ))
    ) {
      return res.status(401).json({
        error: "Incorrect email or password."
      });
    }

    req.session.userId = user.id;

    // Save the session before responding
    req.session.save(error => {
      if (error) {
        console.error("Login session save error:", error);
        return next(error);
      }

      res.json({
        user: safeUser(user)
      });
    });
  } catch (error) {
    next(error);
  }
});

// Logout
app.post("/api/logout", (req, res, next) => {
  if (!req.session) {
    return res.json({ ok: true });
  }

  req.session.destroy(error => {
    if (error) {
      return next(error);
    }

    res.clearCookie("servicenest.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });

    res.json({ ok: true });
  });
});

// List and search services
app.get("/api/services", (req, res) => {
  try {
    const db = readDB();

    const q = String(req.query.q || "").toLowerCase();
    const category = String(req.query.category || "All");

    const services = db.services.filter(service => {
      const matchesCategory =
        category === "All" || service.category === category;

      const matchesQuery = [
        service.name,
        service.provider,
        service.description,
        service.category
      ].some(value => value.toLowerCase().includes(q));

      return matchesCategory && matchesQuery;
    });

    res.json({
      services,
      categories: [
        "All",
        ...new Set(db.services.map(service => service.category))
      ]
    });
  } catch (error) {
    console.error("Get services error:", error);
    res.status(500).json({ error: "Unable to retrieve services." });
  }
});

// Add a service
app.post("/api/services", requireAuth, (req, res) => {
  try {
    const db = readDB();

    const {
      name,
      category,
      price,
      duration,
      description
    } = req.body || {};

    if (
      !name ||
      !category ||
      !description ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 1
    ) {
      return res.status(400).json({
        error: "Enter a service name, category, valid price and description."
      });
    }

    const user = db.users.find(
      u => u.id === req.session.userId
    );

    if (!user) {
      return res.status(401).json({
        error: "Please log in again."
      });
    }

    const service = {
      id: Math.max(0, ...db.services.map(s => s.id)) + 1,
      name: String(name).trim(),
      category: String(category),
      price: Number(price),
      duration: duration || "As agreed",
      provider: user.name,
      providerId: user.id,
      description: String(description).trim(),
      rating: 0,
      reviews: 0,
      icon: "✨"
    };

    db.services.push(service);
    writeDB(db);

    res.status(201).json({ service });
  } catch (error) {
    console.error("Add service error:", error);
    res.status(500).json({ error: "Unable to add service." });
  }
});

// Create a booking
app.post("/api/bookings", requireAuth, (req, res) => {
  try {
    const {
      serviceId,
      date,
      time,
      address,
      notes
    } = req.body || {};

    const db = readDB();

    const user = db.users.find(
      u => u.id === req.session.userId
    );

    if (!user) {
      return res.status(401).json({
        error: "Please log in again."
      });
    }

    const service = db.services.find(
      s => s.id === Number(serviceId)
    );

    if (!service) {
      return res.status(404).json({
        error: "Service not found."
      });
    }

    if (!date || !time || !address) {
      return res.status(400).json({
        error: "Date, time and service address are required."
      });
    }

    if (date < new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({
        error: "Choose a date that is not in the past."
      });
    }

    const booking = {
      id: db.nextBookingId++,
      userId: user.id,
      serviceId: service.id,
      serviceName: service.name,
      provider: service.provider,
      price: service.price,
      date,
      time,
      address: String(address).trim(),
      notes: String(notes || "").trim(),
      status: "Confirmed",
      paymentStatus: "Pay on service",
      createdAt: new Date().toISOString()
    };

    db.bookings.push(booking);
    writeDB(db);

    res.status(201).json({ booking });
  } catch (error) {
    console.error("Create booking error:", error);
    res.status(500).json({ error: "Unable to create booking." });
  }
});

// Get bookings for the logged-in user
app.get("/api/bookings", requireAuth, (req, res) => {
  try {
    const db = readDB();

    const user = db.users.find(
      u => u.id === req.session.userId
    );

    if (!user) {
      return res.status(401).json({
        error: "Please log in again."
      });
    }

    const bookings = db.bookings
      .filter(booking =>
        user.role === "provider"
          ? booking.provider === user.name
          : booking.userId === user.id
      )
      .sort((a, b) => b.id - a.id);

    res.json({ bookings });
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({ error: "Unable to retrieve bookings." });
  }
});

// Cancel a booking
app.patch("/api/bookings/:id/cancel", requireAuth, (req, res) => {
  try {
    const db = readDB();

    const booking = db.bookings.find(
      b => b.id === Number(req.params.id)
    );

    if (!booking) {
      return res.status(404).json({
        error: "Booking not found."
      });
    }

    const user = db.users.find(
      u => u.id === req.session.userId
    );

    if (!user) {
      return res.status(401).json({
        error: "Please log in again."
      });
    }

    if (
      booking.userId !== user.id &&
      !(user.role === "provider" && booking.provider === user.name)
    ) {
      return res.status(403).json({
        error: "You cannot change this booking."
      });
    }

    if (booking.status !== "Confirmed") {
      return res.status(400).json({
        error: "This booking cannot be cancelled."
      });
    }

    booking.status = "Cancelled";
    writeDB(db);

    res.json({ booking });
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({ error: "Unable to cancel booking." });
  }
});

// Submit a review
app.post("/api/reviews", requireAuth, (req, res) => {
  try {
    const { serviceId, rating, comment } = req.body || {};
    const db = readDB();

    const user = db.users.find(
      u => u.id === req.session.userId
    );

    if (!user) {
      return res.status(401).json({
        error: "Please log in again."
      });
    }

    const service = db.services.find(
      s => s.id === Number(serviceId)
    );

    if (!service) {
      return res.status(404).json({
        error: "Service not found."
      });
    }

    const score = Number(rating);

    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({
        error: "Rating must be between 1 and 5."
      });
    }

    const hasBooking = db.bookings.some(
      booking =>
        booking.userId === user.id &&
        booking.serviceId === service.id &&
        booking.status === "Confirmed"
    );

    if (!hasBooking) {
      return res.status(403).json({
        error: "Book this service before leaving a review."
      });
    }

    if (
      db.reviews.some(
        review =>
          review.userId === user.id &&
          review.serviceId === service.id
      )
    ) {
      return res.status(409).json({
        error: "You have already reviewed this service."
      });
    }

    db.reviews.push({
      id: db.nextReviewId++,
      userId: user.id,
      serviceId: service.id,
      rating: score,
      comment: String(comment || "").slice(0, 500),
      createdAt: new Date().toISOString()
    });

    const serviceReviews = db.reviews.filter(
      review => review.serviceId === service.id
    );

    service.rating = Number(
      (
        serviceReviews.reduce(
          (sum, review) => sum + review.rating,
          0
        ) / serviceReviews.length
      ).toFixed(1)
    );

    service.reviews = serviceReviews.length;

    writeDB(db);

    res.status(201).json({ ok: true });
  } catch (error) {
    console.error("Submit review error:", error);
    res.status(500).json({ error: "Unable to submit review." });
  }
});

// Get reviews for a service
app.get("/api/reviews/:serviceId", (req, res) => {
  try {
    const db = readDB();

    const reviews = db.reviews
      .filter(review => review.serviceId === Number(req.params.serviceId))
      .map(review => ({
        ...review,
        user:
          db.users.find(u => u.id === review.userId)?.name ||
          "Customer"
      }));

    res.json({ reviews });
  } catch (error) {
    console.error("Get reviews error:", error);
    res.status(500).json({ error: "Unable to retrieve reviews." });
  }
});

// Handle unexpected errors
app.use((err, req, res, next) => {
  console.error("Server error:", err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: "An internal server error occurred."
  });
});

// Serve the homepage for other frontend routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ServiceNest running at port ${PORT}`);
});