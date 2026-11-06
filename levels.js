/**
 * ============================================================================
 * CYBER ESCAPE ROOM: LA BRECHA — DEFINICIÓN DE LOS 3 NIVELES (levels.js)
 * Contiene la configuración de dificultad y los mapas 2D sin etiquetas encimadas:
 *  - Nivel 1: Oficina (Phishing) -> Clave: PHISH
 *  - Nivel 2: Sala del Servidor (Inyección SQL) -> Clave: SQLSAFE
 *  - Nivel 3: Sala de Acceso (Contraseña Fuerte + MFA vs BRECHA) -> Clave: ACCESS
 * ============================================================================
 */

/* ============================================================================
   0. CONFIGURACIÓN DE DIFICULTAD (FÁCIL, NORMAL, DIFÍCIL)
   ============================================================================ */
const CONFIG_DIFICULTAD = {
  facil: {
    clave: 'facil',
    nombre: 'Fácil',
    insignia: 'FÁCIL (x0.8)',
    vidasMaximas: 5,
    multVelocidadEnemigos: 0.75,
    cambioCantidadEnemigos: -1,
    recuperacionVida: 2,
    penalizacionPista: -10,
    multiplicadorPuntos: 0.8,
    resumen: '5 Vidas (+2 por nivel) • Menos enemigos y más lentos • Pista: -10 pts • Puntos: x0.8'
  },
  normal: {
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
  },
  dificil: {
    clave: 'dificil',
    nombre: 'Difícil',
    insignia: 'DIFÍCIL (x1.5)',
    vidasMaximas: 2,
    multVelocidadEnemigos: 1.35,
    cambioCantidadEnemigos: 1,
    recuperacionVida: 0,
    penalizacionPista: -50,
    multiplicadorPuntos: 1.5,
    resumen: '2 Vidas (sin curación entre niveles) • Más enemigos y más rápidos • Pista: -50 pts • Puntos: x1.5'
  }
};

/**
 * Ajusta la cantidad y velocidad de enemigos según la dificultad seleccionada
 */
function aplicarDificultadAEnemigos(enemigosBase, enemigoExtra, configDif = CONFIG_DIFICULTAD.normal) {
  const lista = enemigosBase.map((e) => ({ ...e }));

  if (configDif.cambioCantidadEnemigos < 0 && lista.length > 1) {
    // En Fácil: elimina un enemigo patrullero (sin eliminar nunca al Jefe BRECHA)
    const indiceEliminable = lista.findLastIndex((e) => e.tipo !== 'jefe');
    if (indiceEliminable !== -1) {
      lista.splice(indiceEliminable, 1);
    }
  } else if (configDif.cambioCantidadEnemigos > 0 && enemigoExtra) {
    // En Difícil: agrega un enemigo adicional al mapa
    lista.push({ ...enemigoExtra });
  }

  return lista.map((e) => ({
    ...e,
    velocidad: Math.round(e.velocidad * configDif.multVelocidadEnemigos)
  }));
}

/* ============================================================================
   1. DATOS DEL NIVEL 1 — OFICINA (PHISHING)
   ============================================================================ */
