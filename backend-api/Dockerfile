# 1. Pilih Base Image (OS yang ringan & sudah ada Node.js)
FROM node:18-alpine

# 2. Bikin folder kerja di dalam kontainer
WORKDIR /app

# 3. Copy daftar belanjaan (package.json) dulu biar caching jalan
COPY package*.json ./

# 4. Install semua library di dalam kontainer
RUN npm install

# 5. Copy seluruh sisa kodingan kamu ke dalam kontainer
COPY . .

# 6. Buka Port 3000 (Jendela komunikasi)
EXPOSE 3000

# 7. Perintah buat nyalain server kalau kontainer dijalankan
CMD ["node", "index.js"]