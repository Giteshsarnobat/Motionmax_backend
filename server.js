require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser"); // ✅ NEW
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const contactRoutes = require("./routes/contactRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://127.0.0.1:3000",
  "null",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // ✅ Required for cookies to be sent cross-origin
  }),
);

app.options("*", cors());

// ── SECURITY MIDDLEWARE ───────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Slow down." },
  }),
);

// ── PARSERS ───────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser()); // ✅ Must be after body parsers

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.get("/", (_req, res) =>
  res.json({ success: true, message: "JWT Auth API is running 🚀" }),
);

app.use("/api/auth", authRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/users", userRoutes); // ✅ NEW — user management

app.use((_req, res) =>
  res.status(404).json({ success: false, message: "Route not found." }),
);

app.use((err, _req, res, _next) => {
  if (err.message?.includes("CORS blocked")) {
    return res.status(403).json({ success: false, message: err.message });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error." });
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`🍪 Refresh token stored in HttpOnly cookie (secure)`);
  console.log(`🌐 CORS enabled for: ${allowedOrigins.join(", ")}\n`);
  console.log(`\n📋 API Endpoints:`);
  console.log(`   POST /api/auth/signup`);
  console.log(`   POST /api/auth/login`);
  console.log(`   POST /api/auth/refresh-token`);
  console.log(`   POST /api/auth/logout`);
  console.log(`   GET  /api/auth/profile         [protected]`);
  console.log(`   POST /api/contact              [public]`);
  console.log(`   GET  /api/contact              [admin only]`);
  console.log(`   GET  /api/contact/export/excel [admin only]\n`);
});