const CORREOS_NIVEL_1 = [
  {
    id: 1,
    aliasRemitente: 'Soporte TI',
    correoRemitente: 'alerta@unach-soporte-falso.com',
    asunto: 'Tu cuenta será suspendida hoy',
    esPhishing: true,
    estado: 'pendiente',
    cuerpo: 'Detectamos un acceso extraño. Tu cuenta será suspendida hoy si no validas tu contraseña ahora mismo en este enlace:',
    textoEnlace: 'https://unach.mx/validar-cuenta',
    urlReal: 'http://185.220.101.44/robar-clave.php',
    pistaLupa: '⚠️ FALSO: Viene de "@unach-soporte-falso.com" y el enlace real va a una IP pirata.'
  },
  {
    id: 2,
    aliasRemitente: 'Coordinación UNACH',
    correoRemitente: 'coordinacion@unach.mx',
    asunto: 'Reunión del equipo — UNACH',
    esPhishing: false,
    estado: 'pendiente',
    cuerpo: 'Hola equipo, recuerden que hoy a las 13:00 hrs tenemos reunión en la Sala B para revisar el avance del sistema.',
    textoEnlace: 'https://intranet.unach.mx/agenda.pdf',
    urlReal: 'https://intranet.unach.mx/agenda.pdf',
    pistaLupa: '✓ SEGURO: Usa el correo oficial "@unach.mx" y el enlace es auténtico.'
  },
  {
    id: 3,
    aliasRemitente: 'Admin Cuentas',
    correoRemitente: 'admin@unach-clave-urgente.net',
    asunto: 'URGENTE: Actualización de contraseña',
    esPhishing: true,
    estado: 'pendiente',
    cuerpo: 'Tu clave ha caducado. Escribe tu contraseña actual en este formulario externo para no bloquear tu equipo:',
    textoEnlace: 'https://bit.ly/cambiar-clave-unach',
    urlReal: 'http://sitio-pirata.ru/formulario.html',
    pistaLupa: '⚠️ FALSO: Dominio engañoso (".net"), pide tu clave y oculta un sitio extranjero.'
  },
  {
    id: 4,
    aliasRemitente: 'Sistemas TI',
    correoRemitente: 'sistemas@unach.mx',
    asunto: 'Recordatorio de seguridad',
    esPhishing: false,
    estado: 'pendiente',
    cuerpo: 'Recuerda que el área de TI jamás pide contraseñas por correo y nuestro único dominio oficial es @unach.mx.',
    textoEnlace: 'https://intranet.unach.mx/seguridad',
    urlReal: 'https://intranet.unach.mx/seguridad',
    pistaLupa: '✓ SEGURO: Remitente institucional "@unach.mx" verificado.'
  }
];

const PISTAS_NIVEL_1 = [
  'Pista 1: Habla con la Ing. Sofía (tecla E): solo los correos @unach.mx son reales.',
  'Pista 2: Acércate a la 💻 Terminal de Correo, presiona E y activa "🔍 Usar lupa" para ver el enlace oculto.',
  'Pista 3: Reporta como Phishing los correos #1 y #3, y descarta el USB trampa para abrir la puerta.'
];

function crearDatosNivel1(configDif = CONFIG_DIFICULTAD.normal) {
  const enemigosBase = [
    {
      tipo: 'phishing',
      etiqueta: 'BOT PHISHING 1',
      velocidad: 115,
      puntosRuta: [
        { x: 365, y: 120 },
        { x: 365, y: 375 }
      ]
    },
    {
      tipo: 'phishing',
      etiqueta: 'BOT PHISHING 2',
      velocidad: 125,
      puntosRuta: [
        { x: 690, y: 165 },
        { x: 690, y: 365 }
      ]
    }
  ];

  const enemigoExtra = {
    tipo: 'phishing',
    etiqueta: 'BOT PHISHING 3',
    velocidad: 130,
    puntosRuta: [
      { x: 205, y: 260 },
      { x: 335, y: 260 }
    ]
  };

  return {
    id: 1,
    tema: 'theme-cyan',
    colorAcento: '#00f0ff',
    nombre: 'NIVEL 1: OFICINA (PHISHING)',
    objetivo: 'Esquiva los bots, presiona E en la 💻 Terminal para reportar los 2 correos falsos y cruza la puerta.',
    etiquetaContador: 'Correos falsos:',
    inicioJugador: { x: 95, y: 260 },

    obstaculos: [
      { x: 185, y: 105, ancho: 155, alto: 52, etiqueta: 'MESA TI', color: '#00f0ff' },
      { x: 430, y: 215, ancho: 150, alto: 70, etiqueta: '', color: '#00f0ff' },
      { x: 455, y: 410, ancho: 150, alto: 55, etiqueta: '', color: '#ff2bd6' },
      { x: 825, y: 0, ancho: 20, alto: 185, etiqueta: '', color: '#00f0ff' },
      { x: 825, y: 315, ancho: 20, alto: 205, etiqueta: '', color: '#00f0ff' },
      { x: 827, y: 185, ancho: 16, alto: 130, etiqueta: 'PUERTA', color: '#ff1f4b', esPuerta: true, abierta: false }
    ],

    interactuables: [
      {
        id: 'npc-aria',
        tipo: 'npc',
        x: 95,
        y: 115,
        radio: 22,
        color: '#00f0ff',
        nombre: 'A.R.I.A.',
        aviso: '[E] Hablar con A.R.I.A.',
        dialogo: 'A.R.I.A.: "Esquiva los Bots de Phishing, habla con los empleados y revisa la 💻 Terminal de Correo en el centro."'
      },
      {
        id: 'npc-sofia',
        tipo: 'npc',
        x: 262,
        y: 68,
        radio: 22,
        color: '#39ff14',
        nombre: 'Ing. Sofía (TI)',
        aviso: '[E] Hablar con Sofía',
        dialogo: 'Ing. Sofía (TI): "Regla de oro: solo los correos que terminan en @unach.mx son auténticos. ¡Activa la lupa en la terminal!"'
      },
      {
        id: 'npc-carlos',
        tipo: 'npc',
        x: 225,
        y: 435,
        radio: 22,
        color: '#ffb800',
        nombre: 'Carlos (Oficina)',
        aviso: '[E] Hablar con Carlos',
        dialogo: 'Carlos: "Alguien dejó un 🔌 USB sospechoso en la mesa de abajo y mandó correos urgentes falsos pidiendo contraseñas."'
      },
      {
        id: 'npc-brecha',
        tipo: 'villano',
        x: 745,
        y: 90,
        radio: 22,
        color: '#ff1f4b',
        nombre: 'BRECHA',
        aviso: '[E] Ver mensaje de BRECHA',
        dialogo: 'BRECHA: "Sembré correos trampa y un USB infectado en esta oficina. ¡Nunca conseguirás la clave PHISH!"'
      },
      {
        id: 'obj-terminal',
        tipo: 'terminal',
        x: 505,
        y: 250,
        radio: 56,
        color: '#00f0ff',
        nombre: '💻 CORREOS',
        aviso: '[E] Abrir Correos (4)'
      },
      {
        id: 'obj-usb',
        tipo: 'usb',
        x: 530,
        y: 437,
        radio: 48,
        color: '#ff2bd6',
        nombre: '🔌 USB TRAMPA',
        aviso: '[E] Revisar USB',
        revisado: false
      },
      {
        id: 'obj-exit-zone',
        tipo: 'salida',
        x: 902,
        y: 250,
        radio: 34,
        color: '#39ff14',
        nombre: 'SALIDA',
        aviso: '[E] Salir con clave PHISH'
      }
    ],

    enemigos: aplicarDificultadAEnemigos(enemigosBase, enemigoExtra, configDif)
  };
}

