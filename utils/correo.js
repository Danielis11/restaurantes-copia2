// Envío de correos del sitio (Gmail con EMAIL_USER / EMAIL_PASS del .env).
const nodemailer = require('nodemailer');

let transporte = null;
function obtenerTransporte() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  if (!transporte) {
    transporte = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
  }
  return transporte;
}

function esc(t) {
  return String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Correo con el código para confirmar la cuenta. Devuelve true si se envió.
async function enviarCodigoVerificacion(usuario, codigo) {
  const t = obtenerTransporte();
  if (!t) {
    // Sin correo configurado: en desarrollo se muestra el código en la consola para poder probar
    if (process.env.NODE_ENV !== 'production') console.log(`📧 [dev] Código de verificación para ${usuario.email}: ${codigo}`);
    return false;
  }
  try {
    await t.sendMail({
      from: `"Turismo Jalpan de Serra" <${process.env.EMAIL_USER}>`,
      to: usuario.email,
      subject: `${codigo} es tu código para confirmar tu cuenta`,
      text: `Hola ${usuario.nombre || ''}:\n\nTu código para confirmar tu cuenta en Jalpan de Serra es: ${codigo}\n\nVence en 30 minutos. Si no creaste esta cuenta, ignora este correo.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111827;">
          <h2 style="margin: 0 0 8px; color: #2563eb;">Confirma tu cuenta</h2>
          <p style="color: #4b5563;">Hola ${esc(usuario.nombre || '')}, usa este código para confirmar tu correo y poder opinar en Jalpan de Serra:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; background: #eff6ff; color: #1e40af; padding: 16px; border-radius: 12px; margin: 20px 0;">${esc(codigo)}</div>
          <p style="color: #6b7280; font-size: 14px;">El código vence en 30 minutos. Si tú no creaste esta cuenta, ignora este correo.</p>
        </div>`
    });
    return true;
  } catch (e) {
    console.error('No se pudo enviar el correo de verificación:', e.message);
    return false;
  }
}

// Aviso al negocio: le publicaron una opinión nueva (se llama al aprobarla en el panel central)
async function enviarAvisoNuevaResena({ para, nombre, lugar, rating, comentario, enlacePanel }) {
  const t = obtenerTransporte();
  if (!t || !para) return false;
  const n = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  const estrellas = '★'.repeat(n) + '☆'.repeat(5 - n);
  const enlace = (process.env.SITIO_URL || '') + enlacePanel;
  try {
    await t.sendMail({
      from: `"Turismo Jalpan de Serra" <${process.env.EMAIL_USER}>`,
      to: para,
      subject: `Nueva opinión de ${lugar}`,
      text: `Hola ${nombre || ''}:\n\n${lugar} recibió una opinión nueva (${n}/5):\n\n"${comentario}"\n\nPuedes contestarla desde tu panel: ${enlace}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #111827;">
          <h2 style="margin: 0 0 8px; color: #2563eb;">Nueva opinión de ${esc(lugar)}</h2>
          <p style="color: #4b5563;">Hola ${esc(nombre || '')}, un viajero dejó esta opinión y ya está publicada:</p>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 16px 0;">
            <div style="color: #f59e0b; font-size: 18px;">${estrellas}</div>
            <p style="margin: 8px 0 0; color: #374151; white-space: pre-line;">${esc(comentario)}</p>
          </div>
          <p style="color: #4b5563;">Responder a tiempo y con amabilidad ayuda a que más viajeros te elijan.</p>
          <a href="${esc(enlace)}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: bold;">Responder desde mi panel</a>
        </div>`
    });
    return true;
  } catch (e) {
    console.error('No se pudo enviar el aviso de reseña:', e.message);
    return false;
  }
}

// Acceso para el responsable de un hospedaje dado de alta desde el panel central
async function enviarAccesoSocio({ para, nombre, lugar, clave }) {
  const t = obtenerTransporte();
  if (!t || !para) return false;
  const enlace = (process.env.SITIO_URL || '') + '/hospedaje/login.html';
  try {
    await t.sendMail({
      from: `"Turismo Jalpan de Serra" <${process.env.EMAIL_USER}>`,
      to: para,
      subject: `Tu acceso para administrar ${lugar}`,
      text: `Hola ${nombre || ''}:\n\nDimos de alta ${lugar} en el sitio de turismo de Jalpan de Serra.\n\nEntra en ${enlace}\nCorreo: ${para}\nContraseña temporal: ${clave}\n\nTe recomendamos cambiarla al entrar. Este enlace es solo para ti; no lo compartas.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #111827;">
          <h2 style="margin: 0 0 8px; color: #2563eb;">Bienvenido, ${esc(nombre || '')}</h2>
          <p style="color: #4b5563;">Dimos de alta <strong>${esc(lugar)}</strong> en el sitio de turismo de Jalpan de Serra. Desde tu panel puedes subir fotos, actualizar precios y contestar opiniones.</p>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 6px;">Correo: <strong>${esc(para)}</strong></p>
            <p style="margin: 0;">Contraseña temporal: <strong style="font-family: monospace; font-size: 16px;">${esc(clave)}</strong></p>
          </div>
          <a href="${esc(enlace)}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: bold;">Entrar a mi panel</a>
          <p style="color: #6b7280; font-size: 14px; margin-top: 16px;">Te recomendamos cambiar la contraseña al entrar. Este enlace es solo para ti; no lo compartas.</p>
        </div>`
    });
    return true;
  } catch (e) {
    console.error('No se pudo enviar el acceso del socio:', e.message);
    return false;
  }
}

module.exports = { enviarCodigoVerificacion, enviarAvisoNuevaResena, enviarAccesoSocio, obtenerTransporte };
