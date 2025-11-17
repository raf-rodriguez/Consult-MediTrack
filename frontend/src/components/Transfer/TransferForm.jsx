// src/components/Transfer/TransferForm.jsx
import React, { useEffect, useState, useCallback } from "react";
import api from "../../services/api";
import logo from "../../assets/image.png";

// ✅ Ambulancias válidas
const AMBULANCES = ["CM1", "CM2", "CM3", "S56"];

// ✅ Categorías canónicas (coinciden con backend)
const CATEGORY_LABELS = [
  "Inmovilización",
    "Canalización",
    "Airway / Oxígeno",
    "Medicamentos",
    "Misceláneos",
    "Ventilacion & Monitor",
    "Equipo / Vitales",
    "Bulto de trauma",
    "Entubación",
];

// ✅ Normalizador (UI <-> Backend)
const normalize = (txt = "") =>
  txt
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // quita acentos
    .replace(/\s+/g, " ")           // limpia espacios repetidos
    .trim()
    .toLowerCase();

export default function TransferForm() {
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [toLocation, setToLocation] = useState(AMBULANCES[0]);
  const [paramedic, setParamedic] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // ✅ Cargar inventario del almacén
  const fetchInventory = useCallback(async () => {
    try {
      const res = await api.get("/inventory/");
      // Me quedo solo con los que están en Almacén (normalizado por si acaso)
      const onlyStorage = (res.data || []).filter(
        (i) => normalize(i.location) === normalize("Almacén")
      );
      setItems(onlyStorage);
    } catch (err) {
      setMsg({ type: "danger", text: "Error cargando inventario del almacén" });
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // ✅ Lista filtrada por categoría (normalizada)
  const filteredItems = category
    ? items.filter(
      (i) => normalize(i.category) === normalize(category)
    )
    : [];

  // ✅ Agregar item a la selección (sin duplicar)
  const addItem = (item) => {
    if (selectedItems.some((si) => si.item_id === item.id)) return;
    setSelectedItems((prev) => [
      ...prev,
      { item_id: item.id, name: item.name, quantity: 1, unit: item.unit },
    ]);
  };

  const updateQuantity = (id, qty) => {
    const q = Math.max(1, Number(qty) || 1);
    setSelectedItems((prev) =>
      prev.map((i) => (i.item_id === id ? { ...i, quantity: q } : i))
    );
  };

  const removeItem = (id) => {
    setSelectedItems((prev) => prev.filter((i) => i.item_id !== id));
  };

  // ✅ Enviar transferencia
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!paramedic.trim())
      return setMsg({
        type: "warning",
        text: "Debes ingresar el nombre del paramédico",
      });

    if (!selectedItems.length)
      return setMsg({
        type: "warning",
        text: "Selecciona al menos un equipo",
      });

    setLoading(true);

    try {
      const payload = {
        ambulance: toLocation,
        paramedic: paramedic.trim(),
        items: selectedItems.map((i) => ({
          item_id: i.item_id,
          quantity: i.quantity,
        })),
      };

      await api.post("/transfers/", payload);

      setMsg({ type: "success", text: "✅ Transferencia realizada correctamente" });

      // 🔄 LIMPIAR TODO EL FORMULARIO AUTOMÁTICAMENTE
      setSelectedItems([]);
      setCategory("");
      setParamedic("");
      setToLocation("CM1");

      // 🔄 Refrescar inventario
      await fetchInventory();

      // 🔄 Opcional: refrescar totalmente la página
      setTimeout(() => window.location.reload(), 400);

    } catch (err) {
      const text = err.response?.data?.detail || err.message;
      setMsg({ type: "danger", text });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div
      className="position-relative min-vh-100 d-flex justify-content-center align-items-center p-3"
      style={{ backgroundColor: "#000511" }}
    >
      {/* Fondo logo semi-transparente */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          height: 400,
          backgroundImage: `url(${logo})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0.05,
        }}
      />

      {/* Card */}
      <div
        className="card shadow-lg border-0 rounded-4 w-100"
        style={{
          maxWidth: 700,
          backgroundColor: "rgba(15,48,74,0.95)",
          border: "1px solid #0d6efd",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Header */}
        <div
          className="card-header text-white text-center rounded-top-4 py-3"
          style={{ background: "linear-gradient(90deg, #0d6efd, #6610f2)" }}
        >
          <h4 className="mb-0 fw-bold">
            🚑 Transferir Equipos desde Almacén a Ambulancia
          </h4>
        </div>

        {/* Body */}
        <div className="card-body p-4">
          {msg && (
            <div className={`alert alert-${msg.type} fw-semibold text-center`}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-bold text-white">
                👨‍⚕️ Paramédico
              </label>
              <input
                className="form-control form-control-lg shadow-sm"
                value={paramedic}
                onChange={(e) => setParamedic(e.target.value)}
                placeholder="Ejemplo: Juan Pérez"
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold text-white">📂 Categoría</label>
              <select
                className="form-select form-select-lg shadow-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">-- Selecciona categoría --</option>
                {CATEGORY_LABELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {filteredItems.length > 0 && (
              <div className="mb-3">
                <label className="fw-bold text-white">🧰 Equipos disponibles</label>
                <ul className="list-group shadow-sm">
                  {filteredItems.map((i) => (
                    <li
                      key={i.id}
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <strong>{i.name}</strong> — {i.quantity} {i.unit || ""}
                      </div>
                      <button
                        type="button"
                        className="btn btn-success btn-sm rounded-pill px-3"
                        onClick={() => addItem(i)}
                      >
                        ➕ Agregar
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedItems.length > 0 && (
              <div className="mb-4">
                <h6 className="fw-bold text-white mb-3">
                  📦 Equipos seleccionados
                </h6>
                <ul className="list-group shadow-sm">
                  {selectedItems.map((i) => (
                    <li
                      key={i.item_id}
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <span className="fw-semibold text-black">{i.name}</span>
                      <div className="d-flex align-items-center">
                        <input
                          type="number"
                          min="1"
                          value={i.quantity}
                          onChange={(e) =>
                            updateQuantity(i.item_id, e.target.value)
                          }
                          className="form-control form-control-sm text-center"
                          style={{ width: "70px" }}
                        />
                        <span className="ms-2 text-white">{i.unit || ""}</span>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm ms-3 rounded-circle"
                          onClick={() => removeItem(i.item_id)}
                          title="Quitar"
                        >
                          ✖
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mb-4">
              <label className="form-label fw-bold text-white">
                🚐 Ambulancia destino
              </label>
              <select
                className="form-select form-select-lg shadow-sm"
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
              >
                {AMBULANCES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-primary btn-lg w-100 shadow-sm fw-bold"
              type="submit"
              disabled={loading}
            >
              {loading ? "⏳ Enviando..." : "📤 Transferir Equipos"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center py-3">
          <img
            src={logo}
            alt="MediTrack Logo"
            style={{
              height: 60,
              filter: "drop-shadow(0 0 6px rgba(13,110,253,0.5))",
            }}
          />
        </div>
      </div>
    </div>
  );
}
