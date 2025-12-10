// src/components/Ambulance/initialFormState.js

const initialFormState = {
  date: "",
  ambulance: "",
  staff: "",
  shift: "",
  millage: 0,
  combustible: "Full",
  oxigeno_m: 0,
  oxigeno_d: 0,
  observaciones: "",

  // 🔧 Vehículo
  seccion_vehiculo: {
    aceite_motor: "Normal",
    aceite_transmision: "Normal",
    radiador: "Normal",
    frenos: "Normal",
    power_steering: "Normal",
  },

  // 🟦 Secciones por Categoría
  // IMPORTANTE: Las keys deben ser idénticas a las de checkFormConstants.js
  seccion_inmovilizacion: {}, // Corregido (sin tilde)
  seccion_canalizacion: {},
  seccion_oxigeno_airway: {},
  seccion_medicamentos: {},
  seccion_miscelaneos: {},
  seccion_entubacion: {},
  seccion_equipo: {}, 
  
  // Agregamos esta que faltaba y la tienes en constants:
  seccion_medical_equipment: {}, 
};

export default initialFormState;