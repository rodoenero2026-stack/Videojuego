# 📄 Game Design Document (GDD)
## **Cyber Escape Room: La Brecha**

---

### 1. Ficha Técnica
* **Título del videojuego:** *Cyber Escape Room: La Brecha*
* **Género:** Acción / Escape Room 2D (Top-Down) / Puzzle Educativo de Ciberseguridad
* **Tecnologías utilizadas:** HTML5 (`<canvas>`), CSS3 (Variables Neón Cyberpunk) y JavaScript (ES6+ modular y Web Audio API)
* **Arquitectura de archivos:**
  * `index.html`: Interfaz, HUD mínimo, Canvas 2D, terminales interactivas y pantallas de resumen.
  * `styles.css`: Paleta de colores neón en `:root`, animaciones y diseño responsivo.
  * `player.js`: Movimiento 2D del Auditor (`WASD` / Flechas), animación al caminar y colisiones.
  * `enemies.js`: Bots de Phishing, Drones de Inyección SQL, Jefe Final BRECHA y sistema de partículas.
  * `levels.js`: Diseño de los 3 mapas 2D, diálogos de NPCs, objetos interactivos y pistas.
  * `game.js`: Bucle principal a 60 FPS, sonido sintetizado, puntuación, vidas y flujo de victoria/derrota.

---

### 2. Historia y Personajes
* **Sinopsis:** Un auditor de seguridad informática es contratado para revisar la red central de la institución tras detectar incidentes sospechosos. Al ingresar, una inteligencia hostil llamada **BRECHA** activa el bloqueo de contención, encerrándolo dentro de una simulación dividida en 3 sectores comprometidos.
* **Objetivo general:** Investigar las 3 habitaciones virtuales, esquivar los ataques activos de BRECHA, corregir cada vulnerabilidad técnica para obtener las **3 claves de acceso (`PHISH`, `SQLSAFE`, `ACCESS`)** y escapar del sistema antes de perder todas las vidas.
* **Personajes principales:**
  * **El Auditor (Jugador):** Protagonista controlable en vista 2D desde arriba.
  * **A.R.I.A. (IA Guía):** Subrutina holográfica que orienta al jugador con mensajes claros de máximo 2 líneas.
  * **BRECHA (Villano / Jefe Final):** IA maliciosa que despliega bots de phishing, drones de inyección SQL y ataques de fuerza bruta.
  * **NPCs de apoyo:** *Ing. Sofía (TI)*, *Carlos (Oficina)*, *Ing. David (DBA)* e *Ing. Elena (Control de Accesos)*, quienes brindan pistas técnicas al interactuar con la tecla `E`.

---

### 3. Mecánicas de Juego y Reglas
1. **Ciclo de Juego (3 Pasos):**
   * **Paso 1 — Investiga:** Caminar con `WASD` o `Flechas` y hablar con los NPCs presionando `E`.
   * **Paso 2 — Detecta:** Esquivar los bots enemigos y analizar las pistas o recolectar fragmentos seguros.
   * **Paso 3 — Defiende:** Aplicar la contramedida técnica en la consola central para obtener la clave y abrir la compuerta láser.
2. **Sistema de Vidas (Integridad):**
   * El jugador inicia con **3 vidas**.
   * Ser alcanzado por un enemigo o caer en una trampa (USB infectado, correo mal clasificado, orden SQL erróneo o contraseña débil) resta **1 vida** y activa sacudida de pantalla y parpadeo de invulnerabilidad.
   * Al avanzar a un nuevo nivel, el jugador **recupera +1 vida** (hasta un máximo de 3).
   * Si pierde las 3 vidas, aparece la pantalla **"❌ Sistema Comprometido"** con el botón **[Reintentar habitación actual]**, que reinicia el nivel actual conservando el puntaje previo.
