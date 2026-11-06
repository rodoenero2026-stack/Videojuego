/**
 * ============================================================================
 * CYBER ESCAPE ROOM: LA BRECHA — MOTOR PRINCIPAL DEL JUEGO 2D (game.js)
 * Gestiona los 3 niveles completos en HTML5 Canvas:
 *  - Nivel 1: Oficina (Phishing) -> Clave: PHISH
 *  - Nivel 2: Sala del Servidor (Inyección SQL) -> Clave: SQLSAFE
 *  - Nivel 3: Sala de Acceso (Contraseña Fuerte + MFA vs BRECHA) -> Clave: ACCESS
 * ============================================================================
 */

const EstadoJuego = {
  enEjecucion: false,
  pausado: false,           // Pausa manual (P / Esc / botón HUD) o por cambio de pestaña
  pausadoPorModal: false,
  dificultad: 'normal',     // 'facil' | 'normal' | 'dificil'
  habitacionActual: 1,
  vidas: 3,                 // Vidas según dificultad (5 / 3 / 2)
  vidasMaximas: 3,
  puntos: 0,                // Puntuación (0 a 1000 máx, nunca menor a 0)
  puntosAntesHabitacion: 0,
  erroresHabitacion: 0,
  sonidoSilenciado: false,
  lupaActiva: false,
  idCorreoSeleccionado: 1,
  temblorPantalla: 0,

  // Claves obtenidas por nivel
  claves: {
    1: false, // PHISH
    2: false, // SQLSAFE
    3: false  // ACCESS
  },

  // Estado Nivel 1
  nivel1: {
    indicePista: 0,
    correosReportados: 0,
    metaCorreosPhishing: 2,
    progresoPuerta: 0
  },

  // Estado Nivel 2 (Servidor SQL)
  nivel2: {
    indicePista: 0,
    bloquesRecolectados: [],
    ordenArmado: [],
    progresoPuerta: 0
  },

  // Estado Nivel 3 (Sala de Acceso y Jefe BRECHA)
  nivel3: {
    indicePista: 0,
    piezasRecolectadas: [], // ['pieza1', 'pieza2', 'pieza3', 'mfa']
    claveFuerteElegida: false,
    mfaActivado: false,
    codigoMfa: '482 915',
    temporizadorMfa: 30,
    temporizadorRayo: 0,    // Rayo láser del escudo que derrota a BRECHA
    progresoPuerta: 0
  }
};

/** Devuelve el objeto de configuración de la dificultad activa */
function obtenerConfigDificultad() {
  const diccionario = window.CONFIG_DIFICULTAD || {};
  return diccionario[EstadoJuego.dificultad] || diccionario.normal || {
    clave: 'normal',
    nombre: 'Normal',
    insignia: 'NORMAL (x1)',
    vidasMaximas: 3,
    multVelocidadEnemigos: 1.0,
    cambioCantidadEnemigos: 0,
    recuperacionVida: 1,
    penalizacionPista: -25,
    multiplicadorPuntos: 1.0,
    resumen: '3 Vidas (+1 por nivel) • Enemigos estándar • Pista: -25 pts • Puntos: x1'
  };
}

/** Cambia la dificultad en la pantalla de inicio y actualiza la interfaz */
function seleccionarDificultad(claveDif) {
  if (!window.CONFIG_DIFICULTAD || !window.CONFIG_DIFICULTAD[claveDif]) return;
  EstadoJuego.dificultad = claveDif;
  const config = obtenerConfigDificultad();
  EstadoJuego.vidasMaximas = config.vidasMaximas;
  EstadoJuego.vidas = config.vidasMaximas;

  document.querySelectorAll('.diff-btn').forEach((boton) => {
    const activo = boton.getAttribute('data-dificultad') === claveDif;
    boton.classList.toggle('active', activo);
    boton.setAttribute('aria-pressed', String(activo));
  });

  const elementoResumen = document.getElementById('difficulty-summary');
  if (elementoResumen) {
    elementoResumen.textContent = config.resumen;
  }

  actualizarHUD();
}

/* ============================================================================
   1. SONIDOS SINTETIZADOS (Web Audio API)
   ============================================================================ */
const EfectosSonido = {
  ctxAudio: null,

  iniciar() {
    if (!this.ctxAudio) {
      const ContextoAudio = window.AudioContext || window.webkitAudioContext;
      if (ContextoAudio) this.ctxAudio = new ContextoAudio();
    }
    if (this.ctxAudio && this.ctxAudio.state === 'suspended') {
      this.ctxAudio.resume();
    }
  },

  reproducirClic(frecuencia = 680) {
    if (EstadoJuego.sonidoSilenciado) return;
    this.iniciar();
    if (!this.ctxAudio) return;

    const ahora = this.ctxAudio.currentTime;
    const oscilador = this.ctxAudio.createOscillator();
    const ganancia = this.ctxAudio.createGain();
    oscilador.type = 'triangle';
    oscilador.frequency.setValueAtTime(frecuencia, ahora);
    oscilador.frequency.exponentialRampToValueAtTime(frecuencia * 1.35, ahora + 0.06);

    ganancia.gain.setValueAtTime(0.08, ahora);
    ganancia.gain.exponentialRampToValueAtTime(0.001, ahora + 0.065);

    oscilador.connect(ganancia);
    ganancia.connect(this.ctxAudio.destination);
    oscilador.start(ahora);
    oscilador.stop(ahora + 0.07);
  },

  reproducirGolpe() {
    if (EstadoJuego.sonidoSilenciado) return;
    this.iniciar();
    if (!this.ctxAudio) return;

    const ahora = this.ctxAudio.currentTime;
    const oscilador = this.ctxAudio.createOscillator();
    const ganancia = this.ctxAudio.createGain();
    oscilador.type = 'sawtooth';
    oscilador.frequency.setValueAtTime(175, ahora);
    oscilador.frequency.setValueAtTime(98, ahora + 0.14);

    ganancia.gain.setValueAtTime(0.15, ahora);
    ganancia.gain.exponentialRampToValueAtTime(0.001, ahora + 0.32);

    oscilador.connect(ganancia);
    ganancia.connect(this.ctxAudio.destination);
    oscilador.start(ahora);
    oscilador.stop(ahora + 0.34);
  },

  reproducirExito() {
    if (EstadoJuego.sonidoSilenciado) return;
    this.iniciar();
    if (!this.ctxAudio) return;

    const notas = [523.25, 659.25, 783.99, 1046.5];
    notas.forEach((frecuencia, indice) => {
      const ahora = this.ctxAudio.currentTime + indice * 0.06;
      const oscilador = this.ctxAudio.createOscillator();
      const ganancia = this.ctxAudio.createGain();
      oscilador.type = 'triangle';
      oscilador.frequency.setValueAtTime(frecuencia, ahora);

      ganancia.gain.setValueAtTime(0.1, ahora);
      ganancia.gain.exponentialRampToValueAtTime(0.001, ahora + 0.28);

      oscilador.connect(ganancia);
      ganancia.connect(this.ctxAudio.destination);
      oscilador.start(ahora);
      oscilador.stop(ahora + 0.3);
    });
  }
};

/* ============================================================================
   2. HUD, NARRADOR IA Y PUNTUACIÓN
   ============================================================================ */

function hablarIA(mensaje) {
  const narrador = document.getElementById('ai-narrator');
  const elementoTexto = document.getElementById('ai-text');
  narrador.classList.remove('hidden');
  elementoTexto.textContent = mensaje;
}

function activarEfectoGlitch() {
  const capaGlitch = document.getElementById('glitch-overlay');
  capaGlitch.classList.remove('hidden');
  setTimeout(() => {
    capaGlitch.classList.add('hidden');
  }, 320);
}

function actualizarHUD() {
  const config = obtenerConfigDificultad();
  const porcentajeVidas = Math.round((EstadoJuego.vidas / EstadoJuego.vidasMaximas) * 100);
  const elementoTextoVidas = document.getElementById('integrity-text');
  const elementoBarraVidas = document.getElementById('integrity-bar-fill');
  const contenedorBarra = document.querySelector('.integrity-bar-wrapper');
  const contenedorSegmentos = document.querySelector('.integrity-segments');

  elementoTextoVidas.textContent = `${EstadoJuego.vidas} / ${EstadoJuego.vidasMaximas}`;
  elementoBarraVidas.style.width = `${porcentajeVidas}%`;

  if (contenedorBarra) {
    contenedorBarra.setAttribute('aria-valuemax', String(EstadoJuego.vidasMaximas));
    contenedorBarra.setAttribute('aria-valuenow', String(EstadoJuego.vidas));
  }

  if (contenedorSegmentos && contenedorSegmentos.children.length !== EstadoJuego.vidasMaximas) {
    contenedorSegmentos.style.gridTemplateColumns = `repeat(${EstadoJuego.vidasMaximas}, 1fr)`;
    contenedorSegmentos.innerHTML = '<span class="segment"></span>'.repeat(EstadoJuego.vidasMaximas);
  }

  elementoBarraVidas.classList.remove('integrity-warn', 'integrity-critical');
  if (EstadoJuego.vidas <= 1) {
    elementoBarraVidas.classList.add('integrity-critical');
  } else if (EstadoJuego.vidas <= Math.ceil(EstadoJuego.vidasMaximas * 0.6)) {
    elementoBarraVidas.classList.add('integrity-warn');
  }

  const insigniaDif = document.getElementById('hud-difficulty');
  if (insigniaDif) {
    insigniaDif.textContent = config.insignia;
    insigniaDif.classList.remove('diff-facil', 'diff-normal', 'diff-dificil');
    insigniaDif.classList.add(`diff-${config.clave}`);
  }

  const botonPista = document.getElementById('btn-hint');
  if (botonPista) {
    botonPista.textContent = `💡 Pista (${config.penalizacionPista})`;
    botonPista.title = `Ver una pista (${config.penalizacionPista} puntos)`;
  }

  document.getElementById('hud-score').textContent = String(EstadoJuego.puntos);
}

