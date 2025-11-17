import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Container } from "react-bootstrap";
import logo from "../../assets/image.png"; // logo de fondo
import SidebarTop from '../Dashboard/SidebarTop';

export default function AmbulanceList() {
  const navigate = useNavigate();
  const [units, setUnits] = useState([]);

  // 🔹 Inicializar unidades y refrescar automáticamente
  useEffect(() => {
    const loadUnits = () => {
      setUnits(['CM1', 'CM2', 'CM3', 'S56']); // reemplazar con fetch si viene de API
    };
    loadUnits();

    const interval = setInterval(loadUnits, 30000); // refrescar cada 30s
    return () => clearInterval(interval);
  }, []);

  const buttonStyle = {
    background: "linear-gradient(90deg, #0069D9, #0A2A43)",
    color: "#F4F7FA",
    border: "none",
    fontWeight: 600,
  };

  return (
    <div className="d-flex">
      <SidebarTop />

      <div style={{ flexGrow: 1, marginLeft: "220px", backgroundColor: "#0A2A43", minHeight: "100vh", padding: "40px 20px", color: "#F4F7FA" }}>
        {/* Logo translúcido de fondo */}
        <div style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundImage: `url(${logo})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "50%",
          backgroundPosition: "center",
          opacity: 0.05,
          width: "100%",
          height: "100%",
          zIndex: 0,
          pointerEvents: "none"
        }} />
        {/* 🎨 Borde difuminado oscuro entre sidebar y contenido */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: "220px", // ancho del sidebar
            width: "40px",
            height: "100%",
            background: "linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0))",
            zIndex: 2,
            pointerEvents: "none",
          }}
        />


        <Container style={{ position: "relative", zIndex: 1 }}>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start mb-4">
            <h2 className="text-primary fw-bold mb-3 mb-md-0">🚑 Ambulance List</h2>
          </div>

          <div className="d-flex flex-wrap gap-4 justify-content-start">
            {units.map(u => (
              <div
                key={u}
                className="card shadow-sm p-3"
                style={{
                  minWidth: 200,
                  maxWidth: 250,
                  backgroundColor: "#0F304A",
                  border: "1px solid #0069D9",
                  borderRadius: "15px",
                  color: "#F4F7FA",
                  flex: "1 0 200px"
                }}
              >
                <h5 style={{ fontWeight: "600", textAlign: "center" }}>{u}</h5>
                <div className="d-grid gap-2 mt-3">
                  <button
                    className="btn"
                    style={buttonStyle}
                    onClick={() => navigate(`/ambulances/${u}/checks`)}
                  >
                    1. Lista de chequeo
                  </button>
                  <button
                    className="btn"
                    style={buttonStyle}
                    onClick={() => navigate(`/ambulances/${u}/equipment`)}
                  >
                    2. Lista de equipo requisado
                  </button>
                  <button
                    className="btn"
                    style={buttonStyle}
                    onClick={() => navigate(`/ambulances/${u}/current`)}
                  >
                    3. Equipo Actual
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </div>
    </div>
  );
}
