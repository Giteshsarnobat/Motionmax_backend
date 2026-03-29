// controllers/userController.js — Admin user management
const db = require('../config/db');

// ── GET ALL USERS ─────────────────────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, name, mobile, email, role, is_active, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    return res.status(200).json({ success: true, total: rows.length, users: rows });
  } catch (err) {
    console.error('Get users error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── DELETE SINGLE USER ────────────────────────────────────────────────────────
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id) || parseInt(id) <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid user ID.' });
  }

  const userId = parseInt(id);

  // Prevent admin from deleting their own account
  if (userId === req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You cannot delete your own account.',
    });
  }

  try {
    const [existing] = await db.execute(
      'SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = existing[0];

    // Delete user — CASCADE will also delete their refresh_tokens automatically
    await db.execute('DELETE FROM users WHERE id = ?', [userId]);

    console.log(`🗑️  User deleted — ID: ${userId}, Name: ${user.name}, Role: ${user.role}`);

    return res.status(200).json({
      success:    true,
      message:    `User "${user.name}" deleted successfully.`,
      deletedId:  userId,
    });

  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── DELETE ALL USERS ──────────────────────────────────────────────────────────
exports.deleteAllUsers = async (req, res) => {
  try {
    // Never delete the currently logged-in admin
    const [count] = await db.execute(
      'SELECT COUNT(*) AS total FROM users WHERE id != ?',
      [req.user.id]
    );
    const total = count[0].total;

    if (total === 0) {
      return res.status(200).json({
        success: true,
        message: 'No other users to delete.',
        deleted: 0,
      });
    }

    // Delete all EXCEPT the current admin — so they stay logged in
    await db.execute('DELETE FROM users WHERE id != ?', [req.user.id]);

    console.log(`🗑️  ${total} users deleted by admin ID: ${req.user.id}`);

    return res.status(200).json({
      success: true,
      message: `${total} user(s) deleted. Your account was kept.`,
      deleted: total,
    });

  } catch (err) {
    console.error('Delete all users error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};