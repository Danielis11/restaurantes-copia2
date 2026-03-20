// Funciones auxiliares para el proyecto

// Formatear fecha para mostrar
const formatearFecha = (fecha) => {
  const opciones = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(fecha).toLocaleDateString('es-ES', opciones);
};

// Formatear fecha solo día
const formatearSoloFecha = (fecha) => {
  const opciones = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  };
  return new Date(fecha).toLocaleDateString('es-ES', opciones);
};

// Capitalizar primera letra
const capitalizar = (texto) => {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
};

// Generar slug para URLs amigables
const generarSlug = (texto) => {
  return texto
    .toLowerCase()
    .trim()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

// Validar si un horario está abierto ahora
const estaAbierto = (horarios) => {
  const ahora = new Date();
  const diaActual = ahora.getDay(); // 0 = domingo, 1 = lunes, etc.
  const horaActual = ahora.getHours() + ':' + ahora.getMinutes().toString().padStart(2, '0');
  
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const diaHoy = dias[diaActual];
  
  if (!horarios[diaHoy] || !horarios[diaHoy].apertura || !horarios[diaHoy].cierre) {
    return false; // Cerrado si no hay horarios
  }
  
  const apertura = horarios[diaHoy].apertura;
  const cierre = horarios[diaHoy].cierre;
  
  return horaActual >= apertura && horaActual <= cierre;
};

// Obtener próximo horario de apertura
const proximaApertura = (horarios) => {
  const ahora = new Date();
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  
  for (let i = 1; i <= 7; i++) {
    const siguienteDia = new Date(ahora);
    siguienteDia.setDate(ahora.getDate() + i);
    const diaNombre = dias[siguienteDia.getDay()];
    
    if (horarios[diaNombre] && horarios[diaNombre].apertura) {
      return {
        dia: capitalizar(diaNombre),
        hora: horarios[diaNombre].apertura
      };
    }
  }
  
  return null;
};

// Limpiar texto para búsqueda
const limpiarTextoParaBusqueda = (texto) => {
  return texto
    .toLowerCase()
    .trim()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n');
};

// Truncar texto
const truncarTexto = (texto, longitud = 150) => {
  if (!texto || texto.length <= longitud) return texto;
  return texto.substring(0, longitud).trim() + '...';
};

// Formatear precio
const formatearPrecio = (precio) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(precio);
};

// Formatear teléfono para mostrar
const formatearTelefono = (telefono) => {
  // Remover caracteres no numéricos excepto +
  const limpio = telefono.replace(/[^\d+]/g, '');
  
  // Si tiene 10 dígitos, formatear como (XXX) XXX-XXXX
  if (limpio.length === 10) {
    return `(${limpio.slice(0, 3)}) ${limpio.slice(3, 6)}-${limpio.slice(6)}`;
  }
  
  // Si tiene código de país, mostrar como está
  return limpio;
};

// Generar colores aleatorios para avatares
const generarColorAvatar = (texto) => {
  const colores = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'
  ];
  
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = texto.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colores[Math.abs(hash) % colores.length];
};

// Obtener iniciales para avatar
const obtenerIniciales = (nombre, apellido) => {
  const inicial1 = nombre ? nombre.charAt(0).toUpperCase() : '';
  const inicial2 = apellido ? apellido.charAt(0).toUpperCase() : '';
  return inicial1 + inicial2;
};

// Validar URL
const esURLValida = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Crear respuesta estándar de API
const crearRespuesta = (success, message, data = null, errors = null) => {
  const respuesta = { success, message };
  
  if (data) respuesta.data = data;
  if (errors) respuesta.errors = errors;
  
  return respuesta;
};

// Crear respuesta de error estándar
const crearError = (message, errors = null) => {
  return crearRespuesta(false, message, null, errors);
};

// Crear respuesta de éxito estándar
const crearExito = (message, data = null) => {
  return crearRespuesta(true, message, data);
};

// Obtener tiempo relativo (hace X tiempo)
const tiempoRelativo = (fecha) => {
  const ahora = new Date();
  const fechaObj = new Date(fecha);
  const diff = ahora - fechaObj;
  
  const segundos = Math.floor(diff / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  
  if (dias > 0) return `hace ${dias} día${dias > 1 ? 's' : ''}`;
  if (horas > 0) return `hace ${horas} hora${horas > 1 ? 's' : ''}`;
  if (minutos > 0) return `hace ${minutos} minuto${minutos > 1 ? 's' : ''}`;
  return 'hace unos momentos';
};

// Generar ID único simple
const generarId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Filtrar objeto por claves permitidas
const filtrarObjeto = (objeto, clavesPermitidas) => {
  const objetoFiltrado = {};
  
  clavesPermitidas.forEach(clave => {
    if (objeto.hasOwnProperty(clave)) {
      objetoFiltrado[clave] = objeto[clave];
    }
  });
  
  return objetoFiltrado;
};

// Agrupar array por propiedad
const agruparPor = (array, propiedad) => {
  return array.reduce((grupos, item) => {
    const clave = item[propiedad];
    if (!grupos[clave]) {
      grupos[clave] = [];
    }
    grupos[clave].push(item);
    return grupos;
  }, {});
};

// Ordenar array de objetos por propiedad
const ordenarPor = (array, propiedad, ascendente = true) => {
  return array.sort((a, b) => {
    const valorA = a[propiedad];
    const valorB = b[propiedad];
    
    if (ascendente) {
      return valorA > valorB ? 1 : valorA < valorB ? -1 : 0;
    } else {
      return valorA < valorB ? 1 : valorA > valorB ? -1 : 0;
    }
  });
};

// Remover duplicados de array por propiedad
const removerDuplicados = (array, propiedad) => {
  const vistos = new Set();
  return array.filter(item => {
    const valor = item[propiedad];
    if (vistos.has(valor)) {
      return false;
    }
    vistos.add(valor);
    return true;
  });
};

module.exports = {
  formatearFecha,
  formatearSoloFecha,
  capitalizar,
  generarSlug,
  estaAbierto,
  proximaApertura,
  limpiarTextoParaBusqueda,
  truncarTexto,
  formatearPrecio,
  formatearTelefono,
  generarColorAvatar,
  obtenerIniciales,
  esURLValida,
  crearRespuesta,
  crearError,
  crearExito,
  tiempoRelativo,
  generarId,
  filtrarObjeto,
  agruparPor,
  ordenarPor,
  removerDuplicados
};