/**
 * Modifica la puntuación aplicando el multiplicador de dificultad a los puntos ganados
 * @param {number} cambio Cambio base de puntos
 * @param {boolean} aplicarMultiplicador Si aplica el multiplicador de dificultad (x0.8 / x1 / x1.5)
 */
function modificarPuntos(cambio, aplicarMultiplicador = true) {
  const config = obtenerConfigDificultad();
  const cambioFinal = cambio > 0 && aplicarMultiplicador
    ? Math.round(cambio * config.multiplicadorPuntos)
    : cambio;
  EstadoJuego.puntos = Math.min(1000, Math.max(0, EstadoJuego.puntos + cambioFinal));
  actualizarHUD();
  return cambioFinal;
}

function danarJugador(motivo) {
  EfectosSonido.reproducirGolpe();
  activarEfectoGlitch();
  EstadoJuego.temblorPantalla = 0.35;

  if (jugador && sistemaParticulas) {
    jugador.tiempoInvulnerable = 1.6;
    sistemaParticulas.estallar(jugador.x, jugador.y, '#ff1f4b', 26);
  }

  EstadoJuego.vidas = Math.max(0, EstadoJuego.vidas - 1);
  EstadoJuego.erroresHabitacion += 1;
  modificarPuntos(-50, false);

  hablarIA(`❌ ${motivo} Pierdes 1 vida (-50 puntos).`);

  if (EstadoJuego.vidas <= 0) {
    EstadoJuego.enEjecucion = false;
    setTimeout(() => {
      activarDerrota(motivo);
    }, 420);
  }
}

function mostrarPantalla(idPantalla) {
  document.querySelectorAll('.screen').forEach((pantalla) => {
    pantalla.classList.add('hidden');
    pantalla.classList.remove('active');
  });
  const destino = document.getElementById(idPantalla);
  if (destino) {
    destino.classList.remove('hidden');
    destino.classList.add('active');
  }
}

/* ============================================================================
   3. INICIALIZACIÓN DE LOS 3 NIVELES EN EL CANVAS 2D
   ============================================================================ */
let lienzo = null;
let ctx = null;
let datosNivel = null;
let jugador = null;
let enemigos = [];
let sistemaParticulas = null;
let objetoInteractivoActivo = null;
const teclasPresionadas = {};
let tiempoUltimoFotograma = performance.now();

/** Genera un nuevo código MFA aleatorio de 6 dígitos */
function generarNuevoCodigoMFA() {
  const numero = Math.floor(100000 + Math.random() * 900000);
  EstadoJuego.nivel3.codigoMfa = `${String(numero).slice(0, 3)} ${String(numero).slice(3)}`;
  EstadoJuego.nivel3.temporizadorMfa = 30;
}

/**
 * Carga y arranca el Nivel indicado (1 = Oficina, 2 = Servidor SQL, 3 = Sala de Acceso)
 * @param {number} numeroHabitacion 1, 2 o 3
 * @param {boolean} esReintento Si es un reintento tras perder las vidas
 */
function iniciarNivel(numeroHabitacion, esReintento = false) {
  const configDif = obtenerConfigDificultad();
  EstadoJuego.vidasMaximas = configDif.vidasMaximas;
  EstadoJuego.habitacionActual = numeroHabitacion;
  EstadoJuego.erroresHabitacion = 0;
  EstadoJuego.pausado = false;
  EstadoJuego.pausadoPorModal = false;

  const modalPausa = document.getElementById('modal-pause');
  if (modalPausa) modalPausa.classList.add('hidden');

  if (esReintento || numeroHabitacion === 1) {
    // Al iniciar el juego o reintentar la habitación actual, restaura las vidas máximas de la dificultad
    EstadoJuego.vidas = EstadoJuego.vidasMaximas;
    if (esReintento) {
      EstadoJuego.puntos = EstadoJuego.puntosAntesHabitacion;
    } else {
      EstadoJuego.puntosAntesHabitacion = EstadoJuego.puntos;
    }
  } else {
    // Al avanzar a un nuevo nivel (2 o 3), recupera vidas según la dificultad (hasta el máximo)
    EstadoJuego.vidas = Math.min(EstadoJuego.vidasMaximas, EstadoJuego.vidas + configDif.recuperacionVida);
    EstadoJuego.puntosAntesHabitacion = EstadoJuego.puntos;
  }

  const notaRecuperacion = configDif.recuperacionVida > 0
    ? `+${configDif.recuperacionVida} vida${configDif.recuperacionVida > 1 ? 's' : ''} recuperada${configDif.recuperacionVida > 1 ? 's' : ''}`
    : 'Sin recuperación de vida en Difícil';

  const contenedorApp = document.getElementById('game-app');
  contenedorApp.classList.remove('theme-cyan', 'theme-magenta', 'theme-violet');

  if (numeroHabitacion === 1) {
    EstadoJuego.claves[1] = false;
    EstadoJuego.lupaActiva = false;
    EstadoJuego.nivel1.correosReportados = 0;
    EstadoJuego.nivel1.progresoPuerta = 0;

    CORREOS_NIVEL_1.forEach((correo) => {
      correo.estado = 'pendiente';
    });

    datosNivel = crearDatosNivel1(configDif);
    contenedorApp.classList.add('theme-cyan');

    document.getElementById('hud-room-title').textContent = datosNivel.nombre;
    document.getElementById('mission-objective-text').innerHTML =
      `<strong>Objetivo:</strong> ${datosNivel.objetivo}`;
    document.getElementById('mission-counter-label').textContent = datosNivel.etiquetaContador;
    document.getElementById('l1-phish-counter').textContent = '0 / 2';

    hablarIA(`Nivel 1 [${configDif.nombre}]: Muévete con WASD o Flechas y presiona E cerca de los personajes o de la 💻 Terminal.`);
  } else if (numeroHabitacion === 2) {
    EstadoJuego.claves[2] = false;
    EstadoJuego.nivel2.bloquesRecolectados = [];
    EstadoJuego.nivel2.ordenArmado = [];
    EstadoJuego.nivel2.progresoPuerta = 0;

    datosNivel = crearDatosNivel2(configDif);
    contenedorApp.classList.add('theme-magenta');

    document.getElementById('hud-room-title').textContent = datosNivel.nombre;
    document.getElementById('mission-objective-text').innerHTML =
      `<strong>Objetivo:</strong> ${datosNivel.objetivo}`;
    document.getElementById('mission-counter-label').textContent = datosNivel.etiquetaContador;
    document.getElementById('l1-phish-counter').textContent = '0 / 3';

    hablarIA(`Nivel 2 (${notaRecuperacion}): Recoge los 3 🧩 Bloques de Código con E y ve al 🖥️ Servidor SQL.`);
  } else if (numeroHabitacion === 3) {
    EstadoJuego.claves[3] = false;
    EstadoJuego.nivel3.piezasRecolectadas = [];
    EstadoJuego.nivel3.claveFuerteElegida = false;
    EstadoJuego.nivel3.mfaActivado = false;
    EstadoJuego.nivel3.temporizadorRayo = 0;
    EstadoJuego.nivel3.progresoPuerta = 0;
    generarNuevoCodigoMFA();

    datosNivel = crearDatosNivel3(configDif);
    contenedorApp.classList.add('theme-violet');

    document.getElementById('hud-room-title').textContent = datosNivel.nombre;
    document.getElementById('mission-objective-text').innerHTML =
      `<strong>Objetivo:</strong> ${datosNivel.objetivo}`;
    document.getElementById('mission-counter-label').textContent = datosNivel.etiquetaContador;
    document.getElementById('l1-phish-counter').textContent = '0 / 4';

    hablarIA(`Nivel 3 (${notaRecuperacion}): Recoge las 3 🔑 Piezas de Clave y el 📱 Celular MFA con E para derrotar a BRECHA.`);
  }

  jugador = new Jugador(datosNivel.inicioJugador.x, datosNivel.inicioJugador.y);
  enemigos = datosNivel.enemigos.map((cfg) => new BotEnemigo(cfg));
  sistemaParticulas = new SistemaParticulas();

  document.getElementById('game-hud').classList.remove('hidden');
  actualizarHUD();
  mostrarPantalla('screen-level-1');

  EstadoJuego.enEjecucion = true;
  tiempoUltimoFotograma = performance.now();
}

