// ===== utils/sanitizePlugin.js =====
// Plugin global de Mongoose contra XSS almacenado.
// Limpia TODO texto antes de guardarlo en la base de datos, venga de donde venga
// (JSON, formularios, subidas con multer, rutas viejas o nuevas):
//   - quita etiquetas HTML (<script>, <img onerror=...>, <iframe>, etc.)
//   - neutraliza enlaces "javascript:" / "data:text/html" / "vbscript:"
//   - los embeds de Instagram se reducen a su URL pública (el frontend arma el embed)
// No toca contraseñas ni tokens (se compararían mal después).

const CAMPOS_EXCLUIDOS = /(password|contrase|token|hash|secret)/i;
const ETIQUETAS = /<\/?[a-zA-Z!][^>]*>?/g;           // <b>, </script>, <!-- , <img ... (incluso sin cerrar)
const ESQUEMA_PELIGROSO = /^(javascript|vbscript):|^data:text\/html/i;
const URL_INSTAGRAM = /https:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[A-Za-z0-9_-]+\/?/i;

// "java&#115;cript:", "javascript&colon;" o "  JaVa	ScRiPt:" también cuentan como peligrosos:
// se decodifican entidades y se quitan espacios/controles antes de revisar el inicio.
const ENTIDADES = { colon: ':', tab: '', newline: '', sol: '/', lpar: '(', rpar: ')' };
const pareceEsquemaPeligroso = (s) => {
  const normal = s.slice(0, 80)
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in ENTIDADES ? ENTIDADES[n.toLowerCase()] : m))
    .replace(/[\s\x00-\x1f]/g, '')
    .toLowerCase();
  return ESQUEMA_PELIGROSO.test(normal);
};

function limpiarTexto(valor) {
  if (typeof valor !== 'string') return valor;
  if (!/[<"']/.test(valor) && !pareceEsquemaPeligroso(valor)) return valor;
  let limpio = valor;
  // Repetir por si quitar una etiqueta deja otra armada (ej. "<scr<script>ipt>")
  for (let i = 0; i < 3 && /<\/?[a-zA-Z!]/.test(limpio); i++) limpio = limpio.replace(ETIQUETAS, '');
  if (pareceEsquemaPeligroso(limpio)) return '';
  // Comillas rectas → tipográficas: se ven igual, pero ya no pueden "salirse" de un
  // atributo HTML (alt="...", onclick='...') ni romper el JavaScript de la página
  return limpio.replace(/"/g, '”').replace(/'/g, '’');
}

function limpiarInstagram(valor) {
  if (typeof valor !== 'string') return valor;
  const m = valor.match(URL_INSTAGRAM);
  return m ? m[0] : '';
}

// Recorre objetos/arrays sin entrar en ObjectId, Date, Buffer, etc.
function limpiarProfundo(valor, clave) {
  if (clave && CAMPOS_EXCLUIDOS.test(clave)) return valor;
  if (clave === 'instagramEmbeds') {
    return Array.isArray(valor) ? valor.map(limpiarInstagram).filter(Boolean) : limpiarInstagram(valor);
  }
  if (typeof valor === 'string') return limpiarTexto(valor);
  if (Array.isArray(valor)) {
    for (let i = 0; i < valor.length; i++) valor[i] = limpiarProfundo(valor[i], clave);
    return valor;
  }
  if (valor && typeof valor === 'object' && Object.getPrototypeOf(valor) === Object.prototype) {
    for (const k of Object.keys(valor)) {
      // En updates las claves pueden ser rutas: "menu.0.items.1.descripcion"
      const ultima = k.split('.').filter((p) => !/^\d+$/.test(p) && p !== '$').pop() || k;
      valor[k] = limpiarProfundo(valor[k], k.startsWith('$') ? clave : ultima);
    }
  }
  return valor;
}

module.exports = function sanitizePlugin(schema) {
  // Documentos: create(), save(), insertMany()
  schema.pre('validate', function (next) {
    const doc = this;
    schema.eachPath((ruta, tipo) => {
      if (CAMPOS_EXCLUIDOS.test(ruta)) return;
      const ultima = ruta.split('.').pop();
      if (tipo.instance === 'String') {
        const v = doc.get(ruta);
        const nuevo = ultima === 'instagramEmbeds' ? limpiarInstagram(v) : limpiarTexto(v);
        if (nuevo !== v) doc.set(ruta, nuevo);
      } else if (tipo.instance === 'Array' || tipo.instance === 'Mixed' || tipo.$isMongooseDocumentArray) {
        const v = doc.get(ruta);
        if (v == null) return;
        if (tipo.$isMongooseDocumentArray) return; // los subdocumentos ejecutan su propio pre('validate')
        const plano = typeof v.toObject === 'function' ? v.toObject() : v;
        const antes = JSON.stringify(plano);
        const limpio = limpiarProfundo(plano, ultima);
        if (JSON.stringify(limpio) !== antes) doc.set(ruta, limpio);
      }
    });
    next();
  });

  // Actualizaciones directas: findByIdAndUpdate, updateOne, etc. (no pasan por save)
  const limpiarUpdate = function (next) {
    const update = this.getUpdate();
    if (update && typeof update === 'object') limpiarProfundo(update);
    next();
  };
  ['findOneAndUpdate', 'updateOne', 'updateMany', 'replaceOne', 'findOneAndReplace'].forEach((op) => {
    schema.pre(op, limpiarUpdate);
  });

  schema.pre('insertMany', function (next, docs) {
    if (Array.isArray(docs)) docs.forEach((d) => limpiarProfundo(d));
    next();
  });
};

module.exports.limpiarTexto = limpiarTexto;
module.exports.limpiarProfundo = limpiarProfundo;
