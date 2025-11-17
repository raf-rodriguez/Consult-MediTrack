import { useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/image.png";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const normalizedUsername = username.trim();
      const res = await api.post("secure-login/", {
        username: normalizedUsername,
        password,
      });

      const { access, refresh, user } = res.data;
      localStorage.setItem("accessToken", access);
      localStorage.setItem("refreshToken", refresh);
      localStorage.setItem(
        "user",
        JSON.stringify({ username: user.username, fullName: user.full_name || user.username })
      );

      navigate("/dashboard");
    } catch (err) {
      setError("Credenciales incorrectas");
      console.error("Error al iniciar sesión:", err);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#0A2A43",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      {/* Logo de fondo tipo watermark */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundImage: `url(${logo})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "50vw",
          backgroundPosition: "center",
          opacity: 0.05,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Card Login */}
      <div
        className="card p-4 shadow-lg text-center"
        style={{
          width: "100%",
          maxWidth: 380,
          backgroundColor: "rgba(16, 23, 40, 0.95)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: "16px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div className="d-flex flex-column align-items-center mb-4">
          <img
            src={logo}
            alt="Logo"
            style={{
              height: 80,
              width: "auto",
              filter: "drop-shadow(0 0 8px rgba(13,110,253,0.5))",
            }}
          />
          <h3 className="text-light fw-bold mt-3">MediTrack</h3>
          <p className="text-secondary m-0" style={{ fontSize: "0.9rem" }}>
            Sistema de gestión médica
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Usuario"
            className="form-control mb-3 rounded-pill shadow-sm"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="form-control mb-3 rounded-pill shadow-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <div className="alert alert-danger py-1">{error}</div>}

          <button
            type="submit"
            className="btn w-100 fw-semibold"
            style={{
              background: "linear-gradient(90deg, #0d6efd, #6610f2)",
              border: "none",
              borderRadius: "12px",
            }}
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
