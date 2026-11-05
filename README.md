# Mi Finanzas · Tu centro de control financiero

Aplicación personal en español para gestionar patrimonio, cuentas, gastos, nóminas, carteras de inversión, dividendos, objetivos e informes. **Versión 1.0 · Los datos se guardan exclusivamente en el navegador mediante IndexedDB.**

![Vista del panel](./captura-dashboard.png)

## Empieza a usarla en tu ordenador (Windows)

1. Descomprime la carpeta completa y guárdala, por ejemplo, en `Documentos/Mi Finanzas`.
2. Instala **Node.js LTS** desde [nodejs.org](https://nodejs.org/) si todavía no lo tienes.
3. Haz doble clic en **`iniciar-windows.bat`**. Se abrirá tu navegador en `http://localhost:4173`.
4. La primera vez verás **datos inventados**. Pulsa **Borrar demostración**, crea tus cuentas e introduce tus operaciones.
5. Mantén abierta la ventana del servidor mientras utilices la web. Para cerrar, ciérrala.

No hace falta instalar dependencias ni programar para usar los archivos `dist` ya compilados que incluye este proyecto. Para macOS/Linux, abre una terminal dentro de la carpeta y ejecuta `node scripts/serve.mjs`, y luego visita `http://localhost:4173`.

> **No abras `index.html` haciendo doble clic.** IndexedDB puede no funcionar correctamente con direcciones `file://`. Usa el servidor incluido o GitHub Pages.

## Publicarla gratis mediante GitHub Desktop (sin programar)

**Si todavía no tienes un repositorio:**

1. Instala [GitHub Desktop](https://desktop.github.com/) e inicia sesión en GitHub.
2. En el menú **File → Add local repository**, selecciona la carpeta descomprimida `mi-finanzas`. Este paquete ya es un repositorio local de Git preparado para publicar.
3. Pulsa **Publish repository**. Nombre recomendado: `mi-finanzas`.
4. Para disponer de GitHub Pages gratis con un plan GitHub Free, publica el código como **repositorio público**. Esto **no** publica tus datos financieros, porque no están en el código.
5. En la web de GitHub, abre el repositorio → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
6. En **Actions**, abre la ejecución **Publicar Mi Finanzas** y comprueba que termina en verde. Si no se ha iniciado todavía, usa **Run workflow**.
7. Vuelve a **Settings → Pages** para encontrar la dirección pública de tu web. Si el repositorio se llama `mi-finanzas` y tu usuario es `emartindesoto`, normalmente será `https://emartindesoto.github.io/mi-finanzas/` (no funcionará hasta que se publique).

También puedes publicar sobre un repositorio existente: copia estos archivos dentro de él, en su raíz, y súbelos a la rama `main` respetando la carpeta oculta `.github`.

Para **actualizar** en el futuro, sustituye los archivos del proyecto por una versión nueva y utiliza GitHub Desktop: **Commit to main → Push origin**. GitHub Actions recompilará y publicará automáticamente. Los datos IndexedDB seguirán almacenados bajo la misma dirección de la web y el mismo navegador, salvo que borres su almacenamiento.

**No cambies el nombre o la URL del repositorio sin hacer una copia JSON:** la nueva web tendrá otro origen y no encontrará automáticamente los datos del sitio anterior.

## ¿Qué funciona?

- **Panel de patrimonio:** liquidez, inversiones, deudas, patrimonio neto, ahorro y gráficos por periodos.
- **Movimientos:** añadir, editar, borrar, filtrar, buscar, traspasar entre cuentas y crear categorías personalizadas.
- **Cuentas:** bancos, efectivo, brókeres y préstamos con saldo inicial. Los saldos se calculan a partir de la actividad.
- **Nóminas:** bruto, IRPF, Seguridad Social, retribución flexible y neto recibido, sin duplicar efectivo.
- **Inversiones:** carteras, fondos, acciones, criptomonedas, compras, ventas, entregas sin efectivo, comisiones, valoración manual e historial de precios.
- **Rentabilidad:** coste FIFO de ventas, resultado realizado/no realizado, dividendos netos, resultado acumulado y TIR anualizada XIRR cuando sea calculable.
- **Repsol/retribución flexible:** operación **Entrega de acciones**, precio de adquisición, fecha de compra y fecha opcional a partir de la que se permite vender. No altera el dinero bancario.
- **Dividendos:** cobros brutos y netos con retenciones/comisiones, integrados automáticamente en el saldo y en los informes.
- **Objetivos:** asignaciones, fecha objetivo, progreso y ahorro mensual orientativo; simulador de interés compuesto (hipótesis, no garantía).
- **Informes:** gastos por categorías, gráficos históricos, aportaciones y rentabilidades.
- **Datos:** copia y restauración JSON, exportación CSV, importación CSV y `.xlsx` tabular, comprobación de duplicados y validación de datos.
- **Diseño:** ordenador y móvil, modos claro/oscuro, datos ficticios borrables y aplicación instalable/offline tras la primera carga con conexión.

### Reglas contables importantes

- Un **traspaso entre tus propias cuentas** no es ingreso ni gasto.
- Una **compra de inversiones** mueve dinero de una cuenta a una inversión; no se contabiliza como gasto de consumo ni como beneficio.
- Una **venta** mueve el valor recibido a la cuenta y registra el beneficio/pérdida realizado con coste FIFO y comisiones.
- Un **dividendo** se suma a la cuenta y a los resultados de inversión. El patrimonio solo lo contabiliza una vez.
- El importe de **retribución flexible en la nómina** es informativo. Si se materializa en acciones, registra también la **entrega sin efectivo**; no se suma dos veces al salario neto.
- Un **préstamo** se modela como una cuenta de **deuda con saldo negativo**. Recibirlo o devolver principal son transferencias, no ingresos/gastos; los intereses pagados son gastos.
- El **patrimonio neto** = liquidez + valor de inversiones − deuda pendiente. Los objetivos no crean patrimonio adicional.
- Las participaciones **bloqueadas** no pueden venderse antes de la fecha de desbloqueo.
- Los resultados históricos dependen de los precios introducidos manualmente. **Sin historial de cotizaciones completo, las curvas de valoración antiguas son aproximadas**. La rentabilidad simple es resultado / coste de compra bruto acumulado; XIRR utiliza la fecha de los flujos.
- No se descargan precios de mercado ni tipos de cambio de terceros. **Todos los importes se introducen en euros**: para activos cotizados en otras divisas, convierte los importes tú mismo.

## Cómo importar CSV / Excel

Desde **Datos y seguridad → Importar movimientos**, selecciona un `.csv` o `.xlsx` con encabezados:

```csv
fecha;tipo;cuenta;importe;categoria;concepto;destino
2026-11-05;gasto;Cuenta corriente;25,50;Alimentación;Supermercado;
2026-11-05;transferencia;Cuenta corriente;200;Transferencias;Traspaso a ahorro;Cuenta de ahorro
```

- **fecha**: `AAAA-MM-DD` o `DD/MM/AAAA`.
- **tipo**: `ingreso`, `gasto`, `transferencia`, o `income`, `expense`, `transfer`.
- **cuenta**: nombre EXACTO de una cuenta que ya hayas creado en la web.
- **importe**: positivo y expresado en euros. Se acepta coma decimal.
- **categoría**: si no existe se crea automáticamente (para ingresos/gastos).
- **concepto**: descripción de la operación.
- **destino**: obligatorio en transferencias, debe coincidir con otra cuenta existente.

La importación muestra un resumen antes de guardar y salta los movimientos duplicados según fecha, tipo, cuenta, destino, importe, categoría y concepto. El soporte Excel se centra en hojas `.xlsx` convencionales con datos tabulares; no ejecuta macros ni fórmulas.

## Seguridad y privacidad

**No requiere acceso a bancos, claves ni servicios externos.** Los datos personales se almacenan en IndexedDB en el navegador donde utilizas la web. No están incluidos en el repositorio ni en sus archivos de demostración. El código fuente sí puede ser público.

**Advertencias importantes:**

- Los datos **no se sincronizan** entre PC, teléfono, distintos navegadores o distintas URL.
- Si borras los datos del sitio, utilizas navegación privada o pierdes el dispositivo, **puedes perder toda la información**.
- Haz una **copia JSON al menos una vez al mes y antes de cada actualización importante**. Guarda la copia en una carpeta privada, idealmente cifrada; nunca la subas al repositorio público.
- La aplicación **no cifra IndexedDB por sí misma ni protege con contraseña**; cualquiera que entre en tu perfil de navegador podría ver esos datos. Usa un perfil de sistema protegido y evita equipos compartidos.
- No incluye sincronización bancaria automática, cotizaciones automáticas, asesoramiento de inversión ni presentación fiscal.
- La caché offline guarda solamente archivos públicos de la aplicación, **nunca los datos financieros**.

## Para modificar el código y ejecutar pruebas

La primera versión se ha implementado con **TypeScript, HTML/CSS, IndexedDB y gráficos SVG**. Se ha preferido una **web estática sin dependencias en tiempo de ejecución** frente a React/Vite/Tailwind/Recharts: funciona muy bien con GitHub Pages, tiene una instalación pequeña, es rápida y puede ejecutarse localmente sin descargar bibliotecas. El código está separado en módulos, de modo que se puede migrar a React y añadir un adaptador de autenticación/sincronización privada con Supabase en otra versión, pero **Supabase no está conectado**.

```bash
npm install
npm run build
npm test
npm run preview
```

- `src/models.ts`: tipos, entidades y formato español.
- `src/finance.ts`: saldos, FIFO, XIRR, dividendos, patrimonio y proyecciones.
- `src/store.ts`: persistencia IndexedDB y validación de copias.
- `src/views.ts`: pantallas, tablas, gráficos SVG y formularios.
- `src/app.ts`: acciones, eventos, importación/exportación y coordinación de estados.
- `src/xlsx.ts`: lector ligero de XLSX (tablas).
- `src/demo.ts`: datos ficticios independientes de los tuyos.
- `dist/`: versión compilada lista para ejecutar.
- `tests/`: pruebas unitarias con `node:test`.
- `.github/workflows/deploy.yml`: compilación, pruebas y publicación en GitHub Pages.

La rama recomendada para publicar es `main`. No se necesita servidor de datos: GitHub Pages solo distribuye los archivos estáticos. Para futuras sincronizaciones privadas entre dispositivos sería necesario incorporar autenticación, reglas de acceso por usuario, cifrado adecuado y un mecanismo de migraciones/conflictos antes de conectar Supabase.
