/**
 * ============================================================================
 * CYBER ESCAPE ROOM: LA BRECHA — LÓGICA PRINCIPAL (script.js)
 * Versión simplificada y clara para exposición: HUD mínimo, lenguaje directo,
 * narrador de máximo 2 líneas y pantalla final explicativa por nivel.
 * ============================================================================
 */

/* ============================================================================
   1. ESTADO GLOBAL DEL JUEGO (MÁXIMO 1000 PUNTOS, MÍNIMO 0)
   ============================================================================ */
const GameState = {
  currentRoom: 1,
  integrity: 3,           // 3 vidas por habitación
  maxIntegrity: 3,
  score: 0,               // Puntuación (0 a 1000 máx, nunca baja de 0)
  scoreBeforeRoom: 0,     // Puntos guardados al empezar la habitación
  roomMistakes: 0,
  audioMuted: false,
  magnifierActive: false,
  selectedEmailId: 1,

  // Claves de cada nivel
  keys: {
    1: false, // PHISH
    2: false, // SQLSAFE
    3: false  // ACCESS
  },

  // Datos del Nivel 1 (Oficina: Phishing)
  level1: {
    usbHandled: false,
    hintIndex: 0,
    quarantinedCount: 0,
    targetPhishCount: 2
  }
};

/* Lista de 5 correos claros para el Nivel 1 (2 son Phishing y 3 son seguros) */
const LEVEL1_EMAILS = [
  {
    id: 1,
    senderAlias: 'Soporte TI',
    senderEmail: 'alerta@unach-soporte-falso.com',
    subject: 'Tu cuenta será suspendida hoy',
    time: '08:15 AM',
    isPhishing: true,
    status: 'pending',
    body: 'Detectamos un acceso extraño. Tu cuenta será suspendida hoy mismo si no entras ahora a validar tu contraseña en el siguiente enlace:',
    linkText: 'https://unach.mx/validar-cuenta',
    realUrl: 'http://185.220.101.44/robar-clave.php',
    lensHint: '⚠️ FALSO: El correo viene de "@unach-soporte-falso.com" y el enlace lleva a una dirección IP extraña.'
  },
  {
    id: 2,
    senderAlias: 'Coordinación UNACH',
    senderEmail: 'coordinacion@unach.mx',
    subject: 'Reunión del equipo — UNACH',
    time: '08:45 AM',
    isPhishing: false,
    status: 'pending',
    body: 'Hola equipo, les recuerdo que hoy a las 13:00 hrs tenemos reunión en la Sala B para revisar el avance del proyecto.',
    linkText: 'https://intranet.unach.mx/agenda.pdf',
    realUrl: 'https://intranet.unach.mx/agenda.pdf',
    lensHint: '✓ SEGURO: El remitente usa el dominio oficial "@unach.mx" y el enlace es auténtico.'
  },
  {
    id: 3,
    senderAlias: 'Administración de Cuentas',
    senderEmail: 'admin@unach-clave-urgente.net',
    subject: 'URGENTE: Actualización de contraseña',
    time: '09:10 AM',
    isPhishing: true,
    status: 'pending',
    body: 'Tu contraseña ha caducado. Escribe tu contraseña actual en este formulario externo para no perder acceso a tu computadora:',
    linkText: 'https://bit.ly/cambiar-clave-unach',
    realUrl: 'http://sitio-pirata.ru/formulario.html',
    lensHint: '⚠️ FALSO: Usa un dominio engañoso (".net"), pide tu contraseña y oculta el enlace real.'
  },
  {
    id: 4,
    senderAlias: 'Recursos Humanos',
    senderEmail: 'rh@unach.mx',
    subject: 'Constancia de curso disponible',
    time: '09:30 AM',
    isPhishing: false,
    status: 'pending',
    body: 'Buen día. Ya puedes consultar tu constancia del curso de seguridad dentro de la intranet oficial de la universidad.',
    linkText: 'https://intranet.unach.mx/constancias',
    realUrl: 'https://intranet.unach.mx/constancias',
    lensHint: '✓ SEGURO: Viene del correo oficial "@unach.mx" y no pide datos personales.'
  },
  {
    id: 5,
    senderAlias: 'Aviso de Sistemas',
    senderEmail: 'sistemas@unach.mx',
    subject: 'Mantenimiento programado el viernes',
    time: '09:50 AM',
    isPhishing: false,
    status: 'pending',
    body: 'Les informamos que el viernes a las 22:00 hrs habrá mantenimiento en el servidor. Recuerda que TI nunca pide contraseñas por correo.',
    linkText: 'https://intranet.unach.mx/avisos',
    realUrl: 'https://intranet.unach.mx/avisos',
    lensHint: '✓ SEGURO: Remitente oficial "@unach.mx" y enlace interno confiable.'
  }
];

