const Tour = require('../models/Tour');
const { translateText } = require('../utils/translator');

const parseBilingualObj = (val) => {
    if (!val) return { es: '', en: '', fr: '' };
    if (typeof val === 'string') {
        try { 
            const parsed = JSON.parse(val); 
            return { es: parsed.es || val, en: parsed.en || '', fr: parsed.fr || '' };
        } catch(e) { 
            return { es: val, en: '', fr: '' }; 
        }
    }
    return { es: val.es || '', en: val.en || '', fr: val.fr || '' };
};

const mapTourInfo = (obj) => {
    ['nombre', 'descripcion', 'descripcionCorta', 'itinerarioBasico', 'puntoEncuentro', 'politicasCancelacion', 'restricciones'].forEach(field => {
        if (obj[field] !== undefined) {
            obj[field] = parseBilingualObj(obj[field]);
        }
    });
    return obj;
};

// @desc    Obtener todos los tours (Público)
// @route   GET /api/tours
// @access  Público
exports.getTours = async (req, res) => {
  try {
    const filter = { activo: true };
    if (req.query.tipo) {
      filter.tipo = req.query.tipo;
    }
    const tours = await Tour.find(filter)
      .populate('guiaReferencia', 'nombreCompleto fotoPerfil')
      .populate('guiasAsignados', 'nombreCompleto fotoPerfil idiomas especialidades')
      .lean();
    const parsedTours = tours.map(mapTourInfo);
    res.json({
      success: true,
      count: parsedTours.length,
      data: parsedTours
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Obtener un tour por ID
// @route   GET /api/tours/:id
// @access  Público
exports.getTour = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id)
      .populate('guiaReferencia')
      .populate('guiasAsignados', 'nombreCompleto fotoPerfil idiomas especialidades biografia')
      .lean();
    if (!tour) {
      return res.status(404).json({ success: false, message: 'Tour no encontrado' });
    }
    res.json({ success: true, data: mapTourInfo(tour) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Crear un nuevo tour
// @route   POST /api/tours
// @access  Privado (Admin)
exports.crearTour = async (req, res) => {
  try {
    let tourData = { ...req.body };
    
    // Helper para parsear y traducir campos bilingües
    const parseYTraducirBilingue = async (campo) => {
      let obj = { es: '', en: '', fr: '' };
      if (!campo) return obj;
      
      if (typeof campo === 'string') {
        if (campo.startsWith('{')) {
          try { obj = JSON.parse(campo); } catch(e) { obj.es = campo; }
        } else {
          obj.es = campo;
        }
      } else if (typeof campo === 'object') {
        obj = { ...campo };
      }

      if (obj.es) {
        if (!obj.en) {
          try { obj.en = await translateText(obj.es, 'EN-US'); } catch(e) { console.error('EN Trans Error', e); }
        }
        if (!obj.fr) {
          try { obj.fr = await translateText(obj.es, 'FR'); } catch(e) { console.error('FR Trans Error', e); }
        }
      }
      return obj;
    };

    tourData.nombre = await parseYTraducirBilingue(tourData.nombre);
    tourData.descripcion = await parseYTraducirBilingue(tourData.descripcion);
    tourData.descripcionCorta = await parseYTraducirBilingue(tourData.descripcionCorta);
    tourData.itinerarioBasico = await parseYTraducirBilingue(tourData.itinerarioBasico);
    tourData.puntoEncuentro = await parseYTraducirBilingue(tourData.puntoEncuentro);
    tourData.politicasCancelacion = await parseYTraducirBilingue(tourData.politicasCancelacion);
    tourData.restricciones = await parseYTraducirBilingue(tourData.restricciones);

    const safeParseArray = (val) => {
      if (!val) return [];
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch(e) { return []; }
      }
      return Array.isArray(val) ? val : [];
    };

    tourData.incluye = safeParseArray(tourData.incluye);
    tourData.noIncluye = safeParseArray(tourData.noIncluye);
    tourData.requisitos = safeParseArray(tourData.requisitos);
    tourData.queTraer = safeParseArray(tourData.queTraer);
    tourData.guiasAsignados = safeParseArray(tourData.guiasAsignados);

    // Parse precio and duracion from FormData
    if (typeof tourData.precio === 'string') {
      try { tourData.precio = JSON.parse(tourData.precio); } catch(e) {}
    }
    if (typeof tourData.duracion === 'string') {
      try { tourData.duracion = JSON.parse(tourData.duracion); } catch(e) {}
    }

    // Parse disponibilidad.diasSemana from FormData
    if (tourData.disponibilidad && typeof tourData.disponibilidad.diasSemana === 'string') {
      try { tourData.disponibilidad.diasSemana = JSON.parse(tourData.disponibilidad.diasSemana); } catch(e) { tourData.disponibilidad.diasSemana = []; }
    }

    if (typeof tourData.rutas === 'string') {
      try { tourData.rutas = JSON.parse(tourData.rutas); } catch(e) { tourData.rutas = []; }
    } else if (!tourData.rutas) {
      tourData.rutas = [];
    }

    // Procesar imágenes subidas
    if (req.files && req.files.length > 0) {
      const { cloudinaryConfigurado } = require('../config/cloudinary');
      
      const imagenesTour = req.files.filter(f => f.fieldname === 'imagenes');
      tourData.imagenes = imagenesTour.map(file => {
        return {
          filename: cloudinaryConfigurado() ? file.filename : file.filename,
          url: cloudinaryConfigurado() ? file.path : `/uploads/restaurants/${file.filename}`,
          size: file.size,
          path: file.path, 
          cloudinaryId: cloudinaryConfigurado() ? file.filename : null,
          esPrincipal: false // Se puede ajustar luego
        };
      });

      const imagenesRutas = req.files.filter(f => f.fieldname.startsWith('ruta_imagen_'));
      imagenesRutas.forEach(file => {
         const match = file.fieldname.match(/^ruta_imagen_(\d+)$/);
         if (match) {
            const idx = parseInt(match[1], 10);
            if (tourData.rutas && tourData.rutas[idx]) {
                tourData.rutas[idx].imagen = {
                  filename: cloudinaryConfigurado() ? file.filename : file.filename,
                  url: cloudinaryConfigurado() ? file.path : `/uploads/restaurants/${file.filename}`,
                  size: file.size,
                  path: file.path,
                  cloudinaryId: cloudinaryConfigurado() ? file.filename : null
                };
            }
         }
      });
      // Order images if sorted array provided
      if (req.body.imagenesOrden) {
        let orden = typeof req.body.imagenesOrden === 'string' ? JSON.parse(req.body.imagenesOrden) : req.body.imagenesOrden;
        // In creation, all images are new, so ordering them might just mean matching 'NUEVA_IMAGEN' placeholders
        let nuevasIndex = 0;
        let orderedImages = [];
        for (const item of orden) {
          if (item === 'NUEVA_IMAGEN' && nuevasIndex < tourData.imagenes.length) {
            orderedImages.push(tourData.imagenes[nuevasIndex]);
            nuevasIndex++;
          }
        }
        // In case of mismatch, just append the rest
        while (nuevasIndex < tourData.imagenes.length) {
          orderedImages.push(tourData.imagenes[nuevasIndex]);
          nuevasIndex++;
        }
        tourData.imagenes = orderedImages;
      }

    // Hacer principal la primera imagen si hay varias
      if (tourData.imagenes.length > 0) {
        tourData.imagenes[0].esPrincipal = true;
      }
    }

    // Arrays bilingües
    const parseArrayBilingue = async (arr) => {
        if (!arr || !Array.isArray(arr)) return [];
        const result = [];
        for (const item of arr) {
            const tempVal = typeof item === 'object' ? item.es || item.en || item.fr : item;
            if (!tempVal) {
                result.push({ es: '', en: '', fr: '' });
                continue;
            }
            
            let enVal = typeof item === 'object' ? item.en || '' : '';
            let frVal = typeof item === 'object' ? item.fr || '' : '';
            
            if (!enVal) {
              try { enVal = await translateText(tempVal, 'EN-US'); } catch(e) {}
            }
            if (!frVal) {
              try { frVal = await translateText(tempVal, 'FR'); } catch(e) {}
            }
            
            result.push({ es: tempVal, en: enVal, fr: frVal });
        }
        return result;
    };

    tourData.incluye = await parseArrayBilingue(tourData.incluye);
    tourData.noIncluye = await parseArrayBilingue(tourData.noIncluye);
    tourData.queTraer = await parseArrayBilingue(tourData.queTraer);
    tourData.requisitos = await parseArrayBilingue(tourData.requisitos);

    const tour = await Tour.create(tourData);
    res.status(201).json({ success: true, data: tour });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Actualizar un tour
// @route   PUT /api/tours/:id
// @access  Privado (Admin)
exports.actualizarTour = async (req, res) => {
  try {
    let tourData = { ...req.body };
    
    // Helper para parsear y traducir campos bilingües
    const parseYTraducirBilingue = async (campo) => {
      let obj = { es: '', en: '', fr: '' };
      if (!campo) return obj;
      
      if (typeof campo === 'string') {
        if (campo.startsWith('{')) {
          try { obj = JSON.parse(campo); } catch(e) { obj.es = campo; }
        } else {
          obj.es = campo;
        }
      } else if (typeof campo === 'object') {
        obj = { ...campo };
      }

      if (obj.es) {
        if (!obj.en) {
          try { obj.en = await translateText(obj.es, 'EN-US'); } catch(e) {}
        }
        if (!obj.fr) {
          try { obj.fr = await translateText(obj.es, 'FR'); } catch(e) {}
        }
      }
      return obj;
    };

    tourData.nombre = await parseYTraducirBilingue(tourData.nombre);
    tourData.descripcion = await parseYTraducirBilingue(tourData.descripcion);
    tourData.descripcionCorta = await parseYTraducirBilingue(tourData.descripcionCorta);
    tourData.itinerarioBasico = await parseYTraducirBilingue(tourData.itinerarioBasico);
    tourData.puntoEncuentro = await parseYTraducirBilingue(tourData.puntoEncuentro);
    tourData.politicasCancelacion = await parseYTraducirBilingue(tourData.politicasCancelacion);
    tourData.restricciones = await parseYTraducirBilingue(tourData.restricciones);

    const safeParseArray = (val) => {
      if (!val) return [];
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch(e) { return []; }
      }
      return Array.isArray(val) ? val : [];
    };

    tourData.incluye = safeParseArray(tourData.incluye);
    tourData.noIncluye = safeParseArray(tourData.noIncluye);
    tourData.requisitos = safeParseArray(tourData.requisitos);
    tourData.queTraer = safeParseArray(tourData.queTraer);
    tourData.guiasAsignados = safeParseArray(tourData.guiasAsignados);

    // Parse precio and duracion from FormData
    if (typeof tourData.precio === 'string') {
      try { tourData.precio = JSON.parse(tourData.precio); } catch(e) {}
    }
    if (typeof tourData.duracion === 'string') {
      try { tourData.duracion = JSON.parse(tourData.duracion); } catch(e) {}
    }

    // Parse disponibilidad.diasSemana from FormData
    if (tourData.disponibilidad && typeof tourData.disponibilidad.diasSemana === 'string') {
      try { tourData.disponibilidad.diasSemana = JSON.parse(tourData.disponibilidad.diasSemana); } catch(e) { tourData.disponibilidad.diasSemana = []; }
    }

    if (typeof tourData.rutas === 'string') {
      try { tourData.rutas = JSON.parse(tourData.rutas); } catch(e) { tourData.rutas = []; }
    } else if (!tourData.rutas) {
      tourData.rutas = [];
    }

    const tourExistente = await Tour.findById(req.params.id);
    if (!tourExistente) {
      return res.status(404).json({ success: false, message: 'Tour no encontrado' });
    }

    // Gestionar imágenes existentes
    let imagenesFinales = tourExistente.imagenes || [];
    const { cloudinaryConfigurado, eliminarImagenCloudinary } = require('../config/cloudinary');

    // Procesar imágenes eliminadas por el usuario
    if (req.body.imagenesEliminar) {
      let imagenesEliminar = typeof req.body.imagenesEliminar === 'string' 
        ? JSON.parse(req.body.imagenesEliminar) 
        : req.body.imagenesEliminar;
        
      await Promise.all(imagenesEliminar.map(async (id) => {
        const img = imagenesFinales.find(i => i._id.toString() === id);
        if (img) {
          if (cloudinaryConfigurado() && img.cloudinaryId) {
            try { await eliminarImagenCloudinary(img.cloudinaryId); } catch(ex) {}
          }
        }
      }));
      imagenesFinales = imagenesFinales.filter(i => !imagenesEliminar.includes(i._id.toString()));
    }

    let nuevasImagenes = [];
    // Agregar nuevas imágenes subidas
    if (req.files && req.files.length > 0) {
      const imagenesTour = req.files.filter(f => f.fieldname === 'imagenes');
      nuevasImagenes = imagenesTour.map(file => ({
        filename: cloudinaryConfigurado() ? file.filename : file.filename,
        url: cloudinaryConfigurado() ? file.path : `/uploads/restaurants/${file.filename}`,
        size: file.size,
        path: file.path, 
        cloudinaryId: cloudinaryConfigurado() ? file.filename : null,
        esPrincipal: false
      }));

      const imagenesRutas = req.files.filter(f => f.fieldname.startsWith('ruta_imagen_'));
      imagenesRutas.forEach(file => {
         const match = file.fieldname.match(/^ruta_imagen_(\d+)$/);
         if (match) {
            const idx = parseInt(match[1], 10);
            if (tourData.rutas && tourData.rutas[idx]) {
                tourData.rutas[idx].imagen = {
                  filename: cloudinaryConfigurado() ? file.filename : file.filename,
                  url: cloudinaryConfigurado() ? file.path : `/uploads/restaurants/${file.filename}`,
                  size: file.size,
                  path: file.path,
                  cloudinaryId: cloudinaryConfigurado() ? file.filename : null
                };
            }
         }
      });
    }

    // Reordenar imágenes si se proporcionó un orden
    if (req.body.imagenesOrden) {
      let orden = typeof req.body.imagenesOrden === 'string' ? JSON.parse(req.body.imagenesOrden) : req.body.imagenesOrden;
      let orderedImages = [];
      let nuevasIndex = 0;

      for (const item of orden) {
        if (item === 'NUEVA_IMAGEN' && nuevasIndex < nuevasImagenes.length) {
          orderedImages.push(nuevasImagenes[nuevasIndex]);
          nuevasIndex++;
        } else {
          const imgF = imagenesFinales.find(i => i && i._id && i._id.toString() === item);
          if (imgF) {
            orderedImages.push(imgF);
          }
        }
      }
      
      // En caso de que falten imágenes en el orden por algún motivo, agregar las restantes
      imagenesFinales.forEach(img => {
        if (!orderedImages.some(o => o._id && img._id && o._id.toString() === img._id.toString())) {
          orderedImages.push(img);
        }
      });
      while (nuevasIndex < nuevasImagenes.length) {
        orderedImages.push(nuevasImagenes[nuevasIndex]);
        nuevasIndex++;
      }

      imagenesFinales = orderedImages;
    } else {
      imagenesFinales = [...imagenesFinales, ...nuevasImagenes];
    }

    // Resetear esPrincipal
    imagenesFinales.forEach(img => img.esPrincipal = false);
    
    // Si no hay ninguna imagen principal o acabamos de reordenar, asignar la primera
    if (imagenesFinales.length > 0) {
      imagenesFinales[0].esPrincipal = true;
    }

    tourData.imagenes = imagenesFinales;

    const parseArrayBilingue = async (arr) => {
        if (!arr || !Array.isArray(arr)) return [];
        const result = [];
        for (const item of arr) {
            if (typeof item === 'object' && item.es && item.en && item.fr) {
                result.push(item); // Ya procesado
                continue;
            }
            const tempVal = typeof item === 'object' ? item.es || item.en || item.fr : item;
            if (!tempVal) {
                result.push({ es: '', en: '', fr: '' });
                continue;
            }
            
            let enVal = typeof item === 'object' ? item.en || '' : '';
            let frVal = typeof item === 'object' ? item.fr || '' : '';
            
            if (!enVal) {
              try { enVal = await translateText(tempVal, 'EN-US'); } catch(e) {}
            }
            if (!frVal) {
              try { frVal = await translateText(tempVal, 'FR'); } catch(e) {}
            }
            
            result.push({ es: tempVal, en: enVal, fr: frVal });
        }
        return result;
    };

    tourData.incluye = await parseArrayBilingue(tourData.incluye);
    tourData.noIncluye = await parseArrayBilingue(tourData.noIncluye);
    tourData.queTraer = await parseArrayBilingue(tourData.queTraer);
    tourData.requisitos = await parseArrayBilingue(tourData.requisitos);

    const tour = await Tour.findByIdAndUpdate(req.params.id, tourData, {
      new: true,
      runValidators: true
    });
    
    res.json({ success: true, data: tour });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Eliminar/Desactivar un tour
// @route   DELETE /api/tours/:id
// @access  Privado (Admin)
exports.eliminarTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, { activo: false }, { new: true });
    if (!tour) {
      return res.status(404).json({ success: false, message: 'Tour no encontrado' });
    }
    res.json({ success: true, message: 'Tour desactivado correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