/* ============================================================================
   2. DATOS DEL NIVEL 2 — SALA DEL SERVIDOR (INYECCIÓN SQL)
   ============================================================================ */
const PISTAS_NIVEL_2 = [
  'Pista 1: Recoge los 3 🧩 Bloques de Código Seguro brillantes en el mapa presionando la tecla E.',
  'Pista 2: Una vez que tengas los 3 bloques (3/3), acércate al 🖥️ Servidor SQL en el centro y presiona E.',
  'Pista 3: El orden correcto del parche es: 1. PREPARE -> 2. WHERE usuario = ? -> 3. EXECUTE.'
];

const BLOQUES_CODIGO_NIVEL_2 = [
  {
    orden: 1,
    id: 'bloque-1',
    tituloCorto: '1. PREPARE stmt',
    codigo: 'PREPARE login_stmt FROM',
    descripcion: 'Prepara la estructura fija del comando SQL antes de recibir datos.'
  },
  {
    orden: 2,
    id: 'bloque-2',
    tituloCorto: '2. WHERE usuario = ?',
    codigo: '"SELECT * FROM usuarios WHERE usuario = ?"',
    descripcion: 'Usa el signo ? como marcador seguro en vez de concatenar texto.'
  },
  {
    orden: 3,
    id: 'bloque-3',
    tituloCorto: '3. EXECUTE [dato]',
    codigo: 'EXECUTE login_stmt USING @usuario_input;',
    descripcion: 'Envía el texto del usuario por separado para que no ejecute trampas.'
  }
];