/* ============================================================================
   3B. SISTEMA DE PAUSA (TECLA P / ESC, BOTÓN HUD Y CAMBIO DE PESTAÑA)
   ============================================================================ */

/** Sincroniza el estado visual del sonido en el HUD y en el menú de pausa */
function sincronizarUISonido() {
  const botonAudioHud = document.getElementById('btn-audio');
  if (botonAudioHud) {
    botonAudioHud.textContent = EstadoJuego.sonidoSilenciado ? '🔇' : '🔊';
  }
  const botonAudioPausa = document.getElementById('btn-pause-audio');
  if (botonAudioPausa) {
    botonAudioPausa.textContent = EstadoJuego.sonidoSilenciado
      ? '🔇 Sonido: SILENCIADO'
      : '🔊 Sonido: ACTIVADO';
  }
}

/** Alterna activar/silenciar sonido */
function alternarSilencioSonido() {
  EstadoJuego.sonidoSilenciado = !EstadoJuego.sonidoSilenciado;
  sincronizarUISonido();
  if (!EstadoJuego.sonidoSilenciado) {
    EfectosSonido.reproducirClic(720);
  }
}

/** Congela enemigos, movimiento y temporizadores mostrando el menú de pausa */
function pausarJuego(esAutomatico = false) {
  if (!EstadoJuego.enEjecucion || EstadoJuego.pausado) return;
  EstadoJuego.pausado = true;

  // Limpiar teclas presionadas para evitar movimiento residual al reanudar
  Object.keys(teclasPresionadas).forEach((tecla) => {
    teclasPresionadas[tecla] = false;
  });
  if (jugador) {
    jugador.enMovimiento = false;
  }

  const subtituloPausa = document.getElementById('pause-subtitle');
  if (subtituloPausa) {
    subtituloPausa.textContent = esAutomatico
      ? 'Pausa automática activada al cambiar de pestaña.'
      : 'Simulación congelada — Temporizadores y enemigos detenidos.';
  }

  sincronizarUISonido();
  const modal = document.getElementById('modal-pause');
  if (modal) modal.classList.remove('hidden');

  if (!esAutomatico) {
    EfectosSonido.reproducirClic(540);
  }
}

/** Reanuda la partida desde el menú de pausa */
function reanudarJuego() {
  if (!EstadoJuego.pausado) return;
  EstadoJuego.pausado = false;
  tiempoUltimoFotograma = performance.now();

  const modal = document.getElementById('modal-pause');
  if (modal) modal.classList.add('hidden');
  EfectosSonido.reproducirClic(760);
}

/** Alterna entre pausar y continuar */
function alternarPausa() {
  if (!EstadoJuego.enEjecucion) return;
  if (EstadoJuego.pausado) {
    reanudarJuego();
  } else {
    pausarJuego(false);
  }
}

/** Sale de la partida actual hacia el menú principal */
function salirAlMenuPrincipal() {
  EfectosSonido.reproducirClic(500);
  cerrarClienteCorreo();
  cerrarModalServidorSQL();
  cerrarModalEscudoAuth();
  cerrarModalObjeto();

  const modalPausa = document.getElementById('modal-pause');
  if (modalPausa) modalPausa.classList.add('hidden');

  EstadoJuego.enEjecucion = false;
  EstadoJuego.pausado = false;
  EstadoJuego.pausadoPorModal = false;

  document.getElementById('game-hud').classList.add('hidden');
  document.getElementById('ai-narrator').classList.add('hidden');

  const contenedorApp = document.getElementById('game-app');
  contenedorApp.classList.remove('theme-cyan', 'theme-magenta', 'theme-violet');
  contenedorApp.classList.add('theme-cyan');

  mostrarPantalla('screen-start');
}

/* ============================================================================
   4. BUCLE PRINCIPAL DEL JUEGO (ACTUALIZAR Y DIBUJAR A 60 FPS)
   ============================================================================ */
function bucleJuego(ahora) {
  const dt = Math.min(0.05, (ahora - tiempoUltimoFotograma) / 1000);
  tiempoUltimoFotograma = ahora;

  if (EstadoJuego.enEjecucion && lienzo && ctx && datosNivel) {
    if (!EstadoJuego.pausado) {
      // Actualizar reloj del código MFA de 30 segundos en el Nivel 3 (se congela en pausa)
      if (EstadoJuego.habitacionActual === 3) {
        actualizarRelojMFA(dt);
      }

      if (!EstadoJuego.pausadoPorModal) {
        actualizarJuego(dt);
      }
    }
    dibujarJuego();
  }

  requestAnimationFrame(bucleJuego);
}

/** Rotación automática cada 30 segundos del código MFA en el Nivel 3 */
function actualizarRelojMFA(dt) {
  EstadoJuego.nivel3.temporizadorMfa -= dt;
  if (EstadoJuego.nivel3.temporizadorMfa <= 0) {
    generarNuevoCodigoMFA();
    if (!document.getElementById('modal-auth-shield').classList.contains('hidden')) {
      renderizarModalEscudoAuth();
    }
  }
  const elementoSegundos = document.getElementById('mfa-seconds-left');
  if (elementoSegundos) {
    elementoSegundos.textContent = String(Math.max(1, Math.ceil(EstadoJuego.nivel3.temporizadorMfa)));
  }
}

function actualizarJuego(dt) {
  if (EstadoJuego.temblorPantalla > 0) {
    EstadoJuego.temblorPantalla = Math.max(0, EstadoJuego.temblorPantalla - dt);
  }

  if (EstadoJuego.nivel3.temporizadorRayo > 0) {
    EstadoJuego.nivel3.temporizadorRayo = Math.max(0, EstadoJuego.nivel3.temporizadorRayo - dt);
  }

  const claveActualDesbloqueada = EstadoJuego.claves[EstadoJuego.habitacionActual];
  const obstaculoPuerta = datosNivel.obstaculos.find((o) => o.esPuerta);

  if (claveActualDesbloqueada && obstaculoPuerta) {
    if (EstadoJuego.habitacionActual === 1) {
      EstadoJuego.nivel1.progresoPuerta = Math.min(1, EstadoJuego.nivel1.progresoPuerta + dt * 1.8);
      if (EstadoJuego.nivel1.progresoPuerta >= 0.85) obstaculoPuerta.abierta = true;
    } else if (EstadoJuego.habitacionActual === 2) {
      EstadoJuego.nivel2.progresoPuerta = Math.min(1, EstadoJuego.nivel2.progresoPuerta + dt * 1.8);
      if (EstadoJuego.nivel2.progresoPuerta >= 0.85) obstaculoPuerta.abierta = true;
    } else if (EstadoJuego.habitacionActual === 3) {
      EstadoJuego.nivel3.progresoPuerta = Math.min(1, EstadoJuego.nivel3.progresoPuerta + dt * 1.8);
      if (EstadoJuego.nivel3.progresoPuerta >= 0.85) obstaculoPuerta.abierta = true;
    }
  }

  // Movimiento del jugador
  jugador.actualizar(dt, teclasPresionadas, datosNivel.obstaculos, lienzo.width, lienzo.height);

  // Actualizar enemigos y colisiones
  for (const bot of enemigos) {
    bot.actualizar(dt);
    if (bot.tocaJugador(jugador)) {
      danarJugador(`Te alcanzó ${bot.etiqueta}.`);
    }
  }

  // Detectar objeto/NPC más cercano para interactuar con [E]
  objetoInteractivoActivo = null;
  let distanciaMinima = Infinity;

  for (const objeto of datosNivel.interactuables) {
    if ((objeto.tipo === 'bloqueCodigo' || objeto.tipo === 'piezaEscudo') && objeto.recolectado) continue;
    const distancia = Math.hypot(jugador.x - objeto.x, jugador.y - objeto.y);
    if (distancia <= objeto.radio + jugador.radio + 14 && distancia < distanciaMinima) {
      distanciaMinima = distancia;
      objetoInteractivoActivo = objeto;
    }
  }

  // Cruzar zona de salida con la clave desbloqueada completa la habitación
  if (objetoInteractivoActivo && objetoInteractivoActivo.tipo === 'salida' && claveActualDesbloqueada) {
    if (EstadoJuego.habitacionActual === 1) completarNivel1();
    else if (EstadoJuego.habitacionActual === 2) completarNivel2();
    else if (EstadoJuego.habitacionActual === 3) completarNivel3();
  }

  sistemaParticulas.actualizar(dt);
}

/**
 * Dibuja una etiqueta con pastilla oscura de fondo para evitar que se encime o corte
 */