3. **Sistema de Puntuación (0 a 1000 Puntos) y Rangos:**
   * La puntuación máxima es de **1000 puntos** y **nunca baja de 0**.
   * **Nivel 1 (Oficina):** Descartar USB trampa (`+50`), verificar 2 correos seguros (`+50`), reportar 2 correos de phishing (`+200`), bono sin errores (`+50`) = **350 pts**.
   * **Nivel 2 (Servidor):** Recolectar 3 bloques de código (`+150`), ensamblar consulta parametrizada (`+150`), bono sin errores (`+50`) = **350 pts**.
   * **Nivel 3 (Sala de Acceso):** Recolectar 3 piezas de clave y Celular MFA (`+160`), activar clave robusta (`+100`), activar MFA y derrotar a BRECHA (`+150`), bono sin errores (`+50`) = **tope ajustado a 1000 pts**.
   * **Penalizaciones:** Usar una pista (`-25 pts`), cometer un error o recibir daño (`-50 pts`).
   * **Rangos Finales:**
     * **Rango S:** `900 – 1000 pts`
     * **Rango A:** `750 – 899 pts`
     * **Rango B:** `550 – 749 pts`
     * **Rango C:** `0 – 549 pts`

---

### 4. Diseño de Niveles y Correspondencia Técnica

| Nivel | Escenario y Color | Concepto de Ciberseguridad | Mecánica Jugable | Clave Obtenida |
| :--- | :--- | :--- | :--- | :---: |
| **Nivel 1** | **Oficina**<br>*(Neón Cian `#00f0ff`)* | **Ingeniería Social y Phishing** | Esquivar 2 *Bots de Phishing*, hablar con Sofía y Carlos, descartar el **USB trampa** y usar la **Lupa** en la terminal de 4 correos para detectar remitentes falsos y enlaces ocultos. | **`PHISH`** |
| **Nivel 2** | **Sala del Servidor**<br>*(Neón Magenta `#ff2bd6`)* | **Inyección SQL (SQLi)** | Esquivar 3 *Drones SQL*, recoger los **3 Bloques de Código Seguro** (`PREPARE`, `WHERE usuario = ?`, `EXECUTE`) en el mapa y ensamblar la **Consulta Parametrizada** en el Servidor Central. | **`SQLSAFE`** |
| **Nivel 3** | **Sala de Acceso**<br>*(Neón Violeta `#8a2be2`)* | **Autenticación Débil, Fuerza Bruta y MFA** | Esquivar los ataques de *Fuerza Bruta* de **BRECHA**, recoger las **3 piezas de contraseña robusta (`M4r!9xP2#`)** y el **Celular MFA** (código que rota cada 30s), y activar el **Escudo Central** para derrotar al jefe. | **`ACCESS`** |

---

### 5. Resumen Educativo para Exposición

1. **Nivel 1 — Phishing (`PHISH`)**
   * **¿Qué ataque era?** Correos o memorias USB falsas que imitan a una institución confiable para engañar al usuario y robar sus contraseñas.
   * **¿Cómo se previene?** Verificar siempre que el remitente pertenezca al dominio oficial (`@unach.mx`), revisar a dónde apunta realmente cada enlace antes de hacer clic y nunca conectar memorias USB desconocidas.
2. **Nivel 2 — Inyección SQL (`SQLSAFE`)**
   * **¿Qué ataque era?** Introducir fragmentos de código malicioso (como `' OR '1'='1`) en un formulario de inicio de sesión para alterar la consulta de la base de datos y entrar sin contraseña.
   * **¿Cómo se previene?** Utilizar **consultas parametrizadas** (`PREPARE` con marcadores `?`) para separar las instrucciones SQL de los datos ingresados por el usuario.
3. **Nivel 3 — Autenticación Débil y Fuerza Bruta (`ACCESS`)**
   * **¿Qué ataque era?** Probar automáticamente miles de contraseñas comunes o cortas (`123456`, `password`, `admin123`) por segundo hasta adivinar la clave.
   * **¿Cómo se previene?** Emplear contraseñas largas y complejas que combinen mayúsculas, minúsculas, números y símbolos (`M4r!9xP2#`), junto con la **Autenticación Multifactor (MFA)**.
