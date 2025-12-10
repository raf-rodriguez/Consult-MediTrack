// src/components/Ambulance/SignatureModal.jsx
// esto es de hoja de chequeo

import { Modal, Button } from "react-bootstrap";

export default function SignatureModal({
  show,
  onClose,
  saveSignatures,
  clearSig1,
  clearSig2,
  canvas1Ref,
  canvas2Ref,
  padHeight,
  form,
}) {
  return (
    <Modal show={show} onHide={onClose} centered size="lg">
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
                style={{
                  width: "100%",
                  height: padHeight,
                  touchAction: "none",
                }}
                aria-label="Firma Staff 1"
              />

              <div className="d-grid d-sm-flex gap-2 mt-2">
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={clearSig1}
                  className="w-100 w-sm-auto"
                >
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
                style={{
                  width: "100%",
                  height: padHeight,
                  touchAction: "none",
                }}
                aria-label="Firma Staff 2"
              />

              <div className="d-grid d-sm-flex gap-2 mt-2">
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={clearSig2}
                  className="w-100 w-sm-auto"
                >
                  Borrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer
        style={{ backgroundColor: "#0A2A43" }}
        className="d-grid d-sm-flex gap-2"
      >
        <Button
          variant="secondary"
          onClick={onClose}
          className="w-100 w-sm-auto"
        >
          Cancelar
        </Button>
        <Button
          variant="success"
          onClick={saveSignatures}
          className="w-100 w-sm-auto"
        >
          Guardar Firmas
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
