const tombol = document.getElementById("tombolAjaib");
const body = document.body;

tombol.addEventListener("click", function () {
  // Cara Pro: Toggle class (Kalau ada dihapus, kalau gak ada ditambah)
  body.classList.toggle("dark-mode");

  // Ubah teks tombol
  if (body.classList.contains("dark-mode")) {
    tombol.textContent = "Kembali ke Terang";
  } else {
    tombol.textContent = "Klik Saya! (Mode Gelap)";
  }
});
