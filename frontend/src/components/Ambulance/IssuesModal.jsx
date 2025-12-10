// src/components/Ambulance/IssuesModal.jsx
// esto es parte de la hoja de chequeo

import { Modal, Button } from "react-bootstrap";

export default function IssuesModal({
  show,
  onClose,
  issues,
  SECTION_LABELS,
  onConfirmSave,
}) {
  return (
    <Modal show={show} onHide={onClose} centered>
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
        <Button variant="secondary" onClick={onClose}>
          Revisar
        </Button>
        <Button variant="primary" onClick={onConfirmSave}>
          Guardar igualmente
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
