import { useState, useEffect } from "react";
import MedicationExpenseForm from "../Medication/MedicationExpenseForm";
import EquipmentExpenseForm from "../Equipment/EquipmentExpenseForm";
import logo from "../../assets/image.png";

export default function ExpenseForm() {
  const [activeTab, setActiveTab] = useState("med");
  const [refreshKey, setRefreshKey] = useState(0); // para auto-refresh

  // 🔹 Auto-refresh cada 10s
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      backgroundColor: "#000511", 
      minHeight: "100vh", 
      width: "100%", 
      position: "relative", 
      padding: "30px 15px", 
      color: "#fff"
    }}>
      {/* 🔹 Fondo logo translúcido */}
      <div style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        backgroundImage: `url(${logo})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "45vw",
        backgroundPosition: "center",
        opacity: 0.05,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none"
      }} />

      {/* 🔹 Tarjeta principal */}
      <div className="card p-4 shadow-lg border-0 rounded-4" style={{ 
        backgroundColor: "#101728", 
        color: "#fff", 
        position: "relative", 
        zIndex: 2 
      }}>
        {/* 🔹 Botones tipo pestañas */}
        <div className="d-flex flex-wrap mb-3 justify-content-center">
          <button
            className={`btn me-2 mb-2 rounded-pill ${activeTab === "med" ? "btn-primary" : "btn-outline-primary"}`}
            style={{ minWidth: 180 }}
            onClick={() => setActiveTab("med")}
          >
            Gasto de Medicamentos
          </button>
          <button
            className={`btn mb-2 rounded-pill ${activeTab === "equip" ? "btn-primary" : "btn-outline-primary"}`}
            style={{ minWidth: 180 }}
            onClick={() => setActiveTab("equip")}
          >
            Gasto de Equipos
          </button>
        </div>

        {/* 🔹 Formulario según pestaña activa */}
        <div key={refreshKey}>
          {activeTab === "med" ? <MedicationExpenseForm /> : <EquipmentExpenseForm />}
        </div>
      </div>
    </div>
  );
}