function crearDatosNivel2(configDif = CONFIG_DIFICULTAD.normal) {
  const enemigosBase = [
    {
      tipo: 'sql',
      etiqueta: 'DRON SQL 1',
      velocidad: 125,
      puntosRuta: [
        { x: 390, y: 95 },
        { x: 390, y: 425 }
      ]
    },
    {
      tipo: 'sql',
      etiqueta: 'DRON SQL 2',
      velocidad: 135,
      puntosRuta: [
        { x: 685, y: 155 },
        { x: 685, y: 375 }
      ]
    },
    {
      tipo: 'sql',
      etiqueta: 'DRON SQL 3',
      velocidad: 115,
      puntosRuta: [
        { x: 185, y: 245 },
        { x: 350, y: 245 }
      ]
    }
  ];

  const enemigoExtra = {
    tipo: 'sql',
    etiqueta: 'DRON SQL 4',
    velocidad: 140,
    puntosRuta: [
      { x: 470, y: 115 },
      { x: 650, y: 115 }
    ]
  };

  return {
    id: 2,
    tema: 'theme-magenta',
    colorAcento: '#ff2bd6',
    nombre: 'NIVEL 2: SERVIDOR (INYECCIÓN SQL)',
    objetivo: 'Recoge los 3 🧩 Bloques de Código con E esquivando los Drones SQL y colócalos en el 🖥️ Servidor Central.',
    etiquetaContador: 'Bloques seguros:',
    inicioJugador: { x: 90, y: 260 },

    obstaculos: [
      { x: 185, y: 115, ancho: 145, alto: 52, etiqueta: 'RACK A', color: '#ff2bd6' },
      { x: 185, y: 355, ancho: 145, alto: 52, etiqueta: 'RACK B', color: '#ff2bd6' },
      { x: 475, y: 215, ancho: 155, alto: 72, etiqueta: '', color: '#00f0ff' },
      { x: 825, y: 0, ancho: 20, alto: 185, etiqueta: '', color: '#ff2bd6' },
      { x: 825, y: 315, ancho: 20, alto: 205, etiqueta: '', color: '#ff2bd6' },
      { x: 827, y: 185, ancho: 16, alto: 130, etiqueta: 'PUERTA', color: '#ff1f4b', esPuerta: true, abierta: false }
    ],

    interactuables: [
      {
        id: 'npc-aria-2',
        tipo: 'npc',
        x: 90,
        y: 115,
        radio: 22,
        color: '#00f0ff',
        nombre: 'A.R.I.A.',
        aviso: '[E] Hablar con A.R.I.A.',
        dialogo: 'A.R.I.A.: "BRECHA atacó la base de datos con Inyección SQL. Recoge los 3 🧩 Bloques verdes y parchea el 🖥️ Servidor Central."'
      },
      {
        id: 'npc-dba',
        tipo: 'npc',
        x: 90,
        y: 410,
        radio: 22,
        color: '#39ff14',
        nombre: 'Ing. David (DBA)',
        aviso: '[E] Hablar con Ing. David',
        dialogo: 'Ing. David: "Para frenar la Inyección SQL debemos armar una Consulta Parametrizada: 1) PREPARE, 2) WHERE usuario = ?, 3) EXECUTE."'
      },
      {
        id: 'npc-brecha-2',
        tipo: 'villano',
        x: 745,
        y: 85,
        radio: 22,
        color: '#ff1f4b',
        nombre: 'BRECHA',
        aviso: '[E] Ver mensaje de BRECHA',
        dialogo: 'BRECHA: "¡Escribí \' OR \'1\'=\'1 en el login y entré sin contraseña! Mis Drones SQL no te dejarán reparar el código."'
      },
      {
        id: 'code-block-1',
        tipo: 'bloqueCodigo',
        ordenBloque: 1,
        x: 255,
        y: 62,
        radio: 26,
        color: '#39ff14',
        nombre: '🧩 BLOQUE 1 (PREPARE)',
        aviso: '[E] Recoger Bloque 1',
        recolectado: false
      },
      {
        id: 'code-block-2',
        tipo: 'bloqueCodigo',
        ordenBloque: 2,
        x: 552,
        y: 435,
        radio: 26,
        color: '#39ff14',
        nombre: '🧩 BLOQUE 2 (WHERE ?)',
        aviso: '[E] Recoger Bloque 2',
        recolectado: false
      },
      {
        id: 'code-block-3',
        tipo: 'bloqueCodigo',
        ordenBloque: 3,
        x: 745,
        y: 435,
        radio: 26,
        color: '#39ff14',
        nombre: '🧩 BLOQUE 3 (EXECUTE)',
        aviso: '[E] Recoger Bloque 3',
        recolectado: false
      },
      {
        id: 'obj-sql-server',
        tipo: 'servidorSql',
        x: 552,
        y: 251,
        radio: 58,
        color: '#00f0ff',
        nombre: '🖥️ SERVIDOR SQL',
        aviso: '[E] Abrir Consola SQL'
      },
      {
        id: 'obj-exit-zone-2',
        tipo: 'salida',
        x: 902,
        y: 250,
        radio: 34,
        color: '#39ff14',
        nombre: 'SALIDA',
        aviso: '[E] Salir con clave SQLSAFE'
      }
    ],

    enemigos: aplicarDificultadAEnemigos(enemigosBase, enemigoExtra, configDif)
  };
}

