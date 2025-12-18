const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config(); // <--- BARU: Supaya bisa baca variabel server

const app = express();
// <--- BARU: Port ikut aturan Render, kalau di laptop pakai 3000
const PORT = process.env.PORT || 3000;
// <--- BARU: Kunci rahasia diambil dari setting server (nanti kita set di Render)
const JWT_SECRET = process.env.JWT_SECRET || "kunci_rahasia_negara_api";

app.use(cors());
app.use(express.json());

// === KONFIGURASI DATABASE (YANG BIKIN BINGUNG TADI) ===
// Logikanya: "Cek dulu apakah ada alamat DATABASE_URL dari Neon?"
// "Kalau gak ada (artinya lagi di laptop), pakai database lokal."
const connectionString = process.env.DATABASE_URL || "postgres://postgres:root@localhost:5432/bootcamp_db";

const pool = new Pool({
  connectionString: connectionString,
  // <--- BARU: SSL Wajib buat Neon/Render, tapi dimatikan kalau di laptop
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// === MIDDLEWARE AUTH ===
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// === PUBLIC ROUTES ===

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ message: "Email tidak ditemukan!" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: "Password salah!" });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "Login Berhasil!", token, user: { nama: user.nama } });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Get Profile
app.get("/api/profile", async (req, res) => {
  try {
    // Kita pakai LIMIT 1 dulu karena ini portfolio personal
    const result = await pool.query("SELECT * FROM users LIMIT 1");
    if (result.rows.length === 0) return res.status(404).json({ message: "No User" });

    const user = result.rows[0];
    const hobiRes = await pool.query("SELECT * FROM hobbies WHERE user_id = $1", [user.id]);

    res.json({ nama: user.nama, role: user.role, pesan: user.pesan, hobi: hobiRes.rows });
  } catch (err) {
    console.error(err); // Biar kelihatan errornya di log server
    res.status(500).send("Server Error");
  }
});

// === PRIVATE ROUTES (Perlu Token) ===

// Update Pesan
app.put("/api/profile", authenticateToken, async (req, res) => {
  try {
    const { pesanBaru } = req.body;
    await pool.query("UPDATE users SET pesan = $1 WHERE id = $2", [pesanBaru, req.user.id]);
    res.json({ message: "Sukses update data!" });
  } catch (err) {
    res.status(500).send("Gagal Update");
  }
});

// Tambah Hobi
app.post("/api/hobbies", authenticateToken, async (req, res) => {
  try {
    const { hobiBaru } = req.body;
    const result = await pool.query("INSERT INTO hobbies (user_id, hobi) VALUES ($1, $2) RETURNING *", [req.user.id, hobiBaru]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send("Gagal Tambah Hobi");
  }
});

// Hapus Hobi
app.delete("/api/hobbies/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM hobbies WHERE id = $1", [id]);
    res.json({ message: "Hobi dihapus!" });
  } catch (err) {
    res.status(500).send("Gagal Hapus");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di Port ${PORT}`);
});
