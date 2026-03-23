// controllers/authController.js
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const db = require("../config/db");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");

const IS_PRODUCTION   = (process.env.NODE_ENV || 'development') === 'production';
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// ── Cookie options for refresh token ─────────────────────────────────────────
const refreshCookieOptions = {
  httpOnly: true, // JS cannot read this cookie at all
  secure: IS_PRODUCTION, // HTTPS only in production
  sameSite: "strict", // Blocks CSRF — cookie only sent from same origin
  maxAge: REFRESH_MAX_AGE,
  path: "/api/auth", // Cookie only sent to /api/auth routes
};

// ── helpers ──────────────────────────────────────────────────────────────────
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

const sendTokens = async (res, user) => {
  const payload = { id: user.id, email: user.email, role: user.role };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Persist refresh token in DB (expires in 7 days)
  const expiresAt = new Date(Date.now() + REFRESH_MAX_AGE); //7 * 24 * 60 * 60 * 1000);
  await db.execute(
    "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
    [user.id, refreshToken, expiresAt],
  );

  // ✅ Set refresh token in HttpOnly cookie — JS can NEVER read this
  res.cookie("refreshToken", refreshToken, refreshCookieOptions);

  // ✅ Only send accessToken in response body (short-lived 15 min)
  // Never send refreshToken in response body
  return res.status(200).json({
    success: true,
    accessToken,
    //refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
};

// ── SIGNUP ────────────────────────────────────────────────────────────────────
exports.signup = async (req, res) => {
  // 1. Validate inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  const { name, mobile, email, password } = req.body;
  // Only allow 'user' or 'admin' — anything else defaults to 'user'
  const role = ["user", "admin"].includes(req.body.role)
    ? req.body.role
    : "user";

  try {
    // 2. Check duplicate email / mobile
    const [existing] = await db.execute(
      "SELECT id FROM users WHERE email = ? OR mobile = ? LIMIT 1",
      [email, mobile],
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email or mobile number is already registered.",
      });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 4. Insert user
    const [result] = await db.execute(
      "INSERT INTO users (name, mobile, email, password,role) VALUES (?, ?, ?, ?, ?)",
      [name, mobile, email, hashedPassword, role],
    );

    const newUser = { id: result.insertId, name, email, role };

    // 5. Return tokens
    return sendTokens(res, newUser);
  } catch (err) {
    console.error("Signup error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Try again." });
  }
};

// ── LOGIN ─────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // 1. Find user
    const [rows] = await db.execute(
      "SELECT id, name, email, password, role, is_active FROM users WHERE email = ? LIMIT 1",
      [email],
    );
    if (rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials." });
    }

    const user = rows[0];

    // 2. Check account active
    if (!user.is_active) {
      return res
        .status(403)
        .json({ success: false, message: "Account is deactivated." });
    }

    // 3. Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials." });
    }

    // 4. Issue tokens
    return sendTokens(res, user);
  } catch (err) {
    console.error("Login error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Try again." });
  }
};

// ── REFRESH TOKEN ─────────────────────────────────────────────────────────────
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: "No refresh token found. Please login again.",
    });
  }

  try {
    // 1. Verify signature & expiry
    const decoded = verifyRefreshToken(refreshToken);

    // 2. Check token exists in DB (prevents reuse after logout)
    const [rows] = await db.execute(
      "SELECT id FROM refresh_tokens WHERE token = ? AND expires_at > NOW() LIMIT 1",
      [refreshToken],
    );
    if (rows.length === 0) {
      // Clear the invalid cookie
      res.clearCookie("refreshToken", { path: "/api/auth" });
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session. Please login again.",
      });
    }

    // 3. Rotate: delete old, issue new
    await db.execute("DELETE FROM refresh_tokens WHERE token = ?", [
      refreshToken,
    ]);

    const [userRows] = await db.execute(
      "SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1",
      [decoded.id],
    );

    if (userRows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "User not found." });
    }

    return sendTokens(res, userRows[0]);
  } catch (err) {
    res.clearCookie("refreshToken", { path: "/api/auth" });
    return res.status(401).json({
      success: false,
      message: "Invalid or expired session. Please login again.",
    });
  }
};

// ── LOGOUT ────────────────────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  // ✅ Read from cookie
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    // Remove from DB
    await db.execute("DELETE FROM refresh_tokens WHERE token = ?", [
      refreshToken,
    ]);
  }

  // ✅ Clear the HttpOnly cookie
  res.clearCookie("refreshToken", { path: "/api/auth" });

  return res
    .status(200)
    .json({ success: true, message: "Logged out successfully." });
};

// ── GET PROFILE (protected) ───────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, name, mobile, email, role, created_at FROM users WHERE id = ? LIMIT 1",
      [req.user.id],
    );
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }
    return res.status(200).json({ success: true, user: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