/* Pistas cortas del Nivel 1 */
const LEVEL1_HINTS = [
  'Pista 1: Abre la 📌 Nota de TI: solo los correos que terminan en @unach.mx son reales.',
  'Pista 2: En el monitor, activa el botón "🔍 Usar lupa" para ver el enlace real de cada correo.',
  'Pista 3: Los 2 correos falsos son el #1 y el #3. Además, ¡no conectes el USB sospechoso!'
];

/* ============================================================================
   2. SONIDOS SINTETIZADOS (Web Audio API)
   ============================================================================ */
const SoundFX = {
  ctx: null,

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  playClick(freq = 680) {
    if (GameState.audioMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.3, now + 0.06);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  },

  playError() {
    if (GameState.audioMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.setValueAtTime(110, now + 0.14);

    gain.gain.setValueAtTime(0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
  },

  playSuccess() {
    if (GameState.audioMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    });
  }
};

/* ============================================================================
   3. NARRADOR IA (MENSAJES CORTOS DE MÁXIMO 2 LÍNEAS, NUNCA SE CORTA)
   ============================================================================ */

/**
 * Muestra un mensaje corto y completo en el narrador IA sin recortarse
 * @param {string} message Mensaje de máximo 2 líneas
 */
function speakAI(message) {
  const narrator = document.getElementById('ai-narrator');
  const textEl = document.getElementById('ai-text');
  narrator.classList.remove('hidden');
  textEl.textContent = message;
}

/** Efecto glitch corto cuando ocurre un error */
function triggerGlitchEffect() {
  const overlay = document.getElementById('glitch-overlay');
  overlay.classList.remove('hidden');
  setTimeout(() => {
    overlay.classList.add('hidden');
  }, 350);
}

/* ============================================================================
   4. HUD MÍNIMO (SOLO VIDAS, PUNTOS Y PISTA)
   ============================================================================ */

function updateHUD() {
  const integrityPercent = Math.round((GameState.integrity / GameState.maxIntegrity) * 100);
  const textEl = document.getElementById('integrity-text');
  const fillEl = document.getElementById('integrity-bar-fill');

  textEl.textContent = `${GameState.integrity} / ${GameState.maxIntegrity}`;
  fillEl.style.width = `${integrityPercent}%`;

  fillEl.classList.remove('integrity-warn', 'integrity-critical');
  if (GameState.integrity === 2) {
    fillEl.classList.add('integrity-warn');
  } else if (GameState.integrity <= 1) {
    fillEl.classList.add('integrity-critical');
  }

  document.getElementById('hud-score').textContent = String(GameState.score);
}

/** Suma o resta puntos manteniendo el rango entre 0 y 1000 */
function modifyScore(delta) {
  GameState.score = Math.min(1000, Math.max(0, GameState.score + delta));
  updateHUD();
}

/** Resta 1 vida y 50 puntos cuando el jugador comete un error */
function registerMistake(shortReason) {
  SoundFX.playError();
  triggerGlitchEffect();

  GameState.integrity = Math.max(0, GameState.integrity - 1);
  GameState.roomMistakes += 1;
  modifyScore(-50);

  speakAI(`❌ ${shortReason} Pierdes 1 vida (-50 puntos).`);

  if (GameState.integrity <= 0) {
    setTimeout(() => {
      triggerGameOver(shortReason);
    }, 450);
  }
}

/** Cambia la pantalla visible */
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach((scr) => {
    scr.classList.add('hidden');
    scr.classList.remove('active');
  });
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }
}

/* ============================================================================
   5. NIVEL 1 — OFICINA: PHISHING (NOTA TI, MONITOR, USB TRAMPA Y PUERTA)
   ============================================================================ */

