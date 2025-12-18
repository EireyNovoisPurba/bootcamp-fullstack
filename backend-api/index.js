const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3000;
const JWT_SECRET = "kunci_rahasia_negara_api";

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "bootcamp_db",
  password: "root", // <--- CEK PASSWORD KAMU!
  port: 5432,
});

// MIDDLEWARE AUTH
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user; // Simpan data user (termasuk ID asli) ke request
    next();
  });
}

// === PUBLIC ROUTES ===

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ message: "Email tidak ditemukan!" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: "Password salah!" });

    // Kita simpan ID asli user ke dalam token
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "Login Berhasil!", token, user: { nama: user.nama } });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/api/profile", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users LIMIT 1");
    if (result.rows.length === 0) return res.status(404).json({ message: "No User" });

    const user = result.rows[0];
    const hobiRes = await pool.query("SELECT * FROM hobbies WHERE user_id = $1", [user.id]);

    res.json({ nama: user.nama, role: user.role, pesan: user.pesan, hobi: hobiRes.rows });
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// === PRIVATE ROUTES (YANG KITA PERBAIKI) ===

// 1. UPDATE PESAN (Sekarang pakai req.user.id, bukan angka 1)
app.put("/api/profile", authenticateToken, async (req, res) => {
  try {
    const { pesanBaru } = req.body;
    // PERBAIKAN: WHERE id = $2 (ambil dari token user yang login)
    await pool.query("UPDATE users SET pesan = $1 WHERE id = $2", [pesanBaru, req.user.id]);
    res.json({ message: "Sukses update data!" });
  } catch (err) {
    res.status(500).send("Gagal Update");
  }
});

// 2. TAMBAH HOBI (Sekarang pakai req.user.id)
app.post("/api/hobbies", authenticateToken, async (req, res) => {
  try {
    const { hobiBaru } = req.body;
    // PERBAIKAN: VALUES ($1, ...) -> ID User dari token
    const result = await pool.query("INSERT INTO hobbies (user_id, hobi) VALUES ($1, $2) RETURNING *", [req.user.id, hobiBaru]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send("Gagal Tambah Hobi");
  }
});

// 3. HAPUS HOBI
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
  console.log(`🚀 Server FINAL FIX running at http://localhost:${PORT}`);
});