function dibujarEtiquetaPastilla(ctx, texto, x, y, colorTexto = '#00f0ff', colorBorde = 'rgba(0,240,255,0.45)') {
  ctx.save();
  ctx.font = 'bold 11px "Share Tech Mono", "Consolas", "Courier New", monospace';
  const rellenoX = 10;
  const altoCaja = 17;
  const anchoTexto = ctx.measureText(texto).width + rellenoX;

  const posX = Math.max(anchoTexto / 2 + 4, Math.min(960 - anchoTexto / 2 - 4, x));
  const posY = Math.max(altoCaja / 2 + 4, Math.min(520 - altoCaja / 2 - 4, y));

  ctx.fillStyle = 'rgba(8, 12, 24, 0.88)';
  ctx.fillRect(posX - anchoTexto / 2, posY - altoCaja / 2, anchoTexto, altoCaja);
  ctx.strokeStyle = colorBorde;
  ctx.lineWidth = 1;
  ctx.strokeRect(posX - anchoTexto / 2, posY - altoCaja / 2, anchoTexto, altoCaja);

  ctx.fillStyle = colorTexto;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, posX, posY + 1);
  ctx.restore();
}

/** Dibuja todo el mapa 2D del nivel activo */
function dibujarJuego() {
  ctx.save();

  if (EstadoJuego.temblorPantalla > 0) {
    const magnitud = EstadoJuego.temblorPantalla * 18;
    ctx.translate((Math.random() - 0.5) * magnitud, (Math.random() - 0.5) * magnitud);
  }

  const claveActualDesbloqueada = EstadoJuego.claves[EstadoJuego.habitacionActual];
  let colorCuadricula = 'rgba(0, 240, 255, 0.08)';
  if (EstadoJuego.habitacionActual === 2) colorCuadricula = 'rgba(255, 43, 214, 0.08)';
  else if (EstadoJuego.habitacionActual === 3) colorCuadricula = 'rgba(138, 43, 226, 0.11)';

  // 1. Piso con cuadrícula neón
  ctx.fillStyle = '#070b16';
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);

  ctx.strokeStyle = colorCuadricula;
  ctx.lineWidth = 1;
  for (let x = 0; x < lienzo.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, lienzo.height);
    ctx.stroke();
  }
  for (let y = 0; y < lienzo.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(lienzo.width, y);
    ctx.stroke();
  }

  // 2. Pasillo de Salida a la derecha
  ctx.fillStyle = claveActualDesbloqueada ? 'rgba(57, 255, 20, 0.12)' : 'rgba(255, 31, 75, 0.06)';
  ctx.fillRect(845, 185, 110, 130);

  // 3. Paredes, escritorios, racks y compuerta láser
  for (const obs of datosNivel.obstaculos) {
    if (obs.esPuerta) {
      dibujarPuertaLaser(ctx, obs);
      continue;
    }

    ctx.save();
    ctx.fillStyle = '#0e1a32';
    ctx.strokeStyle = obs.color || '#00f0ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = obs.color || '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fillRect(obs.x, obs.y, obs.ancho, obs.alto);
    ctx.strokeRect(obs.x, obs.y, obs.ancho, obs.alto);
    ctx.restore();

    if (obs.etiqueta) {
      dibujarEtiquetaPastilla(ctx, obs.etiqueta, obs.x + obs.ancho / 2, obs.y + obs.alto / 2, '#eef6ff', obs.color);
    }
  }

  // 4. Rayo del Escudo Central cuando derrota a BRECHA en el Nivel 3
  if (EstadoJuego.habitacionActual === 3 && EstadoJuego.nivel3.temporizadorRayo > 0) {
    ctx.save();
    ctx.strokeStyle = '#39ff14';
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 22;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(500, 250);
    ctx.lineTo(755, 250);
    ctx.stroke();
    ctx.restore();
  }

  // 5. NPCs y Objetos Interactivos
  for (const objeto of datosNivel.interactuables) {
    if ((objeto.tipo === 'bloqueCodigo' || objeto.tipo === 'piezaEscudo') && objeto.recolectado) continue;
    dibujarInteractuable(ctx, objeto);
  }

  // 6. Enemigos y Jefe BRECHA
  for (const bot of enemigos) {
    bot.dibujar(ctx);
  }

  // 7. Jugador
  jugador.dibujar(ctx);

  // 8. Partículas
  sistemaParticulas.dibujar(ctx);

  // 9. Cartel flotante "[E] ..."
  if (objetoInteractivoActivo) {
    dibujarAvisoInteraccion(ctx, objetoInteractivoActivo);
  }

  ctx.restore();
}

function dibujarPuertaLaser(ctx, puerta) {
  ctx.save();
  let progreso = EstadoJuego.nivel1.progresoPuerta;
  if (EstadoJuego.habitacionActual === 2) progreso = EstadoJuego.nivel2.progresoPuerta;
  else if (EstadoJuego.habitacionActual === 3) progreso = EstadoJuego.nivel3.progresoPuerta;

  const desbloqueada = EstadoJuego.claves[EstadoJuego.habitacionActual];
  const desplazamientoApertura = progreso * (puerta.alto / 2);
  const altoHoja = puerta.alto / 2 - desplazamientoApertura;
  const color = desbloqueada ? '#39ff14' : '#ff1f4b';

  if (altoHoja > 2) {
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillRect(puerta.x, puerta.y, puerta.ancho, altoHoja);
    ctx.fillRect(puerta.x, puerta.y + puerta.alto - altoHoja, puerta.ancho, altoHoja);
  }
  ctx.restore();

  dibujarEtiquetaPastilla(
    ctx,
    desbloqueada ? '🔓 ABIERTA' : '🔒 PUERTA',
    puerta.x - 38,
    puerta.y - 14,
    color,
    color
  );
}

function dibujarInteractuable(ctx, objeto) {
  ctx.save();
  ctx.translate(objeto.x, objeto.y);

  if (objeto.tipo === 'npc' || objeto.tipo === 'villano') {
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#0a1426';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = objeto.color;
    ctx.shadowColor = objeto.color;
    ctx.shadowBlur = 10;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const icono = objeto.tipo === 'villano' ? '👾' : objeto.id.includes('aria') ? '🤖' : '🧑‍💻';
    ctx.fillText(icono, 0, 1);
    ctx.restore();

    dibujarEtiquetaPastilla(ctx, objeto.nombre, objeto.x, objeto.y - 28, objeto.color, objeto.color);
  } else if (objeto.tipo === 'terminal' || objeto.tipo === 'servidorSql' || objeto.tipo === 'escudoAuth') {
    ctx.fillStyle = '#061a2e';
    ctx.strokeStyle = objeto.color;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = objeto.color;
    ctx.shadowBlur = 12;
    ctx.fillRect(-42, -18, 84, 36);
    ctx.strokeRect(-42, -18, 84, 36);
    ctx.restore();

    dibujarEtiquetaPastilla(ctx, objeto.nombre, objeto.x, objeto.y, objeto.color, objeto.color);
  } else if (objeto.tipo === 'usb') {
    ctx.fillStyle = objeto.revisado ? '#1b2838' : '#2a0d2e';
    ctx.strokeStyle = objeto.revisado ? '#7996aa' : '#ff2bd6';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff2bd6';
    ctx.shadowBlur = objeto.revisado ? 0 : 10;
    ctx.fillRect(-26, -12, 52, 24);
    ctx.strokeRect(-26, -12, 52, 24);
    ctx.restore();

    const colorUsb = objeto.revisado ? '#7996aa' : '#ff2bd6';
    dibujarEtiquetaPastilla(ctx, objeto.revisado ? '✓ USB' : objeto.nombre, objeto.x, objeto.y, colorUsb, colorUsb);
  } else if (objeto.tipo === 'bloqueCodigo' || objeto.tipo === 'piezaEscudo') {
    ctx.fillStyle = '#072026';
    ctx.strokeStyle = objeto.color;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = objeto.color;
    ctx.shadowBlur = 12;
    ctx.fillRect(-20, -14, 40, 28);
    ctx.strokeRect(-20, -14, 40, 28);
    ctx.restore();

    dibujarEtiquetaPastilla(ctx, objeto.nombre, objeto.x, objeto.y - 26, objeto.color, objeto.color);
  } else if (objeto.tipo === 'salida') {
    const desbloqueada = EstadoJuego.claves[EstadoJuego.habitacionActual];
    const color = desbloqueada ? '#39ff14' : '#ff1f4b';
    const mapaClaves = { 1: 'PHISH', 2: 'SQLSAFE', 3: 'ACCESS' };
    const nombreClave = mapaClaves[EstadoJuego.habitacionActual];

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(-34, -22, 68, 44);
    ctx.restore();

    dibujarEtiquetaPastilla(
      ctx,
      desbloqueada ? 'SALIDA ▶' : `🔒 ${nombreClave}`,
      objeto.x,
      objeto.y,
      color,
      color
    );
  } else {
    ctx.restore();
  }
}

function dibujarAvisoInteraccion(ctx, objeto) {
  const texto = objeto.aviso || '[E] Interactuar';
  const posY = objeto.y > 430 ? objeto.y - 46 : objeto.y + 42;
  dibujarEtiquetaPastilla(ctx, texto, objeto.x, posY, '#39ff14', '#39ff14');
}

/* ============================================================================
   5. INTERACCIÓN CON LA TECLA [E]
   ============================================================================ */