function initLevel1(isRetry = false) {
  GameState.currentRoom = 1;
  GameState.integrity = GameState.maxIntegrity;
  GameState.roomMistakes = 0;

  if (isRetry) {
    GameState.score = GameState.scoreBeforeRoom;
  } else {
    GameState.scoreBeforeRoom = GameState.score;
  }

  GameState.keys[1] = false;
  GameState.magnifierActive = false;
  GameState.level1.usbHandled = false;
  GameState.level1.quarantinedCount = 0;

  LEVEL1_EMAILS.forEach((mail) => {
    mail.status = 'pending';
  });

  // Reiniciar estado visual de la puerta
  document.getElementById('svg-door-frame').setAttribute('stroke', '#ff1f4b');
  document.getElementById('svg-door-icon').textContent = '🔒';
  document.getElementById('svg-door-icon').setAttribute('fill', '#ff1f4b');
  document.getElementById('svg-door-status').textContent = 'CERRADA';
  document.getElementById('svg-door-status').setAttribute('fill', '#ff1f4b');
  document.getElementById('l1-phish-counter').textContent = '0 / 2';

  document.getElementById('game-hud').classList.remove('hidden');
  updateHUD();
  showScreen('screen-level-1');

  speakAI('Paso 1: Revisa la 📌 Nota de TI en la pared y luego abre el 💻 Monitor para buscar los 2 correos falsos.');
}

function openObjectModal(title, bodyHTML, footerHTML = '') {
  SoundFX.playClick();
  document.getElementById('obj-modal-title').innerHTML = title;
  document.getElementById('obj-modal-body').innerHTML = bodyHTML;
  document.getElementById('obj-modal-footer').innerHTML = footerHTML;
  document.getElementById('modal-object').classList.remove('hidden');
}

function closeObjectModal() {
  SoundFX.playClick(520);
  document.getElementById('modal-object').classList.add('hidden');
}

/** 1. Nota de TI (Pista clara) */
function inspectPostIt() {
  openObjectModal(
    '📌 Nota de TI (Pista)',
    `<div class="inst-box">
      <h3>¿Cómo detectar un correo falso (Phishing)?</h3>
      <p style="margin-bottom:8px;">• <strong>Correo oficial:</strong> Solo los correos que terminan en <code>@unach.mx</code> son reales.</p>
      <p style="margin-bottom:8px;">• <strong>Usa la lupa:</strong> Revisa a dónde lleva realmente el enlace antes de confiar.</p>
      <p>• <strong>Cuidado con los USB:</strong> Nunca conectes memorias USB encontradas en el escritorio.</p>
    </div>`,
    `<button class="cyber-btn btn-primary" type="button" onclick="closeObjectModal()">Entendido</button>`
  );
  speakAI('Ya tienes la pista clave: solo el dominio @unach.mx es legítimo. Ahora revisa el monitor.');
}

/** 2. USB sospechoso (Trampa) */
function inspectUSB() {
  if (GameState.level1.usbHandled) {
    openObjectModal(
      '🔌 USB sospechoso',
      `<p>Ya revisaste esta memoria USB.</p>`,
      `<button class="cyber-btn btn-primary" type="button" onclick="closeObjectModal()">Cerrar</button>`
    );
    return;
  }

  openObjectModal(
    '🔌 USB sospechoso en el escritorio',
    `<p style="margin-bottom:12px;">Encontraste una memoria USB sin dueño con la etiqueta <strong>"PREMIOS Y NÓMINAS"</strong>.</p>
     <p class="text-cyan">¿Qué quieres hacer con el USB?</p>`,
    `<button class="cyber-btn btn-danger" type="button" id="btn-usb-plug">Conectar a la PC</button>
     <button class="cyber-btn btn-primary" type="button" id="btn-usb-isolate">Descartar por seguridad</button>`
  );

  document.getElementById('btn-usb-plug').addEventListener('click', () => {
    GameState.level1.usbHandled = true;
    closeObjectModal();
    registerMistake('El USB tenía un virus oculto (trampa física).');
  });

  document.getElementById('btn-usb-isolate').addEventListener('click', () => {
    GameState.level1.usbHandled = true;
    SoundFX.playSuccess();
    modifyScore(50);
    closeObjectModal();
    speakAI('¡Bien hecho (+50 puntos)! Nunca debes conectar memorias USB desconocidas.');
  });
}

