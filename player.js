/**
 * ============================================================================
 * CYBER ESCAPE ROOM: LA BRECHA — JUGADOR / AUDITOR (player.js)
 * Controla el movimiento 2D (WASD / Flechas), colisiones con paredes y
 * animación neón al caminar en el Canvas.
 * ============================================================================
 */

class Jugador {
  /**
   * @param {number} x Posición inicial X
   * @param {number} y Posición inicial Y
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radio = 16;
    this.velocidad = 210; // píxeles por segundo
    this.direccion = 'abajo'; // 'arriba' | 'abajo' | 'izquierda' | 'derecha'
    this.enMovimiento = false;
    this.cicloPasos = 0;
    this.tiempoInvulnerable = 0; // Tiempo de parpadeo tras recibir daño
  }

  /**
   * Reinicia la posición del jugador en la habitación
   * @param {number} x
   * @param {number} y
   */
  reiniciar(x, y) {
    this.x = x;
    this.y = y;
    this.direccion = 'abajo';
    this.enMovimiento = false;
    this.cicloPasos = 0;
    this.tiempoInvulnerable = 0;
  }

  /**
   * Actualiza la posición y animación del jugador según las teclas presionadas
   * @param {number} dt Tiempo transcurrido en segundos
   * @param {Object} teclas Estado del teclado
   * @param {Array} obstaculos Lista de rectángulos con colisión {x, y, ancho, alto}
   * @param {number} anchoMapa Ancho del mapa
   * @param {number} altoMapa Alto del mapa
   */
  actualizar(dt, teclas, obstaculos, anchoMapa, altoMapa) {
    if (this.tiempoInvulnerable > 0) {
      this.tiempoInvulnerable = Math.max(0, this.tiempoInvulnerable - dt);
    }

    let dx = 0;
    let dy = 0;

    if (teclas['ArrowUp'] || teclas['KeyW']) {
      dy -= 1;
      this.direccion = 'arriba';
    }
    if (teclas['ArrowDown'] || teclas['KeyS']) {
      dy += 1;
      this.direccion = 'abajo';
    }
    if (teclas['ArrowLeft'] || teclas['KeyA']) {
      dx -= 1;
      this.direccion = 'izquierda';
    }
    if (teclas['ArrowRight'] || teclas['KeyD']) {
      dx += 1;
      this.direccion = 'derecha';
    }

    // Normalizar movimiento diagonal
    if (dx !== 0 && dy !== 0) {
      const factorDiagonal = 1 / Math.sqrt(2);
      dx *= factorDiagonal;
      dy *= factorDiagonal;
    }

    this.enMovimiento = dx !== 0 || dy !== 0;

    if (this.enMovimiento) {
      this.cicloPasos += dt * 10;

      // Movimiento separado en X y Y para deslizarse suavemente por las paredes
      const siguienteX = this.x + dx * this.velocidad * dt;
      if (!this.colisionaConMapa(siguienteX, this.y, obstaculos, anchoMapa, altoMapa)) {
        this.x = siguienteX;
      }

      const siguienteY = this.y + dy * this.velocidad * dt;
      if (!this.colisionaConMapa(this.x, siguienteY, obstaculos, anchoMapa, altoMapa)) {
        this.y = siguienteY;
      }
    } else {
      this.cicloPasos = 0;
    }
  }

  /**
   * Verifica colisión circular del jugador contra los bordes del mapa y obstáculos
   */
  colisionaConMapa(cx, cy, obstaculos, anchoMapa, altoMapa) {
    const margen = this.radio + 4;
    if (cx < margen || cx > anchoMapa - margen || cy < margen || cy > altoMapa - margen) {
      return true;
    }

    for (const obs of obstaculos) {
      if (obs.abierta) continue; // Si es una puerta abierta, permite pasar
      const masCercanoX = Math.max(obs.x, Math.min(cx, obs.x + obs.ancho));
      const masCercanoY = Math.max(obs.y, Math.min(cy, obs.y + obs.alto));
      const distX = cx - masCercanoX;
      const distY = cy - masCercanoY;
      if (distX * distX + distY * distY < this.radio * this.radio) {
        return true;
      }
    }
    return false;
  }

  /**
   * Dibuja al Auditor (personaje neón con animación de pasos y visor)
   * @param {CanvasRenderingContext2D} ctx
   */
  dibujar(ctx) {
    // Parpadeo cuando es invulnerable tras ser golpeado
    if (this.tiempoInvulnerable > 0 && Math.floor(this.tiempoInvulnerable * 12) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    // Sombra/halo neón bajo los pies
    ctx.beginPath();
    ctx.arc(0, 0, this.radio + 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 240, 255, 0.14)';
    ctx.fill();

    // Animación de pies al caminar
    const desfasePaso = this.enMovimiento ? Math.sin(this.cicloPasos) * 5 : 0;
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(-9, 8 + desfasePaso, 6, 6);
    ctx.fillRect(3, 8 - desfasePaso, 6, 6);

    // Cuerpo del Auditor (chaqueta ciberpunk)
    ctx.beginPath();
    ctx.arc(0, 0, this.radio, 0, Math.PI * 2);
    ctx.fillStyle = '#0b192e';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.stroke();

    // Visor direccional neón
    let visorX = 0;
    let visorY = 0;
    if (this.direccion === 'arriba') visorY = -7;
    if (this.direccion === 'abajo') visorY = 5;
    if (this.direccion === 'izquierda') visorX = -6;
    if (this.direccion === 'derecha') visorX = 6;

    ctx.fillStyle = '#39ff14';
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 8;
    ctx.fillRect(visorX - 6, visorY - 2, 12, 4);

    // Etiqueta pequeña sobre el jugador
    ctx.shadowBlur = 0;
    ctx.font = 'bold 10px "Share Tech Mono", "Consolas", "Courier New", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.textAlign = 'center';
    ctx.fillText('AUDITOR', 0, -this.radio - 7);

    ctx.restore();
  }
}

window.Jugador = Jugador;
