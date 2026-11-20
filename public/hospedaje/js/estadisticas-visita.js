// Cuenta la visita a la ficha de un hospedaje y los clics a WhatsApp, teléfono, mapa y sitio web.
// El servidor ignora las repeticiones de la misma persona durante 30 minutos.
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  var tipo = params.get('tipo');
  var id = params.get('id');
  if (!/^(hotel|cabana|airbnb)$/.test(tipo || '') || !/^[a-f0-9]{24}$/i.test(id || '')) return;

  function enviar(evento) {
    var url = '/api/hospedaje/estadisticas/' + tipo + '/' + id + '/' + evento;
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(url)) return;
    } catch (e) { /* se intenta con fetch */ }
    fetch(url, { method: 'POST', keepalive: true }).catch(function () {});
  }

  enviar('vista');

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i.test(href)) enviar('whatsapp');
    else if (/^tel:/i.test(href)) enviar('telefono');
    else if (/google\.[a-z.]+\/maps|maps\.google\.|goo\.gl\/maps|maps\.app\.goo\.gl|waze\.com/i.test(href)) enviar('mapa');
    else if (/^https?:\/\//i.test(href) && a.host !== location.host) enviar('web');
  }, true);
})();
