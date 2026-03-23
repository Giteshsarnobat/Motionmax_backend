// routes/contactRoutes.js
const express           = require('express');
const { body }          = require('express-validator');
const rateLimit         = require('express-rate-limit');
const contactController = require('../controllers/contactController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// ── Rate limiter: max 5 contact submissions per hour per IP ───────────────
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max:      5,
  message:  { success: false, message: 'Too many contact requests. Try again later.' },
});

// ── Validators ────────────────────────────────────────────────────────────
const contactValidators = [
  body('name')
    .trim().notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

  body('email')
    .trim().isEmail().withMessage('Valid email is required').normalizeEmail(),

  body('mobile')
    .trim().matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit mobile number'),

  body('subject')
    .trim().notEmpty().withMessage('Subject is required')
    .isLength({ max: 255 }).withMessage('Subject max 255 characters'),

  body('message')
    .trim().notEmpty().withMessage('Message is required')
    .isLength({ min: 10, max: 2000 }).withMessage('Message must be 10–2000 characters'),
];

// ── Routes ─────────────────────────────────────────────────────────────────
// Public: anyone can submit a contact form
router.post('/',           contactLimiter, contactValidators, contactController.createContact);

// Protected: only admin can view or export contacts
router.get('/',            protect, authorize('admin'),       contactController.getContacts);
router.get('/export/excel',protect, authorize('admin'),       contactController.exportContactsExcel);

module.exports = router;
