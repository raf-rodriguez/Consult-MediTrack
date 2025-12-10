import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Table, Button, Card, Container, Row, Col, Modal, Badge } from "react-bootstrap";
import logo from "../../assets/image.png";
import SidebarTop from "../Dashboard/SidebarTop";

export default function AmbulanceEquipment({ ambulance }) {
  const navigate = useNavigate();
  // Renombramos el estado para reflejar que agrupa por fecha Y paramédico
  const [groupedRequisitions, setGroupedRequisitions] = useState({});
  const [show, setShow] = useState(false);
  
  // Guardamos el grupo seleccionado (array de items) en lugar de solo la fecha
  const [selectedGroupItems, setSelectedGroupItems] = useState([]);

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
      // Filtramos por la ambulancia actual
      const filtered = res.data.filter(req => req.ambulance === ambulance);

      const grouped = {};

      filtered.forEach(req => {
        const dateObj = new Date(req.created_at);
        const dateStr = dateObj.toLocaleDateString("es-PR");
        const timeStr = dateObj.toLocaleTimeString("es-PR", { hour: '2-digit', minute: '2-digit' });
        
        // Normalizamos el nombre del paramédico
        const paramedicName = req.paramedic ? req.paramedic.trim() : "Sin Asignar";

        // 🔑 CLAVE ÚNICA: Fecha + Paramédico
        // Esto separa las listas. Si Rafael pidió 2 veces el mismo día, 
        // se agruparán juntas bajo su nombre en esa fecha.
        const uniqueKey = `${dateStr} - ${paramedicName}`;

        if (!grouped[uniqueKey]) {
          grouped[uniqueKey] = {
            date: dateStr,
            time: timeStr, // Guardamos la hora del primer item como referencia
            paramedic: paramedicName,
            items: []
          };
        }
        grouped[uniqueKey].items.push(req);
      });

      // Ordenar: Las fechas más recientes primero
      // Convertimos el objeto a array para poder ordenar
      const sortedGroups = Object.entries(grouped).sort((a, b) => {
         // a[1] y b[1] son los objetos con { items: [...] }
         // Tomamos la fecha de creación del primer item de cada grupo para comparar
         const dateA = new Date(a[1].items[0].created_at);
         const dateB = new Date(b[1].items[0].created_at);
         return dateB - dateA; // Descendente (más nuevo arriba)
      });

      // Convertimos de nuevo a objeto o lo dejamos como array para map.
      // Para facilitar el render, lo guardaré como objeto ordenado (o array de entradas)
      // Pero para mantener compatibilidad con tu estructura, usaré un objeto reconstruido:
      const sortedGroupedObject = {};
      sortedGroups.forEach(([key, val]) => {
        sortedGroupedObject[key] = val;
      });

      setGroupedRequisitions(sortedGroupedObject);
    } catch (err) {
      console.error("Error cargando requisiciones:", err);
    }
  }, [ambulance]);

  useEffect(() => {
    fetchRequisitions();
    const interval = setInterval(fetchRequisitions, 10000);
    return () => clearInterval(interval);
  }, [fetchRequisitions]);

  // Abrir Modal
  const handleView = (groupItems) => {
    setSelectedGroupItems(groupItems);
    setShow(true);
  };

  // Renderizar cada tarjeta de grupo
  const renderCard = (uniqueKey, groupData) => (
    <Card key={uniqueKey} className="mb-3 shadow-sm border-0" style={{ backgroundColor: "#0F304A", border: "1px solid #0069D9" }}>
      <Card.Body className="d-flex flex-column flex-md-row justify-content-between align-items-center">
        
        {/* Información Izquierda: Fecha y Paramédico */}
        <div style={{ color: "#F4F7FA", marginBottom: "10px", marginMdBottom: 0 }}>
          <div className="d-flex align-items-center gap-3 mb-1">
             <h5 className="mb-0 fw-bold text-info">📅 {groupData.date}</h5>
             <span className="text-muted small">({groupData.time})</span>
          </div>
          <div className="fs-5">
             👨‍⚕️ <span className="fw-bold text-white">{groupData.paramedic}</span>
          </div>
          <div className="text-white-50 small mt-1">
             Total equipos: <Badge bg="primary">{groupData.items.length}</Badge>
          </div>
        </div>

        {/* Botón Derecha */}
        <div className="d-flex gap-2 flex-wrap">
          <Button 
            size="sm" 
            style={buttonStyle} 
            className="rounded-pill px-4 py-2" 
            onClick={() => handleView(groupData.items)}
          >
            👁️ Ver Lista
          </Button>
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <div className="d-flex">
      <SidebarTop />

      <div style={{ flexGrow: 1, marginLeft: "220px", backgroundColor: "#0A2A43", minHeight: "100vh", padding: "40px 20px", color: "#F4F7FA" }}>
        
        {/* Fondo Translúcido */}
        <div style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          backgroundImage: `url(${logo})`, backgroundRepeat: "no-repeat", backgroundSize: "45vw",
          backgroundPosition: "center", opacity: 0.05, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none"
        }} />

        <div style={{ position: "fixed", top: 0, left: "220px", width: "40px", height: "100%", background: "linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0))", zIndex: 2, pointerEvents: "none" }} />

        <Container style={{ position: "relative", zIndex: 2 }}>
          <Row className="mb-4">
            <Col>
              <h3 style={{ color: "#0d6efd", fontWeight: "700", marginBottom: "5px" }}>
                🚑 Historial de Requisiciones - <span className="text-white">{ambulance}</span>
              </h3>
              <p style={{ color: "#9aa9cc" }}>
                Agrupado por fecha y paramédico responsable.
              </p>
              <Button style={buttonStyle} className="mb-3 rounded-pill" onClick={() => navigate("/ambulances")}>
                ← Volver a ambulancias
              </Button>
            </Col>
          </Row>

          <Row>
            <Col>
              {Object.keys(groupedRequisitions).length === 0 ? (
                <div className="text-center p-4 rounded-3" style={{ backgroundColor: "rgba(16,23,40,0.8)", border: "1px solid #1e2b4a", color: "#93baf9" }}>
                  <h4>📭 Sin registros</h4>
                  <p className="mb-0">No se han encontrado requisiciones para la unidad <strong>{ambulance}</strong>.</p>
                </div>
              ) : (
                Object.entries(groupedRequisitions).map(([key, data]) => renderCard(key, data))
              )}
            </Col>
          </Row>
        </Container>

        {/* Modal Detalle */}
        <Modal show={show} onHide={() => setShow(false)} size="xl" centered scrollable>
          <Modal.Header closeButton style={{ background: "linear-gradient(90deg, #0d6efd, #6610f2)", color: "#fff" }}>
            <Modal.Title>📦 Detalle de Entrega</Modal.Title>
          </Modal.Header>
          
          <Modal.Body style={{ backgroundColor: "#0A2A43", color: "#F4F7FA", position: "relative" }}>
            {selectedGroupItems.length > 0 ? (
              <Card className="p-3 text-white border-0" style={{ backgroundColor: "transparent" }}>
                
                {/* Cabecera del Modal con datos del grupo */}
                <div className="alert alert-primary d-flex justify-content-between align-items-center text-white" style={{ backgroundColor: "rgba(13, 110, 253, 0.2)", border: "1px solid #0d6efd" }}>
                    <div>
                        <strong>📅 Fecha:</strong> {new Date(selectedGroupItems[0].created_at).toLocaleDateString("es-PR")}
                    </div>
                    <div>
                        <strong>👨‍⚕️ Responsable:</strong> {selectedGroupItems[0].paramedic || "Sin asignar"}
                    </div>
                    <div>
                        <strong>🚑 Unidad:</strong> {ambulance}
                    </div>
                </div>

                <Table bordered hover responsive className="mt-2 text-white" style={{ borderColor: "#444" }}>
                  <thead className="text-center" style={{ backgroundColor: "#0d6efd" }}>
                    <tr>
                      <th style={{ backgroundColor: "#004085", color: "white" }}>Nombre del Equipo</th>
                      <th style={{ backgroundColor: "#004085", color: "white" }}>Categoría</th>
                      <th style={{ backgroundColor: "#004085", color: "white" }}>Cantidad</th>
                      <th style={{ backgroundColor: "#004085", color: "white" }}>Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGroupItems.map((req, index) => (
                      <tr key={req.id || index}>
                        <td>{req.item?.name}</td>
                        <td>
                             <Badge bg="secondary">{req.item?.category || "General"}</Badge>
                        </td>
                        <td className="text-center fw-bold text-warning" style={{ fontSize: "1.1em" }}>
                            {req.quantity} {req.item?.unit || ""}
                        </td>
                        <td className="text-center small text-muted">
                            {new Date(req.created_at).toLocaleTimeString("es-PR", {hour: '2-digit', minute:'2-digit'})}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            ) : <p className="text-center mt-3">Cargando datos...</p>}
          </Modal.Body>
          
          <Modal.Footer style={{ backgroundColor: "#0F304A", borderTop: "1px solid #0069D9" }}>
            <Button style={buttonStyle} className="rounded-pill px-4" onClick={() => setShow(false)}>Cerrar</Button>
          </Modal.Footer>
        </Modal>

      </div>
    </div>
  );
}