function manejarTeclaInteraccion() {
  if (!EstadoJuego.enEjecucion || EstadoJuego.pausado || EstadoJuego.pausadoPorModal || !objetoInteractivoActivo) return;

  const objeto = objetoInteractivoActivo;
  EfectosSonido.reproducirClic(760);

  if (objeto.tipo === 'npc' || objeto.tipo === 'villano') {
    sistemaParticulas.estallar(objeto.x, objeto.y, objeto.color, 14);
    hablarIA(objeto.dialogo);
  } else if (objeto.tipo === 'terminal') {
    abrirClienteCorreo();
  } else if (objeto.tipo === 'usb') {
    inspeccionarUSB(objeto);
  } else if (objeto.tipo === 'bloqueCodigo') {
    recogerBloqueCodigo(objeto);
  } else if (objeto.tipo === 'servidorSql') {
    abrirModalServidorSQL();
  } else if (objeto.tipo === 'piezaEscudo') {
    recogerPiezaEscudo(objeto);
  } else if (objeto.tipo === 'escudoAuth') {
    abrirModalEscudoAuth();
  } else if (objeto.tipo === 'salida') {
    const desbloqueada = EstadoJuego.claves[EstadoJuego.habitacionActual];
    if (desbloqueada) {
      if (EstadoJuego.habitacionActual === 1) completarNivel1();
      else if (EstadoJuego.habitacionActual === 2) completarNivel2();
      else if (EstadoJuego.habitacionActual === 3) completarNivel3();
    } else {
      const mensajes = {
        1: '🔒 Puerta cerrada: reporta los 2 correos falsos en la 💻 Terminal para obtener la clave PHISH.',
        2: '🔒 Puerta cerrada: recoge los 3 bloques y parchea el 🖥️ Servidor SQL para obtener SQLSAFE.',
        3: '🔒 Puerta cerrada: recoge las 4 piezas y activa el 🛡️ Escudo Central para derrotar a BRECHA y obtener ACCESS.'
      };
      hablarIA(mensajes[EstadoJuego.habitacionActual]);
    }
  }
}

/* ============================================================================
   6. MECÁNICAS DEL NIVEL 1 (USB Y TERMINAL DE 4 CORREOS)
   ============================================================================ */
function abrirModalObjeto(titulo, cuerpoHTML, pieHTML = '') {
  EstadoJuego.pausadoPorModal = true;
  document.getElementById('obj-modal-title').innerHTML = titulo;
  document.getElementById('obj-modal-body').innerHTML = cuerpoHTML;
  document.getElementById('obj-modal-footer').innerHTML = pieHTML;
  document.getElementById('modal-object').classList.remove('hidden');
}

function cerrarModalObjeto() {
  EfectosSonido.reproducirClic(520);
  document.getElementById('modal-object').classList.add('hidden');
  EstadoJuego.pausadoPorModal = false;
}

function inspeccionarUSB(objetoUsb) {
  if (objetoUsb.revisado) {
    hablarIA('Ya revisaste esta memoria USB.');
    return;
  }

  abrirModalObjeto(
    '🔌 USB sospechoso en la mesa',
    `<p style="margin-bottom:12px;">Encontraste un USB sin dueño con la etiqueta <strong>"PREMIOS Y NÓMINAS"</strong>.</p>
     <p class="text-cyan">¿Qué decides hacer?</p>`,
    `<button class="cyber-btn btn-danger" type="button" id="btn-usb-plug">Conectar a la PC</button>
     <button class="cyber-btn btn-primary" type="button" id="btn-usb-isolate">Descartar USB (+50 pts)</button>`
  );

  document.getElementById('btn-usb-plug').addEventListener('click', () => {
    objetoUsb.revisado = true;
    cerrarModalObjeto();
    danarJugador('Conectaste el USB trampa y ejecutó un virus.');
  });

  document.getElementById('btn-usb-isolate').addEventListener('click', () => {
    objetoUsb.revisado = true;
    EfectosSonido.reproducirExito();
    const ganados = modificarPuntos(50);
    sistemaParticulas.estallar(objetoUsb.x, objetoUsb.y, '#39ff14', 24);
    cerrarModalObjeto();
    hablarIA(`¡Bien hecho (+${ganados} puntos)! Evitaste el USB trampa. Nunca conectes memorias desconocidas.`);
  });
}

function abrirClienteCorreo() {
  EstadoJuego.pausadoPorModal = true;
  document.getElementById('modal-email-client').classList.remove('hidden');
  renderizarListaCorreos();
  seleccionarCorreo(EstadoJuego.idCorreoSeleccionado);

  if (!EstadoJuego.lupaActiva) {
    hablarIA('Activa el botón "🔍 Usar lupa" arriba a la derecha para descubrir los enlaces falsos.');
  }
}

function cerrarClienteCorreo() {
  EfectosSonido.reproducirClic(520);
  document.getElementById('modal-email-client').classList.add('hidden');
  EstadoJuego.pausadoPorModal = false;
}

function renderizarListaCorreos() {
  const elementoLista = document.getElementById('email-list');
  elementoLista.innerHTML = '';

  CORREOS_NIVEL_1.forEach((correo) => {
    const itemLi = document.createElement('li');
    itemLi.className = `email-item ${correo.id === EstadoJuego.idCorreoSeleccionado ? 'active' : ''}`;

    let etiquetaEstado = '';
    if (correo.estado === 'cuarentena') {
      etiquetaEstado = '<span class="email-status-pill pill-quarantined">PHISHING</span>';
    } else if (correo.estado === 'verificado') {
      etiquetaEstado = '<span class="email-status-pill pill-verified">SEGURO</span>';
    }

    itemLi.innerHTML = `
      <div class="email-item-top">
        <span>Correo #${correo.id}</span>
        ${etiquetaEstado}
      </div>
      <div class="email-item-subject">${correo.asunto}</div>
      <div class="mono-text" style="font-size:0.78rem; color:var(--text-secondary);">${correo.correoRemitente}</div>
    `;

    itemLi.addEventListener('click', () => {
      EfectosSonido.reproducirClic(740);
      seleccionarCorreo(correo.id);
    });

    elementoLista.appendChild(itemLi);
  });

  document.getElementById('email-modal-counter').textContent =
    `Correos falsos: ${EstadoJuego.nivel1.correosReportados} / ${EstadoJuego.nivel1.metaCorreosPhishing}`;
}

function seleccionarCorreo(id) {
  EstadoJuego.idCorreoSeleccionado = id;
  renderizarListaCorreos();

  const correo = CORREOS_NIVEL_1.find((c) => c.id === id);
  if (!correo) return;

  const elementoDetalle = document.getElementById('email-detail-content');
  elementoDetalle.innerHTML = `
    <div class="email-header-card">
      <div class="email-header-row"><strong>De:</strong> ${correo.aliasRemitente} (<span class="text-cyan">${correo.correoRemitente}</span>)</div>
      <div class="email-header-row"><strong>Asunto:</strong> ${correo.asunto}</div>
    </div>
    <div class="email-body-box">
      <p>${correo.cuerpo}</p>
      <div class="email-fake-link">🔗 Enlace: ${correo.textoEnlace}</div>
    </div>
  `;

  const panelLupa = document.getElementById('forensic-lens-panel');
  const rejillaLupa = document.getElementById('forensic-lens-grid');

  if (EstadoJuego.lupaActiva) {
    panelLupa.classList.remove('hidden');
    const claseAlerta = correo.esPhishing ? 'lens-alert' : 'lens-safe';
    rejillaLupa.innerHTML = `
      <div class="lens-item ${claseAlerta}">
        <strong>Enlace real oculto:</strong> ${correo.urlReal}
      </div>
      <div class="lens-item ${claseAlerta}">
        <strong>Diagnóstico:</strong> ${correo.pistaLupa}
      </div>
    `;
  } else {
    panelLupa.classList.add('hidden');
  }

  const botonSeguro = document.getElementById('btn-mark-safe');
  const botonPhishing = document.getElementById('btn-report-phishing');
  const procesado = correo.estado !== 'pendiente';
  botonSeguro.disabled = procesado;
  botonPhishing.disabled = procesado;
  botonSeguro.style.opacity = procesado ? '0.45' : '1';
  botonPhishing.style.opacity = procesado ? '0.45' : '1';
}

function alternarLupa() {
  EstadoJuego.lupaActiva = !EstadoJuego.lupaActiva;
  EfectosSonido.reproducirClic(840);

  const boton = document.getElementById('btn-toggle-magnifier');
  const texto = document.getElementById('magnifier-state-text');
  boton.classList.toggle('active', EstadoJuego.lupaActiva);
  texto.textContent = EstadoJuego.lupaActiva ? 'SÍ' : 'NO';

  seleccionarCorreo(EstadoJuego.idCorreoSeleccionado);
}

