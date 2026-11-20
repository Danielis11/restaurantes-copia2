# Antes de publicar el sitio: claves y respaldos

## 1. Cambiar (rotar) las claves filtradas

En los commits `50bf896` y `8a99477` se subieron a GitHub archivos `*audit*.txt` con claves reales.
Ya no están en los archivos actuales, pero **siguen en el historial**, así que hay que considerarlas
públicas y cambiarlas todas. Después de cambiar cada una, pon el valor nuevo en el `.env` del servidor
(nunca en un archivo que se suba a git).

| Clave | Dónde se cambia | Variable del `.env` |
|---|---|---|
| Base de datos (usuario y contraseña de Mongo) | MongoDB Atlas → *Database Access* → editar el usuario → *Edit Password*. Revisa también *Network Access* y deja solo la IP del servidor. | `MONGODB_URI` |
| Firma de sesiones (JWT) | No es de un servicio: genera una nueva con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Al cambiarla, todos tendrán que volver a iniciar sesión. | `JWT_SECRET` |
| Cloudinary | Cloudinary → *Settings* → *API Keys* → generar una nueva y borrar la vieja. | `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| DeepL (traducciones) | DeepL → *Account* → *API Keys* → crear una nueva y borrar la vieja. | `DEEPL_API_KEY` |
| Correo (Gmail) | Cuenta de Google → *Seguridad* → *Contraseñas de aplicaciones* → revocar la vieja y crear otra. | `EMAIL_PASS` |

Los tokens de Mapbox que empiezan con `pk.` son públicos por diseño (van en el navegador), pero conviene
restringirlos en Mapbox → *Tokens* → *URL restrictions* al dominio del sitio.

**Opcional:** borrar los archivos del historial con `git filter-repo` y hacer `git push --force`.
Reescribe la historia del repositorio para todos los que lo tengan clonado; solo vale la pena si el
repositorio es público, y aun así **las claves se tienen que cambiar igual**.

## 2. Respaldos de la base de datos

```bash
npm run respaldo
```

Crea `respaldos/AAAA-MM-DD_HH-MM/` con un archivo por colección y conserva los 14 más recientes
(se cambia con `RESPALDOS_MAXIMOS`). La carpeta no se sube a git porque contiene datos personales.

En el servidor de producción hay que programarlo una vez al día, por ejemplo con cron:

```bash
0 3 * * * cd /ruta/del/sitio && npm run respaldo >> respaldos.log 2>&1
```

y copiar la carpeta `respaldos/` a otro lugar (otro servidor, un bucket o Google Drive): un respaldo
que vive en el mismo disco que la base de datos no sirve si ese disco falla. Si usan MongoDB Atlas de
pago (M10 o mayor), también pueden activar sus *Cloud Backups*.

Para restaurar una colección:

```bash
mongoimport --uri "$MONGODB_URI" --collection restaurants --file respaldos/<fecha>/restaurants.json --jsonArray
```

## 3. Pendientes de despliegue

- Elegir el hosting.
- Subir las fotos de `public/hospedaje/img_jalpan` (435 MB, fuera de git) a Cloudinary o al servidor.
- Configurar `EMAIL_USER` / `EMAIL_PASS` en producción: sin correo, las cuentas nuevas no reciben su
  código de verificación y no pueden opinar.