/* ============================================================================
   3. DATOS DEL NIVEL 3 — SALA DE ACCESO (CONTRASEÑA FUERTE + MFA vs BRECHA)
   ============================================================================ */
const PISTAS_NIVEL_3 = [
  'Pista 1: Recoge en el mapa las 3 🔑 Piezas de Contraseña (M4r, !9x, P2#) y el 📱 Celular MFA presionando E.',
  'Pista 2: Ve al 🛡️ Escudo Central y elige la contraseña fuerte M4r!9xP2# (combina mayúsculas, números y símbolos).',
  'Pista 3: Activa la casilla de Autenticación Multifactor (MFA) con el código del celular para derrotar a BRECHA.'
];

/** Opciones de contraseña en la consola del Nivel 3 con su tiempo de crackeo */
const OPCIONES_CLAVE_NIVEL_3 = [
  {
    id: 'debil-1',
    valor: '123456',
    tiempoCrackeo: '0.0001 segundos (Instantáneo)',
    esFuerte: false
  },
  {
    id: 'debil-2',
    valor: 'password',
    tiempoCrackeo: '0.002 segundos (Diccionario)',
    esFuerte: false
  },
  {
    id: 'debil-3',
    valor: 'admin123',
    tiempoCrackeo: '0.4 segundos (Fuerza bruta)',
    esFuerte: false
  },
  {
    id: 'fuerte-1',
    valor: 'M4r!9xP2#',
    tiempoCrackeo: '+450 siglos (Cifrado Robusto)',
    esFuerte: true
  }
];

