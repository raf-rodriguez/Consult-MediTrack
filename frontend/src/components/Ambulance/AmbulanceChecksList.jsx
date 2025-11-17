// Ver la hoja de chequeo paguina principal

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
  const [showModal, setShowModal] = useState(false);

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

  const deleteCheck = async (id) => {
    if (!window.confirm("⚠️ ¿Confirmar eliminación?")) return;
    try {
      await api.delete(`/ambulance-checks/${id}/`);
      setShowModal(false);
      fetchChecks();
    } catch (err) {
      alert("❌ Error eliminando");
    }
  };

  // -------------------------------
  // ✅ GENERAR PDF
  // -------------------------------
  const downloadPDF = () => {
    if (!selectedCheck) return;

    const doc = new jsPDF("p", "mm", "letter");

    // ✅ Usa fuente estándar "Helvetica" (sí soporta acentos en jsPDF)
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

      // ✅ Staff y firmas
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


  // ✅ LISTA DE SECCIONES
  const sections = [
    "seccion_vehiculo",
    "seccion_vitales",
    "seccion_inmovilizacion",
    "seccion_suministros",
    "seccion_miscelaneos",
    "seccion_canalizacion",
    "seccion_ventilacion_monitor",
    "seccion_airway",
    "seccion_bulto_trauma",
    "seccion_entubacion",
    "seccion_medicamentos",
  ];

  const buttonStyle = {
    background: "linear-gradient(90deg, #0069D9, #0A2A43)",
    color: "#F4F7FA",
    border: "none",
    fontWeight: 600,
  };

  // ✅ RETURN PRINCIPAL
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
                      className="rounded-pill"
                      onClick={() => openCheck(c.id)}
                    >
                      👁️ Ver
                    </Button>
                    <Button
                      size="sm"
                      style={{ ...buttonStyle, background: "#dc3545" }}
                      className="rounded-pill"
                      onClick={() => deleteCheck(c.id)}
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

                {/* ✅ Información General */}
                <Card className="mb-3 p-3 text-white" style={{ background: "#0F304A", border: "1px solid #0d6efd" }}>
                  <h5 className="text-info fw-bold">✅ Información General</h5>
                  <p><b>Fecha:</b> {selectedCheck.date}</p>
                  <p><b>Ambulancia:</b> {selectedCheck.ambulance}</p>
                  <p><b>Turno:</b> {selectedCheck.shift}</p>
                  <p><b>Millage:</b> {selectedCheck.millage}</p>
                  <p><b>Combustible:</b> {selectedCheck.combustible}</p>
                  <p><b>Oxígeno M:</b> {selectedCheck.oxigeno_m}</p>
                  <p><b>Oxígeno D:</b> {selectedCheck.oxigeno_d}</p>
                  <p><b>Observaciones:</b> {selectedCheck.observaciones ?? "-"}</p>
                </Card>

                {/* ✅ STAFF */}
                <Card className="mb-3 p-3 text-white" style={{ background: "#0F304A", border: "1px solid #0d6efd" }}>
                  <h5 className="text-info fw-bold">👥 Staff</h5>

                  <p><b>Staff 1:</b> {selectedCheck.staff}</p>
                  {selectedCheck.firma_staff1 && (
                    <img
                      src={selectedCheck.firma_staff1}
                      alt="Firma 1"
                      style={{ width: 180, border: "1px solid #fff", background: "#fff", padding: 5 }}
                    />
                  )}

                  {selectedCheck.staff2 && (
                    <>
                      <p className="mt-3"><b>Staff 2:</b> {selectedCheck.staff2}</p>
                      {selectedCheck.firma_staff2 && (
                        <img
                          src={selectedCheck.firma_staff2}
                          alt="Firma 2"
                          style={{ width: 180, border: "1px solid #fff", background: "#fff", padding: 5 }}
                        />
                      )}
                    </>
                  )}
                </Card>

                {/* ✅ Inventario */}
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
              </div>
            )}
          </Modal.Body>

          <Modal.Footer style={{ background: "#0F304A" }}>
            <Button style={buttonStyle} className="rounded-pill" onClick={() => setShowModal(false)}>
              Cerrar
            </Button>
            <Button style={buttonStyle} className="rounded-pill" onClick={downloadPDF}>
              📄 Descargar PDF
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
}
