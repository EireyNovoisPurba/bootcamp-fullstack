const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Redis } = require("@upstash/redis"); // Import Redis
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "kunci_rahasia_negara_api";

// Setup Client Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:root@localhost:5432/bootcamp_db",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// ... (Middleware authenticateToken TETAP SAMA, tidak perlu diubah) ...
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

// ... (Route Login & Register TETAP SAMA) ...
app.post("/api/register", async (req, res) => {
  // ... (Kode Register sama persis, copy dari sebelumnya)
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

app.post("/api/login", async (req, res) => {
  // ... (Kode Login sama persis)
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

// === BAGIAN INI YANG KITA UBAH JADI CANGGIH (REDIS) ===

app.get("/api/profile", async (req, res) => {
  try {
    // 1. Cek dulu: Apakah data ada di Redis (Cache)?
    const cachedProfile = await redis.get("profile_data");

    if (cachedProfile) {
      // KALO ADA: Kirim langsung dari Redis (Ngebut!)
      console.log("⚡ HIT REDIS (Data dari Cache)");
      return res.json(cachedProfile);
    }

    // 2. KALO GAK ADA: Terpaksa ambil dari Database (Lambat)
    console.log("🐢 MISS REDIS (Ambil dari DB)");
    const result = await pool.query("SELECT * FROM users LIMIT 1");
    if (result.rows.length === 0) return res.status(404).json({ message: "No User" });

    const user = result.rows[0];
    const hobiRes = await pool.query("SELECT * FROM hobbies WHERE user_id = $1", [user.id]);

    const finalData = {
      nama: user.nama,
      role: user.role,
      pesan: user.pesan,
      hobi: hobiRes.rows,
    };

    // 3. Simpan hasilnya ke Redis biar request berikutnya ngebut
    // 'ex: 60' artinya simpan selama 60 detik saja (biar update gak kelamaan)
    await redis.set("profile_data", finalData, { ex: 60 });

    res.json(finalData);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// ... (Route PUT Update & POST Hobbies perlu sedikit update) ...
// Kenapa? Karena kalau data diupdate, Cache lama harus DIHAPUS (Invalidate)
// Biar user gak lihat data jadul.

app.put("/api/profile", authenticateToken, async (req, res) => {
  try {
    const { pesanBaru } = req.body;
    await pool.query("UPDATE users SET pesan = $1 WHERE id = $2", [pesanBaru, req.user.id]);

    // HAPUS CACHE LAMA (Biar data baru muncul)
    await redis.del("profile_data");

    res.json({ message: "Sukses update data!" });
  } catch (err) {
    res.status(500).send("Gagal Update");
  }
});

app.post("/api/hobbies", authenticateToken, async (req, res) => {
  try {
    const { hobiBaru } = req.body;
    const result = await pool.query("INSERT INTO hobbies (user_id, hobi) VALUES ($1, $2) RETURNING *", [req.user.id, hobiBaru]);

    await redis.del("profile_data"); // Hapus Cache

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send("Gagal Tambah Hobi");
  }
});

app.delete("/api/hobbies/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM hobbies WHERE id = $1", [id]);

    await redis.del("profile_data"); // Hapus Cache

    res.json({ message: "Hobi dihapus!" });
  } catch (err) {
    res.status(500).send("Gagal Hapus");
  }
});

module.exports = app;
// ... (Bagian listen tetap sama)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di Port ${PORT}`);
  });
}
