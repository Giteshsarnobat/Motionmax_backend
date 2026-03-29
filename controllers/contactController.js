// controllers/contactController.js
const { validationResult } = require("express-validator");
const ExcelJS = require("exceljs");
const db = require("../config/db");

// ── Timezone from .env — default to Asia/Kolkata (IST) ───────────────────────
const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

/**
 * formatToIST()
 * Converts a MySQL datetime (stored as UTC) to IST (or any timezone set in .env)
 * and returns a clean readable string like "22 Mar 2026, 06:45:30 PM"
 *
 * Root cause of the bug:
 *   new Date(contact.created_at).toLocaleString('en-IN')
 *   → This uses the SERVER's local timezone, which may be UTC or any other zone.
 *   → MySQL stores TIMESTAMP as UTC internally.
 *   → If server timezone ≠ IST, the displayed time is wrong.
 *
 * Fix:
 *   Use Intl.DateTimeFormat with explicit timeZone: 'Asia/Kolkata'
 *   → Always produces correct IST time regardless of where the server runs.
 */
function formatToIST(mysqlDatetime) {
  if (!mysqlDatetime) return "—";

  const date = new Date(mysqlDatetime);
  if (isNaN(date.getTime())) return String(mysqlDatetime);

  // ── Extract each part separately using en-US locale ──────────────────────
  // Reason: 'en-IN' locale shows am/pm in lowercase and inconsistently
  //         'en-US' always gives clean uppercase AM / PM
  const opts = { timeZone: APP_TIMEZONE };

  const day = new Intl.DateTimeFormat("en-US", {
    ...opts,
    day: "2-digit",
  }).format(date);
  const month = new Intl.DateTimeFormat("en-US", {
    ...opts,
    month: "short",
  }).format(date);
  const year = new Intl.DateTimeFormat("en-US", {
    ...opts,
    year: "numeric",
  }).format(date);
  const hour = new Intl.DateTimeFormat("en-US", {
    ...opts,
    hour: "2-digit",
    hour12: true,
  }).format(date);
  const minute = new Intl.DateTimeFormat("en-US", {
    ...opts,
    minute: "2-digit",
  })
    .format(date)
    .padStart(2, "0");
  const second = new Intl.DateTimeFormat("en-US", {
    ...opts,
    second: "2-digit",
  })
    .format(date)
    .padStart(2, "0");

  // hour already contains AM/PM from en-US e.g. "02 PM" or "11 AM"
  // Split it to get numeric hour and AM/PM separately
  const hourParts = hour.split(" "); // ['02', 'PM'] or ['11', 'AM']
  const hh = hourParts[0].padStart(2, "0");
  const ampm = hourParts[1] || ""; // 'AM' or 'PM' — always uppercase

  // ✅ Final format: "22 Mar 2026, 02:45:30 PM"
  return `${day} ${month} ${year}`;
}

