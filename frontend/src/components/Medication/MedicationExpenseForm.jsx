// src/components/Medication/MedicationExpenseForm.jsx
import React, { useState, useEffect, useMemo } from "react";
import api from "../../services/api";
import logo from "../../assets/image.png";

// ✅ Normalizador (UI ⇄ Backend): quita acentos y normaliza espacios
const normalize = (txt = "") =>
  String(txt)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

// ✅ Categorías canónicas que maneja tu backend/inventario
const AMBULANCE_UNITS = ["CM1", "CM2", "CM3", "S56"];
const SHIFTS = ["6-2", "8-4", "12-8", "1-9", "2-10", "3-11", "4-12"];
const PARAMEDICS_LIST = [
  "A. Rodriguez - La Bestia",
  "K. Colon - La Jefa",
  "R. Rodriguez",
  "R. Torres (Supervisor)",
  "A. Cruz",
  "J. Ortiz",
];

// ⚙️ Catálogo de categorías de EQUIPO visibles en UI (coinciden con tu backend)
const EQUIPMENT_CATEGORIES = [
  "Inmovilización",
  "Canalización",
  "Airway / Oxígeno",
  "Equipo",
  "Bulto de trauma",
  "Entubación",
  // Agrega otras si las usas en ambulancias/almacén:
  // "Misceláneos",
  // "Ventilacion & Monitor",
  // "Equipo / Vitales",
];

