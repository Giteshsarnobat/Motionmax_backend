// routes/userRoutes.js  — Admin user management
const express                = require('express');
const userController         = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// ── Admin only ────────────────────────────────────────────────────────────────
router.get('/',        protect, authorize('admin'), userController.getAllUsers);
router.delete('/:id',  protect, authorize('admin'), userController.deleteUser);
router.delete('/',     protect, authorize('admin'), userController.deleteAllUsers);

module.exports = router;