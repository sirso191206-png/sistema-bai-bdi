# Sistema BAI · BDI-II — v2 con backend (Vercel + Supabase)

Panel clínico con **login exclusivo del psicólogo**. El navegador ya no toca
las tablas de Supabase: todos los datos pasan por el backend (`/api`), donde
la service_role key vive como variable de entorno de Vercel.

```
Google Forms ──(Apps Script)──> Supabase <──(service_role)── /api (Vercel) <──token── Navegador (login)
```

## 1. Base de datos (una sola vez)

Supabase > SQL Editor > ejecutar `database/migracion_v2_curp_seguridad.sql`.
Esto agrega la columna CURP, corrige "Evaluados hoy" (zona horaria) y
**cierra el acceso directo** desde el navegador (elimina las policies abiertas).

## 2. Usuario del psicólogo

Supabase > Authentication > Users > **Add user** (correo y contraseña).
No hay registro público: solo entran los usuarios que tú crees aquí.

## 3. Desplegar en Vercel

1. Sube esta carpeta a un repositorio de GitHub (el `apps_script/` puede
   quedarse: no contiene llaves, solo placeholders).
2. En vercel.com > **Add New > Project** > importa el repositorio.
   Framework preset: **Other**. No cambies build settings.
3. En **Settings > Environment Variables** agrega:
   - `SUPABASE_URL` = `https://ltgjomzodwsarmqwchsw.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = la service_role **legacy** (eyJhbGci...)
4. Deploy. La URL queda como `https://tu-proyecto.vercel.app`.

## 4. Google Forms

Agregar a ambos formularios (títulos EXACTOS):
- **CURP** (respuesta corta, con validación de expresión regular opcional:
  `[A-Za-z]{4}[0-9]{6}[A-Za-z]{6}[A-Za-z0-9]{2}`)
- Casilla obligatoria: **He leído y comprendido el aviso de privacidad y
  autorizo el tratamiento de mis datos**
- En la descripción del formulario: la leyenda de Aplicación de Pruebas
  Psicológicas + Aviso de Privacidad Breve.

## 5. Apps Script

Reemplazar los proyectos con `apps_script/Sync_BAI.gs` y `Sync_BDI.gs`
(pegar URL y service_role legacy). Novedad: los pacientes ahora se
identifican **primero por CURP** y después por nombre, lo que evita
duplicados por variaciones de escritura del nombre.

Recordar agregar a `COLUMNAS_METADATO` el título exacto de la casilla de
consentimiento.

## Desarrollo local

```bash
npm install
npx vercel dev
```
(requiere `vercel login` y las variables de entorno con `vercel env pull`)
