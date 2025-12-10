// src/components/Recommended/AddRecommendedModal.jsx
import { useState } from "react";
import { Modal, Form, Button } from "react-bootstrap";
import CATEGORIES from "./categories";

export default function AddRecommendedModal({ show, onHide, onCreate }) {
  const [form, setForm] = useState({
    item_name: "",
    category: "",
    recommended_quantity: 0,
  });

  const handle = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const save = () => {
    if (!form.item_name || !form.category) {
      alert("Todos los campos son obligatorios");
      return;
    }
    onCreate(form); // ← YA NO FALLA
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton style={{ backgroundColor: "#0A2A43", color: "#fff" }}>
        <Modal.Title>Añadir Recomendación</Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ backgroundColor: "#0A2A43", color: "#fff" }}>
        <Form.Group className="mb-3">
          <Form.Label>Nombre del Equipo</Form.Label>
          <Form.Control
            type="text"
            value={form.item_name}
            onChange={(e) => handle("item_name", e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Categoría</Form.Label>
          <Form.Select
            value={form.category}
            onChange={(e) => handle("category", e.target.value)}
          >
            <option value="">Seleccione...</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group>
          <Form.Label>Meta Recomendada</Form.Label>
          <Form.Control
            type="number"
            min={0}
            value={form.recommended_quantity}
            onChange={(e) => handle("recommended_quantity", Number(e.target.value))}
          />
        </Form.Group>
      </Modal.Body>

      <Modal.Footer style={{ background: "#0A2A43" }}>
        <Button variant="secondary" onClick={onHide}>
          Cancelar
        </Button>
        <Button
          style={{
            background: "linear-gradient(90deg,#0069D9,#0A2A43)",
            border: 0,
          }}
          onClick={save}
        >
          Guardar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
