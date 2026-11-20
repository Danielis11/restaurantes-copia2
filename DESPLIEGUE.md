# Publicar el sitio en Render

El sitio es una sola aplicación Node (Express + WebSocket) con la base en MongoDB Atlas y las fotos en
Cloudinary. Se eligió **Render** porque:

- publica directo desde GitHub y vuelve a publicar solo con cada `git push` a `main`;
- acepta WebSocket, da HTTPS gratis y permite dominio propio;
- no hay que administrar un servidor.

El repositorio ya trae lo necesario:

- **`render.yaml`**: la configuración del servicio.
- **`/salud`**: Render lo consulta para saber si el sitio está vivo. Responde `200` solo si la base de datos está conectada.
- **Fotos de los rincones de Jalpan**: ya están optimizadas en `public/hospedaje/img/jalpan/` (3.8 MB). La carpeta vieja `img_jalpan` (435 MB) ya no se necesita para publicar. Sus originales se quedan en tu equipo.

**Costo:** el plan *Starter* cuesta 7 USD al mes y siempre está despierto. El plan *Free* no cuesta, pero se
duerme tras 15 minutos sin visitas y la siguiente visita tarda cerca de un minuto. Para el sitio público
conviene *Starter*. Para probar sirve *Free*: cambia `plan: starter` por `plan: free` en `render.yaml`.

## 0. Antes de publicar

Cambia las claves filtradas. Los pasos están en [SEGURIDAD-PRODUCCION.md](SEGURIDAD-PRODUCCION.md).
`JWT_SECRET` no hace falta: Render genera uno nuevo.

## 1. Crear el servicio

1. Entra a <https://render.com> y crea una cuenta con tu GitHub.
2. **New → Blueprint** y elige el repositorio `restaurantes-copia2`.
3. Render lee `render.yaml` y pide estos valores (cópialos de tu `.env`, ya con las claves nuevas):

| Variable | Qué es |
|---|---|
| `MONGODB_URI` | Conexión a MongoDB Atlas |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Fotos |
| `MAPBOX_TOKEN` | Mapas (token `pk.`) |
| `DEEPL_API_KEY` | Traducciones |
| `GOOGLE_CLIENT_ID` | Inicio de sesión con Google |
| `EMAIL_USER`, `EMAIL_PASS` | Correo para recuperar contraseñas |
| `SITIO_URL`, `SITE_URL` | Dirección pública. Al principio es `https://turismo-jalpan.onrender.com`; después, tu dominio |

4. **Apply**. La primera publicación tarda unos 3 minutos. Al terminar, el sitio queda en
   `https://turismo-jalpan.onrender.com`. Si ese nombre ya está ocupado, Render agrega letras al final.

## 2. Permitir la conexión a la base de datos

En MongoDB Atlas → **Network Access**, agrega las IP de salida del servicio. Las encuentras en Render →
tu servicio → **Connect → Outbound**. Si `/salud` responde `{"ok":false}`, casi siempre falta este paso.

## 3. Ajustes en otros servicios

- **Google** (Google Cloud Console → Credenciales → tu cliente OAuth): agrega la dirección del sitio en
  *Orígenes autorizados de JavaScript*.
- **Mapbox** (Tokens → URL restrictions): agrega la dirección del sitio.

## 4. Dominio propio (cuando lo tengas)

1. En Render → **Settings → Custom Domains**, agrega el dominio, por ejemplo `turismojalpan.mx`.
2. Render te dice qué registro DNS crear en tu proveedor del dominio. El HTTPS se activa solo.
3. Cambia `SITIO_URL` y `SITE_URL` al dominio nuevo y repite el paso 3 con ese dominio.

## Después de publicar

- Cada `git push` a `main` vuelve a publicar solo.
- Si algo falla, revisa los registros en Render → **Logs**.
- **Respaldos:** `npm run respaldo` desde tu equipo. Atlas también tiene respaldos automáticos en sus planes de pago.
- **No guardes archivos en el servidor:** el disco de Render se borra en cada publicación. Las fotos que suben los socios ya van a Cloudinary, siempre que las variables de Cloudinary estén puestas.
