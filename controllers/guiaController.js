const Guia = require('../models/Guia');
const { translateText } = require('../utils/translator');

// @desc    Obtener todos los guías (Público)
// @route   GET /api/guias
// @access  Público
exports.getGuias = async (req, res) => {
  try {
    const guias = await Guia.find({ activo: true, estado: 'activo' });
    res.json({
      success: true,
      count: guias.length,
      data: guias
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Obtener un guía por ID (Público)
// @route   GET /api/guias/:id
// @access  Público
exports.getGuia = async (req, res) => {
  try {
    const guia = await Guia.findById(req.params.id);
    if (!guia) {
      return res.status(404).json({ success: false, message: 'Guía no encontrado' });
    }
    res.json({ success: true, data: guia });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Crear un nuevo guía (Admin/SuperAdmin)
// @route   POST /api/guias
// @access  Privado (Admin)
exports.crearGuia = async (req, res) => {
  try {
    let guiaData = { ...req.body };

    if (typeof guiaData.idiomas === 'string') {
      try { guiaData.idiomas = JSON.parse(guiaData.idiomas); } catch(e) {}
    }
    if (typeof guiaData.especialidades === 'string') {
      try { guiaData.especialidades = JSON.parse(guiaData.especialidades); } catch(e) {}
    }

    if (typeof guiaData.redesSociales === 'string') {
      try { guiaData.redesSociales = JSON.parse(guiaData.redesSociales); } catch(e) {}
    }
    if (typeof guiaData.certificaciones === 'string') {
      try { guiaData.certificaciones = JSON.parse(guiaData.certificaciones); } catch(e) {}
    }
    if (typeof guiaData.zonasOperacion === 'string') {
      try { guiaData.zonasOperacion = JSON.parse(guiaData.zonasOperacion); } catch(e) {}
    }

    const { cloudinaryConfigurado } = require('../config/cloudinary');

    const fotoPerfilFile = req.files && req.files['fotoPerfil'] ? req.files['fotoPerfil'][0] : (req.file ? req.file : null);
    if (fotoPerfilFile) {
      guiaData.fotoPerfil = {
        url: cloudinaryConfigurado() ? fotoPerfilFile.path : `/uploads/restaurants/${fotoPerfilFile.filename}`,
        filename: fotoPerfilFile.filename,
        cloudinaryId: cloudinaryConfigurado() ? fotoPerfilFile.filename : null
      };
    }

    if (req.files && req.files['galeria']) {
      guiaData.galeria = req.files['galeria'].map(file => ({
        url: cloudinaryConfigurado() ? file.path : `/uploads/restaurants/${file.filename}`,
        filename: file.filename,
        cloudinaryId: cloudinaryConfigurado() ? file.filename : null
      }));
    } else {
      guiaData.galeria = [];
    }

    // Traducir biografía si existe
    if (guiaData.biografia) {
      const biografiaEn = await translateText(guiaData.biografia, 'EN-US');
      guiaData.biografia = {
        es: guiaData.biografia,
        en: biografiaEn
      };
    } else {
      guiaData.biografia = { es: '', en: '' };
    }

    const guia = await Guia.create(guiaData);
    res.status(201).json({ success: true, data: guia });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Actualizar un guía
// @route   PUT /api/guias/:id
// @access  Privado (Admin)
exports.actualizarGuia = async (req, res) => {
  try {
    let guiaData = { ...req.body };

    if (typeof guiaData.idiomas === 'string') {
      try { guiaData.idiomas = JSON.parse(guiaData.idiomas); } catch(e) {}
    }
    if (typeof guiaData.especialidades === 'string') {
      try { guiaData.especialidades = JSON.parse(guiaData.especialidades); } catch(e) {}
    }

    if (typeof guiaData.redesSociales === 'string') {
      try { guiaData.redesSociales = JSON.parse(guiaData.redesSociales); } catch(e) {}
    }
    if (typeof guiaData.certificaciones === 'string') {
      try { guiaData.certificaciones = JSON.parse(guiaData.certificaciones); } catch(e) {}
    }
    if (typeof guiaData.zonasOperacion === 'string') {
      try { guiaData.zonasOperacion = JSON.parse(guiaData.zonasOperacion); } catch(e) {}
    }

    const guiaExistente = await Guia.findById(req.params.id);
    if (!guiaExistente) {
      return res.status(404).json({ success: false, message: 'Guía no encontrado' });
    }

    const { cloudinaryConfigurado, eliminarImagenCloudinary } = require('../config/cloudinary');

    // Procesar eliminación de foto de perfil
    const fotoPerfilFile = req.files && req.files['fotoPerfil'] ? req.files['fotoPerfil'][0] : (req.file ? req.file : null);
    if (req.body.eliminarFotoPerfil === 'true' || fotoPerfilFile) {
      if (guiaExistente.fotoPerfil && guiaExistente.fotoPerfil.cloudinaryId && cloudinaryConfigurado()) {
        try { await eliminarImagenCloudinary(guiaExistente.fotoPerfil.cloudinaryId); } catch(ex) {}
      }
      guiaData.fotoPerfil = null;
    }

    // Procesar nueva foto
    if (fotoPerfilFile) {
      guiaData.fotoPerfil = {
        url: cloudinaryConfigurado() ? fotoPerfilFile.path : `/uploads/restaurants/${fotoPerfilFile.filename}`,
        filename: fotoPerfilFile.filename,
        cloudinaryId: cloudinaryConfigurado() ? fotoPerfilFile.filename : null
      };
    }

    // Procesar eliminación de imágenes específicas de la galería
    let galeriaActual = guiaExistente.galeria || [];
    if (req.body.imagenesEliminar) {
      let idsEliminar = [];
      try {
        idsEliminar = JSON.parse(req.body.imagenesEliminar);
      } catch (e) {
        idsEliminar = [req.body.imagenesEliminar];
      }
      
      galeriaActual = galeriaActual.filter(img => {
        if (img._id && idsEliminar.includes(img._id.toString())) {
          if (img.cloudinaryId && cloudinaryConfigurado()) {
            eliminarImagenCloudinary(img.cloudinaryId).catch(console.error);
          }
          return false;
        }
        return true;
      });
    }

    // Añadir nuevas imágenes a la galería
    const nuevasImagenes = [];
    if (req.files && req.files['galeria']) {
      for (const file of req.files['galeria']) {
        nuevasImagenes.push({
          url: cloudinaryConfigurado() ? file.path : `/uploads/restaurants/${file.filename}`,
          filename: file.filename,
          cloudinaryId: cloudinaryConfigurado() ? file.filename : null
        });
      }
    }
    guiaData.galeria = [...galeriaActual, ...nuevasImagenes];

    // Traducir biografía si fue modificada/proporcionada
    if (guiaData.biografia !== undefined) {
      if (typeof guiaData.biografia === 'string') {
        const biografiaEn = await translateText(guiaData.biografia, 'EN-US');
        guiaData.biografia = {
          es: guiaData.biografia,
          en: biografiaEn
        };
      }
    }

    const guia = await Guia.findByIdAndUpdate(req.params.id, guiaData, {
      new: true,
      runValidators: true
    });
    
    res.json({ success: true, data: guia });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Eliminar/Desactivar un guía
// @route   DELETE /api/guias/:id
// @access  Privado (Admin)
exports.eliminarGuia = async (req, res) => {
  try {
    const guia = await Guia.findByIdAndUpdate(req.params.id, { activo: false }, { new: true });
    if (!guia) {
      return res.status(404).json({ success: false, message: 'Guía no encontrado' });
    }
    res.json({ success: true, message: 'Guía desactivado correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Obtener estadísticas del guía
// @route   GET /api/guias/:id/estadisticas
// @access  Privado
exports.getEstadisticas = async (req, res) => {
  try {
    const guia = await Guia.findById(req.params.id);
    if (!guia) {
      return res.status(404).json({ success: false, message: 'Guía no encontrado' });
    }
    // Lógica de estadísticas aquí (ej: número de tours realizados)
    res.json({
      success: true,
      data: {
        totalResenas: guia.numeroResenas,
        calificacion: guia.calificacionPromedio
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
