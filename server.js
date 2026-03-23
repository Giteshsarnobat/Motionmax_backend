// server.js  — Entry point
require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const contactRoutes = require("./routes/contactRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// ══════════════════════════════════════════════════
//  CORS CONFIGURATION
// ══════════════════════════════════════════════════
const allowedOrigins = [
  "http://localhost:3000", // React / Vite dev server
  "http://localhost:5173", // Vite default port
  "http://127.0.0.1:5500", // VS Code Live Server
  "http://localhost:5500", // VS Code Live Server (alt)
  "http://127.0.0.1:3000", // Local fallback
  "null", // File opened directly in browser (file://)
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, mobile apps, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Handle preflight requests for ALL routes
app.options("*", cors());

app.use(cookieParser());
credentials: true; // in CORS — required for cookies cross-origin

// ══════════════════════════════════════════════════
//  SECURITY MIDDLEWARE
// ══════════════════════════════════════════════════
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Slow down." },
  }),
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ══════════════════════════════════════════════════
// ── PARSERS ───────────────────────────────────────
// ══════════════════════════════════════════════════
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser()); // ✅ Must be after body parsers

// ══════════════════════════════════════════════════
//  ROUTES
// ══════════════════════════════════════════════════
app.get("/", (_req, res) =>
  res.json({ success: true, message: "JWT Auth API is running 🚀" }),
);

app.use("/api/auth", authRoutes);
app.use("/api/contact", contactRoutes);

app.use((_req, res) =>
  res.status(404).json({ success: false, message: "Route not found." }),
);

app.use((err, _req, res, _next) => {
  if (err.message && err.message.includes("CORS blocked")) {
    return res.status(403).json({ success: false, message: err.message });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error." });
});

// ══════════════════════════════════════════════════
//  START
// ══════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`🍪 Refresh token stored in HttpOnly cookie (secure)`);
  console.log(`🌐 CORS enabled for: ${allowedOrigins.join(", ")}`);
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
