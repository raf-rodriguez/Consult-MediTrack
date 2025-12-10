import React, { useEffect, useState } from "react";
import api from "../../services/api";
import logo from "../../assets/image.png";
import { Modal, Button, Table, Container, Row, Col } from "react-bootstrap";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import SidebarTop from "../Dashboard/SidebarTop";

export default function MedicationExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [searchDate, setSearchDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // 🆕 ESTADOS PARA EL MODAL DE CONFIRMACIÓN
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState(null);

  // 🔹 Función para cargar gastos
  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await api.get("/medexpenses/");
      setExpenses(res.data);
      setFilteredExpenses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Cargar al montar + refresco automático cada 10s
  useEffect(() => {
    fetchExpenses();
    const interval = setInterval(fetchExpenses, 10000);
    return () => clearInterval(interval);
  }, []);

  // 🔹 Filtrar por fecha
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchDate(value);

    if (!value) {
      setFilteredExpenses(expenses);
      return;
    }

    const filtered = expenses.filter((item) =>
      item.created_at.startsWith(value)
    );
    setFilteredExpenses(filtered);
  };

  // 🔹 Agrupar por fecha + ambulancia + paramédico
  const groupedExpenses = filteredExpenses.reduce((acc, item) => {
    const key = `${item.created_at.split("T")[0]}-${item.ambulance}-${item.paramedic}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const handleViewGroup = (groupKey) => {
    setSelectedGroup(groupedExpenses[groupKey]);
    setShowModal(true);
  };

  // 🆕 Función que abre el modal de confirmación
  const confirmDeletion = (id) => {
    setItemToDeleteId(id);
    setShowConfirmModal(true);
  };

  // 🔹 Función para la eliminación efectiva (llamada desde el modal)
  const handleDeleteConfirmed = async () => {
    setShowConfirmModal(false); // Cierra el modal inmediatamente
    const id = itemToDeleteId;

    try {
      await api.delete(`/medexpenses/${id}/`);
      // Mejora: podrías usar una librería de notificaciones toast para un mejor UX
      alert("✅ Registro eliminado correctamente"); 
      fetchExpenses();
      
      // Actualiza el modal de detalle si estaba abierto
      if (selectedGroup) {
        setSelectedGroup(selectedGroup.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error(err);
      alert("❌ Error al eliminar el registro");
    } finally {
        setItemToDeleteId(null);
    }
  };

  const downloadPDF = (group) => {
    if (!group || group.length === 0) return;
    const doc = new jsPDF();
    const margin = 15;
    const img = new Image();
    img.src = logo;
    img.onload = () => {
      doc.addImage(img, "PNG", margin, margin, 30, 30);
      doc.setFontSize(16);
      doc.text("Gastos de Medicamentos y Equipos", margin, margin + 40);
      const { created_at, paramedic, ambulance, shift } = group[0];
      doc.setFontSize(12);
      doc.text(`Fecha: ${new Date(created_at).toLocaleDateString()}`, margin, margin + 50);
      doc.text(`Paramédico: ${paramedic}`, margin, margin + 57);
      doc.text(`Ambulancia: ${ambulance}`, margin, margin + 64);
      doc.text(`Turno: ${shift}`, margin, margin + 71);

      const tableData = group.map((item) => [item.medicine, item.quantity]);
      autoTable(doc, {
        startY: margin + 85,
        head: [["Medicamento / Equipo", "Cantidad"]],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [13, 110, 253] },
        styles: { fontSize: 10 },
      });

      doc.setTextColor(0, 0, 0, 0.05);
      doc.setFontSize(50);
      doc.text(
        "CONSULT MEDICAL",
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() / 2,
        { angle: 45, align: "center", baseline: "middle" }
      );

      doc.save(`gastos_${ambulance}_${new Date(created_at).toISOString().split("T")[0]}.pdf`);
    };
  };

  const buttonStyle = {
    background: "linear-gradient(90deg, #0069D9, #0A2A43)",
    color: "#F4F7FA",
    border: "none",
    fontWeight: 600,
  };

  // 🆕 Componente Modal de Confirmación
  const ConfirmationModal = () => (
    <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
      <Modal.Header closeButton style={{ backgroundColor: "#101728", borderBottom: "1px solid #dc3545" }}>
        <Modal.Title style={{ color: "#dc3545", fontWeight: 700 }}>
            <span role="img" aria-label="Warning">⚠️</span> Confirmar Eliminación
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: "#101728", color: "#F4F7FA" }}>
        <p>Estás a punto de **eliminar permanentemente** este registro de gasto.</p>
        <p>Esta acción no se puede deshacer. ¿Deseas continuar?</p>
      </Modal.Body>
      <Modal.Footer style={{ backgroundColor: "#101728", borderTop: "1px solid #1e2b4a" }}>
        <Button 
            variant="secondary" 
            className="rounded-pill" 
            onClick={() => setShowConfirmModal(false)}
        >
            Cancelar
        </Button>
        <Button 
            variant="danger" 
            className="rounded-pill" 
            onClick={handleDeleteConfirmed}
        >
            <span role="img" aria-label="Trash">🗑️</span> Eliminar Permanentemente
        </Button>
      </Modal.Footer>
    </Modal>
  );

  return (
    <div className="d-flex">
      {/* Sidebar */}
      <SidebarTop />

      {/* Contenido principal */}
      <div style={{ flexGrow: 1, marginLeft: "220px", backgroundColor: "#0A2A43", minHeight: "100vh", padding: "40px 20px", color: "#F4F7FA" }}>
        {/* Fondo translúcido */}
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
          {/* Encabezado */}
          <Row className="mb-3">
            <Col>
              <h3 style={{ color: "#0d6efd", fontWeight: 700 }}>💰 Gastos de Equipo y Medicamentos</h3>
              <p style={{ color: "#9aa9cc" }}>Consulta los registros de gastos.</p>
              <Button style={buttonStyle} className="mb-3 rounded-pill" onClick={() => window.history.back()}>
                ← Volver
              </Button>
            </Col>
            <Col xs="12" md="3">
              <input
                type="date"
                className="form-control form-control-sm rounded-pill shadow-sm"
                value={searchDate}
                onChange={handleSearch}
              />
            </Col>
          </Row>

          {/* Tabla principal */}
          {loading ? (
            <div className="text-center my-4">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-secondary">Cargando gastos...</p>
            </div>
          ) : Object.keys(groupedExpenses).length === 0 ? (
            <div
              className="text-center p-4 rounded shadow-sm"
              style={{ backgroundColor: "rgba(16,23,40,0.8)", border: "1px solid #1e2b4a", color: "#93baf9" }}
            >
              No se encontraron registros para la fecha seleccionada
            </div>
          ) : (
            <div className="table-responsive shadow rounded-3" style={{ backgroundColor: "rgba(16,23,40,0.85)" }}>
              <table className="table table-dark table-bordered table-hover align-middle mb-0 text-white">
                <thead className="text-center" style={{ backgroundColor: "#0d6efd" }}>
                  <tr>
                    <th>Fecha</th>
                    <th>Paramédico</th>
                    <th>Ambulancia</th>
                    <th>Turno</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody className="text-center">
                  {Object.entries(groupedExpenses).map(([key, group]) => {
                    const { created_at, paramedic, ambulance, shift } = group[0];
                    return (
                      <tr key={key}>
                        <td>{new Date(created_at).toLocaleDateString()}</td>
                        <td>{paramedic}</td>
                        <td>{ambulance}</td>
                        <td>{shift}</td>
                        <td className="d-flex justify-content-center gap-2">
                          <Button size="sm" style={buttonStyle} className="rounded-pill" onClick={() => handleViewGroup(key)}>👁️ Ver</Button>
                          <Button size="sm" style={buttonStyle} className="rounded-pill" onClick={() => downloadPDF(group)}>📥 Descargar</Button>
                          
                          {/* 🆕 LLAMA AL MODAL DE CONFIRMACIÓN */}
                          <Button 
                            size="sm" 
                            style={{ backgroundColor: "#dc3545", border: "none", color: "#fff" }} 
                            className="rounded-pill" 
                            onClick={() => confirmDeletion(group[0].id)}
                          >
                            🗑️ Eliminar
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal detalle grupo */}
          <Modal show={showModal} onHide={() => setShowModal(false)} centered size="md">
            <Modal.Header closeButton style={{ background: "linear-gradient(90deg, #0d6efd, #6610f2)", color: "#fff" }}>
              <Modal.Title>📋 Detalle de Equipo Requisado</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ backgroundColor: "#101728", color: "#fff" }}>
              {selectedGroup ? (
                <>
                  <div style={{ backgroundColor: "rgba(13,110,253,0.1)", border: "1px solid #1e2b4a", borderRadius: "12px", padding: "10px 15px", marginBottom: "15px" }}>
                    <p className="mb-1"><strong>📅 Fecha:</strong> {new Date(selectedGroup[0].created_at).toLocaleDateString()}</p>
                    <p className="mb-1"><strong>🚑 Unidad:</strong> {selectedGroup[0].ambulance}</p>
                    <p className="mb-1"><strong>🧑‍⚕️ Paramédico:</strong> {selectedGroup[0].paramedic}</p>
                    <p className="mb-0"><strong>👤 Paciente:</strong> {selectedGroup[0].patient_name || "—"}</p>
                  </div>

                  <Table bordered hover responsive variant="dark" className="align-middle text-center mb-0">
                    <thead style={{ backgroundColor: "#0d6efd" }}>
                      <tr>
                        <th>Medicamento / Equipo</th>
                        <th>Cantidad</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedGroup.map((item) => (
                        <tr key={item.id}>
                          <td>{item.medicine}</td>
                          <td>{item.quantity}</td>
                          <td>
                            {/* 🆕 LLAMA AL MODAL DE CONFIRMACIÓN */}
                            <Button 
                                size="sm" 
                                style={{ backgroundColor: "#dc3545", border: "none", color: "#fff" }} 
                                className="rounded-pill" 
                                onClick={() => confirmDeletion(item.id)}
                            >
                                🗑️ Eliminar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </>
              ) : <p>No hay datos para mostrar.</p>}
            </Modal.Body>
            <Modal.Footer style={{ backgroundColor: "#101728", borderTop: "1px solid #1e2b4a" }}>
              <Button style={buttonStyle} className="rounded-pill" onClick={() => setShowModal(false)}>Cerrar</Button>
            </Modal.Footer>
          </Modal>

          {/* 🆕 AÑADIR EL MODAL DE CONFIRMACIÓN AL JSX */}
          <ConfirmationModal />
        </Container>
      </div>
    </div>
  );
}