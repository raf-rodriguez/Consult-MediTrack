import { useState } from "react";
import { Modal, Form, Button } from "react-bootstrap";
import api from "../../services/api";

export default function RecommendedModal({ show, onHide, refresh }) {
  const [form, setForm] = useState({
    item: "",
    item_name: "",
    category: "",
    recommended_quantity: 0,
  });

  const handle = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    try {
      await api.post("/recommended-inventory/", form);
      refresh();
      onHide();
    } catch (err) {
      alert("Error guardando recomendación");
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Añadir Recomendación</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Nombre del Ítem</Form.Label>
          <Form.Control
            type="text"
            value={form.item_name}
            onChange={(e) => handle("item_name", e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Categoría</Form.Label>
          <Form.Control
            type="text"
            value={form.category}
            onChange={(e) => handle("category", e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Meta</Form.Label>
          <Form.Control
            type="number"
            min="0"
            value={form.recommended_quantity}
            onChange={(e) => handle("recommended_quantity", e.target.value)}
          />
        </Form.Group>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancelar</Button>
        <Button onClick={save}>Guardar</Button>
      </Modal.Footer>
    </Modal>
  );
}
