// Ver equipo requisado de cada ambulancias

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Table, Button, Card, Container, Row, Col, Modal } from "react-bootstrap";
import logo from "../../assets/image.png";
import SidebarTop from "../Dashboard/SidebarTop";

export default function AmbulanceEquipment({ ambulance }) {
  const navigate = useNavigate();
  const [groupedByDate, setGroupedByDate] = useState({});
  const [show, setShow] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  // 🔹 Estilo de botones
  const buttonStyle = {
    background: "linear-gradient(90deg, #0069D9, #0A2A43)",
    color: "#F4F7FA",
    border: "none",
    fontWeight: 600,
  };

  // 🔹 Cargar requisiciones
  const fetchRequisitions = useCallback(async () => {
    try {
      const res = await api.get("/ambulance-requisitions/");
      const filtered = res.data.filter(req => req.ambulance === ambulance);

      const grouped = {};

      filtered.forEach(req => {
        // ✅ Usamos created_at (fecha real del registro)
        const dateStr = new Date(req.created_at).toLocaleDateString("es-PR");

        if (!grouped[dateStr]) grouped[dateStr] = [];
        grouped[dateStr].push(req);
      });

      setGroupedByDate(grouped);
    } catch (err) {
      console.error("Error cargando requisiciones:", err);
    }
  }, [ambulance]);


  useEffect(() => {
    fetchRequisitions();
    const interval = setInterval(fetchRequisitions, 10000); // refresco cada 10s
    return () => clearInterval(interval);
  }, [fetchRequisitions]);

  const handleView = (dateStr) => {
    setSelectedDate(dateStr);
    setShow(true);
  };

  const renderCard = (dateStr, reqs) => (
    <Card key={dateStr} className="mb-3 shadow-sm border-0" style={{ backgroundColor: "#0F304A", border: "1px solid #0069D9" }}>
      <Card.Body className="d-flex flex-column flex-md-row justify-content-between align-items-center">
        <div style={{ color: "#F4F7FA", marginBottom: "10px", marginMdBottom: 0 }}>
          📅 {dateStr} — {reqs.length} equipos
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <Button size="sm" style={buttonStyle} className="rounded-pill" onClick={() => handleView(dateStr)}>👁️ Ver</Button>
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <div className="d-flex">
      {/* Sidebar */}
      <SidebarTop />

      {/* Contenido principal */}
      <div style={{ flexGrow: 1, marginLeft: "220px", backgroundColor: "#0A2A43", minHeight: "100vh", padding: "40px 20px", color: "#F4F7FA" }}>

        {/* Logo translúcido de fondo */}
        <div style={{
          position: "fixed",
          top: "50%", left: "50%",
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
          <Row className="mb-4">
            <Col>
              <h3 style={{ color: "#0d6efd", fontWeight: "700", marginBottom: "5px" }}>
                🚑 Equipo de Ambulancia - <span style={{ color: "#F4F7FA" }}>{ambulance}</span>
              </h3>
              <p style={{ color: "#9aa9cc" }}>Consulta los registros de equipo requisado para esta unidad.</p>
              {/* Botón volver a ambulancias con mismo estilo */}
              <Button style={buttonStyle} className="mb-3 rounded-pill" onClick={() => navigate("/ambulances")}>
                ← Volver a ambulancias
              </Button>
            </Col>
          </Row>

          {/* Lista de requisiciones */}
          <Row>
            <Col>
              {Object.keys(groupedByDate).length === 0 ? (
                <div className="text-center p-3 rounded" style={{ backgroundColor: "rgba(16,23,40,0.8)", border: "1px solid #1e2b4a", color: "#93baf9" }}>
                  No hay requisiciones para <strong>{ambulance}</strong>.
                </div>
              ) : (
                Object.entries(groupedByDate).map(([dateStr, reqs]) => renderCard(dateStr, reqs))
              )}
            </Col>
          </Row>
        </Container>

        {/* Modal Detalle */}
        <Modal show={show} onHide={() => setShow(false)} size="xl" centered scrollable>
          <Modal.Header closeButton style={{ background: "linear-gradient(90deg, #0d6efd, #6610f2)", color: "#fff" }}>
            <Modal.Title>📦 Detalle de Requisición</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ backgroundColor: "#0A2A43", color: "#F4F7FA", position: "relative" }}>
            {selectedDate && groupedByDate[selectedDate] ? (
              
              <Card className="p-3 text-white" style={{ backgroundColor: "#0F304A", border: "1px solid #0069D9" }}>
                <p><strong>📅 Fecha:</strong> {selectedDate}</p>
                <p><strong>🚑 Ambulancia:</strong> {groupedByDate[selectedDate][0]?.ambulance}</p>
                <p><strong>👨‍⚕️ Paramédico:</strong> {groupedByDate[selectedDate][0]?.paramedic || "_"}</p>

                <Table bordered hover responsive className="mt-3" variant="dark">
                  <thead className="text-center">
                    <tr>
                      <th>Nombre del Equipo</th>
                      <th>Categoría</th>
                      <th>Cantidad</th>
                      <th>Unidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedByDate[selectedDate].map((req, index) => (
                      <tr key={req.id || index}>
                        <td>{req.item?.name}</td>
                        <td>{req.item?.category || "—"}</td>
                        <td>{req.quantity}</td>
                        <td>{req.item?.unit || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            ) : <p>No hay datos disponibles.</p>}
          </Modal.Body>
          <Modal.Footer style={{ backgroundColor: "#0F304A", borderTop: "1px solid #0069D9" }}>
            <Button style={buttonStyle} className="rounded-pill" onClick={() => setShow(false)}>Cerrar</Button>
          </Modal.Footer>
        </Modal>

      </div>
    </div>
  );
}