/* ============================================================================
   6. BANDEJA DE CORREOS Y LUPA
   ============================================================================ */

function openEmailClient() {
  SoundFX.playClick();
  document.getElementById('modal-email-client').classList.remove('hidden');
  renderEmailList();
  selectEmail(GameState.selectedEmailId);

  if (!GameState.magnifierActive) {
    speakAI('Activa el botón "🔍 Usar lupa" arriba a la derecha para ver si el remitente y el enlace son reales.');
  }
}

function closeEmailClient() {
  SoundFX.playClick(520);
  document.getElementById('modal-email-client').classList.add('hidden');
}

function renderEmailList() {
  const listEl = document.getElementById('email-list');
  listEl.innerHTML = '';

  LEVEL1_EMAILS.forEach((mail) => {
    const li = document.createElement('li');
    li.className = `email-item ${mail.id === GameState.selectedEmailId ? 'active' : ''}`;

    let statusBadge = '';
    if (mail.status === 'quarantined') {
      statusBadge = '<span class="email-status-pill pill-quarantined">PHISHING</span>';
    } else if (mail.status === 'verified') {
      statusBadge = '<span class="email-status-pill pill-verified">SEGURO</span>';
    }

    li.innerHTML = `
      <div class="email-item-top">
        <span>Correo #${mail.id}</span>
        ${statusBadge}
      </div>
      <div class="email-item-subject">${mail.subject}</div>
      <div class="mono-text" style="font-size:0.78rem; color:var(--text-secondary);">${mail.senderEmail}</div>
    `;

    li.addEventListener('click', () => {
      SoundFX.playClick(740);
      selectEmail(mail.id);
    });

    listEl.appendChild(li);
  });

  document.getElementById('email-modal-counter').textContent =
    `Correos falsos detectados: ${GameState.level1.quarantinedCount} / ${GameState.level1.targetPhishCount}`;
}

function selectEmail(id) {
  GameState.selectedEmailId = id;
  renderEmailList();

  const mail = LEVEL1_EMAILS.find((m) => m.id === id);
  if (!mail) return;

  const detailEl = document.getElementById('email-detail-content');
  detailEl.innerHTML = `
    <div class="email-header-card">
      <div class="email-header-row"><strong>Remitente:</strong> ${mail.senderAlias} (<span class="text-cyan">${mail.senderEmail}</span>)</div>
      <div class="email-header-row"><strong>Asunto:</strong> ${mail.subject}</div>
    </div>
    <div class="email-body-box">
      <p>${mail.body}</p>
      <div class="email-fake-link">🔗 Enlace en el correo: ${mail.linkText}</div>
    </div>
  `;

  const lensPanel = document.getElementById('forensic-lens-panel');
  const lensGrid = document.getElementById('forensic-lens-grid');

  if (GameState.magnifierActive) {
    lensPanel.classList.remove('hidden');
    const alertClass = mail.isPhishing ? 'lens-alert' : 'lens-safe';
    lensGrid.innerHTML = `
      <div class="lens-item ${alertClass}">
        <strong>Enlace real oculto:</strong> ${mail.realUrl}
      </div>
      <div class="lens-item ${alertClass}">
        <strong>Resultado de la lupa:</strong> ${mail.lensHint}
      </div>
    `;
  } else {
    lensPanel.classList.add('hidden');
  }

  const btnSafe = document.getElementById('btn-mark-safe');
  const btnPhish = document.getElementById('btn-report-phishing');
  const done = mail.status !== 'pending';
  btnSafe.disabled = done;
  btnPhish.disabled = done;
  btnSafe.style.opacity = done ? '0.45' : '1';
  btnPhish.style.opacity = done ? '0.45' : '1';
}

function toggleMagnifier() {
  GameState.magnifierActive = !GameState.magnifierActive;
  SoundFX.playClick(840);

  const btn = document.getElementById('btn-toggle-magnifier');
  const txt = document.getElementById('magnifier-state-text');

  btn.classList.toggle('active', GameState.magnifierActive);
  btn.setAttribute('aria-pressed', String(GameState.magnifierActive));
  txt.textContent = GameState.magnifierActive ? 'SÍ' : 'NO';

  selectEmail(GameState.selectedEmailId);

  if (GameState.magnifierActive) {
    speakAI('🔍 Lupa activada: ahora puedes ver a dónde lleva realmente cada enlace antes de decidir.');
  }
}

