// Hoja de chqueo

import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Form, Button, Modal } from "react-bootstrap";
import axios from "axios";
import SignaturePad from "signature_pad";

import recommendedInventory from "./recommendedInventory";
import initialFormStateBase from "./initialFormstate";

const SECTION_LABELS = {
  seccion_vehiculo: "Vehículo",
  seccion_vitales: "Equipo de Vitales",
  seccion_inmovilizacion: "Inmovilización",
  seccion_suministros: "Suministros",
  seccion_miscelaneos: "Misceláneos",
  seccion_canalizacion: "Canalización",
  seccion_ventilacion_monitor: "Ventilación y Monitor",
  seccion_airway: "Airway",
  seccion_bulto_trauma: "Bulto de Trauma",
  seccion_entubacion: "Entubación",
  seccion_medicamentos: "Medicamentos",
};

const AMBULANCIAS = ["CM1", "CM2", "CM3", "S56"];
const STAFF_LIST = [
  "A. Rodriguez",
  "R. Rodriguez",
  "K. Colon",
  "J. Ortiz",
  "R. Ruben",
];
const TURNOS = ["6-2", "7-3", "8-4", "9-5", "12-8", "1-10", "3-11", "4-12"];

const initialFormState = {
  ...initialFormStateBase,
  staff_1: "",
  staff_2: "",
  signature_staff_1: "",
  signature_staff_2: "",
};

// --- Small responsive helpers ------------------------------------------------
const cardMaxWidth = 1024; // a bit wider to breathe on tablets/desktops
const padHeight = 180; // taller touch area for phones

function fitCanvasToContainer(canvas, height = padHeight) {
  // Respect parent width
  const parent = canvas.parentElement;
  const width = parent.clientWidth;

  // Account for device pixel ratio to render sharp lines on mobile
  const dpr = Math.max(window.devicePixelRatio || 1, 1);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
}

