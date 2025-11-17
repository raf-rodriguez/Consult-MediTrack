import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../services/api";
import logo from "../../assets/image.png";
import Sidebar from "./SidebarTop";
import {
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
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
        label: "Stock",
        data: [35, 30, 60, 100],
        backgroundColor: ["#09B59F", "#0069D9", "#FF002B", "#0A2A43"],
        borderRadius: 8,
      },
    ],
  };

  const cardStyle = {
    backgroundColor: "#0F304A",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
    color: "#F4F7FA",
  };

  const buttonStyle = {
    borderRadius: "10px",
    padding: "10px 15px",
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    background: "linear-gradient(90deg, #0069D9, #0A2A43)",
    color: "white",
    transition: "0.3s",
  };

  return (
    <div className="d-flex">
      {/* Sidebar fijo izquierdo */}
      <Sidebar />
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


      {/* Contenido principal */}
      <div className="flex-grow-1 p-4" style={{ marginLeft: "220px", backgroundColor: "#0A2A43", minHeight: "100vh", color: "#F4F7FA" }}>

        <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundImage: `url(${logo})`, backgroundRepeat: "no-repeat", backgroundSize: "35%", backgroundPosition: "center", opacity: 0.06, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }} />

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 position-relative">
          <div className="text-center text-md-start mb-3 mb-md-0" style={{ zIndex: 2 }}>
            <h3 className="fw-bold mb-1" style={{ color: "#0069D9" }}>{greeting}, <span className="text-[#F4F7FA]">{username}</span> 👋</h3>
            <p className="text-gray-300 mb-0">Welcome to your dashboard.</p>
          </div>

          <div className="d-flex align-items-center gap-2 position-absolute top-50 start-50 translate-middle" style={{ zIndex: 1 }}>
            <span className="fw-bold fs-4" style={{ color: "#0069D9" }}>Consult <img src={logo} alt="logo" style={{ height: 40 }} /> Medical</span>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-12 col-lg-8">
            <div style={cardStyle} className="mb-4">
              <h5 className="fw-bold mb-3" style={{ color: "#09B59F" }}>📆 Chequeos por Fecha</h5>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="date" stroke="#F4F7FA" />
                  <YAxis stroke="#F4F7FA" />
                  <Tooltip contentStyle={{ backgroundColor: "#0F304A", color: "#F4F7FA" }} />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#09B59F" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={cardStyle}>
              <h5 className="fw-bold mb-3" style={{ color: "#09B59F" }}>📦 Stock</h5>
              <ChartBar data={stockData} options={{ responsive: true, plugins: { legend: { labels: { color: "#F4F7FA" } }, title: { display: true, text: "Comparativo de Stock", color: "#0069D9" } }, scales: { x: { ticks: { color: "#F4F7FA" }, grid: { color: "#111827" } }, y: { ticks: { color: "#F4F7FA" }, grid: { color: "#111827" } } } }} />
            </div>
          </div>

          <div className="col-12 col-lg-4 d-flex flex-column gap-4">
            <div style={cardStyle}>
              <h5 className="fw-bold mb-3" style={{ color: "#09B59F" }}>⚙️ Accesos</h5>
              {[{ label: "🚑 Ambulancia", path: "/ambulances" }, { label: "🏢 Storage", path: "/storage" }, { label: "⚕️ Equipos", path: "/medications" }].map((item, idx) => (<button key={idx} style={buttonStyle} onClick={() => navigate(item.path)}>{item.label}</button>))}
            </div>

            <div style={cardStyle}>
              <h5 className="fw-bold mb-3" style={{ color: "#09B59F" }}>📦 Inventario</h5>
              <div className="progress mb-2" style={{ height: 10 }}><div className="progress-bar bg-success" style={{ width: "70%" }}></div></div>
              <div className="progress mb-2" style={{ height: 10 }}><div className="progress-bar bg-warning" style={{ width: "45%" }}></div></div>
              <div className="progress" style={{ height: 10 }}><div className="progress-bar bg-danger" style={{ width: "25%" }}></div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}