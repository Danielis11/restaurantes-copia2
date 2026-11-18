const mongoose = require('mongoose');
const conexion = require('../config/conexion');

const GuiaTuristicaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre del guía es obligatorio'],
    trim: true,
    maxlength: [50, 'El nombre no puede tener más de 50 caracteres']
  },
  apellidos: {
    type: String,
    required: [true, 'Los apellidos son obligatorios'],
    trim: true,
    maxlength: [50, 'Los apellidos no pueden tener más de 50 caracteres']
  },
  descripcion: {
    type: String,
    required: [true, 'La descripción es obligatoria'],
    maxlength: [800, 'La descripción no puede tener más de 800 caracteres']
  },
  foto: String,
  imagenes: [String], // Fotos adicionales, certificados, etc.
  propietario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  informacionPersonal: {
    edad: {
      type: Number,
      min: 18,
      max: 80
    },
    genero: {
      type: String,
      enum: ['masculino', 'femenino', 'otro', 'prefiero_no_decir']
    },
    nacionalidad: {
      type: String,
      default: 'Mexicana'
    }
  },
  ubicacion: {
    ciudadesOperacion: [{
      type: String,
      required: true
    }],
    estado: String,
    disponibleParaViajar: {
      type: Boolean,
      default: true
    },
    radioOperacion: Number // en kilómetros
  },
especialidades: [{
    type: String,
    enum: [
      'excursionismo',
      'misiones_franciscanas', 
      'interpretacion_ambiental',
      'guia_cultural'
    ],
    required: true
}],
  idiomas: [{
    idioma: {
      type: String,
      enum: ['español', 'ingles', 'frances', 'aleman', 'italiano', 'portugues', 'mandarin', 'japones', 'otro'],
      required: true
    },
    nivel: {
      type: String,
      enum: ['basico', 'intermedio', 'avanzado', 'nativo'],
      required: true
    }
  }],
  servicios: {
    tipoGuiado: [{
      type: String,
      enum: ['tours_grupales', 'tours_privados', 'tours_familiares', 'tours_corporativos', 'tours_escolares'],
      required: true
    }],
    duracion: [{
      type: String,
      enum: ['medio_dia', 'dia_completo', 'varios_dias', 'por_horas'],
      required: true
    }],
    transporte: {
      propio: Boolean,
      tipos: [String] // ["automovil", "van", "autobus"]
    }
  },
  tarifas: {
    porHora: {
      type: Number,
      min: 0
    },
    medioDia: {
      type: Number,
      min: 0
    },
    diaCompleto: {
      type: Number,
      min: 0
    },
    grupoPrivado: {
      type: Number,
      min: 0
    },
    moneda: {
      type: String,
      default: 'MXN',
      enum: ['MXN', 'USD', 'EUR']
    }
  },
  contacto: {
    telefono: {
      type: String,
      match: [/^\d{10}$/, 'El teléfono debe tener 10 dígitos']
    },
    email: {
      type: String,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
    },
    whatsapp: String,
    redesSociales: {
      facebook: String,
      instagram: String,
      linkedin: String
    }
  },
  experiencia: {
    anosExperiencia: {
      type: Number,
      min: 0
    },
    toursPorAno: Number,
    clientesAtendidos: Number,
    descripcionExperiencia: String
  },
  certificaciones: [{
    nombre: {
      type: String,
      required: true
    },
    numero: String,
    fechaObtencion: Date,
    vigencia: Date,
    entidadCertificadora: String,
    verificado: {
      type: Boolean,
      default: false
    }
  }],
  educacion: [{
    titulo: String,
    institucion: String,
    año: Number,
    relacionTurismo: Boolean
  }],
  disponibilidad: {
    horarios: {
      lunes: { disponible: Boolean, desde: String, hasta: String },
      martes: { disponible: Boolean, desde: String, hasta: String },
      miercoles: { disponible: Boolean, desde: String, hasta: String },
      jueves: { disponible: Boolean, desde: String, hasta: String },
      viernes: { disponible: Boolean, desde: String, hasta: String },
      sabado: { disponible: Boolean, desde: String, hasta: String },
      domingo: { disponible: Boolean, desde: String, hasta: String }
    },
    fechasNoDisponibles: [Date],
    anticipacionMinima: {
      type: Number,
      default: 24 // horas
    }
  },
  calificacion: {
    promedio: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    categorias: {
      conocimiento: { type: Number, min: 0, max: 5, default: 0 },
      comunicacion: { type: Number, min: 0, max: 5, default: 0 },
      puntualidad: { type: Number, min: 0, max: 5, default: 0 },
      amabilidad: { type: Number, min: 0, max: 5, default: 0 },
      organizacion: { type: Number, min: 0, max: 5, default: 0 }
    }
  },
  verificado: {
    identidad: { type: Boolean, default: false },
    certificaciones: { type: Boolean, default: false },
    antecedentes: { type: Boolean, default: false }
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices
GuiaTuristicaSchema.index({ 'ubicacion.ciudadesOperacion': 1 });
GuiaTuristicaSchema.index({ especialidades: 1 });
GuiaTuristicaSchema.index({ 'idiomas.idioma': 1 });
GuiaTuristicaSchema.index({ 'calificacion.promedio': -1 });
GuiaTuristicaSchema.index({ 'tarifas.porHora': 1 });

module.exports = conexion.model('GuiaTuristica', GuiaTuristicaSchema);