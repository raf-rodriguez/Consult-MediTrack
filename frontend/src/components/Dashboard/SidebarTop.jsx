import { Link, useNavigate } from "react-router-dom";
import {
  FaTachometerAlt,
  FaAmbulance,
  FaWarehouse,
  FaPills,
  FaSignOutAlt,
  FaQrcode,
  FaListAlt   // ✅ nuevo ícono para Activity Log
} from "react-icons/fa";

export default function SidebarTop() {
  const navigate = useNavigate();

  const menuItems = [
    { label: "Dashboard", path: "/dashboard", icon: <FaTachometerAlt /> },
    { label: "Ambulances", path: "/ambulances", icon: <FaAmbulance /> },
    { label: "Storage", path: "/storage", icon: <FaWarehouse /> },
    { label: "Equipos", path: "/medications", icon: <FaPills /> },
    { label: "Activity Log", path: "/activity-log", icon: <FaListAlt /> },  // ✅ NUEVA SECCIÓN
    { label: "QR-list", path: "/QR-list", icon: <FaQrcode /> }, 
  ];

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <aside
      className="d-flex flex-column position-fixed vh-100 p-3"
      style={{
        width: "220px",
        backgroundColor: "#0F304A",
        color: "#F4F7FA",
        boxShadow: "2px 0 8px rgba(0,0,0,0.3)",
      }}
    >
      <div className="mb-4 fw-bold fs-4 text-center" style={{ color: "#FF4D4F" }}>
        MediTrack
      </div>

      <nav className="nav flex-column flex-grow-1">
        {menuItems.map((item, idx) => (
          <Link
            key={idx}
            to={item.path}
            className="nav-link d-flex align-items-center mb-2 p-2 rounded"
            style={{ color: "#F4F7FA", textDecoration: "none" }}
          >
            <span className="me-2">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        className="d-flex align-items-center justify-content-center mt-3 p-2 rounded w-100"
        style={{
          backgroundColor: "#FF002B",
          color: "#F4F7FA",
          border: "none",
          cursor: "pointer",
        }}
      >
        <FaSignOutAlt className="me-2" />
        Logout
      </button>
    </aside>
  );
}
