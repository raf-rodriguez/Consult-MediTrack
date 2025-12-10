// src/components/Ambulance/checkFormConstants.js

// ✅ ETIQUETAS EXACTAS
// Nota: Las llaves (izquierda) NO llevan tildes para evitar errores de código.
export const SECTION_LABELS = {
    seccion_vehiculo: "Vehículo / Fluidos",
    seccion_medical_equipment: "Equipo Médico (Monitores/Bombas)", 
    seccion_equipo: "Equipo General / Vitales",
    seccion_inmovilizacion: "Inmovilización", // Sin tilde en la key
    seccion_canalizacion: "Canalización",
    seccion_oxigeno_airway: "Oxígeno / Airway",
    seccion_medicamentos: "Medicamentos",
    seccion_miscelaneos: "Misceláneos",
    seccion_entubacion: "Entubación"
};

// LISTA PARA "SECCION_MEDICAL_EQUIPMENT"
export const MEDICAL_EQUIPMENT_FIELDS = [
    { id: "eq_monitor_cardiaco", label: "Monitor Cardíaco" },
    { id: "eq_esfigmo_adulto", label: "Esfigmomanómetro (Adulto)" },
    { id: "eq_esfigmo_pediatrico", label: "Esfigmomanómetro (Pediátrico)" },
    { id: "eq_esfigmo_neonatal", label: "Esfigmomanómetro (Neonatal)" },
    { id: "eq_oximetro", label: "Oxímetro de Pulso" },
    { id: "eq_glucometro", label: "Glucómetro" },
    { id: "eq_estetoscopio", label: "Estetoscopio" },
    { id: "eq_iv_pump", label: "Bomba de Infusión (IV Pump)" },
    { id: "eq_ventilador", label: "Ventilador Mecánico" },
];

// LISTA PARA VEHÍCULO
export const VEHICLE_FLUID_FIELDS = [
    { id: "ve_aceite_motor", label: "Aceite de Motor" },
    { id: "ve_coolant", label: "Coolant" },
    { id: "ve_power_steering", label: "Power Steering" },
    { id: "ve_frenos_liquido", label: "Líquido de Frenos" },
    { id: "ve_luces", label: "Luces" },
    { id: "ve_sirena", label: "Sirena" },
    { id: "ve_inverter", label: "Inverter" },
    { id: "ve_extintor", label: "Extintor" }
];

export const AMBULANCIAS = ["CM1", "CM2", "CM3", "S56"];
export const TURNOS = ["6-2", "7-3", "8-4", "9-5", "12-8", "1-10", "3-11", "4-12"];
export const CARD_MAX_WIDTH = 1024;
export const PAD_HEIGHT = 180;