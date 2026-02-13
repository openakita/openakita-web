interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
}

(function bootstrapMotion() {
  function run() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    initBackgroundNetwork();
    initInteractiveGlow();
    initOrbitalParallax();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();

function initBackgroundNetwork(): void {
  const canvas = document.createElement("canvas");
  canvas.className = "site-motion-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    pointerX: -1,
    pointerY: -1,
    particles: [] as Particle[],
    rafId: 0,
  };

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    state.width = width;
    state.height = height;
    state.dpr = dpr;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.max(58, Math.min(168, Math.round((width * height) / 18000)));
    const particles: Particle[] = [];
    for (let i = 0; i < count; i += 1) {
      particles.push(makeParticle(width, height));
    }
    state.particles = particles;
  };

  const frame = () => {
    context.clearRect(0, 0, state.width, state.height);

    const particles = state.particles;
    const lineDistance = 138;

    for (let i = 0; i < particles.length; i += 1) {
      const particle = particles[i];

      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < -12 || particle.x > state.width + 12) particle.vx *= -1;
      if (particle.y < -12 || particle.y > state.height + 12) particle.vy *= -1;

      const pointerDx = state.pointerX - particle.x;
      const pointerDy = state.pointerY - particle.y;
      const pointerDist = Math.hypot(pointerDx, pointerDy);
      if (pointerDist < 160 && pointerDist > 0.001) {
        const push = (160 - pointerDist) / 160;
        particle.x -= (pointerDx / pointerDist) * push * 0.42;
        particle.y -= (pointerDy / pointerDist) * push * 0.42;
      }

      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(45, 132, 216, ${particle.alpha})`;
      context.fill();
    }

    for (let i = 0; i < particles.length; i += 1) {
      for (let j = i + 1; j < particles.length; j += 1) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist > lineDistance) continue;

        const alpha = (1 - dist / lineDistance) * 0.16;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.strokeStyle = `rgba(35, 114, 191, ${alpha.toFixed(3)})`;
        context.lineWidth = 1;
        context.stroke();
      }
    }

    state.rafId = window.requestAnimationFrame(frame);
  };

  window.addEventListener("pointermove", (event) => {
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
  });

  window.addEventListener("pointerleave", () => {
    state.pointerX = -1;
    state.pointerY = -1;
  });

  window.addEventListener("resize", resize);

  resize();
  state.rafId = window.requestAnimationFrame(frame);
  document.body.classList.add("site-motion-ready");

  window.addEventListener("pagehide", () => {
    window.cancelAnimationFrame(state.rafId);
  });
}

function makeParticle(width: number, height: number): Particle {
  const speed = 0.15 + Math.random() * 0.45;
  const angle = Math.random() * Math.PI * 2;

  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 0.8 + Math.random() * 1.6,
    alpha: 0.3 + Math.random() * 0.45,
  };
}

function initInteractiveGlow(): void {
  const items = document.querySelectorAll<HTMLElement>(".card, .highlight-band, .hero-panel");

  items.forEach((item) => {
    item.addEventListener("pointermove", (event) => {
      const rect = item.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      item.style.setProperty("--glow-x", `${x}%`);
      item.style.setProperty("--glow-y", `${y}%`);
      item.classList.add("is-interacting");
    });

    item.addEventListener("pointerleave", () => {
      item.classList.remove("is-interacting");
    });
  });
}

function initOrbitalParallax(): void {
  const orbits = Array.from(document.querySelectorAll<HTMLElement>(".hero-orbit"));
  if (orbits.length === 0) return;

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let rafId = 0;

  const update = () => {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;

    orbits.forEach((orbit, index) => {
      const factor = index === 0 ? 1 : 1.7;
      orbit.style.setProperty("--parallax-x", `${(currentX * factor).toFixed(2)}px`);
      orbit.style.setProperty("--parallax-y", `${(currentY * factor).toFixed(2)}px`);
    });

    rafId = requestAnimationFrame(update);
  };

  window.addEventListener("pointermove", (event) => {
    const nx = event.clientX / window.innerWidth - 0.5;
    const ny = event.clientY / window.innerHeight - 0.5;
    targetX = nx * 20;
    targetY = ny * 16;
  });

  window.addEventListener("pointerleave", () => {
    targetX = 0;
    targetY = 0;
  });

  rafId = requestAnimationFrame(update);

  window.addEventListener("pagehide", () => {
    cancelAnimationFrame(rafId);
  });
}
