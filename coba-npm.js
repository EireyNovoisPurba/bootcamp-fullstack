// Memanggil paket yang baru kita install
const figlet = require("figlet");

// Menggunakan paketnya
figlet("Fullstack Developer", function (err, data) {
  if (err) {
    console.log("Ada yang salah...");
    return;
  }
  // Tampilkan hasilnya di terminal
  console.log(data);
});
