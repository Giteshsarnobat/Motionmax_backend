# JWT Authentication & Authorization — Node.js + MySQL

A production-ready REST API with JWT auth, role-based access control, contact form, and Excel export.

---

## 📁 Project Structure

```
jwt-auth-app/
├── config/
│   └── db.js                  ← MySQL connection pool
├── controllers/
│   ├── authController.js      ← signup, login, refresh, logout, profile
│   └── contactController.js   ← create contact, get all, export Excel
├── middleware/
│   └── auth.js                ← protect() + authorize() guards
├── routes/
│   ├── authRoutes.js          ← /api/auth/*
│   └── contactRoutes.js       ← /api/contact/*
├── utils/
│   └── jwt.js                 ← sign & verify helpers
├── schema.sql                 ← Run this in MySQL first!
├── .env.example               ← Copy to .env and fill values
├── server.js                  ← App entry point
└── package.json
```

---

## ⚙️ Setup — Step by Step

### Step 1 — Install Node.js
Download from https://nodejs.org (choose LTS version)

### Step 2 — Install MySQL
Download from https://dev.mysql.com/downloads/mysql/

### Step 3 — Clone / Download this project
```bash
cd your-projects-folder
```

### Step 4 — Install dependencies
```bash
npm install
```

### Step 5 — Set up the database
Open MySQL Workbench or terminal and run:
```sql
SOURCE /path/to/jwt-auth-app/schema.sql;
```
This creates the database and all 3 tables automatically.

### Step 6 — Configure environment
```bash
cp .env.example .env
```
Open `.env` and fill in your MySQL password and choose strong JWT secrets.

### Step 7 — Start the server
```bash
# Development (auto-restarts on file change)
npm run dev

# Production
npm start
```

You should see:
```
✅ MySQL connected successfully
🚀 Server running on http://localhost:5000
```

---

## 🔌 API Reference

### Auth Endpoints

#### POST /api/auth/signup
Register a new user.
```json
{
  "name":     "John Doe",
  "mobile":   "9876543210",
  "email":    "john@example.com",
  "password": "Pass@1234"
}
```
**Password Rules:** min 8 chars, uppercase, lowercase, number, special char

**Response:**
```json
{
  "success":      true,
  "accessToken":  "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": 1, "name": "John Doe", "email": "john@example.com", "role": "user" }
}
```

---

#### POST /api/auth/login
```json
{
  "email":    "john@example.com",
  "password": "Pass@1234"
}
```

---

#### POST /api/auth/refresh-token
Get a new access token using the refresh token.
```json
{ "refreshToken": "eyJhbGciOiJIUzI1NiIs..." }
```

---

#### POST /api/auth/logout
```json
{ "refreshToken": "eyJhbGciOiJIUzI1NiIs..." }
```

---

#### GET /api/auth/profile
**Header:** `Authorization: Bearer <accessToken>`

Returns current user's profile.

---

### Contact Endpoints

#### POST /api/contact  (Public — no token needed)
```json
{
  "name":    "Jane Smith",
  "email":   "jane@example.com",
  "mobile":  "9123456780",
  "subject": "Product Enquiry",
  "message": "I would like to know more about your services."
}
```

---

#### GET /api/contact  (Admin only)
**Header:** `Authorization: Bearer <adminAccessToken>`

Returns all contacts as JSON.

---

#### GET /api/contact/export/excel  (Admin only)
**Header:** `Authorization: Bearer <adminAccessToken>`

Downloads a professionally formatted `.xlsx` file with all contacts.

---

## 🔐 Security Features

| Feature | Details |
|---|---|
| Password hashing | bcrypt with 12 salt rounds |
| JWT access token | Short-lived (15 min) |
| JWT refresh token | Long-lived (7 days), stored in DB |
| Token rotation | Old refresh token deleted on every refresh |
| Helmet | Secure HTTP headers |
| Rate limiting | Login: 10/15min • Contact: 5/hr • Global: 100/15min |
| Input validation | express-validator on all inputs |
| Role-based access | `user` and `admin` roles |
| SQL injection | Parameterized queries (mysql2) |

---

## 🛠 Make Yourself Admin
After signing up, run this in MySQL:
```sql
USE jwt_auth_db;
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

---

## 📦 Dependencies

| Package | Purpose |
|---|---|
| express | Web framework |
| mysql2 | MySQL driver with promise support |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT sign & verify |
| express-validator | Input validation |
| express-rate-limit | Brute-force protection |
| helmet | Security headers |
| exceljs | Excel file generation |
| dotenv | Environment variables |
| nodemon | Dev auto-restart |
