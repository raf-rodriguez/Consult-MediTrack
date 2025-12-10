// src/components/Storage/StorageCheckList.jsx

import { useEffect, useState, useCallback, useMemo } from "react";
import axios from "../../services/api";
import { Button, Modal, Form, Table, Container, Alert, Spinner, Row, Col, Card } from "react-bootstrap";
import logo from "../../assets/image.png";
import SidebarTop from "../Dashboard/SidebarTop";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Normalizador
const normalize = (txt = "") => txt.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim().toLowerCase();

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
  
  // Modales
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  // 🔴 NUEVOS ESTADOS PARA LA ALERTA DE ELIMINAR
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ ESTADO INICIAL
  const [formList, setFormList] = useState([
    { name: "", quantity: 1, meta: 1, unit: "unidades", location: "Almacén", category: "", isNew: false },
  ]);

  const fetchInventory = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await axios.get("/inventory/");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); } finally { if (!silent) setLoading(false); }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await axios.get("/alerts/");
      setAlerts(Array.isArray(res.data) ? res.data : []);
    } catch (err) { setAlerts([]); }
  }, []);

  useEffect(() => {
    fetchInventory(); fetchAlerts();
    const interval = setInterval(() => { fetchInventory(true); fetchAlerts(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchInventory, fetchAlerts]);

  const markAsViewed = async (id) => {
    try { await axios.patch(`/alerts/${id}/`, { viewed: true }); setAlerts((prev) => prev.filter((a) => a.id !== id)); } catch {}
  };

  const handleChange = (index, key, value) => {
    setFormList((prev) => {
      const updated = [...prev];
      if (key === "category") { updated[index].category = value; updated[index].name = ""; updated[index].isNew = false; return updated; }
      if (key === "name") {
        if (value === "__nuevo__") { updated[index].isNew = true; updated[index].name = ""; } 
        else if (updated[index].isNew) { updated[index].name = value; } 
        else { updated[index].isNew = false; updated[index].name = value; }
        return updated;
      }
      if (key === "quantity" || key === "meta") { updated[index][key] = value === "" ? "" : Math.max(1, Number(value)); } 
      else { updated[index][key] = value; }
      return updated;
    });
  };

  const handleAddRow = () => {
    setFormList((prev) => [...prev, { name: "", quantity: 1, meta: 1, unit: "unidades", location: "Almacén", category: "", isNew: false }]);
  };

  const handleRemoveRow = (index) => setFormList((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    try {
      for (const form of formList) {
        const normalizedName = normalize(form.name);
        if (!form.name.trim()) continue;
        const existingItem = items.find((i) => normalize(i.name) === normalizedName);

        if (existingItem) {
          const newQuantity = (existingItem.quantity || 0) + (Number(form.quantity) || 0);
          await axios.patch(`/inventory/${existingItem.id}/`, { quantity: newQuantity });
        } else {
          if (!form.category || !form.name.trim()) { alert("Faltan datos"); continue; }
          await axios.post("/inventory/", {
            name: form.name.trim(),
            quantity: Math.max(1, Number(form.quantity) || 1),
            meta: Math.max(1, Number(form.meta) || 1),
            unit: form.unit || "unidades",
            location: "Almacén",
            category: form.category,
          });
        }
      }
      await fetchInventory(); await fetchAlerts(); setShowModal(false);
      setFormList([{ name: "", quantity: 1, meta: 1, unit: "unidades", location: "Almacén", category: "", isNew: false }]);
    } catch (err) { console.error(err); alert("Error al guardar."); }
  };

  const handleEdit = (item) => { setEditItem(item); setShowModal(false); };
  
  const handleSaveEdit = async () => {
    try {
      await axios.patch(`/inventory/${editItem.id}/`, { name: editItem.name.trim(), quantity: Number(editItem.quantity) });
      await fetchInventory(); setEditItem(null);
    } catch { alert("Error editando"); }
  };

  // 🔴 1. FUNCIÓN PARA SOLICITAR ELIMINACIÓN (Abre el modal)
  const requestDelete = (id) => {
    setDeleteId(id);
    setShowDeleteAlert(true);
  };

  // 🔴 2. FUNCIÓN PARA EJECUTAR ELIMINACIÓN (Acción real)
  const confirmDelete = async () => {
    if (!deleteId) return;
    try { 
        await axios.delete(`/inventory/${deleteId}/`); 
        await fetchInventory(); 
        setShowDeleteAlert(false);
        setDeleteId(null);
    } catch { 
        alert("Error eliminando"); 
    }
  };

  const groupedItems = useMemo(() => CATEGORIES.map((cat) => ({ ...cat, items: items.filter((i) => normalize(i.category) === normalize(cat.value)) })), [items]);
  const selectedCategoryItems = useMemo(() => selectedCategory ? items.filter((i) => normalize(i.category) === normalize(selectedCategory.value)) : [], [items, selectedCategory]);

  const handleExportPDF = () => {
    const doc = new jsPDF(); doc.text("Inventario Almacén", 20, 20); const rows = [];
    CATEGORIES.forEach((cat) => {
      const catItems = items.filter((i) => normalize(i.category) === normalize(cat.value));
      if (!catItems.length) return;
      rows.push([{ content: cat.label, colSpan: 4, styles: { fillColor: [200, 200, 200] } }]);
      catItems.forEach((i) => rows.push([i.name, i.quantity, i.unit, cat.label]));
    });
    autoTable(doc, { startY: 30, head: [["Nombre", "Cantidad", "Unidad", "Categoría"]], body: rows });
    doc.save("Inventario.pdf");
  };

  const buttonStyle = { background: "linear-gradient(90deg, #0069D9, #0A2A43)", color: "#F4F7FA", border: "none", fontWeight: 600 };
  const inputStyle = { backgroundColor: "#0F304A", color: "white", border: "1px solid #4DBFFF" };

  return (
    <div className="d-flex">
      <SidebarTop />
      <div
        style={{
          flexGrow: 1, marginLeft: "220px", backgroundColor: "#0A2A43", minHeight: "100vh", padding: "40px 20px", color: "#F4F7FA", position: "relative", zIndex: 0,
        }}
      >
        <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundImage: `url(${logo})`, backgroundRepeat: "no-repeat", backgroundSize: "50%", backgroundPosition: "center", opacity: 0.05, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }} />
        <div style={{ position: "fixed", top: 0, left: "220px", width: "40px", height: "100%", background: "linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0))", zIndex: 2, pointerEvents: "none" }} />
        
        <Container style={{ position: "relative", zIndex: 1 }}>
          {loading && <div className="text-info mb-3"><Spinner animation="border" size="sm"/> Cargando...</div>}
          
          {alerts.length > 0 && (
            <div className="mb-4">
              {alerts.map((alert) => (
                <Alert key={alert.id} variant="danger" className="d-flex justify-content-between align-items-center shadow-sm">
                  <div>🚨 <strong>{alert.item_name || alert.item}</strong> — {alert.message}</div>
                  <Button variant="outline-danger" size="sm" onClick={() => markAsViewed(alert.id)}>Ocultar</Button>
                </Alert>
              ))}
            </div>
          )}

          <div className="d-flex justify-content-between mb-4">
            <h2 className="fw-bold" style={{ color: "#4DBFFF" }}>📦 Inventario Almacén</h2>
            <div className="d-flex gap-2">
              <button style={buttonStyle} className="btn" onClick={handleExportPDF}>📄 PDF</button>
              <button style={buttonStyle} className="btn" onClick={() => { setEditItem(null); setFormList([{ name: "", quantity: 1, meta: 1, unit: "Unidades", location: "Almacén", category: "", isNew: false }]); setShowModal(true); }}>➕ Añadir</button>
            </div>
          </div>

          <Row>
            {groupedItems.map((group) => (
              <Col xs={12} sm={6} md={4} lg={3} className="mb-4" key={group.value}>
                <div className="p-4 rounded-3 text-center h-100 shadow-sm" style={{ backgroundColor: "#0F304A", border: "1px solid #0069D9" }}>
                  <h5 className="fw-bold mb-2 text-light">{group.label}</h5>
                  <p className="text-info mb-3">{group.items.length} items</p>
                  <button className="btn btn-sm w-100" style={buttonStyle} onClick={() => { setSelectedCategory(group); setShowCategoryModal(true); }}>Ver Detalles</button>
                </div>
              </Col>
            ))}
          </Row>

          {/* MODAL AÑADIR */}
          <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" backdrop="static" centered>
            <Modal.Header closeButton style={{ background: "linear-gradient(90deg, #0d6efd, #6610f2)", color: "#fff" }}><Modal.Title>➕ Añadir al Inventario</Modal.Title></Modal.Header>
            <Modal.Body style={{ backgroundColor: "#0A2A43", color: "#fff" }}>
              <div style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: "5px" }}>
                {formList.map((form, idx) => (
                  <Card key={idx} className="mb-3 border-0 shadow-sm" style={{ backgroundColor: "#0F304A" }}>
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="text-info fw-bold">Ítem #{idx + 1}</h6>
                        {formList.length > 1 && <Button variant="outline-danger" size="sm" onClick={() => handleRemoveRow(idx)}>✕</Button>}
                      </div>

                      <Row className="g-3">
                        <Col md={4}>
                          <Form.Label className="small text-white-50">Categoría</Form.Label>
                          <Form.Select style={inputStyle} value={form.category || ""} onChange={(e) => handleChange(idx, "category", e.target.value)}>
                            <option value="">-- Seleccionar --</option>
                            {CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                          </Form.Select>
                        </Col>

                        <Col md={8}>
                          <Form.Label className="small text-white-50">Nombre del Equipo</Form.Label>
                          {form.category ? (
                            !form.isNew ? (
                              <Form.Select style={inputStyle} value={form.name || ""} onChange={(e) => handleChange(idx, "name", e.target.value)}>
                                <option value="">Seleccione o cree nuevo...</option>
                                {items.filter(i => normalize(i.category) === normalize(form.category)).map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                                <option value="__nuevo__" className="fw-bold bg-secondary text-white">✨ CREAR NUEVO...</option>
                              </Form.Select>
                            ) : (
                              <Form.Control style={inputStyle} type="text" placeholder="Escriba el nombre..." value={form.name || ""} onChange={(e) => handleChange(idx, "name", e.target.value)} autoFocus />
                            )
                          ) : <Form.Control style={{...inputStyle, opacity: 0.5}} disabled placeholder="Primero elija categoría" />}
                        </Col>

                        <Col md={4}>
                          <Form.Label className="small text-warning">📦 Stock Almacén</Form.Label>
                          <Form.Control style={inputStyle} type="number" min={1} value={form.quantity || ""} onChange={(e) => handleChange(idx, "quantity", e.target.value)} />
                        </Col>

                        <Col md={4}>
                          <Form.Label className="small text-success">🎯 Meta (Recomendaciones)</Form.Label>
                          <Form.Control style={form.isNew ? inputStyle : {...inputStyle, opacity: 0.5}} type="number" min={1} value={form.meta || ""} onChange={(e) => handleChange(idx, "meta", e.target.value)} disabled={!form.isNew} placeholder="Ej: 5" />
                        </Col>

                        <Col md={4}>
                          <Form.Label className="small text-white-50">Unidad</Form.Label>
                          <Form.Select style={inputStyle} value={form.unit || ""} onChange={(e) => handleChange(idx, "unit", e.target.value)}>
                            <option>Unidades</option><option>Cajas</option><option>Paquetes</option>
                          </Form.Select>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                ))}
              </div>
              <div className="d-grid mt-3"><Button variant="outline-light" size="sm" onClick={handleAddRow} style={{ borderStyle: "dashed" }}>+ Añadir otro ítem</Button></div>
            </Modal.Body>
            <Modal.Footer style={{ backgroundColor: "#0A2A43", borderTop: "1px solid #0d6efd" }}>
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button style={buttonStyle} onClick={handleSave}>💾 Guardar Todo</Button>
            </Modal.Footer>
          </Modal>

          {/* Modal EDITAR */}
          <Modal show={editItem !== null} onHide={() => setEditItem(null)} centered>
            <Modal.Header closeButton style={{ background: "#0d6efd", color: "#fff" }}><Modal.Title>Editar Existencia</Modal.Title></Modal.Header>
            <Modal.Body style={{ backgroundColor: "#0A2A43", color: "#fff" }}>
                <Form.Label>Nombre</Form.Label>
                <Form.Control style={inputStyle} value={editItem?.name || ""} onChange={e => setEditItem({...editItem, name: e.target.value})} className="mb-3"/>
                <Form.Label>Cantidad Actual</Form.Label>
                <Form.Control style={inputStyle} type="number" value={editItem?.quantity || ""} onChange={e => setEditItem({...editItem, quantity: e.target.value})} />
            </Modal.Body>
            <Modal.Footer style={{ backgroundColor: "#0A2A43" }}><Button onClick={handleSaveEdit} variant="success">Actualizar</Button></Modal.Footer>
          </Modal>

          {/* Modal DETALLES (LISTA DE ITEMS) */}
          <Modal show={showCategoryModal} onHide={() => setShowCategoryModal(false)} size="lg" centered scrollable>
            <Modal.Header closeButton style={{ background: "#0d6efd", color: "#fff" }}><Modal.Title>{selectedCategory?.label}</Modal.Title></Modal.Header>
            <Modal.Body style={{ backgroundColor: "#0F304A", color: "#fff" }}>
              <Table striped bordered hover variant="dark">
                <thead><tr><th>Nombre</th><th>Cant.</th><th>Unidad</th><th>Acción</th></tr></thead>
                <tbody>
                  {selectedCategoryItems.map(i => (
                    <tr key={i.id}>
                        <td>{i.name}</td><td className="fw-bold text-info">{i.quantity}</td><td>{i.unit}</td>
                        <td>
                            <button className="btn btn-sm btn-primary me-2" onClick={()=>handleEdit(i)}>✏️</button>
                            {/* 🔴 AQUÍ USAMOS LA NUEVA FUNCIÓN REQUEST DELETE */}
                            <button className="btn btn-sm btn-danger" onClick={()=>requestDelete(i.id)}>🗑️</button>
                        </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Modal.Body>
          </Modal>

          {/* 🔴 3. NUEVO MODAL DE ELIMINAR (ESTILO PREMIUM) */}
          <Modal show={showDeleteAlert} onHide={() => setShowDeleteAlert(false)} centered backdrop="static" keyboard={false}>
            <Modal.Header closeButton style={{ background: "linear-gradient(90deg, #dc3545, #b02a37)", border: "none" }}>
              <Modal.Title className="fw-bold text-white">⚠️ Confirmar Eliminación</Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-center py-5" style={{ backgroundColor: "#0F2537", color: "#fff" }}>
              <div className="mb-3" style={{ fontSize: "4rem", filter: "drop-shadow(0 0 15px rgba(220, 53, 69, 0.4))" }}>🗑️</div>
              <h4 className="fw-bold mb-3">¿Eliminar este ítem?</h4>
              <p className="text-white-50 px-3">Estás a punto de borrar permanentemente este registro del inventario.</p>
              <p className="small text-danger fw-bold mt-2 mb-0">⚠️ Esta acción no se puede deshacer.</p>
            </Modal.Body>
            <Modal.Footer style={{ backgroundColor: "#0F2537", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <Button variant="outline-light" className="rounded-pill px-4 border-0 opacity-75" onClick={() => setShowDeleteAlert(false)}>Cancelar</Button>
              <Button 
                variant="danger" 
                className="rounded-pill px-4 fw-bold" 
                onClick={confirmDelete}
                style={{ background: "linear-gradient(90deg, #dc3545, #b02a37)", boxShadow: "0 4px 15px rgba(220, 53, 69, 0.5)", border: "none" }}
              >
                Sí, Eliminar
              </Button>
            </Modal.Footer>
          </Modal>

        </Container>
      </div>
    </div>
  );
}