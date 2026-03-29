// routes/contactRoutes.js
const express                = require('express');
const { body }               = require('express-validator');
const rateLimit              = require('express-rate-limit');
const contactController      = require('../controllers/contactController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      5,
  message:  { success: false, message: 'Too many contact requests. Try again later.' },
});

const contactValidators = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('mobile').trim().matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit mobile number'),
  body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 255 }),
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ min: 10, max: 2000 }),
];

// ── Public ────────────────────────────────────────────────────────────────────
router.post('/', contactLimiter, contactValidators, contactController.createContact);

// ── Admin only ────────────────────────────────────────────────────────────────
router.get('/',                protect, authorize('admin'), contactController.getContacts);
router.get('/export/excel',    protect, authorize('admin'), contactController.exportContactsExcel);

// ✅ NEW — Delete single contact by ID
router.delete('/:id',          protect, authorize('admin'), contactController.deleteContact);

// ✅ NEW — Delete ALL contacts at once
router.delete('/',             protect, authorize('admin'), contactController.deleteAllContacts);

module.exports = router;