function marcarCorreoActualSeguro() {
  const correo = CORREOS_NIVEL_1.find((c) => c.id === EstadoJuego.idCorreoSeleccionado);
  if (!correo || correo.estado !== 'pendiente') return;

  if (correo.esPhishing) {
    danarJugador(`El correo #${correo.id} era phishing y lo marcaste como seguro.`);
  } else {
    EfectosSonido.reproducirClic(880);
    correo.estado = 'verificado';
    const ganados = modificarPuntos(25);
    renderizarListaCorreos();
    seleccionarCorreo(correo.id);
    hablarIA(`✓ Correcto (+${ganados} puntos): el correo #${correo.id} viene de @unach.mx y es legítimo.`);
  }
}

function reportarCorreoActualPhishing() {
  const correo = CORREOS_NIVEL_1.find((c) => c.id === EstadoJuego.idCorreoSeleccionado);
  if (!correo || correo.estado !== 'pendiente') return;

  if (correo.esPhishing) {
    EfectosSonido.reproducirExito();
    correo.estado = 'cuarentena';
    EstadoJuego.nivel1.correosReportados += 1;
    const ganados = modificarPuntos(100);

    document.getElementById('l1-phish-counter').textContent =
      `${EstadoJuego.nivel1.correosReportados} / ${EstadoJuego.nivel1.metaCorreosPhishing}`;

    renderizarListaCorreos();
    seleccionarCorreo(correo.id);

    if (EstadoJuego.nivel1.correosReportados >= EstadoJuego.nivel1.metaCorreosPhishing) {
      EstadoJuego.claves[1] = true;
      if (EstadoJuego.erroresHabitacion === 0) {
        modificarPuntos(50);
      }
      actualizarHUD();
      sistemaParticulas.estallar(505, 250, '#39ff14', 35);
      sistemaParticulas.estallar(827, 250, '#39ff14', 35);

      setTimeout(() => {
        cerrarClienteCorreo();
        hablarIA('🔑 ¡Clave PHISH obtenida! La compuerta láser derecha se ha abierto. Camina hacia SALIDA.');
      }, 450);
    } else {
      hablarIA(`✅ ¡Correo falso reportado (+${ganados} puntos)! Encuentra 1 correo falso más.`);
    }
  } else {
    danarJugador(`El correo #${correo.id} era legítimo de @unach.mx.`);
  }
}

/* ============================================================================
   7. MECÁNICAS DEL NIVEL 2 (BLOQUES DE CÓDIGO Y CONSOLA DEL SERVIDOR SQL)
   ============================================================================ */
function recogerBloqueCodigo(objetoBloque) {
  if (objetoBloque.recolectado) return;

  objetoBloque.recolectado = true;
  EstadoJuego.nivel2.bloquesRecolectados.push(objetoBloque.ordenBloque);
  EfectosSonido.reproducirExito();
  const ganados = modificarPuntos(50);
  sistemaParticulas.estallar(objetoBloque.x, objetoBloque.y, '#39ff14', 28);

  const cantidad = EstadoJuego.nivel2.bloquesRecolectados.length;
  document.getElementById('l1-phish-counter').textContent = `${cantidad} / 3`;

  const infoBloque = BLOQUES_CODIGO_NIVEL_2.find((b) => b.orden === objetoBloque.ordenBloque);
  if (cantidad >= 3) {
    hablarIA(`✅ ¡Recogiste los 3 bloques (+${ganados} pts)! Ahora acércate al 🖥️ Servidor SQL en el centro y presiona E.`);
  } else {
    hablarIA(`🧩 Recogiste ${infoBloque.tituloCorto} (+${ganados} pts): ${infoBloque.descripcion} (${cantidad}/3).`);
  }
}

function abrirModalServidorSQL() {
  EstadoJuego.pausadoPorModal = true;
  document.getElementById('modal-sql-server').classList.remove('hidden');
  renderizarConsolaSQL();

  if (EstadoJuego.nivel2.bloquesRecolectados.length < 3) {
    hablarIA(`Tienes ${EstadoJuego.nivel2.bloquesRecolectados.length}/3 bloques. Recoge los bloques verdes que faltan en la sala con E.`);
  } else {
    hablarIA('Haz clic en los 3 bloques en el orden correcto: 1. PREPARE -> 2. WHERE usuario = ? -> 3. EXECUTE.');
  }
}

function cerrarModalServidorSQL() {
  EfectosSonido.reproducirClic(520);
  document.getElementById('modal-sql-server').classList.add('hidden');
  EstadoJuego.pausadoPorModal = false;
}

function renderizarConsolaSQL() {
  const contenedorRanuras = document.getElementById('sql-slots-container');
  const contenedorInventario = document.getElementById('sql-blocks-inventory');
  const elementoContador = document.getElementById('sql-modal-counter');

  elementoContador.textContent = `Bloques colocados: ${EstadoJuego.nivel2.ordenArmado.length} / 3`;
  contenedorRanuras.innerHTML = '';

  for (let i = 1; i <= 3; i++) {
    const ordenColocado = EstadoJuego.nivel2.ordenArmado[i - 1];
    const divRanura = document.createElement('div');
    if (ordenColocado) {
      const bloque = BLOQUES_CODIGO_NIVEL_2.find((b) => b.orden === ordenColocado);
      divRanura.className = 'sql-slot filled';
      divRanura.textContent = `✓ Paso ${i}: ${bloque.codigo}`;
    } else {
      divRanura.className = 'sql-slot';
      divRanura.textContent = `[ Ranura ${i}: Esperando bloque #${i}... ]`;
    }
    contenedorRanuras.appendChild(divRanura);
  }

  contenedorInventario.innerHTML = '';
  BLOQUES_CODIGO_NIVEL_2.forEach((bloque) => {
    const estaRecolectado = EstadoJuego.nivel2.bloquesRecolectados.includes(bloque.orden);
    const estaColocado = EstadoJuego.nivel2.ordenArmado.includes(bloque.orden);

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'sql-block-card';
    boton.disabled = !estaRecolectado || estaColocado || EstadoJuego.claves[2];

    if (!estaRecolectado) {
      boton.innerHTML = `<strong>🔒 Bloque #${bloque.orden} (En el mapa)</strong><code>Recógelo caminando hacia él con [E]</code>`;
    } else {
      boton.innerHTML = `<strong>${estaColocado ? '✓ ' : '🧩 '}${bloque.tituloCorto}</strong><code>${bloque.codigo}</code>`;
      boton.addEventListener('click', () => colocarBloqueSQL(bloque.orden));
    }
    contenedorInventario.appendChild(boton);
  });
}

function colocarBloqueSQL(orden) {
  if (EstadoJuego.claves[2]) return;

  const ordenEsperado = EstadoJuego.nivel2.ordenArmado.length + 1;
  if (orden !== ordenEsperado) {
    danarJugador(`Orden incorrecto: el paso ${ordenEsperado} requiere el Bloque #${ordenEsperado}.`);
    EstadoJuego.nivel2.ordenArmado = [];
    renderizarConsolaSQL();
    return;
  }

  EfectosSonido.reproducirClic(860);
  EstadoJuego.nivel2.ordenArmado.push(orden);
  renderizarConsolaSQL();

  if (EstadoJuego.nivel2.ordenArmado.length === 3) {
    EstadoJuego.claves[2] = true;
    EfectosSonido.reproducirExito();
    modificarPuntos(150);
    if (EstadoJuego.erroresHabitacion === 0) {
      modificarPuntos(50);
    }

    const preCodigo = document.getElementById('sql-vulnerable-code');
    preCodigo.textContent = 'PREPARE stmt FROM "SELECT * FROM usuarios WHERE usuario = ?"; EXECUTE stmt USING @user;';
    preCodigo.classList.add('patched');

    document.getElementById('sql-exploit-status').className = 'mono-text text-green';
    document.getElementById('sql-exploit-status').textContent =
      '✅ VULNERABILIDAD CORREGIDA: Clave SQLSAFE obtenida.';

    sistemaParticulas.estallar(552, 251, '#39ff14', 35);
    sistemaParticulas.estallar(827, 250, '#39ff14', 35);

    setTimeout(() => {
      cerrarModalServidorSQL();
      hablarIA('🔑 ¡Servidor parcheado! Obtuviste la clave SQLSAFE y la compuerta láser derecha se abrió.');
    }, 650);
  }
}

/* ============================================================================
   8. MECÁNICAS DEL NIVEL 3 (PIEZAS DE CONTRASEÑA, CELULAR MFA Y JEFE BRECHA)
   ============================================================================ */

/** Recoge una de las 3 piezas de contraseña fuerte o el Celular MFA en el Nivel 3 */
function recogerPiezaEscudo(objetoPieza) {
  if (objetoPieza.recolectado) return;

  objetoPieza.recolectado = true;
  EstadoJuego.nivel3.piezasRecolectadas.push(objetoPieza.idPieza);
  EfectosSonido.reproducirExito();
  const ganados = modificarPuntos(40);
  sistemaParticulas.estallar(objetoPieza.x, objetoPieza.y, objetoPieza.color, 28);

  const cantidad = EstadoJuego.nivel3.piezasRecolectadas.length;
  document.getElementById('l1-phish-counter').textContent = `${cantidad} / 4`;

  if (cantidad >= 4) {
    hablarIA('✅ ¡Tienes las 3 piezas de la clave fuerte (M4r!9xP2#) y el 📱 Celular MFA! Ve al 🛡️ Escudo Central y presiona E.');
  } else {
    hablarIA(`✨ ${objetoPieza.descripcion} (+${ganados} pts) [${cantidad}/4].`);
  }
}

