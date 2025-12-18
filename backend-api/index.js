const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "kunci_rahasia_negara_api";

app.use(cors());
app.use(express.json());

const connectionString = process.env.DATABASE_URL || "postgres://postgres:root@localhost:5432/bootcamp_db";

const pool = new Pool({
  connectionString: connectionString,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// MIDDLEWARE AUTH
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

// 1. REGISTER (YANG HILANG TADI)
app.post("/api/register", async (req, res) => {
  try {
    const { nama, email, password, role } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query("INSERT INTO users (nama, email, password, role, pesan) VALUES ($1, $2, $3, $4, $5) RETURNING *", [nama, email, hashedPassword, role, "Halo, saya user baru!"]);
    res.json({ message: "Registrasi Berhasil!", user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send("Gagal Register");
  }
});

// 2. LOGIN
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

// 3. GET PROFILE
app.get("/api/profile", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users LIMIT 1");
    if (result.rows.length === 0) return res.status(404).json({ message: "No User" });

    const user = result.rows[0];
    const hobiRes = await pool.query("SELECT * FROM hobbies WHERE user_id = $1", [user.id]);

    res.json({ nama: user.nama, role: user.role, pesan: user.pesan, hobi: hobiRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// === PRIVATE ROUTES ===

app.put("/api/profile", authenticateToken, async (req, res) => {
  try {
    const { pesanBaru } = req.body;
    await pool.query("UPDATE users SET pesan = $1 WHERE id = $2", [pesanBaru, req.user.id]);
    res.json({ message: "Sukses update data!" });
  } catch (err) {
    res.status(500).send("Gagal Update");
  }
});

app.post("/api/hobbies", authenticateToken, async (req, res) => {
  try {
    const { hobiBaru } = req.body;
    const result = await pool.query("INSERT INTO hobbies (user_id, hobi) VALUES ($1, $2) RETURNING *", [req.user.id, hobiBaru]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send("Gagal Tambah Hobi");
  }
});

app.delete("/api/hobbies/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM hobbies WHERE id = $1", [id]);
    res.json({ message: "Hobi dihapus!" });
  } catch (err) {
    res.status(500).send("Gagal Hapus");
  }
});

module.exports = app;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di Port ${PORT}`);
  });
}
