const tombol = document.getElementById("tombolAjaib");
const html = document.documentElement; // Ini menangkap tag <html>

tombol.addEventListener("click", function () {
  // Toggle class 'dark' di tag <html>
  html.classList.toggle("dark");

  // Ubah tulisan tombol
  if (html.classList.contains("dark")) {
    tombol.textContent = "Kembali ke Terang";
  } else {
    tombol.textContent = "Mode Gelap";
  }
});