function abrirModalEscudoAuth() {
  EstadoJuego.pausadoPorModal = true;
  document.getElementById('modal-auth-shield').classList.remove('hidden');
  renderizarModalEscudoAuth();

  if (EstadoJuego.nivel3.piezasRecolectadas.length < 4) {
    hablarIA(`Llevas ${EstadoJuego.nivel3.piezasRecolectadas.length}/4 piezas. Recoge las piezas faltantes en el mapa con la tecla E.`);
  } else {
    hablarIA('Paso 1: Elige la contraseña fuerte M4r!9xP2#. Paso 2: Activa la Autenticación Multifactor (MFA).');
  }
}

function cerrarModalEscudoAuth() {
  EfectosSonido.reproducirClic(520);
  document.getElementById('modal-auth-shield').classList.add('hidden');
  EstadoJuego.pausadoPorModal = false;
}

/** Renderiza la Consola del Escudo Central y el Celular MFA en vivo */
function renderizarModalEscudoAuth() {
  const piezas = EstadoJuego.nivel3.piezasRecolectadas;
  const tieneTodasPiezasClave = piezas.includes('pieza1') && piezas.includes('pieza2') && piezas.includes('pieza3');
  const tieneCelularMfa = piezas.includes('mfa');

  document.getElementById('auth-modal-counter').textContent = `Piezas recolectadas: ${piezas.length} / 4`;

  // 1. Opciones de contraseña con medidor de tiempo de crackeo
  const rejillaClaves = document.getElementById('auth-password-grid');
  rejillaClaves.innerHTML = '';

  OPCIONES_CLAVE_NIVEL_3.forEach((opcion) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'sql-block-card';

    if (opcion.esFuerte && !tieneTodasPiezasClave) {
      boton.disabled = true;
      boton.innerHTML = `<strong>🔒 Contraseña Fuerte (Incompleta)</strong><code>Recoge las 3 piezas 🔑 en el mapa con [E]</code>`;
    } else {
      const seleccionada = opcion.esFuerte && EstadoJuego.nivel3.claveFuerteElegida;
      boton.disabled = EstadoJuego.claves[3];
      if (seleccionada) {
        boton.style.borderColor = '#39ff14';
        boton.style.background = 'rgba(57, 255, 20, 0.16)';
      }
      boton.innerHTML = `<strong>${seleccionada ? '✓ ' : '🔑 '}Opción: ${opcion.valor}</strong><code>Crackeo: ${opcion.tiempoCrackeo}</code>`;
      boton.addEventListener('click', () => seleccionarOpcionClave(opcion));
    }
    rejillaClaves.appendChild(boton);
  });

  // 2. Celular MFA en vivo
  const elementoCodigoCelular = document.getElementById('mfa-live-code');
  if (tieneCelularMfa) {
    elementoCodigoCelular.textContent = EstadoJuego.nivel3.codigoMfa;
  } else {
    elementoCodigoCelular.textContent = '🔒 RECOGE CELULAR';
  }

  // 3. Opciones de medida adicional (MFA)
  const listaOpcionesMfa = document.getElementById('auth-mfa-options');
  listaOpcionesMfa.innerHTML = '';

  const opcionesMfa = [
    { texto: 'Compartir la contraseña con otros usuarios.', esCorrecta: false },
    { texto: 'Utilizar la misma contraseña en todos los sistemas.', esCorrecta: false },
    {
      texto: tieneCelularMfa
        ? `Activar autenticación multifactor (MFA) con código [${EstadoJuego.nivel3.codigoMfa}].`
        : '🔒 Activar autenticación multifactor (Recoge el 📱 Celular MFA en el mapa).',
      esCorrecta: true,
      bloqueada: !tieneCelularMfa
    },
    { texto: 'Utilizar una contraseña corta fácil de recordar.', esCorrecta: false }
  ];

  opcionesMfa.forEach((opcion) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'sql-block-card';
    boton.disabled = opcion.bloqueada || EstadoJuego.claves[3] || !EstadoJuego.nivel3.claveFuerteElegida;

    if (opcion.esCorrecta && EstadoJuego.nivel3.mfaActivado) {
      boton.style.borderColor = '#39ff14';
      boton.style.background = 'rgba(57, 255, 20, 0.16)';
    }

    boton.innerHTML = `<strong>${opcion.texto}</strong>`;
    boton.addEventListener('click', () => seleccionarOpcionMFA(opcion));
    listaOpcionesMfa.appendChild(boton);
  });
}

function seleccionarOpcionClave(opcion) {
  const medidor = document.getElementById('crack-meter-status');
  if (!opcion.esFuerte) {
    medidor.innerHTML = `⚠️ Contraseña débil (<code>${opcion.valor}</code>): BRECHA la rompe en <strong>${opcion.tiempoCrackeo}</strong>.`;
    danarJugador(`Elegiste una contraseña débil (${opcion.valor}).`);
    return;
  }

  EfectosSonido.reproducirExito();
  EstadoJuego.nivel3.claveFuerteElegida = true;
  modificarPuntos(100);
  medidor.innerHTML = `✅ Contraseña robusta <code>${opcion.valor}</code> activada: Tiempo de crackeo <strong>${opcion.tiempoCrackeo}</strong>. ¡Ahora elige la medida MFA abajo!`;
  renderizarModalEscudoAuth();
}

function seleccionarOpcionMFA(opcion) {
  if (!opcion.esCorrecta) {
    danarJugador('Esa medida debilita la seguridad del sistema.');
    return;
  }

  // ¡Escudo completo: Contraseña fuerte + MFA activado!
  EstadoJuego.nivel3.mfaActivado = true;
  EstadoJuego.claves[3] = true;
  EfectosSonido.reproducirExito();
  modificarPuntos(150);
  if (EstadoJuego.erroresHabitacion === 0) {
    modificarPuntos(50);
  }
  renderizarModalEscudoAuth();

  // Disparar rayo del escudo y derrotar a BRECHA y sus ataques de fuerza bruta
  EstadoJuego.nivel3.temporizadorRayo = 1.4;
  enemigos.forEach((enemigo) => {
    sistemaParticulas.estallar(enemigo.x, enemigo.y, '#ff2bd6', 40);
    sistemaParticulas.estallar(enemigo.x, enemigo.y, '#39ff14', 35);
    enemigo.activo = false;
  });

  setTimeout(() => {
    cerrarModalEscudoAuth();
    hablarIA('⚡ ¡ESCUDO ACTIVADO! Derrotaste a BRECHA y obtuviste la clave ACCESS. Cruza la puerta hacia ESCAPE.');
  }, 600);
}

/* ============================================================================
   9. PANTALLAS DE RESUMEN Y VICTORIA FINAL CON RANGO (S, A, B, C)
   ============================================================================ */
function completarNivel1() {
  EstadoJuego.enEjecucion = false;
  EfectosSonido.reproducirExito();

  document.getElementById('v1-integrity').textContent = `${EstadoJuego.vidas} / ${EstadoJuego.vidasMaximas}`;
  document.getElementById('v1-score').textContent = `${EstadoJuego.puntos} / 1000`;

  mostrarPantalla('screen-stage1-complete');
  hablarIA('🎉 ¡Habitación 1 superada con la clave PHISH! Avanza al Nivel 2 (Servidor SQL).');
}

function completarNivel2() {
  EstadoJuego.enEjecucion = false;
  EfectosSonido.reproducirExito();

  document.getElementById('v2-integrity').textContent = `${EstadoJuego.vidas} / ${EstadoJuego.vidasMaximas}`;
  document.getElementById('v2-score').textContent = `${EstadoJuego.puntos} / 1000`;

  mostrarPantalla('screen-stage2-complete');
  hablarIA('🎉 ¡Habitación 2 superada con la clave SQLSAFE! Avanza al Nivel 3 para enfrentar a BRECHA.');
}

function completarNivel3() {
  EstadoJuego.enEjecucion = false;
  EfectosSonido.reproducirExito();

  mostrarPantalla('screen-stage3-complete');
  hablarIA('🎉 ¡Derrotaste a BRECHA con la clave ACCESS! Haz clic para ver tu Rango Final y el resumen completo.');
}

/** Muestra la Pantalla Final con las 3 claves, dificultad, puntaje sobre 1000 y rango S/A/B/C */
function mostrarPantallaVictoriaFinal() {
  EfectosSonido.reproducirExito();
  const config = obtenerConfigDificultad();

  const puntaje = EstadoJuego.puntos;
  let rango = 'C';
  if (puntaje >= 900) rango = 'S';
  else if (puntaje >= 750) rango = 'A';
  else if (puntaje >= 550) rango = 'B';

  const elementoDifFinal = document.getElementById('final-difficulty-badge');
  if (elementoDifFinal) {
    elementoDifFinal.textContent = config.insignia;
  }

  document.getElementById('final-total-score').textContent = `${puntaje} / 1000`;
  document.getElementById('final-rank-badge').textContent = rango;

  mostrarPantalla('screen-final-victory');
  hablarIA(`🏆 “Sistema asegurado. Has completado la auditoría y escapado.” Dificultad: ${config.nombre} | Rango: ${rango} (${puntaje}/1000 pts).`);
}

