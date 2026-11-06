/**
 * ============================================================================
 * CYBER ESCAPE ROOM: LA BRECHA — ENEMIGOS, JEFE FINAL Y PARTÍCULAS (enemies.js)
 * Define:
 *  - Bots de Phishing (Nivel 1)
 *  - Drones de Inyección SQL (Nivel 2)
 *  - Ataques de Fuerza Bruta y Jefe Final BRECHA (Nivel 3)
 *  - Sistema de Partículas Neón
 * ============================================================================
 */

class BotEnemigo {
  /**
   * @param {Object} config Configuración del enemigo: puntosRuta, velocidad, tipo y etiqueta
   */
  constructor(config) {
    this.puntosRuta = config.puntosRuta || [{ x: 200, y: 200 }];
    this.puntoActual = 0;
    this.x = this.puntosRuta[0].x;
    this.y = this.puntosRuta[0].y;
    this.radio = config.radio || 15;
    this.velocidad = config.velocidad || 105;
    this.tipo = config.tipo || 'phishing'; // 'phishing' | 'sql' | 'fuerzaBruta' | 'jefe'
    this.etiqueta = config.etiqueta || 'BOT PHISHING';
    this.pulso = Math.random() * Math.PI * 2;
    this.activo = true;
  }

  /**
   * Actualiza el movimiento del enemigo entre sus puntos de ruta
   * @param {number} dt Tiempo transcurrido en segundos
   */
  actualizar(dt) {
    if (!this.activo) return;
    this.pulso += dt * 5.5;

    if (this.puntosRuta.length < 2) return;

    const destino = this.puntosRuta[this.puntoActual];
    const dx = destino.x - this.x;
    const dy = destino.y - this.y;
    const distancia = Math.hypot(dx, dy);

    if (distancia < 6) {
      this.puntoActual = (this.puntoActual + 1) % this.puntosRuta.length;
    } else {
      this.x += (dx / distancia) * this.velocidad * dt;
      this.y += (dy / distancia) * this.velocidad * dt;
    }
  }

  /**
   * Verifica si el enemigo o ataque toca al jugador
   * @param {Jugador} jugador
   * @returns {boolean}
   */
  tocaJugador(jugador) {
    if (!this.activo || jugador.tiempoInvulnerable > 0) return false;
    const distancia = Math.hypot(this.x - jugador.x, this.y - jugador.y);
    return distancia < this.radio + jugador.radio - 3;
  }

  /**
   * Dibuja el enemigo o al Jefe Final BRECHA con etiqueta legible
   * @param {CanvasRenderingContext2D} ctx
   */
  dibujar(ctx) {
    if (!this.activo) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    const esJefe = this.tipo === 'jefe';
    const radioAura = this.radio + (esJefe ? 9 : 5) + Math.sin(this.pulso) * (esJefe ? 5 : 3);

    // Aura de peligro
    ctx.beginPath();
    ctx.arc(0, 0, radioAura, 0, Math.PI * 2);
    ctx.fillStyle = esJefe ? 'rgba(255, 43, 214, 0.22)' : 'rgba(255, 31, 75, 0.16)';
    ctx.fill();

    // Cuerpo principal
    ctx.beginPath();
    ctx.arc(0, 0, this.radio, 0, Math.PI * 2);
    ctx.fillStyle = esJefe ? '#2c072e' : '#240814';
    ctx.fill();
    ctx.lineWidth = esJefe ? 3.5 : 2.5;
    ctx.strokeStyle = esJefe ? '#ff2bd6' : '#ff1f4b';
    ctx.shadowColor = esJefe ? '#ff2bd6' : '#ff1f4b';
    ctx.shadowBlur = esJefe ? 16 : 10;
    ctx.stroke();

    // Icono interior
    ctx.shadowBlur = 0;
    ctx.font = esJefe ? 'bold 20px sans-serif' : 'bold 13px "Share Tech Mono", "Consolas", "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let icono = '🎣';
    if (this.tipo === 'sql') icono = '💉';
    else if (this.tipo === 'fuerzaBruta') icono = '⚡';
    else if (this.tipo === 'jefe') icono = '👾';
    ctx.fillText(icono, 0, 1);

    // Etiqueta compacta con pastilla oscura de fondo
    ctx.font = 'bold 10px "Share Tech Mono", "Consolas", "Courier New", monospace';
    const anchoTexto = ctx.measureText(this.etiqueta).width + 10;
    const posEtiquetaY = this.y < 46 ? this.radio + 15 : -this.radio - 14;

    ctx.fillStyle = 'rgba(10, 10, 20, 0.88)';
    ctx.fillRect(-anchoTexto / 2, posEtiquetaY - 8, anchoTexto, 15);
    ctx.strokeStyle = esJefe ? '#ff2bd6' : 'rgba(255, 31, 75, 0.65)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-anchoTexto / 2, posEtiquetaY - 8, anchoTexto, 15);

    ctx.fillStyle = esJefe ? '#ff85e8' : '#ff6b88';
    ctx.fillText(this.etiqueta, 0, posEtiquetaY);

    ctx.restore();
  }
}

/* ============================================================================
   SISTEMA DE PARTÍCULAS NEÓN
   ============================================================================ */
class SistemaParticulas {
  constructor() {
    this.particulas = [];
  }

  estallar(x, y, color = '#00f0ff', cantidad = 22) {
    for (let i = 0; i < cantidad; i++) {
      const angulo = Math.random() * Math.PI * 2;
      const velocidad = 40 + Math.random() * 150;
      this.particulas.push({
        x,
        y,
        vx: Math.cos(angulo) * velocidad,
        vy: Math.sin(angulo) * velocidad,
        vida: 0.45 + Math.random() * 0.4,
        vidaMaxima: 0.85,
        tamano: 2 + Math.random() * 3.5,
        color
      });
    }
  }

  actualizar(dt) {
    for (let i = this.particulas.length - 1; i >= 0; i--) {
      const p = this.particulas[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vida -= dt;
      if (p.vida <= 0) {
        this.particulas.splice(i, 1);
      }
    }
  }

  dibujar(ctx) {
    ctx.save();
    for (const p of this.particulas) {
      const opacidad = Math.max(0, p.vida / p.vidaMaxima);
      ctx.globalAlpha = opacidad;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(p.x - p.tamano / 2, p.y - p.tamano / 2, p.tamano, p.tamano);
    }
    ctx.restore();
  }
}

window.BotEnemigo = BotEnemigo;
window.SistemaParticulas = SistemaParticulas;