function markCurrentEmailSafe() {
  const mail = LEVEL1_EMAILS.find((m) => m.id === GameState.selectedEmailId);
  if (!mail || mail.status !== 'pending') return;

  if (mail.isPhishing) {
    registerMistake(`El correo #${mail.id} era falso (phishing) y lo marcaste como seguro.`);
  } else {
    SoundFX.playClick(880);
    mail.status = 'verified';
    modifyScore(25);
    renderEmailList();
    selectEmail(mail.id);
    speakAI(`✓ Correcto (+25 puntos): el correo #${mail.id} viene de @unach.mx y es seguro.`);
  }
}

function reportCurrentEmailPhishing() {
  const mail = LEVEL1_EMAILS.find((m) => m.id === GameState.selectedEmailId);
  if (!mail || mail.status !== 'pending') return;

  if (mail.isPhishing) {
    SoundFX.playSuccess();
    mail.status = 'quarantined';
    GameState.level1.quarantinedCount += 1;
    modifyScore(100);

    document.getElementById('l1-phish-counter').textContent =
      `${GameState.level1.quarantinedCount} / ${GameState.level1.targetPhishCount}`;

    renderEmailList();
    selectEmail(mail.id);

    if (GameState.level1.quarantinedCount >= GameState.level1.targetPhishCount) {
      GameState.keys[1] = true;
      if (GameState.roomMistakes === 0) {
        modifyScore(50);
      }
      updateHUD();

      document.getElementById('svg-door-frame').setAttribute('stroke', '#39ff14');
      document.getElementById('svg-door-icon').textContent = '🔑';
      document.getElementById('svg-door-icon').setAttribute('fill', '#39ff14');
      document.getElementById('svg-door-status').textContent = 'ABIERTA';
      document.getElementById('svg-door-status').setAttribute('fill', '#39ff14');

      speakAI('✅ ¡Encontraste los 2 correos falsos! Obtuviste la clave PHISH. Haz clic en la 🚪 Puerta de salida.');
    } else {
      speakAI('✅ ¡Correo falso detectado (+100 puntos)! Falta encontrar 1 correo sospechoso más.');
    }
  } else {
    registerMistake(`Has seleccionado un correo legítimo (#${mail.id}).`);
  }
}

/* ============================================================================
   7. PUERTA DE SALIDA NIVEL 1 (CLAVE: PHISH)
   ============================================================================ */

function inspectDoor1() {
  if (!GameState.keys[1]) {
    openObjectModal(
      '🚪 Puerta de salida cerrada',
      `<p>Para abrir esta puerta primero debes encontrar los <strong>2 correos falsos (phishing)</strong> en el monitor.</p>`,
      `<button class="cyber-btn btn-primary" type="button" onclick="closeObjectModal()">Cerrar</button>`
    );
    return;
  }

  openObjectModal(
    '🚪 Puerta de salida — Nivel 1',
    `<p>Usa la clave obtenida para salir de la Oficina:</p>
     <div class="door-keypad-box">
       <label for="door-key-input" class="mono-text text-cyan">CLAVE OBTENIDA: <strong>PHISH</strong></label>
       <input id="door-key-input" class="cyber-input" type="text" value="PHISH" maxlength="12" autocomplete="off" />
       <small id="door-key-feedback" class="mono-text" style="color:var(--text-secondary);">Haz clic en Abrir puerta para continuar.</small>
     </div>`,
    `<button class="cyber-btn btn-primary" type="button" id="btn-submit-door-key">🔓 Abrir puerta [Siguiente]</button>`
  );

  document.getElementById('btn-submit-door-key').addEventListener('click', () => {
    const val = document.getElementById('door-key-input').value.trim().toUpperCase();
    if (val === 'PHISH') {
      SoundFX.playSuccess();
      closeObjectModal();
      completeLevel1();
    } else {
      SoundFX.playError();
      const fb = document.getElementById('door-key-feedback');
      fb.textContent = '❌ Clave incorrecta. Escribe: PHISH';
      fb.className = 'mono-text text-red';
    }
  });
}

