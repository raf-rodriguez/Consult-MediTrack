// src/components/Ambulance/InventorySection.jsx
import { Form, Button } from "react-bootstrap";

// ✅ FUNCIÓN CORREGIDA
// src/components/Ambulance/InventorySection.jsx

export function categoryToSection(category) {
  if (!category) return null;

  // Normalizamos: minúsculas y quitamos espacios al inicio/final
  // "Inmovilización" -> "inmovilización"
  const cat = category.trim().toLowerCase();

  // Opción 1: Inmovilización (Tal cual viene de Django)
  // Usamos .includes para ser tolerantes si hay algún carácter oculto
  if (cat.includes("inmovilizaci")) { 
    return "seccion_inmovilizacion";
  }

  // Opción 2: Canalización
  if (cat.includes("canalizaci")) {
    return "seccion_canalizacion";
  }

  // Opción 3: Airway / Oxígeno
  // El backend dice "Airway / Oxígeno", buscamos palabras clave
  if (cat.includes("airway") || cat.includes("oxígeno") || cat.includes("oxigeno")) {
    return "seccion_oxigeno_airway";
  }

  // Opción 4: Medicamentos
  if (cat === "medicamentos") {
    return "seccion_medicamentos";
  }

  // Opción 5: Misceláneos
  if (cat.includes("misceláneos") || cat.includes("miscelaneos")) {
    return "seccion_miscelaneos";
  }

  // Opción 6: Entubación
  if (cat.includes("entubaci")) {
    return "seccion_entubacion";
  }

  // Opción 7: Equipo
  // Aquí hay un truco: Tú tienes "seccion_equipo" Y "seccion_medical_equipment".
  // Como Django solo manda "Equipo", por defecto lo mandamos a "seccion_equipo".
  // (Si necesitas separar monitores, tendrás que hacerlo filtrando por nombre del item, no por categoría).
  if (cat === "equipo") {
    return "seccion_equipo"; 
  }

  return null;
}

export default function InventorySection({
  selectedSection,
  form,
  recommendedInventory,
  ambulanceInventory,
  recommendedMeta,
  verifiedItems,
  loadingInventory,
  transferLoading,
  handleSectionChange,
  handleRequisition,
  toggleVerified,
}) {
  if (!selectedSection) return null;

  // Aseguramos que items sea un objeto aunque venga undefined
  const items = recommendedInventory[selectedSection] || {};

  return (
    <div className="bg-dark p-2 p-sm-3 rounded-3 border border-primary">
      {loadingInventory ? (
        <div className="text-center text-white py-4">
          Cargando inventario de {form.ambulance || "unidad"}...
        </div>
      ) : (
        <div className="row g-2 g-sm-3">
          {Object.keys(items).length === 0 ? (
            <div className="text-center text-white-50 py-3">
              No hay recomendaciones configuradas para esta sección.
              <br/>
              <small>(Sección seleccionada: {selectedSection})</small>
            </div>
          ) : (
            Object.keys(items).map((itemKey) => {
              const recVal = items[itemKey];
              
              // Protección contra undefined
              const sectionData = form[selectedSection] || {};
              const val = sectionData[itemKey];

              const label = itemKey.replaceAll("_", " ").toUpperCase();
              const isBool = typeof recVal === "boolean";
              const isNum = typeof recVal === "number";
              const isStr = typeof recVal === "string";

              const currentQty =
                (ambulanceInventory[selectedSection] || {})[itemKey]?.quantity || 0;

              const vKey = `${selectedSection}::${itemKey}`;
              const isVerified = !!verifiedItems[vKey];

              const metaSection = recommendedMeta[selectedSection] || {};
              const meta = metaSection[itemKey];
              const itemId = meta?.itemId;

              const disabledVerify = isNum && currentQty < recVal;

              return (
                <div key={itemKey} className="col-12 col-sm-6 col-lg-4">
                  <div
                    className="p-2 rounded-2"
                    style={{
                      backgroundColor: "#0F304A",
                      border: "1px solid #0069D9",
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-white" style={{ fontSize: 13 }}>
                        {label}
                      </span>
                      <span className="text-info small">
                        {isNum ? `Rec. ${recVal}` : isStr ? recVal : ""}
                      </span>
                    </div>

                    {/* LÓGICA NUMÉRICA */}
                    {isNum && (
                      <>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="badge bg-secondary">
                            Actual: {currentQty}
                          </span>

                          <div className="form-check form-check-inline">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              disabled={disabledVerify}
                              checked={isVerified && !disabledVerify}
                              onChange={() =>
                                toggleVerified(selectedSection, itemKey)
                              }
                            />
                            <label className="form-check-label text-white small">
                              Verificado
                            </label>
                          </div>
                        </div>

                        <div className="d-flex gap-2">
                          <Form.Control
                            type="number"
                            min="0"
                            size="sm"
                            inputMode="numeric"
                            className="bg-dark text-white border-secondary"
                            value={val ?? currentQty}
                            onChange={(e) =>
                              handleSectionChange(
                                selectedSection,
                                itemKey,
                                Number(e.target.value)
                              )
                            }
                          />
                          <Button
                            variant="outline-info"
                            size="sm"
                            className="flex-shrink-0"
                            disabled={!itemId || !form.ambulance || (transferLoading && transferLoading[itemId])}
                            onClick={() =>
                              handleRequisition(selectedSection, itemKey)
                            }
                          >
                            {(transferLoading && transferLoading[itemId]) ? "..." : "+1"}
                          </Button>
                        </div>

                        {currentQty < recVal && (
                          <div className="text-warning small mt-1">
                            Faltan {recVal - currentQty} para meta.
                          </div>
                        )}
                        {currentQty >= recVal && (
                          <div className="text-success small mt-1">
                            ✅ Completo
                          </div>
                        )}
                      </>
                    )}

                    {/* LÓGICA BOOLEANA (Checkbox) */}
                    {isBool && (
                      <Form.Check
                        type="checkbox"
                        className="text-white"
                        checked={!!val}
                        onChange={(e) =>
                          handleSectionChange(
                            selectedSection,
                            itemKey,
                            e.target.checked
                          )
                        }
                        label={val ? "✅ Verificado" : "⬜ Pendiente"}
                      />
                    )}

                    {/* VEHÍCULO SELECT */}
                    {selectedSection === "seccion_vehiculo" && isStr && (
                      <Form.Select
                        size="sm"
                        className="bg-dark text-white border-secondary"
                        value={val ?? ""}
                        onChange={(e) =>
                          handleSectionChange(
                            selectedSection,
                            itemKey,
                            e.target.value
                          )
                        }
                      >
                        <option value="">— Selecciona —</option>
                        <option value="Normal">Normal</option>
                        <option value="Bajo">Bajo</option>
                        <option value="Nada">Nada</option>
                      </Form.Select>
                    )}

                    {/* OTROS SELECTS */}
                    {selectedSection !== "seccion_vehiculo" && isStr && (
                      <Form.Select
                        size="sm"
                        className="bg-dark text-white border-secondary"
                        value={val ?? ""}
                        onChange={(e) =>
                          handleSectionChange(
                            selectedSection,
                            itemKey,
                            e.target.value
                          )
                        }
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
            })
          )}
        </div>
      )}
    </div>
  );
}