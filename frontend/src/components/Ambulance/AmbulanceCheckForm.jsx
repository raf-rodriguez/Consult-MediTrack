// src/components/Ambulance/AmbulanceCheckForm.jsx

import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Form, Button, Modal, Table } from "react-bootstrap";
import api from "../../services/api";
import SignaturePad from "signature_pad";

import initialFormState from "./initialFormState";
import QRCodeSVG from "./QRCodeSVG";
import InventorySection, { categoryToSection } from "./InventorySection";
import SignatureModal from "./SignatureModal";
import IssuesModal from "./IssuesModal";

import {
  VEHICLE_FLUID_FIELDS,
  MEDICAL_EQUIPMENT_FIELDS, // ✅ Tu lista específica
  SECTION_LABELS,
  AMBULANCIAS,
  TURNOS,
  CARD_MAX_WIDTH,
  PAD_HEIGHT,
} from "./checkFormConstants";

const cardMaxWidth = CARD_MAX_WIDTH;
const padHeight = PAD_HEIGHT;

// ✅ LISTA NEGRA: Estas secciones NO generan requisición (Solo auditoría visual)
const AUDIT_ONLY_SECTIONS = [
  "seccion_vehiculo",
  "seccion_medical_equipment", // ✅ Tus monitores/bombas
  "seccion_equipo"             // ✅ El otro equipo general
];

function fitCanvasToContainer(canvas, height = padHeight) {
  const parent = canvas.parentElement;
  if (!parent) return;
  const width = parent.clientWidth;
  const dpr = Math.max(window.devicePixelRatio || 1, 1);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
}

const initializeBooleanFields = (fields) =>
  fields.reduce((acc, field) => {
    acc[field.id] = false;
    return acc;
  }, {});

