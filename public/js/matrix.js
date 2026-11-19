// GenBridge - Matrix Digital Rain Engine (Light Theme — Orange & Blue)

class MatrixRain {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.characters = '01$€£¥₿%&<>{}+-=*#@!~/\\▲▼◆0x8F9E2A_GENBRIDGE_4K_AI_TECH_STUDIO_';
    this.fontSize = 14;
    this.columns = 0;
    this.drops = [];
    this.speed = 33; // ~30 FPS
    this.opacity = parseFloat(localStorage.getItem('gb_matrix_opacity') || '0.08');
    this.enabled = localStorage.getItem('gb_matrix_enabled') !== 'false';
    this.intervalId = null;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.updateOpacity();
    if (this.enabled) {
      this.start();
    }
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.columns = Math.floor(this.canvas.width / this.fontSize);
    this.drops = [];
    for (let i = 0; i < this.columns; i++) {
      this.drops[i] = Math.floor(Math.random() * -100);
    }
  }

  start() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => this.draw(), this.speed);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('gb_matrix_enabled', this.enabled ? 'true' : 'false');
    if (this.enabled) {
      this.start();
    } else {
      this.stop();
    }
    this.updateUI();
  }

  cycleOpacity() {
    const levels = [0.04, 0.08, 0.14, 0.22];
    const currentIndex = levels.indexOf(this.opacity);
    this.opacity = levels[(currentIndex + 1) % levels.length];
    localStorage.setItem('gb_matrix_opacity', this.opacity);
    this.updateOpacity();
    this.updateUI();
  }

  updateOpacity() {
    if (this.canvas) {
      this.canvas.style.opacity = this.enabled ? this.opacity : '0';
    }
  }

  updateUI() {
    const btn = document.getElementById('matrixToggleBtn');
    if (btn) {
      const mode = !this.enabled ? 'OFF' : Math.round(this.opacity * 100) + '%';
      btn.innerHTML = `
        <i data-lucide="binary" class="w-3.5 h-3.5 ${this.enabled ? 'text-orange-500' : 'text-gray-400'}"></i>
        <span>Matrix: <strong class="${this.enabled ? 'text-orange-600' : 'text-gray-400'}">${mode}</strong></span>
      `;
      if (window.lucide) lucide.createIcons();
    }
  }

  draw() {
    if (!this.enabled) return;

    // Semi-transparent white wash to create trails on light background
    this.ctx.fillStyle = 'rgba(248, 250, 252, 0.12)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.font = `${this.fontSize}px 'JetBrains Mono', 'Courier New', monospace`;

    for (let i = 0; i < this.drops.length; i++) {
      const text = this.characters.charAt(Math.floor(Math.random() * this.characters.length));
      const x = i * this.fontSize;
      const y = this.drops[i] * this.fontSize;

      // Orange and blue color palette for rain drops
      if (Math.random() > 0.88) {
        this.ctx.fillStyle = '#f97316';
        this.ctx.shadowColor = '#f97316';
        this.ctx.shadowBlur = 6;
      } else if (Math.random() > 0.6) {
        this.ctx.fillStyle = '#3b82f6';
        this.ctx.shadowColor = '#2563eb';
        this.ctx.shadowBlur = 3;
      } else {
        this.ctx.fillStyle = '#93c5fd';
        this.ctx.shadowBlur = 0;
      }

      this.ctx.fillText(text, x, y);
      this.ctx.shadowBlur = 0;

      if (y > this.canvas.height && Math.random() > 0.975) {
        this.drops[i] = 0;
      }

      this.drops[i]++;
    }
  }
}

// Global instance
let matrixEffect = null;
window.addEventListener('DOMContentLoaded', () => {
  matrixEffect = new MatrixRain('matrixCanvas');
  matrixEffect.updateUI();
});
