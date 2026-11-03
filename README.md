# CMMS Bellota · Línea de cuchillas

Aplicación web de gestión de mantenimiento (CMMS) para la línea de cuchillas: Horno de Calentamiento, Noria de Temple y Horno de Revenido (Temple #3), Lijadora #4 y Biseladora #1.
Proyecto académico de Ingeniería Industrial, Universidad Autónoma de Manizales (2026). Es la versión web del CMMS que se construyó primero en Excel.

## Módulos

| Módulo | Qué permite |
|---|---|
| **Dashboard** | MTBF, MTTR, disponibilidad, cumplimiento del plan, costos, Pareto de fallas, tendencia mensual y el efecto del plan (antes y después) |
| **Órdenes de trabajo** | Crear, consultar, editar y eliminar órdenes. El estado, la duración, las horas de paro, los costos y el SLA se calculan solos |
| **Plan preventivo** | CRUD de actividades. Calcula la próxima fecha, los días restantes, el estado (vencido, próximo, al día) y el % de cumplimiento. Tiene un botón para registrar la ejecución |
| **Equipos** | CRUD de equipos con criticidad (P×C) e indicadores por equipo |
| **Hojas de vida** | Ficha, indicadores, modos de falla principales e historial de cada equipo |
| **Catálogo de fallas** | CRUD de modos de falla con su criticidad, eventos, horas, MTTR y ranking |
| **Repuestos** | CRUD de repuestos con alertas de stock y la cantidad a pedir |
| **Técnicos** | CRUD de técnicos con tarifa y carga de trabajo |
| **Costos** | Comparativa correctivo vs. preventivo (réplica del Anexo #4) |
| **Parámetros** | Supuestos del sistema, SLA por prioridad, copias en JSON o CSV y carga de los datos del proyecto |

## Tecnologías (todas gratuitas)

- **React + Vite + TypeScript**: la interfaz.
- **Tailwind CSS**: el diseño. **Recharts**: los gráficos.
- **Supabase**: base de datos PostgreSQL e inicio de sesión.
- **Vercel**: publicación en internet.

## Dos modos de funcionamiento

1. **Modo demostración (sin configurar nada).** Los datos del proyecto se cargan en el navegador y los cambios quedan guardados en ese navegador. Sirve para probar y presentar.
2. **Modo en línea (con Supabase).** Los datos quedan en una base de datos real, compartida por todos los usuarios que inicien sesión.

La aplicación elige el modo sola: si encuentra las variables de Supabase usa el modo en línea; si no, el de demostración.

---

## Paso a paso para publicarla

### 1. Crear la base de datos en Supabase

1. Entra a [supabase.com](https://supabase.com) → **Start your project** → inicia sesión con GitHub.
2. **New project**. Nombre: `cmms-bellota`. Pon una contraseña para la base de datos y elige la región más cercana (por ejemplo, *East US*). Espera a que termine de crearse.
3. Menú **SQL Editor** → **New query** → pega todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) → **Run**. Se crean las 7 tablas con sus reglas de seguridad.
4. Menú **Authentication → Sign In / Providers → Email**: para un proyecto académico conviene **desactivar "Confirm email"**. Así las cuentas nuevas quedan activas sin tener que confirmar el correo.
5. Menú **Project Settings → API** (o **Data API**): copia la **Project URL** y la **anon / publishable key**.

### 2. Publicar en Vercel

1. Entra a [vercel.com](https://vercel.com) con tu cuenta de GitHub.
2. **Add New → Project** → importa el repositorio `cmms-bellota`.
3. En **Environment Variables** agrega:
   - `VITE_SUPABASE_URL` = la Project URL
   - `VITE_SUPABASE_ANON_KEY` = la anon / publishable key
4. **Deploy**. Al terminar, Vercel te da el enlace público de la aplicación.

### 3. Primer ingreso

1. Abre el enlace → **Crear una cuenta** con tu correo y una contraseña.
2. Como la base de datos está vacía, la aplicación ofrece **Cargar datos del proyecto**: 5 equipos, 1.235 órdenes, 51 actividades del plan, 50 modos de falla, 16 repuestos y 12 técnicos.
3. Cada integrante del grupo, y el docente, crea su propia cuenta y todos ven los mismos datos.

> El plan gratuito de Supabase pausa el proyecto después de 7 días sin uso. Se reactiva desde el panel de Supabase con **Restore project**. Conviene abrir la aplicación unos días antes de la sustentación.

---

## Trabajar en el computador (opcional)

Requisitos: [Node.js LTS](https://nodejs.org) y [Visual Studio Code](https://code.visualstudio.com).

```bash
npm install
cp .env.example .env.local   # opcional: pega aquí la URL y la clave de Supabase
npm run dev                  # abre http://localhost:5173
npm run build                # genera la versión de producción en dist/
```

## Estructura del código

```
src/
  lib/calc.ts         Fórmulas del Excel (estado, SLA, MTBF, MTTR, disponibilidad, plan, Pareto, costos)
  lib/store.ts        Guardado de datos: navegador o Supabase
  lib/DataContext.tsx Estado global, periodo de análisis, crear/editar/eliminar
  pages/              Una pantalla por módulo
  components/         Menú lateral, tablas, formularios, tarjetas
  data/seed.json      Datos del proyecto exportados del Excel
supabase/schema.sql   Tablas y reglas de seguridad
```

## Reglas de cálculo (iguales al Excel)

- **Estado de la OT**: sin fecha de inicio = Pendiente · con fecha de inicio = En proceso · con fecha de fin = Completado.
- **Horas de paro**: la duración (fin − inicio) solo cuenta si la OT *detiene producción*.
- **Costo de mano de obra**: horas-hombre × tarifa del técnico. Si el técnico no tiene tarifa propia, se usa la general: salario ÷ horas mensuales = $15.385.
- **MTBF** = (horas de operación del periodo − horas de paro) ÷ número de fallas · **MTTR** = horas de paro correctivas ÷ correctivos cerrados · **Disponibilidad** = (horas de operación − horas de paro) ÷ horas de operación.
- **Horas de operación**: 126 h por semana (3 turnos × 42 h), editables en Parámetros.
- **Plan**: próxima fecha = última ejecución + frecuencia, en días hábiles si la frecuencia es diaria. Estado *Vencido* si ya pasó, *Próximo* si está dentro del aviso.

Los datos del historial y los costos son simulados de referencia, igual que en el documento del proyecto.
