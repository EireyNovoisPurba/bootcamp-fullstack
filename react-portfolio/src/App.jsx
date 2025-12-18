import { useEffect, useState } from "react";

function App() {
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [dataBackend, setDataBackend] = useState(null);
  const [inputPesan, setInputPesan] = useState("");
  const [inputHobi, setInputHobi] = useState("");

  // URL BACKEND VERCEL KAMU
  const API_URL = "https://bootcamp-fullstack-teal.vercel.app/api";

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/login`, {
      // <--- Benar: /api/login
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      setToken(data.token);
      alert("Login Sukses!");
      ambilData();
    } else {
      alert(data.message);
    }
  };

  const ambilData = () => {
    fetch(`${API_URL}/profile`) // <--- Benar: /api/profile (Bukan Login)
      .then((res) => res.json())
      .then((data) => {
        setDataBackend(data);
        setInputPesan(data.pesan);
      });
  };

  useEffect(() => {
    ambilData();
  }, []);

  const handleUpdatePesan = async () => {
    if (!token) return alert("Login dulu!");
    await fetch(`${API_URL}/profile`, {
      // <--- Benar: /api/profile
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pesanBaru: inputPesan }),
    });
    alert("Pesan Terupdate!");
    ambilData();
  };

  const handleTambahHobi = async (e) => {
    e.preventDefault();
    if (!token) return alert("Login dulu!");
    await fetch(`${API_URL}/hobbies`, {
      // <--- Benar: /api/hobbies
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ hobiBaru: inputHobi }),
    });
    setInputHobi("");
    ambilData();
  };

  const handleHapusHobi = async (id) => {
    if (!token) return alert("Login dulu!");
    if (!confirm("Hapus?")) return;
    await fetch(`${API_URL}/hobbies/${id}`, {
      // <--- Benar: /api/hobbies/:id
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    ambilData();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center font-sans p-5 gap-10">
      {!token && (
        <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm">
          <h2 className="text-xl font-bold mb-4 text-center">Login Admin</h2>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="border p-2 rounded" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="border p-2 rounded" />
            <button className="bg-blue-600 text-white py-2 rounded font-bold">Masuk</button>
          </form>
        </div>
      )}

      {dataBackend && (
        <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full text-center relative">
          <div className={`absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full ${token ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>{token ? "🔒 MODE ADMIN" : "👀 READ ONLY"}</div>
          <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full mx-auto mb-4 border-4 border-white shadow-lg flex items-center justify-center text-4xl">😎</div>
          <h1 className="text-2xl font-bold text-slate-800">{dataBackend.nama}</h1>
          <p className="text-blue-500 font-bold text-xs uppercase mb-6">{dataBackend.role}</p>

          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {dataBackend.hobi.map((item) => (
              <div key={item.id} className="group flex items-center bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full font-bold">
                {item.hobi}
                {token && (
                  <button onClick={() => handleHapusHobi(item.id)} className="ml-2 text-red-400 hover:text-red-600">
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {token ? (
            <div className="space-y-4">
              <form onSubmit={handleTambahHobi} className="flex gap-2">
                <input value={inputHobi} onChange={(e) => setInputHobi(e.target.value)} placeholder="Hobi baru..." className="flex-1 border p-2 rounded text-sm" />
                <button className="bg-green-600 text-white px-4 rounded font-bold">+</button>
              </form>
              <textarea value={inputPesan} onChange={(e) => setInputPesan(e.target.value)} className="w-full border p-2 rounded text-sm" rows="2" />
              <button onClick={handleUpdatePesan} className="w-full bg-slate-800 text-white py-2 rounded font-bold">
                Update Pesan
              </button>
              <button onClick={() => setToken(null)} className="w-full bg-red-100 text-red-600 py-2 rounded font-bold mt-2">
                Logout
              </button>
            </div>
          ) : (
            <div className="bg-slate-50 p-4 rounded text-sm text-slate-400 italic">"{dataBackend.pesan}"</div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