function crearDatosNivel3(configDif = CONFIG_DIFICULTAD.normal) {
  const enemigosBase = [
    {
      tipo: 'fuerzaBruta',
      etiqueta: 'FUERZA BRUTA 1',
      velocidad: 135,
      puntosRuta: [
        { x: 365, y: 95 },
        { x: 365, y: 420 }
      ]
    },
    {
      tipo: 'fuerzaBruta',
      etiqueta: 'FUERZA BRUTA 2',
      velocidad: 140,
      puntosRuta: [
        { x: 645, y: 120 },
        { x: 645, y: 400 }
      ]
    },
    {
      tipo: 'jefe',
      etiqueta: 'JEFE BRECHA',
      radio: 24,
      velocidad: 95,
      puntosRuta: [
        { x: 755, y: 155 },
        { x: 755, y: 345 }
      ]
    }
  ];

  const enemigoExtra = {
    tipo: 'fuerzaBruta',
    etiqueta: 'FUERZA BRUTA 3',
    velocidad: 145,
    puntosRuta: [
      { x: 190, y: 250 },
      { x: 330, y: 250 }
    ]
  };

  return {
    id: 3,
    tema: 'theme-violet',
    colorAcento: '#8a2be2',
    nombre: 'NIVEL 3: SALA DE ACCESO (JEFE BRECHA)',
    objetivo: 'Recoge las 3 🔑 Piezas de Clave y el 📱 Celular MFA con E, y arma el 🛡️ Escudo Central para derrotar a BRECHA.',
    etiquetaContador: 'Piezas de defensa:',
    inicioJugador: { x: 88, y: 260 },

    obstaculos: [
      { x: 185, y: 120, ancho: 135, alto: 48, etiqueta: 'NODO A', color: '#8a2be2' },
      { x: 185, y: 350, ancho: 135, alto: 48, etiqueta: 'NODO B', color: '#8a2be2' },
      { x: 425, y: 215, ancho: 150, alto: 70, etiqueta: '', color: '#00f0ff' },
      { x: 825, y: 0, ancho: 20, alto: 185, etiqueta: '', color: '#8a2be2' },
      { x: 825, y: 315, ancho: 20, alto: 205, etiqueta: '', color: '#8a2be2' },
      { x: 827, y: 185, ancho: 16, alto: 130, etiqueta: 'PUERTA', color: '#ff1f4b', esPuerta: true, abierta: false }
    ],

    interactuables: [
      {
        id: 'npc-aria-3',
        tipo: 'npc',
        x: 88,
        y: 110,
        radio: 22,
        color: '#00f0ff',
        nombre: 'A.R.I.A.',
        aviso: '[E] Hablar con A.R.I.A.',
        dialogo: 'A.R.I.A.: "¡Es BRECHA! Recoge las 3 🔑 Piezas de Contraseña Fuerte y el 📱 Celular MFA para activar el 🛡️ Escudo Central."'
      },
      {
        id: 'npc-elena',
        tipo: 'npc',
        x: 88,
        y: 415,
        radio: 22,
        color: '#39ff14',
        nombre: 'Ing. Elena (Accesos)',
        aviso: '[E] Hablar con Elena',
        dialogo: 'Ing. Elena: "Una contraseña fuerte como M4r!9xP2# más la Autenticación Multifactor (MFA) detienen cualquier ataque de fuerza bruta."'
      },
      // 3 Piezas de contraseña fuerte + 1 Celular MFA (Total: 4 piezas de defensa)
      {
        id: 'shield-item-1',
        tipo: 'piezaEscudo',
        idPieza: 'pieza1',
        x: 252,
        y: 62,
        radio: 26,
        color: '#00f0ff',
        nombre: '🔑 PIEZA 1 (M4r)',
        aviso: '[E] Recoger Pieza M4r',
        recolectado: false,
        descripcion: 'Fragmento 1 "M4r": Combina mayúsculas, minúsculas y números.'
      },
      {
        id: 'shield-item-2',
        tipo: 'piezaEscudo',
        idPieza: 'pieza2',
        x: 252,
        y: 445,
        radio: 26,
        color: '#00f0ff',
        nombre: '🔑 PIEZA 2 (!9x)',
        aviso: '[E] Recoger Pieza !9x',
        recolectado: false,
        descripcion: 'Fragmento 2 "!9x": Agrega símbolos especiales contra ataques de diccionario.'
      },
      {
        id: 'shield-item-3',
        tipo: 'piezaEscudo',
        idPieza: 'pieza3',
        x: 565,
        y: 445,
        radio: 26,
        color: '#00f0ff',
        nombre: '🔑 PIEZA 3 (P2#)',
        aviso: '[E] Recoger Pieza P2#',
        recolectado: false,
        descripcion: 'Fragmento 3 "P2#": Completa la contraseña robusta M4r!9xP2#.'
      },
      {
        id: 'shield-item-mfa',
        tipo: 'piezaEscudo',
        idPieza: 'mfa',
        x: 565,
        y: 62,
        radio: 26,
        color: '#39ff14',
        nombre: '📱 CELULAR MFA',
        aviso: '[E] Recoger Token MFA',
        recolectado: false,
        descripcion: 'Dispositivo MFA: Genera un código único de 6 dígitos cada 30 segundos.'
      },
      // Consola del Escudo Central
      {
        id: 'obj-auth-shield',
        tipo: 'escudoAuth',
        x: 500,
        y: 250,
        radio: 58,
        color: '#39ff14',
        nombre: '🛡️ ESCUDO CENTRAL',
        aviso: '[E] Configurar Escudo y MFA'
      },
      // Salida Final del Juego
      {
        id: 'obj-exit-zone-3',
        tipo: 'salida',
        x: 902,
        y: 250,
        radio: 34,
        color: '#39ff14',
        nombre: 'ESCAPE',
        aviso: '[E] Escapar con clave ACCESS'
      }
    ],

    // Ataques de Fuerza Bruta + Jefe Final BRECHA ajustados por dificultad
    enemigos: aplicarDificultadAEnemigos(enemigosBase, enemigoExtra, configDif)
  };
}

window.CONFIG_DIFICULTAD = CONFIG_DIFICULTAD;
window.CORREOS_NIVEL_1 = CORREOS_NIVEL_1;
window.PISTAS_NIVEL_1 = PISTAS_NIVEL_1;
window.crearDatosNivel1 = crearDatosNivel1;

window.PISTAS_NIVEL_2 = PISTAS_NIVEL_2;
window.BLOQUES_CODIGO_NIVEL_2 = BLOQUES_CODIGO_NIVEL_2;
window.crearDatosNivel2 = crearDatosNivel2;

window.PISTAS_NIVEL_3 = PISTAS_NIVEL_3;
window.OPCIONES_CLAVE_NIVEL_3 = OPCIONES_CLAVE_NIVEL_3;
window.crearDatosNivel3 = crearDatosNivel3;
