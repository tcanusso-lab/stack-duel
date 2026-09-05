(() => {
  "use strict";

  const COLORS = [
    "#a8e6cf", "#ff8fab", "#b39ddb", "#7ec8e3",
    "#ffe66d", "#ff9f43", "#5ecfc4", "#ff6b6b",
  ];

  const BLOCK_H = 28;
  const BASE_W = 160;
  const MIN_W = 18;
  const MOVE_SPEED = 2.4;
  const DROP_SPEED = 14;
  const CAMERA_PAD = 180;

  const $ = (id) => document.getElementById(id);
  const screens = {
    title: $("screen-title"),
    game: $("screen-game"),
    over: $("screen-over"),
  };
  const canvas = $("game-canvas");
  const ctx = canvas.getContext("2d");
  const turnText = $("turn-text");
  const turnBanner = $("turn-banner");
  const heightNum = $("height-num");
  const name1 = $("name1");
  const name2 = $("name2");

  const state = {
    phase: "title", // title | moving | dropping | settling | collapsing | over
    players: ["Alex", "Sam"],
    turn: 0,
    stack: [],
    moving: null,
    dir: 1,
    cameraY: 0,
    targetCameraY: 0,
    particles: [],
    wobble: 0,
    collapseTimer: 0,
    raf: 0,
    lastTs: 0,
  };

  function show(name) {
    Object.values(screens).forEach((el) => el.classList.remove("active"));
    screens[name].classList.add("active");
    state.phase = name === "game" ? state.phase : name;
  }

  function names() {
    const a = (name1.value || "Alex").trim().slice(0, 12) || "Alex";
    const b = (name2.value || "Sam").trim().slice(0, 12) || "Sam";
    return [a, b];
  }

  function possessive(n) {
    return n.endsWith("s") || n.endsWith("S") ? `${n}' turn` : `${n}'s turn`;
  }

  function updateHud() {
    const p = state.players[state.turn];
    turnText.textContent = possessive(p);
    turnBanner.classList.toggle("p2", state.turn === 1);
    heightNum.textContent = String(state.stack.length);
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(280, Math.floor(rect.width));
    const h = Math.max(360, Math.floor(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas._cssW = w;
    canvas._cssH = h;
  }

  function worldToScreen(y) {
    const h = canvas._cssH || canvas.height;
    return h - CAMERA_PAD - (y - state.cameraY);
  }

  function spawnMoving() {
    const top = state.stack[state.stack.length - 1];
    const w = top ? top.w : BASE_W;
    const color = COLORS[state.stack.length % COLORS.length];
    const cssW = canvas._cssW || 390;
    const startLeft = state.dir > 0 ? -w : cssW;
    state.moving = {
      x: startLeft,
      y: (top ? top.y + BLOCK_H : BLOCK_H) + 8,
      w,
      h: BLOCK_H,
      color,
      vx: state.dir * MOVE_SPEED,
    };
    state.phase = "moving";
    updateHud();
  }

  function startGame() {
    cancelAnimationFrame(state.raf);
    state.lastTs = 0;
    state.players = names();
    name1.value = state.players[0];
    name2.value = state.players[1];
    state.turn = 0;
    state.stack = [{
      x: ((canvas._cssW || 390) - BASE_W) / 2,
      y: 0,
      w: BASE_W,
      h: BLOCK_H,
      color: COLORS[0],
      cracked: false,
    }];
    state.dir = 1;
    state.cameraY = 0;
    state.targetCameraY = 0;
    state.particles = [];
    state.wobble = 0;
    show("game");
    resizeCanvas();
    // recenter base after resize
    state.stack[0].x = ((canvas._cssW || 390) - BASE_W) / 2;
    spawnMoving();
    loop(performance.now());
  }

  function dropBlock() {
    if (state.phase !== "moving" || !state.moving) return;
    state.phase = "dropping";
    state.moving.vx = 0;
  }

  function placeBlock() {
    const m = state.moving;
    const top = state.stack[state.stack.length - 1];
    const left = Math.max(m.x, top.x);
    const right = Math.min(m.x + m.w, top.x + top.w);
    const overlap = right - left;

    if (overlap < MIN_W) {
      // miss — full fail
      state.stack.push({
        x: m.x,
        y: top.y + BLOCK_H,
        w: m.w,
        h: BLOCK_H,
        color: m.color,
        cracked: true,
        vx: (m.x + m.w / 2 < top.x + top.w / 2 ? -1.5 : 1.5),
        vy: 0,
        rot: 0,
        vr: (Math.random() - 0.5) * 0.2,
      });
      state.moving = null;
      startCollapse();
      return;
    }

    const placed = {
      x: left,
      y: top.y + BLOCK_H,
      w: overlap,
      h: BLOCK_H,
      color: m.color,
      cracked: false,
    };

    // overhang piece becomes falling debris
    const overhangL = left - m.x;
    const overhangR = m.x + m.w - right;
    if (overhangL > 4) {
      spawnDebris(m.x, placed.y, overhangL, m.color, -2.2);
    }
    if (overhangR > 4) {
      spawnDebris(right, placed.y, overhangR, m.color, 2.2);
    }

    state.stack.push(placed);
    state.moving = null;

    // instability from offset of centers
    const offset = Math.abs((placed.x + placed.w / 2) - (top.x + top.w / 2));
    const lean = cumulativeLean();
    const risky = overlap < top.w * 0.42 || lean > placed.w * 0.55 || offset > placed.w * 0.45;

    heightNum.textContent = String(state.stack.length);
    state.targetCameraY = Math.max(0, placed.y - 120);

    if (risky && state.stack.length > 3 && Math.random() < 0.55 + lean / 80) {
      state.wobble = 1;
      state.phase = "settling";
      setTimeout(() => {
        if (state.phase === "settling") startCollapse();
      }, 480);
      return;
    }

    // perfect-enough → next turn
    state.dir *= -1;
    state.turn = 1 - state.turn;
    spawnMoving();
  }

  function cumulativeLean() {
    if (state.stack.length < 2) return 0;
    let lean = 0;
    for (let i = 1; i < state.stack.length; i++) {
      const a = state.stack[i - 1];
      const b = state.stack[i];
      lean += (b.x + b.w / 2) - (a.x + a.w / 2);
    }
    return Math.abs(lean);
  }

  function spawnDebris(x, y, w, color, vx) {
    state.particles.push({
      x, y, w, h: BLOCK_H, color,
      vx, vy: -1.5, rot: 0, vr: vx * 0.05,
      life: 90,
    });
  }

  function startCollapse() {
    state.phase = "collapsing";
    state.collapseTimer = 0;
    const loser = state.turn;
    state._loser = loser;
    state.stack.forEach((b, i) => {
      b.cracked = true;
      b.vx = (Math.random() - 0.5) * 6;
      b.vy = -2 - Math.random() * 3;
      b.rot = 0;
      b.vr = (Math.random() - 0.5) * 0.25;
      b.delay = i * 2;
    });
  }

  function finishCollapse() {
    const loser = state._loser;
    const winner = 1 - loser;
    const winnerName = state.players[winner];
    const loserName = state.players[loser];
    $("winner-text").innerHTML =
      `<span class="who">${escapeHtml(winnerName)}</span> <span class="wins">wins!</span>`;
    $("fall-text").innerHTML =
      `<strong>${escapeHtml(loserName)}</strong> made the tower fall ☹️ 💔`;
    buildConfetti();
    show("over");
    state.phase = "over";
    cancelAnimationFrame(state.raf);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildConfetti() {
    const box = $("confetti");
    box.innerHTML = "";
    const cols = ["#ff8fab", "#b39ddb", "#7ec8e3", "#ffe66d", "#5ecfc4", "#ff9f43"];
    for (let i = 0; i < 28; i++) {
      const el = document.createElement("i");
      el.style.left = `${Math.random() * 100}%`;
      el.style.background = cols[i % cols.length];
      el.style.animationDuration = `${2.2 + Math.random() * 2.5}s`;
      el.style.animationDelay = `${Math.random() * 1.5}s`;
      el.style.transform = `rotate(${Math.random() * 360}deg)`;
      box.appendChild(el);
    }
  }

  function drawRounded(x, y, w, h, r, color, cracked) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, shade(color, 18));
    g.addColorStop(0.45, color);
    g.addColorStop(1, shade(color, -18));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.stroke();
    // soft top highlight
    ctx.beginPath();
    ctx.moveTo(x + rr, y + 3);
    ctx.lineTo(x + w - rr, y + 3);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();
    if (cracked) {
      ctx.strokeStyle = "rgba(60,40,50,0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.3, y + 4);
      ctx.lineTo(x + w * 0.45, y + h * 0.55);
      ctx.lineTo(x + w * 0.35, y + h - 3);
      ctx.moveTo(x + w * 0.65, y + 6);
      ctx.lineTo(x + w * 0.55, y + h * 0.6);
      ctx.stroke();
    }
  }

  function shade(hex, amt) {
    const n = hex.replace("#", "");
    const num = parseInt(n.length === 3 ? n.split("").map((c) => c + c).join("") : n, 16);
    let r = (num >> 16) + amt;
    let g = ((num >> 8) & 0xff) + amt;
    let b = (num & 0xff) + amt;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return `rgb(${r},${g},${b})`;
  }

  function drawGround(cssW, cssH) {
    const gy = worldToScreen(0) + BLOCK_H * 0.2;
    // mound
    ctx.beginPath();
    ctx.ellipse(cssW / 2, gy + 28, cssW * 0.42, 36, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#8ed47a";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cssW / 2, gy + 18, cssW * 0.34, 22, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#9fdf88";
    ctx.fill();
    // flowers
    [[cssW * 0.28, gy + 8], [cssW * 0.7, gy + 12], [cssW * 0.55, gy + 4]].forEach(([fx, fy], i) => {
      ctx.beginPath();
      ctx.arc(fx, fy, 4, 0, Math.PI * 2);
      ctx.fillStyle = i === 1 ? "#ff8fab" : "#ffb3c6";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(fx, fy, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffe66d";
      ctx.fill();
    });
    // stones
    ctx.fillStyle = "#b8b8b8";
    ctx.beginPath();
    ctx.ellipse(cssW * 0.38, gy + 16, 8, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(cssW * 0.62, gy + 18, 6, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBlock(b, shakeX) {
    const sy = worldToScreen(b.y);
    const x = b.x + (shakeX || 0);
    ctx.save();
    if (b.rot) {
      ctx.translate(x + b.w / 2, sy + b.h / 2);
      ctx.rotate(b.rot);
      drawRounded(-b.w / 2, -b.h / 2, b.w, b.h, 10, b.color, b.cracked);
    } else {
      drawRounded(x, sy, b.w, b.h, 10, b.color, b.cracked);
    }
    ctx.restore();
  }

  function drawMoving(m) {
    const sy = worldToScreen(m.y);
    // glow
    ctx.save();
    ctx.shadowColor = m.color;
    ctx.shadowBlur = 18;
    drawRounded(m.x, sy, m.w, m.h, 10, m.color, false);
    ctx.restore();
    // sparkles
    const t = performance.now() / 200;
    for (let i = 0; i < 4; i++) {
      const ang = t + i * (Math.PI / 2);
      const sx = m.x + m.w / 2 + Math.cos(ang) * (m.w * 0.55);
      const sy2 = sy + m.h / 2 + Math.sin(ang) * 18;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      star(sx, sy2, 4, 2);
      ctx.fill();
    }
  }

  function star(x, y, r, n) {
    ctx.moveTo(x, y - r);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      ctx.lineTo(x + Math.cos(a - Math.PI / 2) * r, y + Math.sin(a - Math.PI / 2) * r);
      ctx.lineTo(x + Math.cos(a - Math.PI / 4) * n, y + Math.sin(a - Math.PI / 4) * n);
    }
    ctx.closePath();
  }

  function loop(ts) {
    if (state.phase === "over" || state.phase === "title") return;
    const dt = Math.min(32, ts - (state.lastTs || ts)) / 16.67;
    state.lastTs = ts;
    update(dt);
    render();
    state.raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    state.cameraY += (state.targetCameraY - state.cameraY) * 0.08 * dt;

    if (state.phase === "moving" && state.moving) {
      const m = state.moving;
      const cssW = canvas._cssW || 390;
      m.x += m.vx * dt * 1.15;
      if (m.x <= -m.w * 0.15) {
        m.x = -m.w * 0.15;
        m.vx = Math.abs(m.vx);
        state.dir = 1;
      } else if (m.x + m.w >= cssW + m.w * 0.15) {
        m.x = cssW + m.w * 0.15 - m.w;
        m.vx = -Math.abs(m.vx);
        state.dir = -1;
      }
    }

    if (state.phase === "dropping" && state.moving) {
      const top = state.stack[state.stack.length - 1];
      const targetY = top.y + BLOCK_H;
      state.moving.y -= DROP_SPEED * dt; // wait, y increases upward in world
      // world y: higher stack = higher y. Dropping means decreasing distance from above.
      // Actually spawn puts moving ABOVE top: y = top.y + BLOCK_H + 8.
      // Landing y = top.y + BLOCK_H. So we decrease y toward target... no:
      // In worldToScreen: screenY = h - pad - (y - cameraY). Higher world y = higher on tower = lower screen y.
      // So falling down visually means decreasing world y? No - the block is above the stack (higher y), falls onto stack (lower y toward top.y+BLOCK_H).
      // top.y + BLOCK_H + 8 → top.y + BLOCK_H, so y decreases. Good.
      if (state.moving.y <= targetY) {
        state.moving.y = targetY;
        placeBlock();
      }
    }

    if (state.phase === "settling") {
      state.wobble += 0.35 * dt;
    }

    state.particles.forEach((p) => {
      p.vy += 0.35 * dt;
      p.x += p.vx * dt;
      p.y -= p.vy * dt; // visual fall: decrease world y? Debris should fall down screen = decrease world y if higher is up.
      // Wait: stack grows with increasing y. Falling debris should go toward y=0 and below, so y decreases. But I used p.y -= p.vy with positive vy gravity - that decreases y. Good for falling down.
      p.rot += p.vr * dt;
      p.life -= dt;
    });
    state.particles = state.particles.filter((p) => p.life > 0);

    if (state.phase === "collapsing") {
      state.collapseTimer += dt;
      state.stack.forEach((b) => {
        if (state.collapseTimer < (b.delay || 0)) return;
        b.vy = (b.vy || 0) + 0.4 * dt;
        b.x += (b.vx || 0) * dt;
        b.y -= (b.vy || 0) * dt;
        b.rot = (b.rot || 0) + (b.vr || 0) * dt;
      });
      if (state.collapseTimer > 55) finishCollapse();
    }
  }

  function render() {
    const cssW = canvas._cssW || canvas.width;
    const cssH = canvas._cssH || canvas.height;
    ctx.clearRect(0, 0, cssW, cssH);

    drawGround(cssW, cssH);

    const shake = state.phase === "settling"
      ? Math.sin(state.wobble * 8) * 5
      : 0;

    state.stack.forEach((b) => drawBlock(b, shake));

    if (state.moving && (state.phase === "moving" || state.phase === "dropping")) {
      drawMoving(state.moving);
    }

    state.particles.forEach((p) => {
      const sy = worldToScreen(p.y);
      ctx.save();
      ctx.translate(p.x + p.w / 2, sy + p.h / 2);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 40));
      drawRounded(-p.w / 2, -p.h / 2, p.w, p.h, 8, p.color, true);
      ctx.restore();
    });
  }

  // Events
  $("btn-play").addEventListener("click", startGame);
  $("btn-again").addEventListener("click", startGame);
  $("btn-names").addEventListener("click", () => {
    cancelAnimationFrame(state.raf);
    state.phase = "title";
    show("title");
  });

  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const id = btn.getAttribute("data-focus");
      const input = $(id);
      input.focus();
      input.select();
    });
  });

  function onDropIntent(e) {
    if (state.phase !== "moving") return;
    if (e.target && e.target.closest && e.target.closest("input")) return;
    e.preventDefault();
    dropBlock();
  }

  $("btn-drop").addEventListener("click", onDropIntent);
  canvas.addEventListener("pointerdown", onDropIntent);
  screens.game.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".btn-drop") || e.target === canvas) return;
    // allow drop on empty game area too
    if (state.phase === "moving") onDropIntent(e);
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "Enter") {
      if (state.phase === "moving") {
        e.preventDefault();
        dropBlock();
      } else if (screens.title.classList.contains("active") && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        startGame();
      }
    }
  });

  window.addEventListener("resize", () => {
    if (screens.game.classList.contains("active")) resizeCanvas();
  });

  // Initial
  show("title");
})();