// -----------------------------------------------------
// QR simple sin librerías (placeholder visual)
// -----------------------------------------------------
function QRCodeSVG({ value, size = 200 }) {
  const qrSize = 25;
  const cellSize = size / qrSize;
  const pattern = [];

  for (let y = 0; y < qrSize; y++) {
    for (let x = 0; x < qrSize; x++) {
      const hash = (value.charCodeAt(x % value.length) + x + y * qrSize) % 2;
      if (
        hash === 0 ||
        (x < 7 && y < 7) ||
        (x > qrSize - 8 && y < 7) ||
        (x < 7 && y > qrSize - 8)
      ) {
        pattern.push({ x, y });
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="QR">
      <rect width={size} height={size} />
      {pattern.map((cell, i) => (
        <rect
          key={i}
          x={cell.x * cellSize}
          y={cell.y * cellSize}
          width={cellSize}
          height={cellSize}
        />
      ))}
    </svg>
  );
}

export default function AmbulanceCheckForm() {
  const location = useLocation();

  const [form, setForm] = useState({
    ...initialFormState,
    date: new Date().toISOString().split("T")[0],
  });

  const [selectedSection, setSelectedSection] = useState("");
  const [showIssuesModal, setShowIssuesModal] = useState(false);
  const [issues, setIssues] = useState([]);

  const [showSignModal, setShowSignModal] = useState(false);

  const [ambulanceLocked, setAmbulanceLocked] = useState(false);
  
  const canvas1Ref = useRef(null);
  const canvas2Ref = useRef(null);
  const pad1Ref = useRef(null);
  const pad2Ref = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const amb = params.get("ambulancia");
    if (amb && AMBULANCIAS.includes(amb)) {
      setForm((prev) => ({ ...prev, ambulance: amb }));
      setAmbulanceLocked(true);
    }
  }, [location]);

  // SignaturePads: create + keep crisp on resize/orientation change
  useEffect(() => {
    if (!showSignModal) return;

    const setupPad = (canvasRef, padRef) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      fitCanvasToContainer(canvas);
      const pad = new SignaturePad(canvas, {
        backgroundColor: "rgba(255,255,255,1)",
        penColor: "black",
        minWidth: 0.8,
        maxWidth: 2.5,
      });
      padRef.current = pad;
    };

    setupPad(canvas1Ref, pad1Ref);
    setupPad(canvas2Ref, pad2Ref);

    const onResize = () => {
      // Preserve strokes across resizes/orientation changes
      if (pad1Ref.current && canvas1Ref.current) {
        const data1 = pad1Ref.current.toData();
        fitCanvasToContainer(canvas1Ref.current);
        pad1Ref.current.clear();
        pad1Ref.current.fromData(data1);
      }
      if (pad2Ref.current && canvas2Ref.current) {
        const data2 = pad2Ref.current.toData();
        fitCanvasToContainer(canvas2Ref.current);
        pad2Ref.current.clear();
        pad2Ref.current.fromData(data2);
      }
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [showSignModal]);

  const handleSectionChange = (section, key, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const handleBasicChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectAll = () => {
    if (!selectedSection) return;

    const recommended = recommendedInventory[selectedSection] || {};
    const updated = {};

    Object.keys(recommended).forEach((k) => {
      const recVal = recommended[k];
      if (typeof recVal === "boolean") updated[k] = true;
      else updated[k] = recVal;
    });

    setForm((prev) => ({ ...prev, [selectedSection]: updated }));
  };

  const clearSection = () => {
    if (!selectedSection) return;

    const recommended = recommendedInventory[selectedSection] || {};
    const cleared = {};

    Object.keys(recommended).forEach((k) => {
      const recVal = recommended[k];
      if (typeof recVal === "boolean") cleared[k] = false;
      else if (typeof recVal === "number") cleared[k] = 0;
      else cleared[k] = "";
    });

    setForm((prev) => ({ ...prev, [selectedSection]: cleared }));
  };

  const validateBeforeSubmit = () => {
    if (!form.ambulance) return "Selecciona la ambulancia.";
    if (!form.staff_1 || !form.staff_2) return "Debes indicar Staff 1 y Staff 2.";
    if (!form.signature_staff_1 || !form.signature_staff_2) return "Ambos deben firmar.";
    return null;
  };

  const getDiscrepancies = () => {
    const problems = [];

    Object.keys(recommendedInventory).forEach((section) => {
      const recommended = recommendedInventory[section] || {};
      const actual = form[section] || {};

      Object.keys(recommended).forEach((itemKey) => {
        const recVal = recommended[itemKey];
        const val = actual[itemKey];

        if (typeof recVal === "boolean" && !val)
          problems.push({ section, message: `Falta ${itemKey.replaceAll("_", " ")}` });

        if (typeof recVal === "number" && (val ?? 0) < recVal)
          problems.push({
            section,
            message: `${itemKey.replaceAll("_", " ")} tiene ${val ?? 0} (debería ${recVal})`,
          });

        if (typeof recVal === "string" && !val)
          problems.push({ section, message: `${itemKey.replaceAll("_", " ")} sin valor` });
      });
    });

    return problems;
  };

  const doSubmit = async () => {
    try {
      const payload = {
        ...form,
        staff: `${form.staff_1}${form.staff_2 ? `, ${form.staff_2}` : ""}`,
        staff2: form.staff_2,
        firma_staff1: form.signature_staff_1,
        firma_staff2: form.signature_staff_2,
      };

      delete payload.staff_1;
      delete payload.signature_staff_1;
      delete payload.signature_staff_2;

      await axios.post("http://localhost:8000/api/ambulance-checks/", payload);

      alert("✅ Chequeo guardado correctamente.");

      setForm({ ...initialFormState, date: new Date().toISOString().split("T")[0] });
      setSelectedSection("");
    } catch (e) {
      console.error(e);
      alert("❌ Error al guardar chequeo");
    }
  };

  const handleSubmit = () => {
    const err = validateBeforeSubmit();
    if (err) {
      alert(err);
      return;
    }

    const diffs = getDiscrepancies();

    if (diffs.length > 0) {
      setIssues(diffs);
      setShowIssuesModal(true);
    } else {
      doSubmit();
    }
  };

  const openSignModal = () => setShowSignModal(true);
  const closeSignModal = () => setShowSignModal(false);

  const clearSig1 = () => pad1Ref.current?.clear();
  const clearSig2 = () => pad2Ref.current?.clear();

  const saveSignatures = () => {
    if (pad1Ref.current?.isEmpty() || pad2Ref.current?.isEmpty()) {
      alert("Ambos deben firmar.");
      return;
    }

    const sig1 = pad1Ref.current.toDataURL("image/png");
    const sig2 = pad2Ref.current.toDataURL("image/png");

    setForm((p) => ({ ...p, signature_staff_1: sig1, signature_staff_2: sig2 }));
    setShowSignModal(false);
  };

  const progress = (() => {
    let total = 0;
    let ok = 0;

    Object.keys(recommendedInventory).forEach((section) => {
      const rec = recommendedInventory[section] || {};
      const val = form[section] || {};

      Object.keys(rec).forEach((k) => {
        total++;
        const rv = rec[k];
        const vv = val[k];

        if (typeof rv === "boolean" && vv === true) ok++;
        if (typeof rv === "number" && (vv ?? 0) >= rv) ok++;
        if (typeof rv === "string" && vv) ok++;
      });
    });

    const pct = total ? Math.round((ok / total) * 100) : 0;
    return { total, ok, pct };
  })();

  const buttonStyle = {
    background: "linear-gradient(90deg, #0069D9, #0A2A43)",
    color: "#F4F7FA",
    border: "none",
    fontWeight: 600,
    touchAction: "manipulation",
  };

  return (
    <div className="container-fluid p-2 p-sm-3 p-md-4" style={{ backgroundColor: "#000511" }}>
      {/* Outer wrapper keeps things centered on wide screens but full‑width on phones */}
      <div className="mx-auto" style={{ maxWidth: cardMaxWidth }}>
        <div
          className="card shadow-lg border-0 rounded-4 w-100"
          style={{
            backgroundColor: "rgba(15,48,74,0.95)",
            border: "1px solid #0d6efd",
          }}
        >
          {/* HEADER */}
          <div
            className="card-header text-white rounded-top-4 py-3"
            style={{ background: "linear-gradient(90deg, #0d6efd, #6610f2)" }}
          >
            <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2 gap-md-3">
              <h5 className="mb-0 fw-bold">🚑 Chequeo Ambulancia</h5>

              <div className="w-100 w-md-auto">
                <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.pct}>
                  <div className="progress-bar" style={{ width: `${progress.pct}%` }}>
                    {progress.ok}/{progress.total} ({progress.pct}%)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BODY */}
          <div className="card-body p-3 p-sm-4">
            {/* Datos Básicos */}
            <div className="row g-3 mb-3 mb-md-4">
              <div className="col-6 col-md-3 col-lg-2">
                <Form.Label className="text-white fw-semibold small small-md">Fecha</Form.Label>
                <Form.Control
                  type="date"
                  size="sm"
                  className="bg-dark text-white border-secondary"
                  value={form.date}
                  onChange={(e) => handleBasicChange("date", e.target.value)}
                />
              </div>

              <div className="col-6 col-md-3 col-lg-2">
                <Form.Label className="text-white fw-semibold small">Ambulancia</Form.Label>
                <Form.Select
                  size="sm"
                  className="bg-dark text-white border-secondary"
                  value={form.ambulance}
                  onChange={(e) => {
                    if (!ambulanceLocked) handleBasicChange("ambulance", e.target.value);
                  }}
                  disabled={ambulanceLocked}   // ✅ BLOQUEADO si entró por QR
                >
                  <option value="">Selecciona</option>
                  {AMBULANCIAS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </Form.Select>
              </div>

              {/* STAFF */}
              <div className="col-6 col-md-3 col-lg-2">
                <Form.Label className="text-white fw-semibold small">Staff 1 (obligatorio)</Form.Label>
                <Form.Select
                  size="sm"
                  className="bg-dark text-white border-secondary mb-2"
                  value={form.staff_1}
                  onChange={(e) => handleBasicChange("staff_1", e.target.value)}
                >
                  <option value="">Selecciona</option>
                  {STAFF_LIST.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Form.Select>

                <Form.Label className="text-white fw-semibold small">Staff 2 (obligatorio)</Form.Label>
                <Form.Select
                  size="sm"
                  className="bg-dark text-white border-secondary"
                  value={form.staff_2}
                  onChange={(e) => handleBasicChange("staff_2", e.target.value)}
                >
                  <option value="">Selecciona</option>
                  {STAFF_LIST.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Form.Select>

                <Button style={buttonStyle} size="sm" className="mt-2 w-100 w-sm-auto" onClick={() => setShowSignModal(true)}>
                  ✍️ Firmar
                </Button>

                {(!form.signature_staff_1 || !form.signature_staff_2) && (
                  <div className="text-warning small mt-1">Ambos deben firmar.</div>
                )}
              </div>

              {/* TURNO + MILLAGE */}
              <div className="col-6 col-md-3 col-lg-2">
                <Form.Label className="text-white fw-semibold small">Turno</Form.Label>
                <Form.Select
                  size="sm"
                  className="bg-dark text-white border-secondary"
                  value={form.shift}
                  onChange={(e) => handleBasicChange("shift", e.target.value)}
                >
                  <option value="">Selecciona</option>
                  {TURNOS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </Form.Select>

                <Form.Label className="text-white fw-semibold small mt-2">Millage</Form.Label>
                <Form.Control
                  type="number"
                  size="sm"
                  inputMode="numeric"
                  className="bg-dark text-white border-secondary"
                  value={form.millage}
                  onChange={(e) => handleBasicChange("millage", Number(e.target.value))}
                />
              </div>

              {/* COMBUSTIBLE + O2 */}
              <div className="col-6 col-md-3 col-lg-2">
                <Form.Label className="text-white fw-semibold small">Combustible</Form.Label>
                <Form.Select
                  size="sm"
                  className="bg-dark text-white border-secondary"
                  value={form.combustible}
                  onChange={(e) => handleBasicChange("combustible", e.target.value)}
                >
                  <option>Full</option>
                  <option>3/4</option>
                  <option>1/2</option>
                  <option>1/4</option>
                  <option>Empty</option>
                </Form.Select>

                <Form.Label className="text-white fw-semibold small mt-2">Oxígeno M</Form.Label>
                <Form.Control
                  type="number"
                  size="sm"
                  inputMode="numeric"
                  className="bg-dark text-white border-secondary"
                  value={form.oxigeno_m}
                  onChange={(e) => handleBasicChange("oxigeno_m", Number(e.target.value))}
                />

                <Form.Label className="text-white fw-semibold small mt-2">Oxígeno D</Form.Label>
                <Form.Control
                  type="number"
                  size="sm"
                  inputMode="numeric"
                  className="bg-dark text-white border-secondary"
                  value={form.oxigeno_d}
                  onChange={(e) => handleBasicChange("oxigeno_d", Number(e.target.value))}
                />
              </div>
            </div>

            {/* Selección de Sección */}
            <div className="mb-3">
              <Form.Label className="text-white fw-semibold">Sección</Form.Label>
              <Form.Select
                size="lg"
                className="bg-dark text-white border-secondary"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
              >
                <option value="">-- Selecciona sección --</option>
                {Object.keys(SECTION_LABELS).map((key) => (
                  <option key={key} value={key}>
                    {SECTION_LABELS[key]}
                  </option>
                ))}
              </Form.Select>
            </div>

            {/* Botones de Sección */}
            {selectedSection && (
              <div className="d-flex flex-column flex-sm-row gap-2 mb-3">
                <Button style={buttonStyle} size="sm" className="w-100 w-sm-auto" onClick={handleSelectAll}>
                  ✓ Marcar Todo OK
                </Button>
                <Button variant="outline-danger" size="sm" className="w-100 w-sm-auto" onClick={clearSection}>
                  🗑️ Limpiar Sección
                </Button>
              </div>
            )}

            {/* Items */}
            {selectedSection && (
              <div className="bg-dark p-2 p-sm-3 rounded-3 border border-primary">
                <div className="row g-2 g-sm-3">
                  {Object.keys(recommendedInventory[selectedSection]).map((itemKey) => {
                    const recVal = recommendedInventory[selectedSection][itemKey];
                    const val = (form[selectedSection] || {})[itemKey];

                    const label = itemKey.replaceAll("_", " ").toUpperCase();
                    const isBool = typeof recVal === "boolean";
                    const isNum = typeof recVal === "number";
                    const isStr = typeof recVal === "string";

                    return (
                      <div key={itemKey} className="col-12 col-sm-6 col-lg-4">
                        <div className="p-2 rounded-2" style={{ backgroundColor: "#0F304A", border: "1px solid #0069D9" }}>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="text-white" style={{ fontSize: 13 }}>{label}</span>
                            <span className="text-info small">
                              {isNum ? `Rec. ${recVal}` : isStr ? recVal : ""}
                            </span>
                          </div>

                          {isBool && (
                            <Form.Check
                              type="checkbox"
                              className="text-white"
                              checked={!!val}
                              onChange={(e) => handleSectionChange(selectedSection, itemKey, e.target.checked)}
                              label={val ? "✅ Verificado" : "⬜ Pendiente"}
                            />
                          )}

                          {isNum && (
                            <Form.Control
                              type="number"
                              min="0"
                              size="sm"
                              inputMode="numeric"
                              className="bg-dark text-white border-secondary"
                              value={val ?? 0}
                              onChange={(e) => handleSectionChange(selectedSection, itemKey, Number(e.target.value))}
                            />
                          )}

                          {isStr && (
                            <Form.Select
                              size="sm"
                              className="bg-dark text-white border-secondary"
                              value={val ?? ""}
                              onChange={(e) => handleSectionChange(selectedSection, itemKey, e.target.value)}
                            >
                              <option value="">— Selecciona —</option>
                              <option value="Normal">Normal</option>
                              <option value="Bajo">Bajo</option>
                              <option value="Alto">Alto</option>
                            </Form.Select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div className="mt-3">
              <Form.Label className="text-white fw-semibold">Observaciones</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                className="bg-dark text-white border-secondary"
                value={form.observaciones}
                onChange={(e) => handleBasicChange("observaciones", e.target.value)}
              />
            </div>

            {/* GUARDAR */}
            <div className="d-grid mt-3 mt-md-4">
              <Button style={buttonStyle} size="lg" onClick={handleSubmit} className="py-2 py-md-2">
                💾 Guardar Chequeo
              </Button>
            </div>
          </div>
        </div>

        {/* MODAL: Discrepancias */}
        <Modal show={showIssuesModal} onHide={() => setShowIssuesModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>⚠️ Equipos Faltantes o Incompletos</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {issues.map((d, i) => (
              <p key={i}>
                • <strong>{SECTION_LABELS[d.section]}</strong>: {d.message}
              </p>
            ))}
            <p>¿Deseas guardar de todos modos?</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowIssuesModal(false)}>
              Revisar
            </Button>
            <Button variant="primary" onClick={() => { setShowIssuesModal(false); doSubmit(); }}>
              Guardar igualmente
            </Button>
          </Modal.Footer>
        </Modal>

        {/* MODAL: Firmas */}
        <Modal show={showSignModal} onHide={closeSignModal} centered size="lg">
          <Modal.Header
            closeButton
            className="text-white"
            style={{ background: "linear-gradient(90deg, #0d6efd, #6610f2)" }}
          >
            <Modal.Title>✍️ Firmas del Chequeo</Modal.Title>
          </Modal.Header>

          <Modal.Body style={{ backgroundColor: "#0A2A43" }}>
            <div className="row g-3 g-md-4">
              {/* STAFF 1 */}
              <div className="col-12 col-md-6">
                <div className="text-white mb-2">
                  Staff 1: <strong>{form.staff_1 || "—"}</strong>
                </div>

                <div className="bg-light rounded-2 p-2">
                  <canvas
                    ref={canvas1Ref}
                    style={{ width: "100%", height: padHeight, touchAction: "none" }}
                    aria-label="Firma Staff 1"
                  />

                  <div className="d-grid d-sm-flex gap-2 mt-2">
                    <Button variant="outline-danger" size="sm" onClick={clearSig1} className="w-100 w-sm-auto">
                      Borrar
                    </Button>
                  </div>
                </div>
              </div>

              {/* STAFF 2 */}
              <div className="col-12 col-md-6">
                <div className="text-white mb-2">
                  Staff 2: <strong>{form.staff_2 || "—"}</strong>
                </div>

                <div className="bg-light rounded-2 p-2">
                  <canvas
                    ref={canvas2Ref}
                    style={{ width: "100%", height: padHeight, touchAction: "none" }}
                    aria-label="Firma Staff 2"
                  />

                  <div className="d-grid d-sm-flex gap-2 mt-2">
                    <Button variant="outline-danger" size="sm" onClick={clearSig2} className="w-100 w-sm-auto">
                      Borrar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer style={{ backgroundColor: "#0A2A43" }} className="d-grid d-sm-flex gap-2">
            <Button variant="secondary" onClick={closeSignModal} className="w-100 w-sm-auto">
              Cancelar
            </Button>
            <Button variant="success" onClick={saveSignatures} className="w-100 w-sm-auto">
              Guardar Firmas
            </Button>
          </Modal.Footer>
        </Modal>
      </div>

      {/* Optional footer QR / branding block; hidden on very small screens */}
      <div className="mx-auto mt-3 mt-md-4 d-none d-md-flex align-items-center justify-content-center" style={{ maxWidth: cardMaxWidth }}>
        <div className="d-flex gap-3 align-items-center text-white-50">
          <QRCodeSVG value={`AMB-${form.ambulance || "N/A"}-${form.date}`} size={96} />
          <small>
            Meditrack • {new Date().getFullYear()} • Vista optimizada para móvil, tablet y escritorio
          </small>
        </div>
      </div>
    </div>
  );
}
