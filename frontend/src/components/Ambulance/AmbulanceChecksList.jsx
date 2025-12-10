import { useEffect, useState, useCallback } from "react";
import { Table, Button, Card, Modal, Container } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../../assets/image.png";
import SidebarTop from "../Dashboard/SidebarTop";

export default function AmbulanceChecksList() {
  const { unit } = useParams();
  const navigate = useNavigate();
  const [checks, setChecks] = useState([]);
  const [selectedCheck, setSelectedCheck] = useState(null);
  
  // Modales
  const [showModal, setShowModal] = useState(false); // Modal de "Ver Detalles"
  const [showDeleteModal, setShowDeleteModal] = useState(false); // Modal Eliminar
  const [checkToDelete, setCheckToDelete] = useState(null); // ID para borrar

  const fetchChecks = useCallback(async () => {
    try {
      const res = await api.get("/ambulance-checks/");
      setChecks(res.data.filter((c) => c.ambulance === unit));
    } catch (err) {
      console.error("Error cargando chequeos:", err);
    }
  }, [unit]);

  useEffect(() => {
    fetchChecks();
    const interval = setInterval(fetchChecks, 10000);
    return () => clearInterval(interval);
  }, [fetchChecks]);

  const openCheck = (id) => {
    const data = checks.find((c) => c.id === id);
    setSelectedCheck(data);
    setShowModal(true);
  };

  // 1️⃣ Paso 1: Abrir modal de confirmación
  const confirmDelete = (id) => {
    setCheckToDelete(id);
    setShowDeleteModal(true);
  };

  // 2️⃣ Paso 2: Ejecutar la eliminación
  const executeDelete = async () => {
    if (!checkToDelete) return;
    try {
      await api.delete(`/ambulance-checks/${checkToDelete}/`);
      setShowDeleteModal(false); 
      setShowModal(false);
      setCheckToDelete(null);
      fetchChecks();
    } catch (err) {
      console.error(err);
      alert("❌ Error eliminando");
    }
  };

  // -------------------------------
  // ✅ GENERAR PDF
  // -------------------------------
  const downloadPDF = () => {
    if (!selectedCheck) return;

    const doc = new jsPDF("p", "mm", "letter");
    doc.setFont("helvetica", "normal");

    const headerImg = new Image();
    headerImg.src = logo;

    headerImg.onload = () => {
      doc.addImage(headerImg, "PNG", 10, 10, 40, 25);
      doc.setFontSize(18);
      doc.text("CONSULT MEDICAL — Hoja de Chequeo", 120, 20, { align: "center" });

      let y = 40;

      // ✅ Información General
      doc.setFontSize(14);
      doc.text("Información General", 14, y);
      y += 7;

      const generalData = [
        ["Fecha", selectedCheck.date],
        ["Ambulancia", selectedCheck.ambulance],
        ["Turno", selectedCheck.shift],
        ["Millaje", selectedCheck.millage],
        ["Combustible", selectedCheck.combustible],
        ["Oxígeno M", selectedCheck.oxigeno_m],
        ["Oxígeno D", selectedCheck.oxigeno_d],
        ["Observaciones", selectedCheck.observaciones || "-"],
      ];

      doc.setFontSize(11);
      generalData.forEach(([label, value]) => {
        doc.text(`${label}: ${value}`, 14, y);
        y += 5;
      });

      y += 10;

      // ✅ Staff
      doc.setFontSize(14);
      doc.text("Staff", 14, y);
      y += 7;

      const staff1 = selectedCheck.staff?.split(",")[0] || "";
      const staff2 = selectedCheck.staff2 || selectedCheck.staff?.split(",")[1] || "";

      doc.setFontSize(11);
      doc.text(`Staff 1: ${staff1}`, 14, y);
      y += 5;

      if (selectedCheck.firma_staff1) {
        doc.addImage(selectedCheck.firma_staff1, "PNG", 14, y, 50, 20);
        y += 25;
      }

      if (staff2) {
        doc.text(`Staff 2: ${staff2}`, 14, y);
        y += 5;

        if (selectedCheck.firma_staff2) {
          doc.addImage(selectedCheck.firma_staff2, "PNG", 14, y, 50, 20);
          y += 25;
        }
      }

      y += 10;

      sections.forEach((section) => {
        const sectionData = selectedCheck[section] || {};
        const rows = Object.entries(sectionData).map(([k, v]) => [
          k.replaceAll("_", " "),
          String(v),
        ]);

        if (rows.length > 0) {
          autoTable(doc, {
            startY: y,
            head: [[section.replace("seccion_", "").toUpperCase(), "Valor"]],
            body: rows,
            theme: "grid",
            headStyles: { fillColor: [13, 110, 253] },
          });

          y = doc.lastAutoTable.finalY + 8;
        }
      });

      doc.save(`Chequeo_${selectedCheck.ambulance}_${selectedCheck.date}.pdf`);
    };
  };

  const sections = [
    "seccion_vehiculo",
    "seccion_medical_equipment",
    "seccion_equipo",
    "seccion_inmovilizacion",
    "seccion_canalizacion",
    "seccion_oxigeno_airway",
    "seccion_medicamentos",
    "seccion_miscelaneos",
    "seccion_entubacion"
  ];

  const buttonStyle = {
    background: "linear-gradient(90deg, #0069D9, #0A2A43)",
    color: "#F4F7FA",
    border: "none",
    fontWeight: 600,
  };

  const deleteBtnStyle = {
    background: "linear-gradient(90deg, #dc3545, #b02a37)",
    color: "#fff",
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
          position: "relative",
          zIndex: 0,
        }}
      >
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

        <Container style={{ position: "relative", zIndex: 1 }}>
          <h3 className="text-primary fw-bold mb-4">🚑 Chequeos — Unidad {unit}</h3>

          <Button
            style={buttonStyle}
            className="mb-3 rounded-pill"
            onClick={() => navigate("/ambulances")}
          >
            ← Volver a ambulancias
          </Button>

          {checks.length === 0 ? (
            <Card className="p-3 text-center" style={{ backgroundColor: "#0F304A", border: "1px solid #0069D9" }}>
              No hay chequeos para esta unidad
            </Card>
          ) : (
            checks.map((c) => (
              <Card
                key={c.id}
                className="mb-2 p-3 shadow-sm"
                style={{ backgroundColor: "#0F304A", border: "1px solid #0069D9" }}
              >
                <div className="d-flex justify-content-between flex-wrap text-white">
                  <div>
                    📅 <b>{c.date}</b> — 👨‍⚕️ {c.staff}
                  </div>
                  <div className="d-flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      style={buttonStyle}
                      className="rounded-pill px-3"
                      onClick={() => openCheck(c.id)}
                    >
                      👁️ Ver
                    </Button>
                    <Button
                      size="sm"
                      style={deleteBtnStyle}
                      className="rounded-pill px-3"
                      onClick={() => confirmDelete(c.id)}
                    >
                      🗑️ Eliminar
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </Container>

        {/* ✅ MODAL VER CHEQUEO */}
        <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg" scrollable>
          <Modal.Header closeButton style={{ backgroundColor: "#0d6efd", color: "#fff" }}>
            <Modal.Title>Hoja de Chequeo — {unit}</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ backgroundColor: "#0A2A43", color: "#F4F7FA" }}>
            {selectedCheck && (
              <div>
                <div className="text-center mb-3">
                  <img src={logo} style={{ width: 100, opacity: 0.4 }} alt="" />
                  <h4 className="fw-bold mt-2">CONSULT MEDICAL — HOJA DE CHEQUEO</h4>
                </div>

                {/* Info General */}
                <Card className="mb-3 p-3 text-white" style={{ background: "#0F304A", border: "1px solid #0d6efd" }}>
                  <h5 className="text-info fw-bold">✅ Información General</h5>
                  <p><b>Fecha:</b> {selectedCheck.date}</p>
                  <p><b>Ambulancia:</b> {selectedCheck.ambulance}</p>
                  <p><b>Observaciones:</b> {selectedCheck.observaciones ?? "-"}</p>
                </Card>

                {/* 👇 AQUÍ ESTÁ EL USO DE TABLE QUE FALTABA 👇 */}
                {sections.map((section) => (
                  <Card key={section} className="mb-2 p-2" style={{ background: "#0F304A", border: "1px solid #0069D9" }}>
                    <h6 className="text-info">
                      {section.replace("seccion_", "").replace("_", " ").toUpperCase()}
                    </h6>

                    <Table bordered size="sm" responsive className="mb-0" style={{ color: "#F4F7FA" }}>
                      <tbody>
                        {Object.entries(selectedCheck[section] || {}).map(([k, v]) => (
                          <tr key={k}>
                            <td>{k.replaceAll("_", " ")}</td>
                            <td>{String(v)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card>
                ))}
                {/* 👆 FIN DEL USO DE TABLE 👆 */}
                
              </div>
            )}
          </Modal.Body>
          <Modal.Footer style={{ background: "#0F304A" }}>
            <Button style={buttonStyle} className="rounded-pill" onClick={() => setShowModal(false)}>Cerrar</Button>
            <Button style={buttonStyle} className="rounded-pill" onClick={downloadPDF}>📄 Descargar PDF</Button>
          </Modal.Footer>
        </Modal>

        {/* 🔴 MODAL DE ELIMINAR (ESTILO PREMIUM) */}
        <Modal 
          show={showDeleteModal} 
          onHide={() => setShowDeleteModal(false)} 
          centered 
          backdrop="static"
          keyboard={false}
        >
          <Modal.Header closeButton style={{ background: "linear-gradient(90deg, #dc3545, #8a1c2a)", border: "none" }}>
            <Modal.Title className="fw-bold text-white">
              ⚠️ Confirmar Eliminación
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="text-center py-5" style={{ backgroundColor: "#0F2537", color: "#fff" }}>
            <div className="mb-3" style={{ fontSize: "4rem", filter: "drop-shadow(0 0 15px rgba(220, 53, 69, 0.4))" }}>
              🗑️
            </div>

            <h4 className="fw-bold mb-3">¿Eliminar este chequeo?</h4>
            <p className="text-white-50 px-4">
              Estás a punto de borrar permanentemente el registro de inspección seleccionado.
            </p>

            <div className="alert alert-danger d-inline-block mt-2 px-4 py-2" style={{ backgroundColor: "rgba(220, 53, 69, 0.1)", border: "1px solid #dc3545", color: "#ffcccc" }}>
               <strong>ID Registro:</strong> {checkToDelete}
            </div>
            
            <p className="small text-danger fw-bold mt-3 mb-0">
              ⚠️ Esta acción no se puede deshacer.
            </p>
          </Modal.Body>

          <Modal.Footer style={{ backgroundColor: "#0F2537", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <Button 
              variant="outline-light" 
              className="rounded-pill px-4 border-0 opacity-75"
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
    </div>
  );
}