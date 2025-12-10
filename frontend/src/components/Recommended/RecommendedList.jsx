// src/components/Recommended/RecommendedCheckList.jsx
import { useState, useEffect, useCallback } from "react";
import { Button, Container, Spinner, Table, Card, Modal } from "react-bootstrap";
import SidebarTop from "../Dashboard/SidebarTop";
import api from "../../services/api";
import logo from "../../assets/image.png";

// import AddRecommendedModal from "./AddRecommendedModal";
import EditRecommendedModal from "./EditRecommendedModal";

export default function RecommendedCheckList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editItem, setEditItem] = useState(null);

  // 🔴 NUEVOS ESTADOS PARA EL MODAL DE ELIMINAR
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // ─────────────────────────────────────────────
  // Cargar recomendaciones
  // ─────────────────────────────────────────────
  const fetchRecommended = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/recommended-inventory/");
      setItems(res.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommended();
  }, [fetchRecommended]);

  // ─────────────────────────────────────────────
  // Actualizar recomendación
  // ─────────────────────────────────────────────
  const handleUpdate = async (id, data) => {
    try {
      await api.put(`/recommended-inventory/${id}/`, data);
      setEditItem(null);
      fetchRecommended();
    } catch {
      alert("Error actualizando");
    }
  };

  // ─────────────────────────────────────────────
  // 🔴 1. FUNCIÓN PARA SOLICITAR ELIMINACIÓN (Abre Modal)
  // ─────────────────────────────────────────────
  const confirmDelete = (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  // ─────────────────────────────────────────────
  // 🔴 2. FUNCIÓN PARA EJECUTAR ELIMINACIÓN (Acción Real)
  // ─────────────────────────────────────────────
  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/recommended-inventory/${deleteId}/`);
      fetchRecommended();
      setShowDeleteModal(false);
      setDeleteId(null);
    } catch (error) {
      console.error("Error al eliminar:", error);
      alert("Error al eliminar la recomendación");
    }
  };

  // ─────────────────────────────────────────────
  // Estilos
  // ─────────────────────────────────────────────
  const styles = {
    mainContainer: {
      flexGrow: 1,
      marginLeft: "220px",
      backgroundColor: "#0A2A43",
      minHeight: "100vh",
      padding: "40px 30px",
      color: "#F4F7FA",
      position: "relative",
      zIndex: 0,
    },
    heading: {
      color: "#4DBFFF",
      fontWeight: "800",
      letterSpacing: "0.5px",
    },
    tableCard: {
      backgroundColor: "#0F304A",
      border: "1px solid #0069D9",
      borderRadius: "12px",
      boxShadow: "0 8px 16px rgba(0, 0, 0, 0.3)",
      overflow: "hidden",
    },
    tableHeader: {
      backgroundColor: "#0069D9",
      color: "#F4F7FA",
      textTransform: "uppercase",
      fontSize: "0.9rem",
      fontWeight: "700",
      letterSpacing: "1px",
      borderBottom: "2px solid #0a58ca",
    },
    tableCell: {
      verticalAlign: "middle",
      padding: "16px 12px",
      borderColor: "#004a99",
    },
    itemName: {
      color: "#4DBFFF",
      fontWeight: "600",
      fontSize: "1.05rem",
    },
    emptyState: {
      padding: "40px",
      textAlign: "center",
      color: "#6c757d",
      fontSize: "1.2rem",
      fontStyle: "italic",
    },
  };

  return (
    <div className="d-flex">
      <SidebarTop />

      <div style={styles.mainContainer}>
        {/* Fondo con logo */}
        <div
          style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            backgroundImage: `url(${logo})`, backgroundRepeat: "no-repeat", backgroundSize: "50%",
            backgroundPosition: "center", opacity: 0.05, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "fixed", top: 0, left: "220px", width: "40px", height: "100%",
            background: "linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0))", zIndex: 2, pointerEvents: "none",
          }}
        />

        <Container style={{ position: "relative", zIndex: 1 }} fluid="md">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 style={styles.heading}>⭐ Recomendaciones de Inventario</h2>
          </div>

          {loading ? (
            <div className="text-center p-5">
                <Spinner animation="border" variant="info" style={{width: '3rem', height: '3rem'}} />
                <p className="mt-3 text-info">Cargando recomendaciones...</p>
            </div>
          ) : (
            <Card style={styles.tableCard}>
              <style type="text/css">
                {`
                  .custom-dark-table-hover tbody tr:hover {
                    background-color: rgba(0, 105, 217, 0.15) !important;
                    transition: background-color 0.2s ease-in-out;
                  }
                `}
              </style>
              <div className="table-responsive">
                <Table bordered hover variant="dark" className="mb-0 custom-dark-table-hover" style={{ backgroundColor: "transparent" }}>
                  <thead>
                    <tr>
                      <th style={styles.tableHeader} className="text-center">#</th>
                      <th style={styles.tableHeader}>Nombre del Artículo</th>
                      <th style={styles.tableHeader}>Categoría</th>
                      <th style={styles.tableHeader} className="text-center">Meta</th>
                      <th style={styles.tableHeader} className="text-center">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id}>
                        <td style={styles.tableCell} className="text-center fw-bold text-white-50">
                          {index + 1}
                        </td>
                        <td style={styles.tableCell}>
                            <span style={styles.itemName}>{item.item_name}</span>
                        </td>
                        <td style={styles.tableCell}>
                            <span className="badge bg-secondary bg-opacity-50 text-wrap" style={{fontSize: '0.9em', fontWeight: 500}}>
                                {item.category}
                            </span>
                        </td>
                        <td style={styles.tableCell} className="text-center">
                            <span className="badge bg-info text-dark fs-6 fw-bold px-3 py-2">
                                {item.recommended_quantity}
                            </span>
                        </td>
                        <td style={styles.tableCell} className="text-center">
                          <div className="d-flex gap-2 justify-content-center">
                            <Button
                              variant="outline-warning"
                              size="sm"
                              className="fw-semibold px-3"
                              onClick={() => setEditItem(item)}
                            >
                              ✏ Editar
                            </Button>

                            {/* 🔴 BOTÓN QUE ABRE EL MODAL NUEVO */}
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="fw-semibold px-3"
                              onClick={() => confirmDelete(item.id)}
                            >
                              🗑 Eliminar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan="5" style={styles.emptyState}>
                          <i className="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>
                          No hay recomendaciones de inventario definidas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card>
          )}
        </Container>
      </div>

      {/* MODAL EDITAR */}
      <EditRecommendedModal
        show={!!editItem}
        item={editItem}
        onHide={() => setEditItem(null)}
        onUpdate={handleUpdate}
      />

      {/* 🔴 3. MODAL DE ELIMINAR (ESTILO PREMIUM) */}
      <Modal 
        show={showDeleteModal} 
        onHide={() => setShowDeleteModal(false)} 
        centered 
        backdrop="static"
        keyboard={false}
      >
        {/* Cabecera Roja de Alerta */}
        <Modal.Header closeButton style={{ background: "linear-gradient(90deg, #dc3545, #b02a37)", border: "none" }}>
          <Modal.Title className="fw-bold text-white">
            ⚠️ Confirmar Eliminación
          </Modal.Title>
        </Modal.Header>

        {/* Cuerpo Oscuro */}
        <Modal.Body className="text-center py-5" style={{ backgroundColor: "#0F2537", color: "#fff" }}>
          <div className="mb-3" style={{ fontSize: "4rem", filter: "drop-shadow(0 0 15px rgba(220, 53, 69, 0.4))" }}>
            🗑️
          </div>

          <h4 className="fw-bold mb-3">¿Eliminar esta recomendación?</h4>
          <p className="text-white-50 px-3">
            Esta acción eliminará la meta de inventario para este artículo permanentemente.
          </p>
          
          <p className="small text-danger fw-bold mt-2 mb-0">
            ⚠️ Esta acción no se puede deshacer.
          </p>
        </Modal.Body>

        {/* Footer con botones estilizados */}
        <Modal.Footer style={{ backgroundColor: "#0F2537", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <Button 
            variant="outline-light" 
            className="rounded-pill px-4 border-0 opacity-75 hover-opacity-100"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancelar
          </Button>

          <Button 
            variant="danger" 
            className="rounded-pill px-4 fw-bold"
            onClick={executeDelete}
            style={{ 
              background: "linear-gradient(90deg, #dc3545, #b02a37)", 
              boxShadow: "0 4px 15px rgba(220, 53, 69, 0.5)", 
              border: "none"
            }}
          >
            Sí, Eliminar
          </Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
}