function pedirPista() {
  if (EstadoJuego.pausado) return;
  EfectosSonido.reproducirClic(600);
  const config = obtenerConfigDificultad();
  modificarPuntos(config.penalizacionPista, false);

  if (EstadoJuego.habitacionActual === 1) {
    const textoPista = PISTAS_NIVEL_1[EstadoJuego.nivel1.indicePista % PISTAS_NIVEL_1.length];
    EstadoJuego.nivel1.indicePista += 1;
    hablarIA(`💡 ${textoPista}`);
  } else if (EstadoJuego.habitacionActual === 2) {
    const textoPista = PISTAS_NIVEL_2[EstadoJuego.nivel2.indicePista % PISTAS_NIVEL_2.length];
    EstadoJuego.nivel2.indicePista += 1;
    hablarIA(`💡 ${textoPista}`);
  } else {
    const textoPista = PISTAS_NIVEL_3[EstadoJuego.nivel3.indicePista % PISTAS_NIVEL_3.length];
    EstadoJuego.nivel3.indicePista += 1;
    hablarIA(`💡 ${textoPista}`);
  }
}

function activarDerrota(motivo) {
  cerrarClienteCorreo();
  cerrarModalServidorSQL();
  cerrarModalEscudoAuth();
  cerrarModalObjeto();
  const modalPausa = document.getElementById('modal-pause');
  if (modalPausa) modalPausa.classList.add('hidden');
  EstadoJuego.pausado = false;

  document.getElementById('gameover-reason').textContent =
    `Perdiste tus ${EstadoJuego.vidasMaximas} vidas en el Nivel ${EstadoJuego.habitacionActual} (${obtenerConfigDificultad().nombre}). Último incidente: ${motivo}`;
  mostrarPantalla('screen-gameover');
  hablarIA('❌ Sistema comprometido. Presiona "Reintentar habitación actual" para volver a intentarlo.');
}

/* ============================================================================
   10. INICIALIZACIÓN Y EVENTOS DE TECLADO / VISIBILIDAD
   ============================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  lienzo = document.getElementById('game-canvas');
  if (lienzo) {
    ctx = lienzo.getContext('2d');
  }

  // Selector de dificultad en pantalla de inicio
  document.querySelectorAll('.diff-btn').forEach((boton) => {
    boton.addEventListener('click', () => {
      EfectosSonido.reproducirClic(740);
      seleccionarDificultad(boton.getAttribute('data-dificultad'));
    });
  });
  seleccionarDificultad('normal');

  window.addEventListener('keydown', (evento) => {
    if (evento.code === 'KeyP' && !evento.repeat && EstadoJuego.enEjecucion) {
      evento.preventDefault();
      alternarPausa();
      return;
    }

    if (evento.code === 'Escape' && !evento.repeat) {
      const modalInstrucciones = document.getElementById('modal-instructions');
      if (modalInstrucciones && !modalInstrucciones.classList.contains('hidden')) {
        modalInstrucciones.classList.add('hidden');
        return;
      }
      if (EstadoJuego.enEjecucion) {
        if (EstadoJuego.pausado) {
          reanudarJuego();
        } else if (EstadoJuego.pausadoPorModal) {
          cerrarClienteCorreo();
          cerrarModalServidorSQL();
          cerrarModalEscudoAuth();
          cerrarModalObjeto();
        } else {
          pausarJuego(false);
        }
        return;
      }
    }

    if (EstadoJuego.pausado) return;

    teclasPresionadas[evento.code] = true;

    if (evento.code === 'KeyE' && !evento.repeat) {
      manejarTeclaInteraccion();
    }
  });

  window.addEventListener('keyup', (evento) => {
    teclasPresionadas[evento.code] = false;
  });

  // Pausa automática al cambiar de pestaña o minimizar ventana
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && EstadoJuego.enEjecucion && !EstadoJuego.pausado) {
      pausarJuego(true);
    }
  });

  window.addEventListener('blur', () => {
    if (EstadoJuego.enEjecucion && !EstadoJuego.pausado) {
      pausarJuego(true);
    }
  });

  // Inicio e Instrucciones
  document.getElementById('btn-start-game').addEventListener('click', () => {
    EfectosSonido.reproducirExito();
    EstadoJuego.puntos = 0;
    iniciarNivel(1, false);
  });

  document.getElementById('btn-open-instructions').addEventListener('click', () => {
    EfectosSonido.reproducirClic();
    document.getElementById('modal-instructions').classList.remove('hidden');
  });

  const cerrarInstrucciones = () => {
    EfectosSonido.reproducirClic(520);
    document.getElementById('modal-instructions').classList.add('hidden');
  };
  document.getElementById('btn-close-instructions').addEventListener('click', cerrarInstrucciones);
  document.getElementById('btn-close-instructions-bottom').addEventListener('click', cerrarInstrucciones);

  // HUD y Menú de Pausa
  document.getElementById('btn-hint').addEventListener('click', pedirPista);
  document.getElementById('btn-audio').addEventListener('click', alternarSilencioSonido);
  document.getElementById('btn-pause').addEventListener('click', alternarPausa);

  document.getElementById('btn-close-pause').addEventListener('click', reanudarJuego);
  document.getElementById('btn-pause-resume').addEventListener('click', reanudarJuego);
  document.getElementById('btn-pause-restart').addEventListener('click', () => {
    EfectosSonido.reproducirClic(640);
    iniciarNivel(EstadoJuego.habitacionActual, true);
  });
  document.getElementById('btn-pause-audio').addEventListener('click', alternarSilencioSonido);
  document.getElementById('btn-pause-exit').addEventListener('click', salirAlMenuPrincipal);

  // Modal Nivel 1 (Correo)
  document.getElementById('btn-close-email').addEventListener('click', cerrarClienteCorreo);
  document.getElementById('btn-toggle-magnifier').addEventListener('click', alternarLupa);
  document.getElementById('btn-mark-safe').addEventListener('click', marcarCorreoActualSeguro);
  document.getElementById('btn-report-phishing').addEventListener('click', reportarCorreoActualPhishing);
  document.getElementById('btn-close-obj-modal').addEventListener('click', cerrarModalObjeto);

  // Modal Nivel 2 (Consola SQL)
  document.getElementById('btn-close-sql').addEventListener('click', cerrarModalServidorSQL);
  document.getElementById('btn-close-sql-bottom').addEventListener('click', cerrarModalServidorSQL);
  document.getElementById('btn-reset-sql-slots').addEventListener('click', () => {
    if (EstadoJuego.claves[2]) return;
    EfectosSonido.reproducirClic(580);
    EstadoJuego.nivel2.ordenArmado = [];
    renderizarConsolaSQL();
  });

  document.getElementById('btn-test-sqli').addEventListener('click', () => {
    if (EstadoJuego.claves[2]) return;
    EfectosSonido.reproducirClic(780);
    const preCodigo = document.getElementById('sql-vulnerable-code');
    preCodigo.textContent = "SELECT * FROM usuarios WHERE usuario = '' OR '1'='1' -- ¡ACCESO TOTAL SIN CLAVE!";
    hablarIA("⚡ Simulación: Al inyectar ' OR '1'='1, la condición siempre es verdadera y el atacante entra sin contraseña.");
  });

  // Modal Nivel 3 (Escudo y MFA)
  document.getElementById('btn-close-auth').addEventListener('click', cerrarModalEscudoAuth);
  document.getElementById('btn-close-auth-bottom').addEventListener('click', cerrarModalEscudoAuth);

  // Transiciones entre niveles y reinicios
  document.getElementById('btn-retry-room').addEventListener('click', () => {
    EfectosSonido.reproducirClic();
    iniciarNivel(EstadoJuego.habitacionActual, true);
  });

  document.getElementById('btn-replay-level1').addEventListener('click', () => {
    EfectosSonido.reproducirClic();
    EstadoJuego.puntos = 0;
    iniciarNivel(1, false);
  });

  document.getElementById('btn-next-level2').addEventListener('click', () => {
    EfectosSonido.reproducirExito();
    iniciarNivel(2, false);
  });

  document.getElementById('btn-replay-level2').addEventListener('click', () => {
    EfectosSonido.reproducirClic();
    iniciarNivel(2, true);
  });

  document.getElementById('btn-next-level3').addEventListener('click', () => {
    EfectosSonido.reproducirExito();
    iniciarNivel(3, false);
  });

  document.getElementById('btn-show-final-victory').addEventListener('click', mostrarPantallaVictoriaFinal);

  document.getElementById('btn-play-again-full').addEventListener('click', () => {
    EfectosSonido.reproducirExito();
    EstadoJuego.puntos = 0;
    iniciarNivel(1, false);
  });

  requestAnimationFrame(bucleJuego);
});
