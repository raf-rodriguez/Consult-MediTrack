import { useEffect, useState } from "react";
import axios from "../../services/api";
import { Table, Spinner, Container, Badge, Button } from "react-bootstrap";
import SidebarTop from "../Dashboard/SidebarTop";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../../assets/image.png";

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get("/activity-log/");
        setLogs(res.data);
      } catch (err) {
        console.error("Error al cargar logs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const colorByAction = (action) => {
    switch (action) {
      case "CREATE":
        return "success";
      case "UPDATE":
        return "warning";
      case "DELETE":
        return "danger";
      case "TRANSFER":
        return "info";
      default:
        return "secondary";
    }
  };

  // 📄 ➜ EXPORTAR PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();

    // Header con logo
    doc.addImage(logo, "PNG", 10, 8, 18, 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Reporte — Registro de Actividades", 35, 16);

    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 35, 23);

    // Tabla
    const rows = logs.map((log) => [
      new Date(log.created_at).toLocaleString(),
      log.user || "Desconocido",
      log.action,
      log.entity,
      log.description,
    ]);

    autoTable(doc, {
      startY: 30,
      head: [["Fecha", "Usuario", "Acción", "Entidad", "Descripción"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [0, 80, 155], textColor: 255 },
      styles: { fontSize: 9 },
      columnStyles: {
        4: { cellWidth: 90 }, // descripción ancha
      },
    });

    doc.save("Registro_Actividades.pdf");
  };

  return (
    <div className="d-flex">
      <SidebarTop />

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

        <div
          style={{
            flexGrow: 1,
            marginLeft: "220px",
            backgroundColor: "#0A2A43",
            minHeight: "100vh",
            padding: "40px 20px",
            color: "#F4F7FA",
          }}
        >
          <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="fw-bold" style={{ color: "#4DBFFF" }}>
                🕓 Registro de Actividades
              </h2>

              <Button
                style={{
                  background: "linear-gradient(90deg, #0069D9, #0A2A43)",
                  border: "none",
                  fontWeight: "600",
                }}
                onClick={handleExportPDF}
              >
                📄 Descargar PDF
              </Button>
            </div>

            {loading ? (
              <div className="text-center mt-5">
                <Spinner animation="border" variant="info" /> Cargando registros...
              </div>
            ) : logs.length === 0 ? (
              <p className="text-center text-muted">No hay registros recientes.</p>
            ) : (
              <Table striped bordered hover variant="dark" responsive>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>Acción</th>
                    <th>Entidad</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.created_at).toLocaleString()}</td>
                      <td>{log.user || "Desconocido"}</td>
                      <td>
                        <Badge bg={colorByAction(log.action)}>{log.action}</Badge>
                      </td>
                      <td>{log.entity}</td>
                      <td>{log.description}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Container>
        </div>
      </div>
      );
}