export default function MedicationExpenseForm() {
  const [patientName, setPatientName] = useState("");
  const [paramedic, setParamedic] = useState("");
  const [shift, setShift] = useState(SHIFTS[0]);
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("Medicamento"); // "Medicamento" | "Equipo"
  const [equipmentCategory, setEquipmentCategory] = useState(EQUIPMENT_CATEGORIES[0]);

  const [inventory, setInventory] = useState([]); // Inventario de la ambulancia seleccionada
  const [item, setItem] = useState(""); // Nombre del ítem seleccionado (string)
  const [quantity, setQuantity] = useState(1);

  const [records, setRecords] = useState([]); // { category, item, quantity }
  const [msg, setMsg] = useState(null);

  // 🔄 Cargar inventario de la ambulancia (auto refresh cada 10s)
  useEffect(() => {
    if (!unit) {
      setInventory([]);
      return;
    }

    const fetchInventory = async () => {
      try {
        const res = await api.get(`/ambulance-inventory/?ambulance=${unit}`);
        setInventory(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error cargando inventario:", err);
        setInventory([]);
      }
    };

    fetchInventory();
    const interval = setInterval(fetchInventory, 10000);
    return () => clearInterval(interval);
  }, [unit]);

  // 🎯 Ítems disponibles según selección (Medicamento vs Equipo)
  const filteredItems = useMemo(() => {
    if (!inventory.length) return [];

    if (category === "Medicamento") {
      // El backend guarda los medicamentos como categoría "Medicamentos"
      return inventory.filter(
        (i) => normalize(i.category) === normalize("Medicamentos")
      );
    }

    // Para equipo: filtrar por la subcategoría elegida
    return inventory.filter(
      (i) => normalize(i.category) === normalize(equipmentCategory)
    );
  }, [inventory, category, equipmentCategory]);

  // 🧠 Mantener "item" consistente cuando cambian filtros/datos
  useEffect(() => {
    if (!filteredItems.length) {
      setItem("");
      return;
    }
    // Si el item actual no está en la lista filtrada, selecciona el primero
    const stillExists = filteredItems.some((i) => i.name === item);
    if (!stillExists) setItem(filteredItems[0]?.name || "");
  }, [filteredItems, item]);

  // 👂 Cambios de categoría principal
  const handleCategoryChange = (e) => {
    const newCat = e.target.value;
    setCategory(newCat);

    if (newCat === "Medicamento") {
      // Forzar la lista de "Medicamentos"
      const meds = inventory.filter(
        (i) => normalize(i.category) === normalize("Medicamentos")
      );
      setItem(meds[0]?.name || "");
    } else {
      // Cambiar a equipo y resetear subcategoría al primer valor
      setEquipmentCategory(EQUIPMENT_CATEGORIES[0]);
      const eq = inventory.filter(
        (i) => normalize(i.category) === normalize(EQUIPMENT_CATEGORIES[0])
      );
      setItem(eq[0]?.name || "");
    }
  };

  // 👂 Cambios de subcategoría de equipo
  const handleEquipmentCategoryChange = (e) => {
    const cat = e.target.value;
    setEquipmentCategory(cat);

    const eq = inventory.filter(
      (i) => normalize(i.category) === normalize(cat)
    );
    setItem(eq[0]?.name || "");
  };

  // ➕ Agregar a la lista temporal
  const handleAdd = (e) => {
    e.preventDefault();
    if (!item || Number(quantity) <= 0) return;

    setRecords((prev) => [
      ...prev,
      { category, item, quantity: parseInt(quantity, 10) || 1 },
    ]);
    setQuantity(1);
  };

  // 🗑️ Eliminar línea
  const handleDelete = (index) =>
    setRecords((prev) => prev.filter((_, i) => i !== index));

  // 🚀 Enviar a backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!patientName || !unit || !paramedic) {
      setMsg({ type: "danger", text: "⚠️ Completa paciente, paramédico y unidad." });
      return;
    }
    if (records.length === 0) {
      setMsg({ type: "danger", text: "⚠️ Agrega al menos un medicamento o equipo." });
      return;
    }

    // El backend de /medexpenses/ espera items como { medicine: <nombre>, quantity }
    const payload = {
      patient_name: patientName,
      paramedics: [paramedic],
      shift,
      unit,
      items: records.map((r) => ({ medicine: r.item, quantity: r.quantity })),
    };

    try {
      await api.post("/medexpenses/", payload);
      setMsg({ type: "success", text: "✅ Registro guardado correctamente." });

      // Reset
      setRecords([]);
      setPatientName("");
      setParamedic("");
      setUnit("");
      setCategory("Medicamento");
      setEquipmentCategory(EQUIPMENT_CATEGORIES[0]);
      setItem("");
      setQuantity(1);
    } catch (err) {
      console.error(err.response?.data || err);
      setMsg({
        type: "danger",
        text: `❌ Error: ${err.response?.data?.detail || "No se pudo guardar"}`,
      });
    }
  };

  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center min-vh-100 p-3"
      style={{ backgroundColor: "#000511", position: "relative", width: "100%" }}
    >
      {/* Fondo con logo */}
      <div
        style={{
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
          pointerEvents: "none",
        }}
      />

      {/* Card principal */}
      <div
        className="card shadow-lg border-0 rounded-4 w-100"
        style={{
          maxWidth: 900,
          backgroundColor: "rgba(15,48,74,0.95)",
          border: "1px solid #0d6efd",
          backdropFilter: "blur(10px)",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          className="card-header text-white text-center rounded-top-4 py-3"
          style={{ background: "linear-gradient(90deg, #0d6efd, #6610f2)" }}
        >
          <h4 className="mb-0 fw-bold">💊 Registro de Medicamentos y Equipos</h4>
        </div>

        <div className="card-body p-4">
          {msg && (
            <div className={`alert alert-${msg.type} shadow-sm text-center`}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Encabezado */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold text-white">Nombre del Paciente</label>
                <input
                  type="text"
                  className="form-control shadow-sm"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold text-white">Paramédico</label>
                <select
                  className="form-select shadow-sm"
                  value={paramedic}
                  onChange={(e) => setParamedic(e.target.value)}
                >
                  <option value="">Selecciona</option>
                  {PARAMEDICS_LIST.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-md-2">
                <label className="form-label fw-semibold text-white">Turno</label>
                <select
                  className="form-select shadow-sm"
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                >
                  {SHIFTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-md-2">
                <label className="form-label fw-semibold text-white">Unidad</label>
                <select
                  className="form-select shadow-sm"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  <option value="">Selecciona</option>
                  {AMBULANCE_UNITS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selección de categorías e ítems */}
            <div className="row g-3 align-items-end mb-4">
              <div className="col-12 col-md-3">
                <label className="form-label fw-semibold text-white">Categoría</label>
                <select
                  className="form-select shadow-sm"
                  value={category}
                  onChange={handleCategoryChange}
                >
                  <option>Medicamento</option>
                  <option>Equipo</option>
                </select>
              </div>

              {category === "Equipo" && (
                <div className="col-12 col-md-3">
                  <label className="form-label fw-semibold text-white">Categoría de Equipo</label>
                  <select
                    className="form-select shadow-sm"
                    value={equipmentCategory}
                    onChange={handleEquipmentCategoryChange}
                  >
                    {EQUIPMENT_CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className={`col-12 col-md-${category === "Equipo" ? "4" : "6"}`}>
                <label className="form-label fw-semibold text-white">
                  {category}
                </label>
                <select
                  className="form-select shadow-sm"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                >
                  {filteredItems.map((i) => (
                    <option key={i.id || i.name}>{i.name}</option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-md-2">
                <label className="form-label fw-semibold text-white">Cantidad</label>
                <input
                  type="number"
                  className="form-control shadow-sm"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              <div className="col-6 col-md-2 d-grid">
                <button className="btn btn-primary fw-semibold shadow-sm" onClick={handleAdd}>
                  ➕ Agregar
                </button>
              </div>
            </div>

            {/* Tabla de selección */}
            {records.length > 0 && (
              <div className="table-responsive mb-4 shadow-sm rounded">
                <table className="table table-bordered table-striped align-middle text-white">
                  <thead className="table-primary text-center">
                    <tr>
                      <th>Categoría</th>
                      <th>Medicamento / Equipo</th>
                      <th>Cantidad</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec, i) => (
                      <tr key={`${rec.item}-${i}`} className="text-center">
                        <td>{rec.category}</td>
                        <td>{rec.item}</td>
                        <td>{rec.quantity}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm rounded-pill"
                            onClick={() => handleDelete(i)}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="d-grid mb-3">
              <button type="submit" className="btn btn-success btn-lg fw-semibold shadow-sm">
                💾 Guardar Registro
              </button>
            </div>
          </form>
        </div>

        <div className="text-center py-3">
          <img
            src={logo}
            alt="MediTrack Logo"
            style={{ height: 60, filter: "drop-shadow(0 0 6px rgba(13,110,253,0.5))" }}
          />
        </div>
      </div>
    </div>
  );
}