function completeLevel1() {
  document.getElementById('v1-integrity').textContent = `${GameState.integrity} / ${GameState.maxIntegrity}`;
  document.getElementById('v1-score').textContent = `${GameState.score} / 1000`;

  showScreen('screen-stage1-complete');
  speakAI('🎉 ¡Habitación 1 completada con la clave PHISH! Revisa el resumen en pantalla para tu exposición.');
}

/* ============================================================================
   8. PISTAS Y DERROTA
   ============================================================================ */

function requestHint() {
  SoundFX.playClick(600);
  modifyScore(-25);

  const hintText = LEVEL1_HINTS[GameState.level1.hintIndex % LEVEL1_HINTS.length];
  GameState.level1.hintIndex += 1;

  speakAI(`💡 ${hintText}`);
}

function triggerGameOver(reason) {
  closeEmailClient();
  closeObjectModal();

  document.getElementById('gameover-reason').textContent =
    `Perdiste tus 3 vidas. Último fallo: ${reason}`;

  showScreen('screen-gameover');
  speakAI('❌ Te quedaste sin vidas. Haz clic en "Reintentar habitación" para intentarlo de nuevo.');
}

/* ============================================================================
   9. LLUVIA DE DATOS EN CANVAS
   ============================================================================ */
function initDataRain() {
  const canvas = document.getElementById('data-rain-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  const chars = '01PHISHSQLSAFEACCESS';
  const fontSize = 14;
  const columns = Math.floor(window.innerWidth / fontSize);
  const drops = Array(columns).fill(1);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  setInterval(() => {
    ctx.fillStyle = 'rgba(10, 10, 20, 0.14)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00f0ff';
    ctx.font = `${fontSize}px "Share Tech Mono", monospace`;

    for (let i = 0; i < drops.length; i++) {
      const char = chars.charAt(Math.floor(Math.random() * chars.length));
      ctx.fillText(char, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }, 70);
}

/* ============================================================================
   10. INICIALIZACIÓN DE BOTONES Y EVENTOS
   ============================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initDataRain();

  document.getElementById('btn-start-game').addEventListener('click', () => {
    SoundFX.playSuccess();
    initLevel1(false);
  });

  document.getElementById('btn-open-instructions').addEventListener('click', () => {
    SoundFX.playClick();
    document.getElementById('modal-instructions').classList.remove('hidden');
  });

  const closeInst = () => {
    SoundFX.playClick(520);
    document.getElementById('modal-instructions').classList.add('hidden');
  };
  document.getElementById('btn-close-instructions').addEventListener('click', closeInst);
  document.getElementById('btn-close-instructions-bottom').addEventListener('click', closeInst);

  document.getElementById('btn-hint').addEventListener('click', requestHint);

  document.getElementById('btn-audio').addEventListener('click', (e) => {
    GameState.audioMuted = !GameState.audioMuted;
    e.currentTarget.textContent = GameState.audioMuted ? '🔇' : '🔊';
  });

  const bindSceneObject = (id, handler) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', handler);
    el.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        handler();
      }
    });
  };

  bindSceneObject('obj-postit', inspectPostIt);
  bindSceneObject('obj-monitor', openEmailClient);
  bindSceneObject('obj-usb', inspectUSB);
  bindSceneObject('obj-door-1', inspectDoor1);

  document.querySelectorAll('[data-trigger]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-trigger');
      if (target === 'postit') inspectPostIt();
      if (target === 'monitor') openEmailClient();
      if (target === 'usb') inspectUSB();
      if (target === 'door') inspectDoor1();
    });
  });

  document.getElementById('btn-close-email').addEventListener('click', closeEmailClient);
  document.getElementById('btn-toggle-magnifier').addEventListener('click', toggleMagnifier);
  document.getElementById('btn-mark-safe').addEventListener('click', markCurrentEmailSafe);
  document.getElementById('btn-report-phishing').addEventListener('click', reportCurrentEmailPhishing);
  document.getElementById('btn-close-obj-modal').addEventListener('click', closeObjectModal);

  document.getElementById('btn-retry-room').addEventListener('click', () => {
    SoundFX.playClick();
    initLevel1(true);
  });

  document.getElementById('btn-replay-level1').addEventListener('click', () => {
    SoundFX.playClick();
    GameState.score = 0;
    initLevel1(false);
  });
});
