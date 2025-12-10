import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../services/api";
import logo from "../../assets/image.png";
import Sidebar from "./SidebarTop";
import {
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Bar as ChartBar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from "chart.js";
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, ChartLegend);

export default function Dashboard() {
  const [history, setHistory] = useState([]);
  const [greeting, setGreeting] = useState("");
  const [username, setUsername] = useState("Usuario");
  const navigate = useNavigate();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting("Good morning");
    else if (hour >= 12 && hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) setUsername(storedUser.fullName || storedUser.username || "Usuario");
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("/checks/");
        const data = res.data;
        const dateGrouped = data.reduce((acc, c) => {
          const date = new Date(c.date).toLocaleDateString();
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {});
        setHistory(Object.entries(dateGrouped).map(([date, total]) => ({ date, total })));
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const stockData = {
    labels: ["CM1", "CM2", "CM3", "Almacén"],
    datasets: [
      {
        label: "Nivel de Stock",
        data: [35, 30, 60, 100],
        backgroundColor: ["#09B59F", "#0069D9", "#FF002B", "#6f42c1"],
        borderRadius: 6,
        barThickness: 40,
      },
    ],
  };

  // --- ESTILOS MODERNOS ---
  const glassCardStyle = {
    backgroundColor: "rgba(15, 48, 74, 0.6)", 
    backdropFilter: "blur(12px)",              
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid rgba(255, 255, 255, 0.08)", 
    boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
    color: "#F4F7FA",
    height: "100%",
  };

  const gradientButtonStyle = {
    borderRadius: "12px",
    padding: "14px 20px",
    fontWeight: "600",
    border: "none",
    cursor: "pointer",
    background: "linear-gradient(90deg, #0069D9, #0A2A43)",
    color: "white",
    transition: "all 0.3s ease",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
    boxShadow: "0 4px 15px rgba(0, 105, 217, 0.3)",
  };

  return (
    <div className="d-flex">
      <Sidebar />
      
      <div
        style={{
          flexGrow: 1,
          marginLeft: "220px",
          backgroundColor: "#0A2A43",
          minHeight: "100vh",
          padding: "40px 20px",
          color: "#F4F7FA",
          position: "relative",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            backgroundImage: `url(${logo})`, backgroundRepeat: "no-repeat", backgroundSize: "50%",
            backgroundPosition: "center", opacity: 0.05, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "fixed", top: 0, left: "220px", width: "40px", height: "100%",
            background: "linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0))", zIndex: 2, pointerEvents: "none",
          }}
        />
        {/* ✅ FONDO CON IMAGEN (Se mantiene) */}
        <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundImage: `url(${logo})`, backgroundRepeat: "no-repeat", backgroundSize: "35%", backgroundPosition: "center", opacity: 0.04, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }} />

        {/* HEADER */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-5 position-relative" style={{ zIndex: 2 }}>
          <div className="text-center text-md-start mb-3 mb-md-0">
            <h2 className="fw-bold mb-1" style={{ background: "linear-gradient(90deg, #0069D9, #09B59F)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {greeting}, {username}
            </h2>
            <p className="text-white-50 mb-0">Resumen general del sistema.</p>
          </div>

          <div className="d-flex align-items-center gap-2 bg-dark bg-opacity-50 px-4 py-2 rounded-pill border border-secondary border-opacity-25 shadow">
            <span className="fw-bold fs-5 text-white">Consult Medical</span>
            <img src={logo} alt="logo" style={{ height: 35, filter: "drop-shadow(0 0 5px rgba(9, 181, 159, 0.5))" }} />
          </div>
        </div>

        <div className="row g-4 position-relative" style={{ zIndex: 1 }}>
          
          {/* COLUMNA IZQUIERDA (GRÁFICAS) */}
          <div className="col-12 col-lg-8 d-flex flex-column gap-4">
            
            {/* GRÁFICA DE ÁREA (Recharts) */}
            <div style={glassCardStyle}>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold mb-0" style={{ color: "#09B59F" }}>📈 Tendencia de Chequeos</h5>
                <span className="badge bg-secondary bg-opacity-25 border border-secondary border-opacity-25">Últimos días</span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#09B59F" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#09B59F" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="date" stroke="#9CA3AF" tick={{fill: '#9CA3AF', fontSize: 12}} />
                  <YAxis stroke="#9CA3AF" tick={{fill: '#9CA3AF', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0F304A", border: "1px solid #0069D9", borderRadius: "8px", color: "#fff" }} 
                    itemStyle={{ color: "#09B59F" }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#09B59F" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* GRÁFICA DE BARRAS (ChartJS) */}
            <div style={glassCardStyle}>
              <h5 className="fw-bold mb-4" style={{ color: "#09B59F" }}>📊 Comparativa de Stock</h5>
              <div style={{ height: "250px" }}>
                <ChartBar 
                  data={stockData} 
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { display: false },
                      tooltip: { 
                        backgroundColor: 'rgba(15, 48, 74, 0.9)', 
                        titleColor: '#09B59F',
                        padding: 10,
                        cornerRadius: 8
                      } 
                    }, 
                    scales: { 
                      x: { ticks: { color: "#9CA3AF" }, grid: { display: false } }, 
                      y: { ticks: { color: "#9CA3AF" }, grid: { color: "#1F2937" } } 
                    } 
                  }} 
                />
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA (ACCESOS Y ESTADO) */}
          <div className="col-12 col-lg-4 d-flex flex-column gap-4">
            
            {/* BOTONES DE ACCESO RÁPIDO */}
            <div style={glassCardStyle}>
              <h5 className="fw-bold mb-4 text-white">⚙️ Acceso Rápido</h5>
              
              <button style={gradientButtonStyle} className="hover-brightness w-100" onClick={() => navigate("/ambulances")}>
                <span className="d-flex align-items-center gap-2">🚑 Ambulancias</span>
                <span className="opacity-50">→</span>
              </button>
              
              <button style={gradientButtonStyle} className="hover-brightness w-100" onClick={() => navigate("/storage")}>
                <span className="d-flex align-items-center gap-2">🏢 Almacén Central</span>
                <span className="opacity-50">→</span>
              </button>
              
              <button style={gradientButtonStyle} className="hover-brightness w-100" onClick={() => navigate("/medications")}>
                <span className="d-flex align-items-center gap-2">⚕️ Equipos Médicos</span>
                <span className="opacity-50">→</span>
              </button>
            </div>

            {/* ESTADO DEL INVENTARIO */}
            <div style={glassCardStyle}>
              <h5 className="fw-bold mb-4 text-white">📦 Estado del Inventario</h5>
              
              <div className="mb-3">
                <div className="d-flex justify-content-between text-white-50 small mb-1">
                  <span>Material Quirúrgico</span>
                  <span className="text-success">70%</span>
                </div>
                <div className="progress bg-dark" style={{ height: 8, borderRadius: 10 }}>
                  <div className="progress-bar bg-success" style={{ width: "70%", borderRadius: 10, boxShadow: "0 0 10px rgba(25, 135, 84, 0.5)" }}></div>
                </div>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between text-white-50 small mb-1">
                  <span>Medicamentos</span>
                  <span className="text-warning">45%</span>
                </div>
                <div className="progress bg-dark" style={{ height: 8, borderRadius: 10 }}>
                  <div className="progress-bar bg-warning" style={{ width: "45%", borderRadius: 10, boxShadow: "0 0 10px rgba(255, 193, 7, 0.5)" }}></div>
                </div>
              </div>

              <div className="mb-0">
                <div className="d-flex justify-content-between text-white-50 small mb-1">
                  <span>Oxígeno</span>
                  <span className="text-danger">25%</span>
                </div>
                <div className="progress bg-dark" style={{ height: 8, borderRadius: 10 }}>
                  <div className="progress-bar bg-danger" style={{ width: "25%", borderRadius: 10, boxShadow: "0 0 10px rgba(220, 53, 69, 0.5)" }}></div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-top border-secondary border-opacity-25 text-center">
                 <small className="text-muted">Última actualización: Hace 5 min</small>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}