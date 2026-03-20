// Validaciones personalizadas para el proyecto

// Validar formato de email
const validarEmail = (email) => {
  const regex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return regex.test(email);
};

// Validar formato de teléfono
const validarTelefono = (telefono) => {
  const regex = /^[\+]?[1-9][\d]{0,15}$/;
  return regex.test(telefono);
};

// Validar tipo de establecimiento
const validarTipoEstablecimiento = (tipo) => {
  const tiposValidos = ['restaurante', 'bar', 'cafeteria'];
  return tiposValidos.includes(tipo.toLowerCase());
};

// Validar estructura de dirección
const validarDireccion = (direccion) => {
  if (!direccion || typeof direccion !== 'object') {
    return { valida: false, mensaje: 'La dirección es requerida' };
  }

  const { calle, ciudad, codigoPostal } = direccion;

  if (!calle || !ciudad || !codigoPostal) {
    return { 
      valida: false, 
      mensaje: 'Calle, ciudad y código postal son obligatorios' 
    };
  }

  if (calle.length < 5) {
    return { 
      valida: false, 
      mensaje: 'La calle debe tener al menos 5 caracteres' 
    };
  }

  if (ciudad.length < 2) {
    return { 
      valida: false, 
      mensaje: 'La ciudad debe tener al menos 2 caracteres' 
    };
  }

  return { valida: true };
};

// Validar estructura de horarios
const validarHorarios = (horarios) => {
  if (!horarios || typeof horarios !== 'object') {
    return { valida: true }; // Los horarios son opcionales
  }

  const diasValidos = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const formatoHora = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

  for (const dia of diasValidos) {
    if (horarios[dia]) {
      const { apertura, cierre } = horarios[dia];
      
      if (apertura && !formatoHora.test(apertura)) {
        return { 
          valida: false, 
          mensaje: `Formato de hora de apertura inválido para ${dia}. Use HH:MM` 
        };
      }

      if (cierre && !formatoHora.test(cierre)) {
        return { 
          valida: false, 
          mensaje: `Formato de hora de cierre inválido para ${dia}. Use HH:MM` 
        };
      }

      // Validar que apertura sea antes que cierre
      if (apertura && cierre && apertura >= cierre) {
        return { 
          valida: false, 
          mensaje: `La hora de apertura debe ser antes que la de cierre para ${dia}` 
        };
      }
    }
  }

  return { valida: true };
};

// Validar estructura de menú
const validarMenu = (menu) => {
  if (!menu || !Array.isArray(menu)) {
    return { valida: true }; // El menú es opcional
  }

  for (let i = 0; i < menu.length; i++) {
    const categoria = menu[i];
    
    if (!categoria.categoria || typeof categoria.categoria !== 'string') {
      return { 
        valida: false, 
        mensaje: `La categoría ${i + 1} debe tener un nombre válido` 
      };
    }

    if (!categoria.items || !Array.isArray(categoria.items)) {
      return { 
        valida: false, 
        mensaje: `La categoría "${categoria.categoria}" debe tener items` 
      };
    }

    for (let j = 0; j < categoria.items.length; j++) {
      const item = categoria.items[j];
      
      if (!item.nombre || typeof item.nombre !== 'string') {
        return { 
          valida: false, 
          mensaje: `El item ${j + 1} de "${categoria.categoria}" debe tener nombre` 
        };
      }

      if (typeof item.precio !== 'number' || item.precio < 0) {
        return { 
          valida: false, 
          mensaje: `El precio del item "${item.nombre}" debe ser un número válido` 
        };
      }
    }
  }

  return { valida: true };
};

// Middleware para validar datos de restaurante
const validarDatosRestaurante = (req, res, next) => {
  const {
    nombre,
    tipo,
    descripcion,
    direccion,
    telefono,
    email,
    horarios,
    menu
  } = req.body;

  // Validaciones requeridas
  if (!nombre || nombre.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'El nombre debe tener al menos 2 caracteres'
    });
  }

  if (!tipo || !validarTipoEstablecimiento(tipo)) {
    return res.status(400).json({
      success: false,
      message: 'Tipo inválido. Debe ser: restaurante, bar o cafeteria'
    });
  }

  if (!descripcion || descripcion.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: 'La descripción debe tener al menos 10 caracteres'
    });
  }

  if (!email || !validarEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Email inválido'
    });
  }

  if (!telefono || !validarTelefono(telefono)) {
    return res.status(400).json({
      success: false,
      message: 'Teléfono inválido'
    });
  }

  // Validar dirección
  const validacionDireccion = validarDireccion(direccion);
  if (!validacionDireccion.valida) {
    return res.status(400).json({
      success: false,
      message: validacionDireccion.mensaje
    });
  }

  // Validar horarios (opcional)
  if (horarios) {
    const validacionHorarios = validarHorarios(horarios);
    if (!validacionHorarios.valida) {
      return res.status(400).json({
        success: false,
        message: validacionHorarios.mensaje
      });
    }
  }

  // Validar menú (opcional)
  if (menu) {
    const validacionMenu = validarMenu(menu);
    if (!validacionMenu.valida) {
      return res.status(400).json({
        success: false,
        message: validacionMenu.mensaje
      });
    }
  }

  next();
};

// Middleware para validar datos de admin
const validarDatosAdmin = (req, res, next) => {
  const { nombre, apellido, email, password, telefono } = req.body;

  if (!nombre || nombre.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'El nombre debe tener al menos 2 caracteres'
    });
  }

  if (!apellido || apellido.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'El apellido debe tener al menos 2 caracteres'
    });
  }

  if (!email || !validarEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Email inválido'
    });
  }

  if (!telefono || !validarTelefono(telefono)) {
    return res.status(400).json({
      success: false,
      message: 'Teléfono inválido'
    });
  }

  // Validar contraseña solo en registro
  if (req.route.path === '/register') {
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }
  }

  next();
};

// Middleware para sanitizar datos de entrada
const sanitizarDatos = (req, res, next) => {
  // Sanitizar strings: trim y remover caracteres peligrosos
  const sanitizar = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].trim();
        // Remover caracteres potencialmente peligrosos
        obj[key] = obj[key].replace(/[<>]/g, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizar(obj[key]);
      }
    }
  };

  if (req.body) {
    sanitizar(req.body);
  }

  next();
};

module.exports = {
  validarEmail,
  validarTelefono,
  validarTipoEstablecimiento,
  validarDireccion,
  validarHorarios,
  validarMenu,
  validarDatosRestaurante,
  validarDatosAdmin,
  sanitizarDatos
};