export default function AmbulanceCheckForm() {
  const location = useLocation();

  // --- ESTADO INICIAL ---
  const [form, setForm] = useState({
    ...initialFormState,
    // Inicializamos con false los campos estáticos
    seccion_vehiculo: initializeBooleanFields(VEHICLE_FLUID_FIELDS),
    seccion_medical_equipment: initializeBooleanFields(MEDICAL_EQUIPMENT_FIELDS), // ✅

    date: new Date().toISOString().split("T")[0],
    staff_1: "", staff_2: "", signature_staff_1: "", signature_staff_2: "",
    millage: 0, oxigeno_m: 0, oxigeno_d: 0, combustible: "Full", shift: "", observaciones: ""
  });

  const [selectedSection, setSelectedSection] = useState("");
  const [ambulanceLocked, setAmbulanceLocked] = useState(false);

  // Modales
  const [showIssuesModal, setShowIssuesModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [requisitionSummary, setRequisitionSummary] = useState([]);

  // Lógica
  const [issues, setIssues] = useState([]);
  const [pendingMissingList, setPendingMissingList] = useState([]);

  // Inventario Dinámico
  const [recommendedInventory, setRecommendedInventory] = useState({});
  const [recommendedMeta, setRecommendedMeta] = useState({});
  const [ambulanceInventory, setAmbulanceInventory] = useState({});
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [transferLoading, setTransferLoading] = useState({});
  const [verifiedItems, setVerifiedItems] = useState({});

  const canvas1Ref = useRef(null);
  const canvas2Ref = useRef(null);
  const pad1Ref = useRef(null);
  const pad2Ref = useRef(null);

  // 1. Cargar URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const amb = params.get("ambulancia");
    if (amb && AMBULANCIAS.includes(amb)) {
      setForm((prev) => ({ ...prev, ambulance: amb }));
      setAmbulanceLocked(true);
    }
  }, [location]);

  // 2. Cargar Inventario
  useEffect(() => {
    if (!form.ambulance) return;
    const fetchInventoryData = async () => {
      try {
        setLoadingInventory(true);
        const [recRes, ambRes] = await Promise.all([
          api.get("/recommended-inventory/", { params: { ambulance: form.ambulance } }),
          api.get("/ambulance-inventory/", { params: { ambulance: form.ambulance } }),
        ]);

        const recBySection = {}; const metaBySection = {};

        // Procesar datos API
        (recRes.data || []).forEach((rec) => {
          const section = categoryToSection(rec.category);
          if (!section) return;
          if (!recBySection[section]) recBySection[section] = {};
          if (!metaBySection[section]) metaBySection[section] = {};
          recBySection[section][rec.item_name] = rec.recommended_quantity || 0;
          metaBySection[section][rec.item_name] = { itemId: rec.item, category: rec.category };
        });

        // ✅ INYECTAR CAMPOS ESTÁTICOS
        const addStaticFields = (sectionKey, fields) => {
          if (!recBySection[sectionKey]) recBySection[sectionKey] = {};
          fields.forEach((f) => {
            if (recBySection[sectionKey][f.label] === undefined) {
              recBySection[sectionKey][f.label] = true; // Es booleano
            }
          });
        };
        addStaticFields("seccion_vehiculo", VEHICLE_FLUID_FIELDS);
        addStaticFields("seccion_medical_equipment", MEDICAL_EQUIPMENT_FIELDS); // ✅

        const ambBySection = {};
        (ambRes.data || []).forEach((item) => {
          const section = categoryToSection(item.category);
          if (!section) return;
          if (!ambBySection[section]) ambBySection[section] = {};
          ambBySection[section][item.name] = { id: item.id, quantity: item.quantity || 0 };
        });

        setRecommendedInventory(recBySection);
        setRecommendedMeta(metaBySection);
        setAmbulanceInventory(ambBySection);
      } catch (err) { console.error(err); } finally { setLoadingInventory(false); }
    };
    fetchInventoryData();
  }, [form.ambulance]);

  // 3. Firmas
  useEffect(() => {
    if (!showSignModal) return;
    setTimeout(() => {
      if (canvas1Ref.current) { fitCanvasToContainer(canvas1Ref.current); pad1Ref.current = new SignaturePad(canvas1Ref.current); }
      if (canvas2Ref.current) { fitCanvasToContainer(canvas2Ref.current); pad2Ref.current = new SignaturePad(canvas2Ref.current); }
    }, 100);
  }, [showSignModal]);

  // Handlers básicos
  const handleSectionChange = (section, key, value) => setForm(p => ({ ...p, [section]: { ...p[section], [key]: value } }));
  const handleBasicChange = (key, value) => setForm(p => ({ ...p, [key]: value }));

  const handleSelectAll = () => {
    if (!selectedSection) return;
    const rec = recommendedInventory[selectedSection] || {};
    const updated = {};
    Object.keys(rec).forEach(k => updated[k] = typeof rec[k] === "boolean" ? true : rec[k]);
    setForm(p => ({ ...p, [selectedSection]: updated }));
  };

  const clearSection = () => {
    if (!selectedSection) return;
    const rec = recommendedInventory[selectedSection] || {};
    const cleared = {};
    Object.keys(rec).forEach(k => cleared[k] = typeof rec[k] === "boolean" ? false : 0);
    setForm(p => ({ ...p, [selectedSection]: cleared }));
  };

  const handleRequisition = async (section, itemKey) => {
    // Lógica para pedir manualmente si se desea
    const meta = recommendedMeta[section]?.[itemKey];
    if (!meta?.itemId || !form.ambulance) return alert("Ítem no encontrado");
    try {
      setTransferLoading(p => ({ ...p, [meta.itemId]: true }));
      await api.post("/transfers/", { items: [{ item_id: meta.itemId, quantity: 1 }], ambulance: form.ambulance, paramedic: form.staff_1 || "Sistema" });
      setAmbulanceInventory(p => {
        const copy = { ...p }; const sec = { ...copy[section] };
        sec[itemKey] = { ...sec[itemKey], quantity: (sec[itemKey]?.quantity || 0) + 1 };
        copy[section] = sec; return copy;
      });
    } catch (e) { alert("Error requisición"); } finally { setTransferLoading(p => ({ ...p, [meta.itemId]: false })); }
  };

  const toggleVerified = (section, itemKey) => setVerifiedItems(p => ({ ...p, [`${section}::${itemKey}`]: !p[`${section}::${itemKey}`] }));

  // Validación (Staff 2 Opcional)
  const validateBeforeSubmit = () => {
    if (!form.ambulance) return "Selecciona ambulancia";
    if (!form.staff_1) return "Staff 1 obligatorio";
    if (!form.signature_staff_1) return "Firma 1 obligatoria";
    return null;
  };

  const saveSignatures = () => {
    if (pad1Ref.current?.isEmpty()) return alert("Firma 1 requerida");
    const s1 = pad1Ref.current.toDataURL();
    const s2 = !pad2Ref.current?.isEmpty() ? pad2Ref.current.toDataURL() : "";
    setForm(p => ({ ...p, signature_staff_1: s1, signature_staff_2: s2 }));
    setShowSignModal(false);
  };

  // ✅ Detección de Faltantes (Respeta la Lista Negra)
  const getDiscrepancies = () => {
    const problems = [];
    const missingList = [];

    Object.keys(recommendedInventory).forEach((section) => {
      const rec = recommendedInventory[section] || {};
      const actual = form[section] || {};
      const isAuditOnly = AUDIT_ONLY_SECTIONS.includes(section);

      Object.keys(rec).forEach((itemKey) => {
        const recVal = rec[itemKey];
        const val = actual[itemKey];

        if (typeof recVal === "number" && (val ?? 0) < recVal) {
          const diff = recVal - (val ?? 0);
          problems.push({ section, message: `${itemKey}: Falta ${diff}` });
          if (!isAuditOnly) missingList.push({ name: itemKey, quantity: diff, section });
        }
        else if (typeof recVal === "boolean" && !val) {
          problems.push({ section, message: `⚠️ Fallo: ${itemKey}` });
        }
      });
    });
    return { problems, missingList };
  };

  const doSubmit = async (autoRequisitionList = []) => {
    try {
      const payload = {
        ...form,
        staff: form.staff_2 ? `${form.staff_1}, ${form.staff_2}` : form.staff_1,
        staff2: form.staff_2,
        firma_staff1: form.signature_staff_1,
        firma_staff2: form.signature_staff_2,
        missing_items: autoRequisitionList
      };

      delete payload.staff_1; delete payload.staff_2;
      delete payload.signature_staff_1; delete payload.signature_staff_2;

      const res = await api.post("/ambulance-checks/", payload);
      const requisitioned = res.data.requisition_summary || [];

      setForm({
        ...initialFormState,
        seccion_vehiculo: initializeBooleanFields(VEHICLE_FLUID_FIELDS),
        seccion_medical_equipment: initializeBooleanFields(MEDICAL_EQUIPMENT_FIELDS), // ✅ Reset correcto
        date: new Date().toISOString().split("T")[0],
        staff_1: "", staff_2: "", signature_staff_1: "", signature_staff_2: "",
        millage: 0, oxigeno_m: 0, oxigeno_d: 0, combustible: "Full", shift: "", observaciones: ""
      });
      setSelectedSection("");
      setVerifiedItems({});

      setRequisitionSummary(requisitioned);
      setShowSuccessModal(true);

    } catch (e) {
      console.error(e);
      alert("Error al guardar: " + (e.response?.data?.detail || e.message));
    }
  };

  const handleSubmit = () => {
    const err = validateBeforeSubmit();
    if (err) return alert(err);
    const { problems, missingList } = getDiscrepancies();
    if (problems.length > 0) {
      setIssues(problems);
      setPendingMissingList(missingList);
      setShowIssuesModal(true);
    } else {
      doSubmit([]);
    }
  };

  const progress = (() => {
    let t = 0; let o = 0;
    Object.keys(recommendedInventory).forEach(s => {
      Object.keys(recommendedInventory[s]).forEach(k => {
        t++;
        const rv = recommendedInventory[s][k], vv = form[s]?.[k];
        if ((typeof rv === "boolean" && vv) || (typeof rv === "number" && (vv || 0) >= rv)) o++;
      });
    });
    return t ? Math.round((o / t) * 100) : 0;
  })();

  const btnGradient = { background: "linear-gradient(90deg, #0069D9, #0A2A43)", border: "none" };

  return (
    <div className="container-fluid p-3" style={{ backgroundColor: "#000511", minHeight: "100vh" }}>
      <div className="mx-auto" style={{ maxWidth: cardMaxWidth }}>
        <div className="card shadow-lg border-0 rounded-4" style={{ backgroundColor: "rgba(15,48,74,0.95)", border: "1px solid #0d6efd" }}>

          <div className="card-header text-white rounded-top-4 py-3" style={{ background: "linear-gradient(90deg, #0d6efd, #6610f2)" }}>
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold">🚑 Chequeo Unidad</h5>
              <span className="badge bg-white text-primary fw-bold px-3 py-2 rounded-pill shadow-sm">{progress}%</span>
            </div>
          </div>

          <div className="card-body p-4">
            <div className="row g-3 mb-4 pb-4 border-bottom border-secondary">
              <div className="col-6 col-md-3"><Form.Label className="text-white-50 small">Fecha</Form.Label><Form.Control type="date" size="sm" className="bg-dark text-white border-secondary" value={form.date} onChange={e => handleBasicChange('date', e.target.value)} /></div>
              <div className="col-6 col-md-3"><Form.Label className="text-white-50 small">Unidad</Form.Label><Form.Select size="sm" className="bg-dark text-white border-secondary" value={form.ambulance} onChange={e => !ambulanceLocked && handleBasicChange('ambulance', e.target.value)} disabled={ambulanceLocked}><option value="">--</option>{AMBULANCIAS.map(a => <option key={a}>{a}</option>)}</Form.Select></div>
              <div className="col-6 col-md-3"><Form.Label className="text-white-50 small">Staff 1</Form.Label><Form.Control size="sm" className="bg-dark text-white border-secondary" value={form.staff_1} onChange={e => handleBasicChange('staff_1', e.target.value)} /></div>
              <div className="col-6 col-md-3"><Form.Label className="text-white-50 small">Staff 2</Form.Label><Form.Control size="sm" className="bg-dark text-white border-secondary" value={form.staff_2} onChange={e => handleBasicChange('staff_2', e.target.value)} /></div>
              <div className="col-6 col-md-3"><Form.Label className="text-white-50 small">Turno</Form.Label><Form.Select size="sm" className="bg-dark text-white border-secondary" value={form.shift} onChange={e => handleBasicChange('shift', e.target.value)}><option value="">--</option>{TURNOS.map(t => <option key={t}>{t}</option>)}</Form.Select></div>
              <div className="col-6 col-md-3"><Form.Label className="text-white-50 small">Millaje</Form.Label><Form.Control type="number" size="sm" className="bg-dark text-white border-secondary" value={form.millage} onChange={e => handleBasicChange('millage', e.target.value)} /></div>
              <div className="col-6 col-md-2"><Form.Label className="text-white-50 small">Combustible</Form.Label><Form.Select size="sm" className="bg-dark text-white border-secondary" value={form.combustible} onChange={e => handleBasicChange('combustible', e.target.value)}><option>Full</option><option>3/4</option><option>1/2</option><option>1/4</option><option>Empty</option></Form.Select></div>
              <div className="col-3 col-md-2"><Form.Label className="text-white-50 small">O2 M</Form.Label><Form.Control type="number" size="sm" className="bg-dark text-white border-secondary" value={form.oxigeno_m} onChange={e => handleBasicChange('oxigeno_m', e.target.value)} /></div>
              <div className="col-3 col-md-2"><Form.Label className="text-white-50 small">O2 D</Form.Label><Form.Control type="number" size="sm" className="bg-dark text-white border-secondary" value={form.oxigeno_d} onChange={e => handleBasicChange('oxigeno_d', e.target.value)} /></div>
              <div className="col-12 mt-2"><Button variant="outline-info" size="sm" className="w-100 fw-bold" onClick={() => setShowSignModal(true)}>{form.signature_staff_1 ? "✅ Firmas OK" : "✍️ Firmar"}</Button></div>
            </div>

            <div className="mb-3">
              <Form.Label className="text-white fw-bold h5">Inventario</Form.Label>
              <Form.Select size="lg" className="bg-dark text-white border-info mb-3 shadow" value={selectedSection} onChange={e => setSelectedSection(e.target.value)}>
                <option value="">-- Selecciona --</option>
                {Object.keys(SECTION_LABELS).map(k => <option key={k} value={k}>{SECTION_LABELS[k]}</option>)}
              </Form.Select>

              {selectedSection && (
                <div className="animate__animated animate__fadeIn">
                  <div className="d-flex gap-2 mb-3">
                    <Button style={btnGradient} size="sm" onClick={handleSelectAll}>✓ Todo OK</Button>
                    <Button variant="outline-danger" size="sm" onClick={clearSection}>🗑️ Limpiar</Button>
                  </div>
                  <InventorySection
                    selectedSection={selectedSection} form={form} recommendedInventory={recommendedInventory}
                    ambulanceInventory={ambulanceInventory} recommendedMeta={recommendedMeta} verifiedItems={verifiedItems}
                    loadingInventory={loadingInventory} transferLoading={transferLoading} handleSectionChange={handleSectionChange}
                    handleRequisition={handleRequisition} toggleVerified={toggleVerified}
                  />
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-top border-secondary">
              <Form.Control as="textarea" rows={2} className="bg-dark text-white mb-3" placeholder="Observaciones..." value={form.observaciones} onChange={e => handleBasicChange('observaciones', e.target.value)} />
              <Button style={btnGradient} size="lg" className="w-100 py-3 shadow fw-bold text-uppercase" onClick={handleSubmit}>💾 Finalizar</Button>
            </div>
          </div>
        </div>
        <div className="d-flex justify-content-center mt-4 opacity-50"><QRCodeSVG value={`CHK-${form.ambulance}-${Date.now()}`} size={60} /></div>
      </div>

      <IssuesModal show={showIssuesModal} onClose={() => setShowIssuesModal(false)} issues={issues} SECTION_LABELS={SECTION_LABELS} onConfirmSave={() => { setShowIssuesModal(false); doSubmit(pendingMissingList); }} />
      <SignatureModal show={showSignModal} onClose={() => setShowSignModal(false)} saveSignatures={saveSignatures} clearSig1={() => pad1Ref.current?.clear()} clearSig2={() => pad2Ref.current?.clear()} canvas1Ref={canvas1Ref} canvas2Ref={canvas2Ref} padHeight={padHeight} form={form} />

      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered backdrop="static">
        <Modal.Header className="bg-success text-white border-0"><Modal.Title className="fw-bold">✅ Guardado</Modal.Title></Modal.Header>
        <Modal.Body className="bg-dark text-white">
          <p>Reporte registrado correctamente.</p>
          {requisitionSummary.length > 0 ? (
            <div className="mt-3">
              <h6 className="text-info border-bottom pb-2">📦 Requisición Automática:</h6>
              <Table striped bordered variant="dark" size="sm" className="mt-2">
                <thead><tr><th>Ítem</th><th>Cant.</th></tr></thead>
                <tbody>{requisitionSummary.map((item, idx) => (<tr key={idx}><td>{item.name}</td><td className="text-center fw-bold text-warning">{item.quantity} {item.unit}</td></tr>))}</tbody>
              </Table>
            </div>
          ) : (<p className="text-success">✨ Inventario completo.</p>)}
        </Modal.Body>
        <Modal.Footer className="bg-dark border-top border-secondary"><Button variant="light" onClick={() => setShowSuccessModal(false)}>Aceptar</Button></Modal.Footer>
      </Modal>
    </div>
  );
}