import React from "react";
import logo from "../assets/image.png";
import SidebarTop from "../components/Dashboard/SidebarTop";

export default function QRList() {
  const ambulances = ["CM1", "CM2", "CM3", "S56"];

  const CHECK_FORM_URL = "http://localhost:3000/ambulance-check-form";
  const MEDICATION_FORM_URL = "http://localhost:3000/medications-form";
  const TRANSFER_FORM_URL = "http://localhost:3000/transfer-form";

  // ✅ Descargar QR
  const downloadQR = (url, filename) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="d-flex">
      <SidebarTop />

      {/* ✅ Contenido principal */}
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
        {/* ✅ Fondo difuminado */}
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


        <div style={{ position: "relative", zIndex: 2 }}>
          {/* ✅ Sección QR Ambulancias */}
          <h2 className="fw-bold mb-4 text-white text-center">🚑 Códigos QR de Ambulancias</h2>

          <div className="row w-100 mb-5 justify-content-center" style={{ maxWidth: "900px" }}>
            {ambulances.map((amb) => {
              const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${CHECK_FORM_URL}?ambulancia=${amb}`;
              return (
                <div key={amb} className="col-md-3 col-6 mb-4 text-center text-white">
                  <h5 className="fw-bold mb-2">{amb}</h5>

                  <img
                    src={qrURL}
                    alt={`QR ${amb}`}
                    className="img-fluid p-2 border rounded shadow"
                    style={{ backgroundColor: "white", borderColor: "#0d6efd" }}
                  />

                  <button
                    className="btn btn-primary btn-sm mt-2 rounded-pill"
                    onClick={() => downloadQR(qrURL, `QR_${amb}.png`)}
                  >
                    ⬇️ Descargar
                  </button>

                  <p className="mt-2 small text-muted">Escanea para Chequeo Diario</p>
                </div>
              );
            })}
          </div>

          {/* ✅ Sección QR Medicamentos */}
          <h2 className="fw-bold mb-4 text-white text-center">💊 QR para Medicamentos / Equipo</h2>

          <div className="text-center">
            {(() => {
              const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${MEDICATION_FORM_URL}`;
              return (
                <>
                  <img
                    src={qrURL}
                    alt="QR Medicamentos"
                    className="img-fluid p-3 border rounded shadow"
                    style={{ backgroundColor: "white", borderColor: "#6610f2" }}
                  />

                  <button
                    className="btn btn-success btn-sm mt-3 rounded-pill"
                    onClick={() => downloadQR(qrURL, "QR_Medicamentos.png")}
                  >
                    ⬇️ Descargar
                  </button>

                  <p className="mt-3 small text-muted">Escanea para abrir el Formulario de Medicamentos</p>
                </>
              );
            })()}
          </div>

          {/* ✅ Sección QR Transferencias */}
          <h2 className="fw-bold mt-5 mb-4 text-white text-center">📦 QR para Transferencias desde Almacén</h2>

          <div className="text-center">
            {(() => {
              const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${TRANSFER_FORM_URL}`;

              return (
                <>
                  <img
                    src={qrURL}
                    alt="QR Transferencias"
                    className="img-fluid p-3 border rounded shadow"
                    style={{
                      backgroundColor: "white",
                      borderColor: "#20c997",
                    }}
                  />

                  <button
                    className="btn btn-info btn-sm mt-3 rounded-pill"
                    onClick={() => downloadQR(qrURL, "QR_Transferencias.png")}
                  >
                    ⬇️ Descargar
                  </button>

                  <p className="mt-3 small text-muted">
                    Escanea para abrir el Formulario de Transferencias
                  </p>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
