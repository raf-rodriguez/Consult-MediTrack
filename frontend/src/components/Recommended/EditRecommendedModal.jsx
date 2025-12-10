// src/components/Recommended/EditRecommendedModal.jsx
import { useEffect, useState } from "react";
import { Modal, Form, Button } from "react-bootstrap";
import CATEGORIES from "./categories";

export default function EditRecommendedModal({ show, onHide, item, onUpdate }) {
  const [form, setForm] = useState({
    item_name: "",
    category: "",
    recommended_quantity: 0,
  });

  useEffect(() => {
    if (item) {
      setForm({
        item_name: item.item_name,
        category: item.category,
        recommended_quantity: item.recommended_quantity,
      });
    }
  }, [item]);

  const handle = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const save = () => {
    onUpdate(item.id, form);
  };

  if (!item) return null;

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton style={{ backgroundColor: "#0A2A43", color: "#fff" }}>
        <Modal.Title>Editar Recomendación</Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ backgroundColor: "#0A2A43", color: "#fff" }}>
        <Form.Group className="mb-3">
          <Form.Label>Nombre</Form.Label>
          <Form.Control
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
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group>
          <Form.Label>Meta</Form.Label>
          <Form.Control
            type="number"
            value={form.recommended_quantity}
            onChange={(e) => handle("recommended_quantity", Number(e.target.value))}
          />
        </Form.Group>
      </Modal.Body>

      <Modal.Footer style={{ background: "#0A2A43" }}>
        <Button variant="secondary" onClick={onHide}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={save}>
          Guardar cambios
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
