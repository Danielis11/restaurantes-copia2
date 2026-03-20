const Agencia = require('../models/Agencia');
const { cloudinaryConfigurado, eliminarImagenCloudinary } = require('../config/cloudinary');

exports.getAgencias = async (req, res) => {
  try {
    const agencias = await Agencia.find();
    res.json({ success: true, count: agencias.length, data: agencias });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAgencia = async (req, res) => {
  try {
    const agencia = await Agencia.findById(req.params.id);
    if (!agencia) {
      return res.status(404).json({ success: false, message: 'Agencia no encontrada' });
    }
    res.json({ success: true, data: agencia });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.crearAgencia = async (req, res) => {
  try {
    const agenciaData = { ...req.body };
    
    // Convert strings to arrays/objects if they come stringified from FormData
    if (agenciaData.idiomas && typeof agenciaData.idiomas === 'string') {
      try { agenciaData.idiomas = JSON.parse(agenciaData.idiomas); } catch (e) {}
    }
    if (agenciaData.especialidades && typeof agenciaData.especialidades === 'string') {
      try { agenciaData.especialidades = JSON.parse(agenciaData.especialidades); } catch (e) {}
    }
    if (agenciaData.serviciosDefecto && typeof agenciaData.serviciosDefecto === 'string') {
      try { agenciaData.serviciosDefecto = JSON.parse(agenciaData.serviciosDefecto); } catch (e) {}
    }
    if (agenciaData.redesSociales && typeof agenciaData.redesSociales === 'string') {
      try { agenciaData.redesSociales = JSON.parse(agenciaData.redesSociales); } catch (e) {}
    }
    if (agenciaData.coordenadas && typeof agenciaData.coordenadas === 'string') {
      try { agenciaData.coordenadas = JSON.parse(agenciaData.coordenadas); } catch (e) {}
    }

    if (req.files && req.files['logo']) {
      const file = req.files['logo'][0];
      agenciaData.logo = {
        filename: file.filename,
        url: cloudinaryConfigurado() ? file.path : `/uploads/restaurants/${file.filename}`,
        public_id: cloudinaryConfigurado() ? file.filename : null
      };
    }

    if (req.files && req.files['galeria']) {
      agenciaData.galeria = req.files['galeria'].map(file => ({
        filename: file.filename,
        url: cloudinaryConfigurado() ? file.path : `/uploads/restaurants/${file.filename}`,
        public_id: cloudinaryConfigurado() ? file.filename : null
      }));
    }

    const agencia = await Agencia.create(agenciaData);
    res.status(201).json({ success: true, data: agencia });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.actualizarAgencia = async (req, res) => {
  try {
    const agenciaData = { ...req.body };
    const agenciaExistente = await Agencia.findById(req.params.id);

    if (!agenciaExistente) {
      return res.status(404).json({ success: false, message: 'Agencia no encontrada' });
    }

    // Convert strings to arrays/objects if they come stringified from FormData
    if (agenciaData.idiomas && typeof agenciaData.idiomas === 'string') {
      try { agenciaData.idiomas = JSON.parse(agenciaData.idiomas); } catch (e) {}
    }
    if (agenciaData.especialidades && typeof agenciaData.especialidades === 'string') {
      try { agenciaData.especialidades = JSON.parse(agenciaData.especialidades); } catch (e) {}
    }
    if (agenciaData.serviciosDefecto && typeof agenciaData.serviciosDefecto === 'string') {
      try { agenciaData.serviciosDefecto = JSON.parse(agenciaData.serviciosDefecto); } catch (e) {}
    }
    if (agenciaData.redesSociales && typeof agenciaData.redesSociales === 'string') {
      try { agenciaData.redesSociales = JSON.parse(agenciaData.redesSociales); } catch (e) {}
    }
    if (agenciaData.coordenadas && typeof agenciaData.coordenadas === 'string') {
      try { agenciaData.coordenadas = JSON.parse(agenciaData.coordenadas); } catch (e) {}
    }

    if (req.body.eliminarLogo === 'true' && agenciaExistente.logo && agenciaExistente.logo.public_id) {
       if (cloudinaryConfigurado()) {
           try { await eliminarImagenCloudinary(agenciaExistente.logo.public_id); } catch (e) {}
       }
       agenciaData.logo = null;
    }

    if (req.files && req.files['logo']) {
      const file = req.files['logo'][0];
      if (agenciaExistente.logo && agenciaExistente.logo.public_id && cloudinaryConfigurado()) {
           try { await eliminarImagenCloudinary(agenciaExistente.logo.public_id); } catch (e) {}
      }
      
      agenciaData.logo = {
        filename: file.filename,
        url: cloudinaryConfigurado() ? file.path : `/uploads/restaurants/${file.filename}`,
        public_id: cloudinaryConfigurado() ? file.filename : null
      };
    }

    let galeriaActualizada = [...(agenciaExistente.galeria || [])];

    // Eliminar imágenes seleccionadas de la galería
    if (req.body.eliminarGaleria) {
        let imagenesAEliminar = req.body.eliminarGaleria;
        if (typeof imagenesAEliminar === 'string') {
            try {
                imagenesAEliminar = JSON.parse(imagenesAEliminar);
            } catch (e) {
                imagenesAEliminar = [req.body.eliminarGaleria]; // Formato antiguo
            }
        }
        
        if (Array.isArray(imagenesAEliminar)) {
            for (const id of imagenesAEliminar) {
                const imgIndex = galeriaActualizada.findIndex(i => i._id && i._id.toString() === id);
                if (imgIndex !== -1) {
                    const img = galeriaActualizada[imgIndex];
                    if (img.public_id && cloudinaryConfigurado()) {
                        try { await eliminarImagenCloudinary(img.public_id); } catch (e) { console.error('Error eliminando de Cloudinary', e); }
                    }
                    galeriaActualizada.splice(imgIndex, 1);
                }
            }
        }
    }

    // Añadir nuevas imágenes a la galería
    if (req.files && req.files['galeria']) {
      const nuevasImagenes = req.files['galeria'].map(file => ({
        filename: file.filename,
        url: cloudinaryConfigurado() ? file.path : `/uploads/restaurants/${file.filename}`,
        public_id: cloudinaryConfigurado() ? file.filename : null
      }));
      galeriaActualizada = galeriaActualizada.concat(nuevasImagenes);
    }
    
    // Limitar máximo a 5 fotos
    agenciaData.galeria = galeriaActualizada.slice(0, 5);

    const agencia = await Agencia.findByIdAndUpdate(req.params.id, agenciaData, { new: true, runValidators: true });
    res.json({ success: true, data: agencia });
  } catch (error) {
    console.error('Error actualizarAgencia:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.eliminarAgencia = async (req, res) => {
  try {
    const agencia = await Agencia.findByIdAndDelete(req.params.id);
    if (!agencia) {
      return res.status(404).json({ success: false, message: 'Agencia no encontrada' });
    }
    
    if (agencia.logo && agencia.logo.public_id && cloudinaryConfigurado()) {
        try { await eliminarImagenCloudinary(agencia.logo.public_id); } catch (e) {}
    }

    if (agencia.galeria && agencia.galeria.length > 0 && cloudinaryConfigurado()) {
        for (const img of agencia.galeria) {
            if (img.public_id) {
                try { await eliminarImagenCloudinary(img.public_id); } catch (e) {}
            }
        }
    }

    res.json({ success: true, message: 'Agencia eliminada' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== RESEÑAS =====
exports.getResenasAgencia = async (req, res) => {
  try {
    const agencia = await Agencia.findById(req.params.id).select('resenas calificacionPromedio numeroResenas nombre');
    if (!agencia) return res.status(404).json({ success: false, message: 'Agencia no encontrada' });
    res.json({ success: true, resenas: agencia.resenas, calificacionPromedio: agencia.calificacionPromedio, numeroResenas: agencia.numeroResenas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.crearResenaAgencia = async (req, res) => {
  try {
    const agencia = await Agencia.findById(req.params.id);
    if (!agencia) return res.status(404).json({ success: false, message: 'Agencia no encontrada' });

    const { calificacion, comentario } = req.body;
    if (!calificacion || !comentario) return res.status(400).json({ success: false, message: 'Calificación y comentario son requeridos' });

    // Prevent duplicate reviews from same user
    const yaReseno = agencia.resenas.some(r => r.usuario && r.usuario.toString() === req.user._id.toString());
    if (yaReseno) return res.status(400).json({ success: false, message: 'Ya tienes una reseña para esta agencia' });

    const nuevaResena = {
      usuario: req.user._id,
      nombreUsuario: req.user.nombre || req.user.email,
      calificacion: Number(calificacion),
      comentario,
      fotos: []
    };

    if (req.files && req.files.length > 0) {
      nuevaResena.fotos = req.files.map(file => ({
        url: file.path,
        public_id: file.filename
      }));
    }

    agencia.resenas.push(nuevaResena);
    agencia.numeroResenas = agencia.resenas.length;
    agencia.calificacionPromedio = parseFloat(
      (agencia.resenas.reduce((sum, r) => sum + r.calificacion, 0) / agencia.resenas.length).toFixed(1)
    );

    await agencia.save();
    res.status(201).json({ success: true, resena: nuevaResena, calificacionPromedio: agencia.calificacionPromedio, numeroResenas: agencia.numeroResenas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.eliminarResenaAgencia = async (req, res) => {
  try {
    const agencia = await Agencia.findById(req.params.id);
    if (!agencia) return res.status(404).json({ success: false, message: 'Agencia no encontrada' });

    const resena = agencia.resenas.id(req.params.resenaId);
    if (!resena) return res.status(404).json({ success: false, message: 'Reseña no encontrada' });

    if (resena.usuario.toString() !== req.user._id.toString() && req.user.rol !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    resena.deleteOne();
    agencia.numeroResenas = agencia.resenas.length;
    agencia.calificacionPromedio = agencia.resenas.length
      ? parseFloat((agencia.resenas.reduce((sum, r) => sum + r.calificacion, 0) / agencia.resenas.length).toFixed(1))
      : 0;

    await agencia.save();
    res.json({ success: true, message: 'Reseña eliminada' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== TOURS POR AGENCIA =====
exports.getToursAgencia = async (req, res) => {
  try {
    const Tour = require('../models/Tour');
    const tours = await Tour.find({ agenciaRef: req.params.id, activo: true })
      .select('nombre descripcionCorta imagenPrincipal precio duracion dificultad categoria slug _id disponibilidad')
      .sort({ createdAt: -1 })
      .limit(12);
    res.json({ success: true, count: tours.length, data: tours });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== CALENDARIO DE LA AGENCIA =====
exports.getCalendarioAgencia = async (req, res) => {
  try {
    const Tour = require('../models/Tour');
    const tours = await Tour.find({ agenciaRef: req.params.id, activo: true })
        .select('nombre slug disponibilidad duracion precio');

    // Generate upcoming 30 days availability based on tour schedules
    const today = new Date();
    today.setHours(0,0,0,0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30); // Look ahead 30 days

    const datesObj = {};
    const weekDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    tours.forEach(tour => {
        if (!tour.disponibilidad) return;
        const disp = tour.disponibilidad;
        
        let currentDate = new Date(today);
        while (currentDate <= endDate) {
            // Check season bounds if it's not "all year"
            let inSeason = true;
            if (!disp.todoElAnio && disp.temporada && disp.temporada.inicio && disp.temporada.fin) {
                const seasonStart = new Date(disp.temporada.inicio);
                const seasonEnd = new Date(disp.temporada.fin);
                // Simple check for current year mapping
                seasonStart.setFullYear(currentDate.getFullYear());
                seasonEnd.setFullYear(currentDate.getFullYear());
                if (seasonStart > seasonEnd) seasonEnd.setFullYear(seasonEnd.getFullYear() + 1); // handles wrap around
                inSeason = currentDate >= seasonStart && currentDate <= seasonEnd;
            }

            // Check day of week
            if (inSeason) {
                const dayName = weekDays[currentDate.getDay()];
                if (!disp.diasSemana || disp.diasSemana.length === 0 || disp.diasSemana.includes(dayName)) {
                    const dateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
                    if (!datesObj[dateStr]) datesObj[dateStr] = [];
                    datesObj[dateStr].push({
                        id: tour._id,
                        nombre: tour.nombre,
                        slug: tour.slug,
                        precio: tour.precio
                    });
                }
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
    });

    // Convert to sorted array
    const upcomingDates = Object.keys(datesObj)
        .sort()
        .map(date => ({
            date,
            tours: datesObj[date]
        }))
        .slice(0, 15); // Return only the next 15 upcoming distinct dates with active tours

    res.json({ success: true, data: upcomingDates });
  } catch (error) {
    console.error('Error generando calendario de agencia:', error);
    res.status(500).json({ success: false, message: 'Error al cargar el calendario' });
  }
};

// ===== CONTACTO DIRECTO AGENCIA =====
const nodemailer = require('nodemailer');

exports.enviarContactoAgencia = async (req, res) => {
  try {
    const agencia = await Agencia.findById(req.params.id);
    if (!agencia) return res.status(404).json({ success: false, message: 'Agencia no encontrada' });

    const { nombre, email, telefono, mensaje } = req.body;
    if (!nombre || !email || !mensaje) {
      return res.status(400).json({ success: false, message: 'Por favor, llena los campos requeridos' });
    }

    if (!agencia.email) {
      return res.status(400).json({ success: false, message: 'Esta agencia no tiene un correo electrónico configurado para recibir mensajes.' });
    }

    // Configure nodemailer with environment variables or fallback to ethereal for testing
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: process.env.SMTP_PORT || 587,
      auth: {
        user: process.env.SMTP_USER || 'test@ethereal.email',
        pass: process.env.SMTP_PASS || 'pass123'
      }
    });

    const mailOptions = {
      from: `"${nombre}" <${email}>`,
      to: agencia.email,
      subject: `Nuevo mensaje de contacto desde el Directorio Turístico`,
      text: `Has recibido un nuevo mensaje de contacto interesándose en tu Agencia.\n\nNombre: ${nombre}\nEmail: ${email}\nTeléfono: ${telefono || 'No proporcionado'}\n\nMensaje:\n${mensaje}`,
      html: `
        <h3>Nuevo mensaje de contacto web</h3>
        <p>Has recibido una solicitud de información desde la página de tu agencia en el Directorio Turístico.</p>
        <ul>
          <li><strong>Nombre:</strong> ${nombre}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Teléfono:</strong> ${telefono || 'No proporcionado'}</li>
        </ul>
        <p><strong>Mensaje:</strong></p>
        <blockquote style="background:#f9f9f9; border-left:4px solid #ccc; padding:10px;">${mensaje}</blockquote>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Mensaje enviado correctamente a la agencia.' });

  } catch (error) {
    console.error('Error enviando contacto agencia:', error);
    res.status(500).json({ success: false, message: 'Error enviando el correo. Inténtalo más tarde.' });
  }
};

