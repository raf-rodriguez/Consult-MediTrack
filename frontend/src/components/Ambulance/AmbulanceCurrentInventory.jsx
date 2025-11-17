// Informacion del equipo actual de la ambulancia

import { useEffect, useState, useCallback } from "react";
import { Table, Button, Modal, Form, Spinner, Container, Row, Col } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import logo from "../../assets/image.png";
import SidebarTop from "../Dashboard/SidebarTop";

const normalize = (txt = "") =>
  txt.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim().toLowerCase();

export default function AmbulanceCurrentInventory() {
  const { unit } = useParams();
  const navigate = useNavigate();

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState("Inmovilización");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [newItem, setNewItem] = useState({ category: "", id: null, name: "", quantity: 1, unit: "" });
  const [addModeData, setAddModeData] = useState({ existingId: null });

  const [editItem, setEditItem] = useState({ id: null, name: "", quantity: 1 });

  const categories = [
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

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/ambulance-inventory/?ambulance=${unit}`);
      setInventory(res.data);
    } catch (err) {
      console.error(err);
      alert("No se pudo obtener inventario");
    } finally {
      setLoading(false);
    }
  }, [unit]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewItem((prev) => ({ ...prev, [name]: value }));
  };

  // 🚀 AGREGAR O SUMAR A EXISTENTE
  const handleAddItem = async () => {
    if (!newItem.category) return alert("Seleccione categoría");
    if (!newItem.name.trim()) return alert("Ingrese nombre");

    try {
      if (addModeData.existingId) {
        // SUMAR CANTIDAD A EXISTENTE
        const existing = inventory.find(i => i.id === addModeData.existingId);

        const payload = {
          quantity: existing.quantity + Number(newItem.quantity)
        };

        await api.patch(`/ambulance-inventory/${existing.id}/`, payload);
      } else {
        // CREAR NUEVO
        const payload = {
          ambulance: unit,
          name: newItem.name,
          unit: newItem.unit,
          quantity: Number(newItem.quantity),
          category: newItem.category
        };

        await api.post(`/ambulance-inventory/`, payload);
      }

      fetchInventory();
      setShowAddModal(false);
      setNewItem({ category: "", id: null, name: "", quantity: 1, unit: "" });
      setAddModeData({ existingId: null });

    } catch (err) {
      console.error(err.response?.data || err);
      alert("Error al guardar");
    }
  };

  // ✏️ ABRIR MODAL EDITAR
  const openEditModal = (item) => {
    setEditItem({
      id: item.id,
      name: item.name,
      quantity: item.quantity
    });
    setShowEditModal(true);
  };

  // 💾 GUARDAR CAMBIOS DE EDICIÓN
  const handleSaveEdit = async () => {
    if (!editItem.name.trim()) {
      alert("El nombre no puede estar vacío");
      return;
    }

    const payload = {
      name: editItem.name.trim(),
      quantity: Number(editItem.quantity)
    };

    try {
      await api.patch(`/ambulance-inventory/${editItem.id}/`, payload);

      setShowEditModal(false);
      fetchInventory();
    } catch (err) {
      console.error("PATCH ERROR:", err.response?.data || err);
      alert("Error al guardar cambios");
    }
  };

  const filteredInventory = inventory.filter(
    (i) => normalize(i.category) === normalize(selectedCategory)
  );

  const buttonStyle = {
    background: "linear-gradient(90deg, #0069D9, #0A2A43)",
    color: "#FFF",
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

        <Container style={{ position: "relative", zIndex: 2 }}>
          <Row className="mb-3">
            <Col>
              <h3 style={{ color: "#0d6efd", fontWeight: 700 }}>
                🧰 Inventario Actual — {unit}
              </h3>
              <Button style={buttonStyle} className="rounded-pill" onClick={() => navigate("/ambulances")}>
                ← Volver
              </Button>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col className="d-flex flex-wrap gap-2 justify-content-center">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={cat === selectedCategory ? "primary" : "outline-primary"}
                  className="rounded-pill px-3"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </Col>
          </Row>

          <Row>
            <Col className="d-flex justify-content-end">
              <Button style={buttonStyle} className="rounded-pill" onClick={() => setShowAddModal(true)}>
                ➕ Agregar Equipo
              </Button>
            </Col>
          </Row>

          <Row className="mt-3">
            <Col>
              {loading ? (
                <Spinner animation="border" />
              ) : (
                <Table bordered hover variant="dark" className="text-center">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Cantidad</th>
                      <th>Unidad</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unit}</td>
                        <td>
                          <Button
                            size="sm"
                            style={buttonStyle}
                            className="rounded-pill me-2"
                            onClick={() => openEditModal(item)}
                          >
                            ✏️ Editar
                          </Button>
                          <Button size="sm" variant="danger" className="rounded-pill">🗑️ Eliminar</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Col>
          </Row>
        </Container>

        {/* MODAL AGREGAR */}
        <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
          <Modal.Header closeButton style={{ background: "linear-gradient(90deg, #0d6efd, #6610f2)", color: "#fff" }}>
            <Modal.Title>Agregar Equipo — {unit}</Modal.Title>
          </Modal.Header>

          <Modal.Body style={{ backgroundColor: "#0A2A43", color: "#fff" }}>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Categoría</Form.Label>
                <Form.Select
                  name="category"
                  value={newItem.category}
                  onChange={(e) => {
                    handleChange(e);
                    setAddModeData({ existingId: null });
                  }}
                >
                  <option value="">Seleccione categoría</option>
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </Form.Select>
              </Form.Group>

              {newItem.category && (
                <Form.Group className="mb-3">
                  <Form.Label>Equipo existente</Form.Label>
                  <Form.Select
                    value={addModeData.existingId || "new"}
                    onChange={(e) => {
                      const id = e.target.value;
                      if (id === "new") {
                        setAddModeData({ existingId: null });
                        setNewItem((p) => ({ ...p, name: "" }));
                        return;
                      }

                      const item = inventory.find(i => i.id === Number(id));
                      setAddModeData({ existingId: item.id });
                      setNewItem({
                        category: item.category,
                        id: item.id,
                        name: item.name,
                        quantity: 1,
                        unit: item.unit,
                      });
                    }}
                  >
                    <option value="new">➕ Nuevo equipo</option>
                    {inventory
                      .filter(i => normalize(i.category) === normalize(newItem.category))
                      .map(i => (
                        <option key={i.id} value={i.id}>
                          {i.name} — {i.quantity} {i.unit}
                        </option>
                      ))}
                  </Form.Select>
                </Form.Group>
              )}

              {!addModeData.existingId && (
                <Form.Group className="mb-3">
                  <Form.Label>Nombre</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={newItem.name}
                    onChange={handleChange}
                  />
                </Form.Group>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Cantidad</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  name="quantity"
                  value={newItem.quantity}
                  onChange={handleChange}
                />
              </Form.Group>

              <Form.Group>
                <Form.Label>Unidad</Form.Label>
                <Form.Control
                  type="text"
                  name="unit"
                  value={newItem.unit}
                  onChange={handleChange}
                />
              </Form.Group>
            </Form>
          </Modal.Body>

          <Modal.Footer style={{ backgroundColor: "#0A2A43" }}>
            <Button variant="danger" onClick={() => setShowAddModal(false)}>Cancelar</Button>
            <Button style={buttonStyle} onClick={handleAddItem}>Guardar</Button>
          </Modal.Footer>
        </Modal>

        {/* MODAL EDITAR */}
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
          <Modal.Header closeButton style={{ background: "linear-gradient(90deg, #0d6efd, #6610f2)", color: "#fff" }}>
            <Modal.Title>Editar Equipo</Modal.Title>
          </Modal.Header>

          <Modal.Body style={{ backgroundColor: "#0A2A43", color: "#fff" }}>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Nombre</Form.Label>
                <Form.Control
                  type="text"
                  value={editItem.name}
                  onChange={(e) => setEditItem((p) => ({ ...p, name: e.target.value }))}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Cantidad</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={editItem.quantity}
                  onChange={(e) => setEditItem((p) => ({ ...p, quantity: e.target.value }))}
                />
              </Form.Group>
            </Form>
          </Modal.Body>

          <Modal.Footer style={{ backgroundColor: "#0A2A43" }}>
            <Button variant="danger" onClick={() => setShowEditModal(false)}>Cancelar</Button>
            <Button style={buttonStyle} onClick={handleSaveEdit}>Guardar cambios</Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
}
