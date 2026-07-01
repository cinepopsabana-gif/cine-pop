# Cine Pop — Guía de instalación con Supabase y Vercel

Esta versión de la app ya está conectada a Supabase (base de datos real en la
nube). Esto es necesario porque el sitio va a recibir compras de clientes
reales desde distintos dispositivos, y todos necesitan ver los mismos
asientos, ventas y películas.

Sigue estos pasos en orden. No necesitas saber programación, solo copiar y
pegar donde se indique.

---

## PARTE 1: Crear el proyecto en Supabase (gratis)

1. Ve a **https://supabase.com**
2. Click en **"Start your project"** y crea una cuenta (puedes usar tu cuenta
   de GitHub o tu correo).
3. Click en **"New project"**.
4. Completa:
   - **Name**: `cine-pop` (o el nombre que quieras)
   - **Database password**: crea una contraseña segura y guárdala en algún
     lugar seguro (no la necesitarás para los pasos siguientes, pero es bueno
     tenerla)
   - **Region**: elige la más cercana (por ejemplo, una de Estados Unidos si
     estás en Latinoamérica)
5. Click en **"Create new project"** y espera 1-2 minutos mientras se crea.

## PARTE 2: Crear las tablas de la base de datos

1. Dentro de tu proyecto de Supabase, ve al menú lateral y click en
   **"SQL Editor"**.
2. Click en **"New query"**.
3. Abre el archivo **`supabase_schema.sql`** (está incluido en esta carpeta),
   selecciona todo el contenido (Ctrl+A) y cópialo (Ctrl+C).
4. Pégalo en el editor SQL de Supabase.
5. Click en **"Run"** (o presiona Ctrl+Enter).
6. Debe decir "Success. No rows returned" — eso significa que las tablas se
   crearon correctamente.

## PARTE 3: Obtener tus claves de conexión

1. En Supabase, ve a **Project Settings** (ícono de engranaje) → **API**.
2. Vas a ver dos datos que necesitas copiar:
   - **Project URL** (algo como `https://abcdefgh.supabase.co`)
   - **anon public** key (un texto largo, dentro de "Project API keys")

## PARTE 4: Configurar el proyecto con tus claves

1. En la carpeta del proyecto, busca el archivo `.env.example`.
2. Haz una copia y renómbrala a `.env.local`.
3. Ábrelo con el Bloc de notas y complétalo así:

```
GEMINI_API_KEY="tu_clave_de_gemini"
VITE_SUPABASE_URL="https://abcdefgh.supabase.co"
VITE_SUPABASE_ANON_KEY="tu_clave_anon_public_aqui"
```

4. Guarda el archivo.

## PARTE 5: Probar que funciona localmente (opcional pero recomendado)

1. Abre la carpeta del proyecto en la terminal (CMD).
2. Ejecuta `npm install` (si no lo habías hecho antes).
3. Ejecuta `npm run dev`.
4. Abre `http://localhost:3000` — deberías ver la app cargando las películas.
   Si compras un boleto, ve a Supabase → **Table Editor** → tabla
   `sales_history` y deberías ver el registro nuevo ahí.

---

## PARTE 6: Subir el proyecto a GitHub

Vercel necesita que el código esté en GitHub para poder publicarlo.

1. Ve a **https://github.com** y crea una cuenta si no tienes.
2. Click en **"New repository"**.
3. Ponle un nombre, por ejemplo `cine-pop`, y créalo (puede ser privado).
4. Sigue las instrucciones de GitHub para subir tu carpeta del proyecto
   ("…or push an existing repository from the command line"), o usa
   **GitHub Desktop** (https://desktop.github.com) si prefieres no usar
   comandos — es una app con botones que hace lo mismo.

   Importante: el archivo `.env.local` con tus claves **no se debe subir a
   GitHub** (el archivo `.gitignore` del proyecto ya está configurado para
   excluirlo automáticamente, así que no tienes que hacer nada extra).

## PARTE 7: Publicar en Vercel

1. Ve a **https://vercel.com** y crea una cuenta (puedes usar tu cuenta de
   GitHub para entrar directo).
2. Click en **"Add New..."** → **"Project"**.
3. Busca y selecciona el repositorio que subiste a GitHub (`cine-pop`).
4. Antes de hacer click en "Deploy", busca la sección **"Environment
   Variables"** y agrega estas tres, una por una:

   | Name | Value |
   |---|---|
   | `GEMINI_API_KEY` | tu clave de Gemini |
   | `VITE_SUPABASE_URL` | tu Project URL de Supabase |
   | `VITE_SUPABASE_ANON_KEY` | tu clave anon public de Supabase |

5. Click en **"Deploy"**.
6. Espera 1-2 minutos. Cuando termine, Vercel te da una URL pública como
   `https://cine-pop.vercel.app` — ¡esa es la dirección que puedes compartir
   con tus clientes!

---

## Cómo funciona ahora (importante entender esto)

- Cualquier persona que entre a la URL pública puede comprar boletos, y todos
  ven los mismos asientos ocupados en tiempo real.
- Si dos personas intentan comprar el mismo asiento al mismo segundo, el
  sistema solo le permite a una completar la compra — la otra recibe un
  aviso de que ese asiento ya no está disponible.
- El panel de administración sigue siendo accesible agregando `#admin` al
  final de la URL (por ejemplo `https://cine-pop.vercel.app/#admin`). Ten en
  cuenta que **no tiene contraseña real** — cualquiera que conozca esa
  dirección puede entrar a administrar películas, precios, y ver el
  historial de ventas. Si esto te preocupa, lo ideal sería agregar un login
  real más adelante.

## Si necesitas hacer cambios después

Cualquier cambio que quieras hacerle al código, lo haces en tu computadora,
lo subes a GitHub (`git push` o con GitHub Desktop), y Vercel **automáticamente
vuelve a publicar la app actualizada** en la misma URL. No tienes que repetir
los pasos de Vercel cada vez.
