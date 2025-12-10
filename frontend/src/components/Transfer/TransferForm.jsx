import React, { useEffect, useState, useCallback } from "react";
import api from "../../services/api";
import logo from "../../assets/image.png";

// 🌟 Importamos SOLO lo que sí tienes en tu archivo de constantes
import { AMBULANCIAS } from "../Ambulance/checkFormConstants";

// ✅ Definimos las categorías AQUÍ LOCALMENTE
const CATEGORY_LABELS = [
  "Inmovilización",
  "Canalización",
  "Airway / Oxígeno",
  "Medicamentos",
  "Misceláneos",
  "Entubación",
  "Equipo",
];

const normalize = (txt = "") =>
  txt
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export default function TransferForm() {
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);

  // Usamos la primera ambulancia de la lista importada como default
  const [toLocation, setToLocation] = useState(AMBULANCIAS[0]);

  const [paramedic, setParamedic] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // ✅ Cargar inventario del almacén
  const fetchInventory = useCallback(async () => {
    try {
      const res = await api.get("/inventory/");
      const onlyStorage = (res.data || []).filter(
        (i) => normalize(i.location) === normalize("Almacén")
      );
      setItems(onlyStorage);
    } catch (err) {
      console.error(err);
      setMsg({ type: "danger", text: "Error cargando inventario del almacén" });
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // ✅ Lista filtrada por categoría
  const filteredItems = category
    ? items.filter((i) => normalize(i.category) === normalize(category))
    : [];

  // ✅ Agregar item a la selección
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
      return setMsg({ type: "warning", text: "Selecciona al menos un equipo" });

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

      setMsg({
        type: "success",
        text: "✅ Transferencia realizada correctamente",
      });

      // Limpiar formulario
      setSelectedItems([]);
      setCategory("");
      setParamedic("");
      setToLocation(AMBULANCIAS[0]);

      // Refrescar inventario y recargar
      await fetchInventory();
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      const text =
        err.response?.data?.detail || "Error al realizar la transferencia";
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
      {/* 🎨 Estilos CSS Locales para scrollbar personalizado */}
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1); 
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #0d6efd; 
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #0b5ed7; 
          }
          .hover-scale:active {
            transform: scale(0.98);
          }
          .form-control:focus, .form-select:focus {
            box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
            border-color: #86b7fe;
          }
        `}
      </style>

      {/* Fondo con Logo */}
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

      <div
        className="card shadow-lg border-0 rounded-4 w-100"
        style={{
          maxWidth: 700,
          backgroundColor: "rgba(15,48,74,0.95)",
          border: "1px solid rgba(13, 110, 253, 0.3)", // Borde más sutil
          backdropFilter: "blur(10px)", // Efecto cristal
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Header con gradiente suave */}
        <div
          className="card-header text-white text-center rounded-top-4 py-4"
          style={{
            background: "linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <h4 className="mb-0 fw-bold d-flex align-items-center justify-content-center gap-2">
            🚑 <span>Transferir Equipos</span>
            <span className="badge bg-white text-primary fs-6 ms-2 shadow-sm">Almacén → Unidad</span>
          </h4>
        </div>

        <div className="card-body p-4 p-md-5">
          {msg && (
            <div className={`alert alert-${msg.type} shadow-sm border-0 fw-semibold text-center mb-4 rounded-3`}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              {/* Paramédico */}
              <div className="col-12">
                <label className="form-label fw-bold text-white mb-2">
                  👨‍⚕️ Paramédico
                </label>
                <input
                  className="form-control form-control-lg shadow-sm border-0"
                  value={paramedic}
                  onChange={(e) => setParamedic(e.target.value)}
                  placeholder="Nombre y Apellido"
                  style={{ backgroundColor: "#f8f9fa" }}
                />
              </div>

              {/* Categoría */}
              <div className="col-12 mb-2">
                <label className="form-label fw-bold text-white mb-2">
                  📂 Seleccionar Categoría
                </label>
                <select
                  className="form-select form-select-lg shadow-sm border-0"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ cursor: "pointer", backgroundColor: "#f8f9fa" }}
                >
                  <option value="">-- Filtrar por categoría --</option>
                  {CATEGORY_LABELS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <hr className="border-secondary opacity-25 my-4" />

            {/* Lista Items Disponibles */}
            {filteredItems.length > 0 && (
              <div className="mb-4 animate__animated animate__fadeIn">
                <label className="fw-bold text-white mb-2 d-flex justify-content-between align-items-center">
                  <span>🧰 Equipos disponibles en Almacén</span>
                  <span className="badge bg-secondary">{filteredItems.length} items</span>
                </label>
                
                <div
                  className="custom-scrollbar p-2 rounded-3"
                  style={{
                    maxHeight: "220px",
                    overflowY: "auto",
                    backgroundColor: "rgba(0, 0, 0, 0.2)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <ul className="list-group list-group-flush bg-transparent">
                    {filteredItems.map((i) => (
                      <li
                        key={i.id}
                        className="list-group-item d-flex justify-content-between align-items-center mb-2 rounded-3 shadow-sm border-0"
                        style={{ transition: "0.2s", backgroundColor: "#fff" }}
                      >
                        <div className="text-dark">
                          <strong className="d-block text-primary">{i.name}</strong>
                          <small className="text-muted">Stock: {i.quantity} {i.unit || ""}</small>
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline-success btn-sm rounded-pill px-3 fw-bold"
                          onClick={() => addItem(i)}
                          disabled={i.quantity <= 0}
                          style={{ minWidth: "90px" }}
                        >
                          {i.quantity > 0 ? "➕ Agregar" : "Agotado"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Items Seleccionados */}
            {selectedItems.length > 0 && (
              <div className="mb-4">
                <h6 className="fw-bold text-white mb-3 border-bottom border-secondary pb-2 d-inline-block text-warning">
                  📦 Equipos a transferir ({selectedItems.length})
                </h6>
                <ul className="list-group shadow-sm">
                  {selectedItems.map((i) => (
                    <li
                      key={i.item_id}
                      className="list-group-item d-flex justify-content-between align-items-center mb-2 rounded-3 border-start border-4 border-warning"
                    >
                      <span className="fw-bold text-dark">{i.name}</span>
                      <div className="d-flex align-items-center bg-light rounded-pill p-1 border">
                        <input
                          type="number"
                          min="1"
                          value={i.quantity}
                          onChange={(e) =>
                            updateQuantity(i.item_id, e.target.value)
                          }
                          className="form-control form-control-sm text-center border-0 bg-transparent fw-bold"
                          style={{ width: "60px", boxShadow: "none" }}
                        />
                        <span className="text-muted small me-2 border-start ps-2">{i.unit || "u"}</span>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm rounded-circle d-flex align-items-center justify-content-center p-0"
                          style={{ width: "24px", height: "24px" }}
                          onClick={() => removeItem(i.item_id)}
                          title="Quitar"
                        >
                          <small>✕</small>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 pt-2">
              {/* Ambulancia Destino */}
              <div className="mb-4">
                <label className="form-label fw-bold text-white mb-2">
                  🚐 Ambulancia destino
                </label>
                <div className="input-group input-group-lg shadow-sm">
                  <span className="input-group-text bg-primary text-white border-0">
                    ➜
                  </span>
                  <select
                    className="form-select border-0"
                    value={toLocation}
                    onChange={(e) => setToLocation(e.target.value)}
                    style={{ cursor: "pointer" }}
                  >
                    {AMBULANCIAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                className="btn btn-primary btn-lg w-100 shadow fw-bold hover-scale"
                type="submit"
                disabled={loading}
                style={{
                  transition: "all 0.2s ease",
                  background: "linear-gradient(90deg, #0d6efd, #0b5ed7)",
                }}
              >
                {loading ? (
                  <span>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Procesando...
                  </span>
                ) : (
                  "📤 Confirmar Transferencia"
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center py-3 opacity-75">
          <img
            src={logo}
            alt="Logo"
            style={{
              height: 50,
              filter: "drop-shadow(0 0 4px rgba(13,110,253,0.8))",
            }}
          />
        </div>
      </div>
    </div>
  );
}