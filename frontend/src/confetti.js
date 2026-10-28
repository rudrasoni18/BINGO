/**
 * confetti.js — Lightweight, Zero-Dependency HTML5 Canvas Confetti Burst Engine
 *
 * Provides explosive multi-angle celebratory fireworks & particle blasts.
 * 100% offline, zero external dependencies, auto-cleaning canvas overlay.
 */

const NEON_COLORS = [
  '#00f5ff', // Neon Cyan
  '#ff00ff', // Neon Pink
  '#39ff14', // Neon Lime
  '#ffff00', // Neon Yellow
  '#ff6600', // Neon Orange
  '#a855f7', // Electric Purple
  '#38bdf8', // Sky Blue
  '#f43f5e', // Hot Crimson
];

class Particle {
  constructor(x, y, vx, vy, color, shape = 'rect') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.shape = shape;

    this.size = Math.random() * 8 + 6; // 6-14px
    this.gravity = 0.35;
    this.drag = 0.982;
    this.opacity = 1;
    this.decay = Math.random() * 0.008 + 0.007; // ~3.5-4s lifespan

    // 3D tumbling & flutter
    this.tilt = Math.random() * Math.PI * 2;
    this.tiltSpeed = (Math.random() * 0.15 + 0.05) * (Math.random() < 0.5 ? 1 : -1);
    this.angle = Math.random() * Math.PI * 2;
    this.angularVelocity = (Math.random() * 0.2 - 0.1);
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= this.drag;
    this.vy = this.vy * this.drag + this.gravity;

    this.tilt += this.tiltSpeed;
    this.angle += this.angularVelocity;
    this.opacity -= this.decay;

    return this.opacity > 0 && this.y < window.innerHeight + 100;
  }

  draw(ctx) {
    if (this.opacity <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = Math.max(0, this.opacity);
    ctx.fillStyle = this.color;

    const w = this.size * Math.cos(this.tilt);
    const h = this.size;

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.abs(w) / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }

    ctx.restore();
  }
}

let activeCanvas = null;
let activeCtx = null;
let particles = [];
let animFrameId = null;

function ensureCanvas() {
  if (typeof document === 'undefined') return null;

  if (!activeCanvas || !document.body.contains(activeCanvas)) {
    activeCanvas = document.createElement('canvas');
    activeCanvas.style.position = 'fixed';
    activeCanvas.style.top = '0';
    activeCanvas.style.left = '0';
    activeCanvas.style.width = '100vw';
    activeCanvas.style.height = '100vh';
    activeCanvas.style.pointerEvents = 'none';
    activeCanvas.style.zIndex = '9999';
    activeCanvas.className = 'confetti-canvas';
    document.body.appendChild(activeCanvas);

    const resize = () => {
      if (!activeCanvas) return;
      activeCanvas.width = window.innerWidth * window.devicePixelRatio;
      activeCanvas.height = window.innerHeight * window.devicePixelRatio;
      activeCtx = activeCanvas.getContext('2d');
      activeCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener('resize', resize);
  }

  return activeCanvas;
}

function spawnBurst(originX, originY, count, minAngleRad, maxAngleRad, minSpeed, maxSpeed) {
  for (let i = 0; i < count; i++) {
    const angle = minAngleRad + Math.random() * (maxAngleRad - minAngleRad);
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const color = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
    const shape = Math.random() < 0.25 ? 'circle' : 'rect';

    particles.push(new Particle(originX, originY, vx, vy, color, shape));
  }
}

function loop() {
  if (!activeCtx || !activeCanvas) return;

  activeCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  particles = particles.filter((p) => {
    const alive = p.update();
    if (alive) p.draw(activeCtx);
    return alive;
  });

  if (particles.length > 0) {
    animFrameId = requestAnimationFrame(loop);
  } else {
    // Teardown canvas when idle
    if (activeCanvas && activeCanvas.parentNode) {
      activeCanvas.parentNode.removeChild(activeCanvas);
    }
    activeCanvas = null;
    activeCtx = null;
    animFrameId = null;
  }
}

/**
 * Fires an explosive, multi-angle celebratory confetti shower
 */
export function fireConfettiExplosion() {
  if (typeof window === 'undefined') return;
  ensureCanvas();

  const W = window.innerWidth;
  const H = window.innerHeight;

  // 1. Immediate explosive center & lower angle blasts
  // Left cannon: angled up & right (~ -60 degrees = -1.05 rad)
  spawnBurst(W * 0.1, H * 0.95, 60, -1.35, -0.75, 14, 26);

  // Right cannon: angled up & left (~ -120 degrees = -2.09 rad)
  spawnBurst(W * 0.9, H * 0.95, 60, -2.39, -1.79, 14, 26);

  // Center radial fireworks
  spawnBurst(W * 0.5, H * 0.45, 80, -Math.PI, Math.PI, 6, 18);

  // 2. Delayed secondary wave at 250ms for sustained spectacle
  setTimeout(() => {
    if (!activeCanvas) ensureCanvas();
    spawnBurst(W * 0.25, H * 0.85, 45, -1.6, -0.9, 12, 22);
    spawnBurst(W * 0.75, H * 0.85, 45, -2.2, -1.5, 12, 22);
  }, 250);

  // 3. Delayed top glitter shower at 500ms
  setTimeout(() => {
    if (!activeCanvas) ensureCanvas();
    spawnBurst(W * 0.5, H * 0.2, 50, -Math.PI * 0.75, -Math.PI * 0.25, 8, 16);
  }, 500);

  if (!animFrameId) {
    animFrameId = requestAnimationFrame(loop);
  }
}

export default fireConfettiExplosion;
