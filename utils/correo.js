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

module.exports = { enviarCodigoVerificacion, obtenerTransporte };
