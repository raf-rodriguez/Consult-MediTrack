// src/components/Storage/StorageCheckList.jsx
import { useEffect, useState, useCallback, useMemo } from "react";
import axios from "../../services/api";
import { Button, Modal, Form, Table, Container, Alert, Spinner } from "react-bootstrap";
import logo from "../../assets/image.png";
import SidebarTop from "../Dashboard/SidebarTop";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ✅ Normalizador
const normalize = (txt = "") =>
  txt
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

// ✅ Categorías
const CATEGORIES = [
  { value: "Inmovilización", label: "Inmovilización" },
  { value: "Canalización", label: "Canalización" },
  { value: "Airway / Oxígeno", label: "Airway / Oxígeno" },
  { value: "Medicamentos", label: "Medicamentos" },
  { value: "Misceláneos", label: "Misceláneos" },
  { value: "Entubación", label: "Entubación" },
  { value: "Equipo", label: "Equipo" },
];

export default function StorageCheckList() {
  const [items, setItems] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formList, setFormList] = useState([
    { name: "", quantity: 1, unit: "unidades", location: "Almacén", category: "", isNew: false },
  ]);

  // 🔹 Obtener inventario
  const fetchInventory = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await axios.get("/inventory/");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error al cargar inventario:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // 🔹 Obtener alertas
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await axios.get("/alerts/");
      setAlerts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn("No se pudieron cargar alertas:", err.message);
      setAlerts([]);
    }
  }, []);

  // 🔁 Auto-refresh
  useEffect(() => {
    fetchInventory();
    fetchAlerts();
    const interval = setInterval(() => {
      fetchInventory(true);
      fetchAlerts();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchInventory, fetchAlerts]);

  // 🔔 Marcar alerta como vista
  const markAsViewed = async (id) => {
    try {
      await axios.patch(`/alerts/${id}/`, { viewed: true });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert("❌ Error al marcar alerta como vista");
    }
  };

  const handleChange = (index, key, value) => {
    setFormList((prev) => {
      const updated = [...prev];

      // 🔹 Si cambia categoría, reiniciamos el nombre
      if (key === "category") {
        updated[index].category = value;
        updated[index].name = "";
        updated[index].isNew = false;
        return updated;
      }

      // 🔹 Si cambia el nombre
      if (key === "name") {
        // Si el usuario elige "nuevo equipo" en el select
        if (value === "__nuevo__") {
          updated[index].isNew = true;
          updated[index].name = "";
        }
        // Si ya está escribiendo un nuevo equipo, solo actualizar el texto
        else if (updated[index].isNew) {
          updated[index].name = value;
        }
        // Si selecciona un equipo existente del select
        else {
          updated[index].isNew = false;
          updated[index].name = value;
        }
        return updated;
      }

      // 🔹 Para otros campos
      updated[index][key] =
        key === "quantity"
          ? value === "" ? "" : Math.max(1, Number(value) || 1)
          : value;

      return updated;
    });
  };

  const handleAddRow = () => {
    setFormList((prev) => [
      ...prev,
      { name: "", quantity: 1, unit: "unidades", location: "Almacén", category: "", isNew: false },
    ]);
  };

  const handleRemoveRow = (index) => {
    setFormList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormList([{ ...item, category: item.category || "", isNew: false }]);
    setShowModal(false);
  };

  // ✅ Guardar edición
  const handleSaveEdit = async () => {
    try {
      if (!editItem.name.trim()) {
        alert("El nombre no puede estar vacío");
        return;
      }

      const payload = {
        name: editItem.name.trim(),
        quantity: Number(editItem.quantity),
      };

      await axios.patch(`/inventory/${editItem.id}/`, payload);
      await fetchInventory();
      await fetchAlerts();

      setShowModal(false);
      setEditItem(null);

    } catch (err) {
      console.error("❌ Error al guardar:", err.response?.data || err.message);
      alert("❌ Error al guardar cambios");
    }
  };

  // ✅ Guardar nuevos o actualizar cantidad si ya existe
  const handleSave = async () => {
    try {
      for (const form of formList) {
        const normalizedName = normalize(form.name);
        if (!form.name.trim()) continue;

        const existingItem = items.find(
          (i) => normalize(i.name) === normalizedName
        );

        if (existingItem) {
          const newQuantity =
            (existingItem.quantity || 0) + (Number(form.quantity) || 0);
          await axios.patch(`/inventory/${existingItem.id}/`, {
            quantity: newQuantity,
          });
          console.log(`✅ Actualizado ${existingItem.name}`);
        } else {
          if (!form.category || !form.name.trim()) {
            alert("⚠️ Debes seleccionar una categoría y un nombre antes de guardar.");
            continue;
          }

          await axios.post("/inventory/", {
            name: form.name.trim(),
            quantity: Math.max(1, Number(form.quantity) || 1),
            unit: form.unit || "unidades",
            location: form.location || "Almacén",
            category: form.category,
          });
          console.log(`🆕 Creado ${form.name}`);
        }
      }

      await fetchInventory();
      await fetchAlerts();
      setShowModal(false);
      setFormList([
        { name: "", quantity: 1, unit: "unidades", location: "Almacén", category: "", isNew: false },
      ]);
    } catch (err) {
      console.error("❌ Error al guardar:", err.response?.data || err.message);
      alert("❌ Error al guardar cambios");
    }
  };

  // ✅ Eliminar
  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este item?")) return;
    try {
      await axios.delete(`/inventory/${id}/`);
      await fetchInventory();
      await fetchAlerts();
    } catch (err) {
      console.error("❌ Error al eliminar:", err.response?.data || err.message);
      alert("❌ Error al eliminar");
    }
  };

  // ✅ Agrupar items
  const groupedItems = useMemo(() =>
    CATEGORIES.map((cat) => ({
      ...cat,
      items: items.filter((i) => normalize(i.category) === normalize(cat.value)),
    }))
    , [items]);

  const selectedCategoryItems = useMemo(() => {
    if (!selectedCategory) return [];
    return items.filter(
      (i) => normalize(i.category) === normalize(selectedCategory.value)
    );
  }, [items, selectedCategory]);

  // ✅ Exportar PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const margin = 15;
    doc.addImage(logo, "PNG", margin, 10, 22, 22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Inventario General - Almacén", margin + 30, 18);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, margin + 30, 26);
    try {
      doc.setGState(new doc.GState({ opacity: 0.07 }));
      doc.addImage(logo, "PNG", 45, 60, 120, 120);
      doc.setGState(new doc.GState({ opacity: 1 }));
    } catch { }
    const rows = [];
    CATEGORIES.forEach((cat) => {
      const catItems = items.filter(
        (i) => normalize(i.category) === normalize(cat.value)
      );
      if (!catItems.length) return;
      rows.push([
        { content: cat.label, colSpan: 5, styles: { halign: "center", fillColor: [230, 230, 230] } },
      ]);
      catItems.forEach((i) =>
        rows.push([i.name, i.quantity, i.unit, i.location, cat.label])
      );
    });
    autoTable(doc, {
      startY: 50,
      head: [["Nombre", "Cantidad", "Unidad", "Ubicación", "Categoría"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [13, 110, 253], textColor: 255 },
      styles: { fontSize: 9 },
    });
    doc.save("Inventario_Almacen.pdf");
  };

  const buttonStyle = {
    background: "linear-gradient(90deg, #0069D9, #0A2A43)",
    color: "#F4F7FA",
    border: "none",
    fontWeight: 600,
  };

  return (
    <div className="d-flex">
      <SidebarTop />

      <div
        style={{
          flexGrow: 1,
          marginLeft: "220px",
          backgroundColor: "#0A2A43",
          minHeight: "100vh",
          padding: "40px 20px",
          color: "#F4F7FA",
          position: "relative", // 👈 Necesario para el posicionamiento del fondo
          zIndex: 0,
        }}
      >
        {/* ✅ Fondo con logo */}
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


        {/* Contenido principal sobre el fondo */}
        <Container style={{ position: "relative", zIndex: 1 }}>
          {loading && (
            <div className="text-primary fw-bold mb-4">
              <Spinner animation="border" variant="info" />{" "}
              <span>Cargando inventario...</span>
            </div>
          )}

          {alerts.length > 0 && (
            <div className="mb-4">
              {alerts.map((alert) => (
                <Alert
                  key={alert.id}
                  variant="danger"
                  className="d-flex justify-content-between align-items-center flex-wrap"
                >
                  <div>
                    🚨 <strong>{alert.item_name || alert.item}</strong> —{" "}
                    {alert.message}
                  </div>
                  <Button
                    variant="outline-light"
                    size="sm"
                    onClick={() => markAsViewed(alert.id)}
                  >
                    Marcar como vista
                  </Button>
                </Alert>
              ))}
            </div>
          )}

          {/* 🔹 Encabezado y botones */}
          <div className="d-flex flex-column flex-md-row justify-content-between mb-4">
            <h2 className="fw-bold mb-3" style={{ color: "#4DBFFF" }}>
              📦 Inventario General
            </h2>
            <div className="d-flex gap-2 flex-wrap">
              <button style={buttonStyle} className="btn" onClick={handleExportPDF}>
                📄 Descargar PDF
              </button>
              <button
                style={buttonStyle}
                className="btn"
                onClick={() => {
                  setEditItem(null);
                  setFormList([
                    {
                      name: "",
                      quantity: 1,
                      unit: "Unidades",
                      location: "Almacén",
                      category: "",
                      isNew: false,
                    },
                  ]);
                  setShowModal(true);
                }}
              >
                ➕ Añadir Equipos
              </button>
            </div>
          </div>

          {/* Categorías */}
          <div className="row">
            {groupedItems.map((group) => (
              <div key={group.value} className="col-12 col-sm-6 col-md-4 col-lg-3 mb-4">
                <div className="p-4 rounded-3 text-center h-100 shadow-sm" style={{ backgroundColor: "#0F304A", border: "1px solid #0069D9" }}>
                  <h5 className="fw-bold mb-2 text-light">{group.label}</h5>
                  <p className="text-info mb-3">
                    {group.items.length} equipo{group.items.length !== 1 ? "s" : ""}
                  </p>
                  <button
                    className="btn btn-sm w-100"
                    style={buttonStyle}
                    onClick={() => {
                      setSelectedCategory({ value: group.value, label: group.label });
                      setShowCategoryModal(true);
                    }}
                  >
                    👀 Ver Detalles
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* Modal SOLO para creación */}
          {/* Modal solo para AGREGAR */}
          <Modal show={showModal} onHide={() => setShowModal(false)} size="md">
            <Modal.Header closeButton style={{ background: "linear-gradient(90deg, #0d6efd, #6610f2)", color: "#fff" }}>
              <Modal.Title>Añadir Item(s)</Modal.Title>
            </Modal.Header>

            <Modal.Body style={{ backgroundColor: "#0A2A43", color: "#fff" }}>
              {formList.map((form, idx) => (
                <div key={idx} className="mb-3 border-bottom pb-2">

                  {/* Categoría */}
                  <Form.Group className="mb-2">
                    <Form.Label>Categoría</Form.Label>
                    <Form.Select
                      value={form.category}
                      onChange={(e) => handleChange(idx, "category", e.target.value)}
                    >
                      <option value="">Seleccione categoría...</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  {/* Equipo */}
                  <Form.Group className="mb-2">
                    <Form.Label>Equipo</Form.Label>
                    {form.category ? (
                      !form.isNew ? (
                        <Form.Select
                          value={form.name || ""}
                          onChange={(e) => handleChange(idx, "name", e.target.value)}
                        >
                          <option value="">Seleccione un equipo...</option>
                          {items
                            .filter((i) => normalize(i.category) === normalize(form.category))
                            .map((i) => (
                              <option key={i.id} value={i.name}>
                                {i.name}
                              </option>
                            ))}
                          <option value="__nuevo__">➕ Nuevo equipo...</option>
                        </Form.Select>
                      ) : (
                        <Form.Control
                          type="text"
                          placeholder="Escriba el nombre del nuevo equipo"
                          value={form.name}
                          onChange={(e) => handleChange(idx, "name", e.target.value)}
                        />
                      )
                    ) : (
                      <Form.Control type="text" placeholder="Seleccione categoría" disabled />
                    )}
                  </Form.Group>

                  {/* Cantidad */}
                  <Form.Group className="mb-2">
                    <Form.Label>Cantidad</Form.Label>
                    <Form.Control
                      type="number"
                      min={1}
                      value={form.quantity}
                      onChange={(e) => handleChange(idx, "quantity", e.target.value)}
                    />
                  </Form.Group>

                  {/* Unidad */}
                  <Form.Group className="mb-2">
                    <Form.Label>Unidad</Form.Label>
                    <Form.Select
                      value={form.unit}
                      onChange={(e) => handleChange(idx, "unit", e.target.value)}
                    >
                      <option value="Unidades">Unidades</option>
                      <option value="Paquetes">Paquetes</option>
                      <option value="Cajas">Cajas</option>
                    </Form.Select>
                  </Form.Group>

                  {/* Ubicación */}
                  <Form.Group className="mb-2">
                    <Form.Label>Ubicación</Form.Label>
                    <Form.Control type="text" value={form.location} disabled />
                  </Form.Group>

                  {formList.length > 1 && (
                    <Button variant="danger" size="sm" onClick={() => handleRemoveRow(idx)}>
                      Eliminar
                    </Button>
                  )}
                </div>
              ))}

              <Button variant="secondary" size="sm" onClick={handleAddRow}>
                ➕ Agregar otra fila
              </Button>
            </Modal.Body>

            <Modal.Footer style={{ backgroundColor: "#0A2A43" }}>
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cerrar</Button>
              <Button variant="primary" onClick={handleSave}>Guardar Items</Button>
            </Modal.Footer>
          </Modal>
          {/* Modal pequeño para EDITAR */}
          <Modal show={editItem !== null} onHide={() => setEditItem(null)} centered>
            <Modal.Header closeButton style={{ background: "linear-gradient(90deg, #0d6efd, #6610f2)", color: "#fff" }}>
              <Modal.Title>Editar Equipo</Modal.Title>
            </Modal.Header>

            <Modal.Body style={{ backgroundColor: "#0A2A43", color: "#fff" }}>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre</Form.Label>
                  <Form.Control
                    type="text"
                    value={editItem?.name || ""}
                    onChange={(e) =>
                      setEditItem((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Cantidad</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={editItem?.quantity || 1}
                    onChange={(e) =>
                      setEditItem((prev) => ({ ...prev, quantity: e.target.value }))
                    }
                  />
                </Form.Group>
              </Form>
            </Modal.Body>

            <Modal.Footer style={{ backgroundColor: "#0A2A43" }}>
              <Button variant="danger" onClick={() => setEditItem(null)}>
                Cancelar
              </Button>
              <Button style={buttonStyle} onClick={handleSaveEdit}>Guardar cambios</Button>
            </Modal.Footer>
          </Modal>

          {/* Modal Detalle Categoría */}
          <Modal show={showCategoryModal} onHide={() => setShowCategoryModal(false)} size="lg" centered>
            <Modal.Header closeButton style={{ background: "linear-gradient(90deg, #0d6efd, #6610f2)", color: "#fff" }}>
              <Modal.Title>Detalles — {selectedCategory?.label}</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ backgroundColor: "#0F304A", color: "#fff" }}>
              <Table striped bordered hover variant="dark" responsive>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Cantidad</th>
                    <th>Unidad</th>
                    <th>Ubicación</th>
                    <th style={{ minWidth: 140 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCategoryItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unit}</td>
                      <td>{item.location}</td>
                      <td className="d-flex gap-2 flex-wrap">
                        <button className="btn btn-sm" style={buttonStyle} onClick={() => handleEdit(item)}>
                          ✏️ Editar
                        </button>
                        <Button size="sm" variant="outline-danger" onClick={() => handleDelete(item.id)}>
                          🗑️
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {selectedCategoryItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-secondary">
                        No hay items en esta categoría.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Modal.Body>
          </Modal>
        </Container>
      </div>
    </div>
  );
}