// ── INSERT CONTACT ────────────────────────────────────────────────────────────
exports.createContact = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  const { name, email, mobile, subject, message } = req.body;

  try {
    const [result] = await db.execute(
      "INSERT INTO contacts (name, email, mobile, subject, message) VALUES (?, ?, ?, ?, ?)",
      [name, email, mobile, subject, message],
    );

    return res.status(201).json({
      success: true,
      message: "Your message has been sent successfully.",
      contactId: result.insertId,
    });
  } catch (err) {
    console.error("Contact insert error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── GET ALL CONTACTS ──────────────────────────────────────────────────────────
exports.getContacts = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, name, email, mobile, subject, message, created_at
       FROM contacts
       ORDER BY created_at DESC`,
    );
    return res.status(200).json({
      success: true,
      total: rows.length,
      contacts: rows,
    });
  } catch (err) {
    console.error("Fetch contacts error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── EXPORT CONTACTS → EXCEL ───────────────────────────────────────────────────
exports.exportContactsExcel = async (req, res) => {
  try {
    // db.js has timezone:'+00:00' so mysql2 returns created_at as UTC string.
    // formatToIST() converts UTC → IST (Asia/Kolkata) correctly — NO CONVERT_TZ needed.
    const [rows] = await db.execute(
      `SELECT id, name, email, mobile, subject, message, created_at
       FROM contacts
       ORDER BY created_at DESC`,
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "MotionMax Institute";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Contacts", {
      pageSetup: { paperSize: 9, orientation: "landscape" },
    });

    sheet.columns = [
      { header: "#", key: "sr", width: 8 },
      { header: "Name", key: "name", width: 22 },
      { header: "Email", key: "email", width: 30 },
      { header: "Mobile", key: "mobile", width: 18 },
      { header: "Subject", key: "subject", width: 35 },
      { header: "Message", key: "message", width: 50 },
      { header: "Submitted (IST)", key: "submitted", width: 26 },
    ];

    // Header styling
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A5F" },
      };
      cell.font = {
        bold: true,
        color: { argb: "FFFFFFFF" },
        size: 11,
        name: "Arial",
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFFFFFFF" } },
        bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
        left: { style: "thin", color: { argb: "FFFFFFFF" } },
        right: { style: "thin", color: { argb: "FFFFFFFF" } },
      };
    });
    headerRow.height = 30;

    // Data rows
    rows.forEach((contact, idx) => {
      // created_at from mysql2 is UTC → formatToIST converts to IST correctly
      const row = sheet.addRow({
        sr: idx + 1,
        name: contact.name,
        email: contact.email,
        mobile: contact.mobile,
        subject: contact.subject,
        message: contact.message,
        submitted: formatToIST(contact.created_at), // UTC → IST, single conversion
      });

      const bgColor = idx % 2 === 0 ? "FFF0F4FA" : "FFFFFFFF";
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: bgColor },
        };
        cell.font = { name: "Arial", size: 10 };
        cell.alignment = { vertical: "middle", wrapText: true };
        cell.border = {
          top: { style: "hair", color: { argb: "FFCCCCCC" } },
          bottom: { style: "hair", color: { argb: "FFCCCCCC" } },
          left: { style: "hair", color: { argb: "FFCCCCCC" } },
          right: { style: "hair", color: { argb: "FFCCCCCC" } },
        };
      });
      row.height = 20;
    });

    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };

    // Summary row
    sheet.addRow([]);
    const summaryRow = sheet.addRow([
      `Total Contacts: ${rows.length}`,
      "",
      "",
      "",
      "",
      "",
      `Exported on: ${formatToIST(new Date())}`,
    ]);
    summaryRow.getCell(1).font = {
      bold: true,
      name: "Arial",
      size: 11,
      color: { argb: "FF1E3A5F" },
    };
    summaryRow.getCell(7).font = {
      italic: true,
      name: "Arial",
      size: 10,
      color: { argb: "FF64748B" },
    };

    const filename = `contacts_${Date.now()}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    return res.end();
  } catch (err) {
    console.error("Excel export error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to generate Excel file." });
  }
};

// ── DELETE SINGLE CONTACT ─────────────────────────────────────────────────────
exports.deleteContact = async (req, res) => {
  const { id } = req.params;

  // Validate ID is a positive integer
  if (!id || isNaN(id) || parseInt(id) <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid contact ID." });
  }

  try {
    // Check contact exists first
    const [existing] = await db.execute(
      "SELECT id, name FROM contacts WHERE id = ? LIMIT 1",
      [parseInt(id)],
    );

    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Contact not found." });
    }

    // Delete it
    await db.execute("DELETE FROM contacts WHERE id = ?", [parseInt(id)]);

    console.log(`🗑️  Contact deleted — ID: ${id}, Name: ${existing[0].name}`);

    return res.status(200).json({
      success: true,
      message: `Contact "${existing[0].name}" deleted successfully.`,
      deletedId: parseInt(id),
    });
  } catch (err) {
    console.error("Delete contact error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── DELETE ALL CONTACTS ───────────────────────────────────────────────────────
exports.deleteAllContacts = async (req, res) => {
  try {
    const [count] = await db.execute("SELECT COUNT(*) AS total FROM contacts");
    const total = count[0].total;

    if (total === 0) {
      return res
        .status(200)
        .json({ success: true, message: "No contacts to delete.", deleted: 0 });
    }

    await db.execute("DELETE FROM contacts");

    // Reset auto increment so next contact starts from ID 1
    await db.execute("ALTER TABLE contacts AUTO_INCREMENT = 1");

    console.log(
      `🗑️  All ${total} contacts deleted by admin ID: ${req.user.id}`,
    );

    return res.status(200).json({
      success: true,
      message: `All ${total} contact(s) deleted successfully.`,
      deleted: total,
    });
  } catch (err) {
    console.error("Delete all contacts error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
