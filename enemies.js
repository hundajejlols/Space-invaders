// enemies.js — ruch kosmitów i AI strzelania dla Space Invaders
// Wystawia globalny window.Enemies = { init, update }
(function () {
  'use strict';

  // ---- Parametry konfiguracyjne ----
  const CANVAS_W = 800;
  const CANVAS_H = 600;

  const ROWS = 5;
  const COLS = 11;

  const ENEMY_W = 32;
  const ENEMY_H = 24;

  const GAP_X = 16;          // odstęp poziomy między kosmitami
  const GAP_Y = 16;          // odstęp pionowy
  const MARGIN_TOP = 60;     // start siatki od góry
  const STEP_DOWN = 20;      // ile opadają na krawędzi

  const BASE_SPEED = 40;     // px/s przy pełnej siatce
  const MAX_SPEED = 240;     // px/s gdy zostaje 1 kosmita
  const EDGE_MARGIN = 10;    // jak blisko krawędzi canvasu zawracają

  // AI strzelania
  const SHOOT_INTERVAL_BASE = 1.1;  // średni odstęp między salwami (s) przy pełnej siatce
  const SHOOT_INTERVAL_MIN = 0.35;  // minimalny odstęp przy małej liczbie wrogów
  const ENEMY_BULLET_W = 4;
  const ENEMY_BULLET_H = 12;
  const ENEMY_BULLET_VY = 240;      // px/s, w dół (vy > 0)

  // Stan wewnętrzny modułu
  let direction = 1;        // 1 = w prawo, -1 = w lewo
  let pendingDrop = false;  // czy w tej klatce trzeba opaść
  let shootTimer = 0;       // odliczanie do następnej salwy
  let totalEnemies = ROWS * COLS;

  function gridWidth() {
    return COLS * ENEMY_W + (COLS - 1) * GAP_X;
  }

  function init(Game) {
    Game.enemies = [];
    direction = 1;
    pendingDrop = false;
    shootTimer = SHOOT_INTERVAL_BASE;
    totalEnemies = ROWS * COLS;

    const startX = Math.floor((CANVAS_W - gridWidth()) / 2);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        Game.enemies.push({
          x: startX + c * (ENEMY_W + GAP_X),
          y: MARGIN_TOP + r * (ENEMY_H + GAP_Y),
          w: ENEMY_W,
          h: ENEMY_H,
          // type zależny od rzędu: górny rząd = 2 (najtwardszy/najwyżej punktowany),
          // dwa środkowe = 1, dwa dolne = 0
          type: r === 0 ? 2 : (r <= 2 ? 1 : 0),
          alive: true,
        });
      }
    }
  }

  function liveEnemies(Game) {
    const out = [];
    const list = Game.enemies || [];
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e && e.alive !== false) out.push(e);
    }
    return out;
  }

  // Prędkość rośnie wraz ze spadkiem liczby żywych kosmitów
  function currentSpeed(aliveCount) {
    if (totalEnemies <= 0) return BASE_SPEED;
    const ratio = aliveCount / totalEnemies; // 1 -> pełna siatka, ~0 -> jeden
    const speed = BASE_SPEED + (MAX_SPEED - BASE_SPEED) * (1 - ratio);
    return speed;
  }

  function update(Game, dt) {
    if (!Game || !Game.enemies) return;
    if (typeof dt !== 'number' || dt <= 0) dt = 0;
    // sanity clamp dt (np. po utracie focusu zakładki)
    if (dt > 0.1) dt = 0.1;

    const live = liveEnemies(Game);
    if (live.length === 0) return;

    const speed = currentSpeed(live.length);

    // ---- Ruch poziomy + wykrycie krawędzi ----
    let minX = Infinity;
    let maxX = -Infinity;
    for (let i = 0; i < live.length; i++) {
      const e = live[i];
      if (e.x < minX) minX = e.x;
      if (e.x + e.w > maxX) maxX = e.x + e.w;
    }

    const dx = direction * speed * dt;
    const nextMin = minX + dx;
    const nextMax = maxX + dx;

    if (nextMax >= CANVAS_W - EDGE_MARGIN || nextMin <= EDGE_MARGIN) {
      // dotknęliśmy krawędzi: opadamy i zmieniamy kierunek
      pendingDrop = true;
    }

    if (pendingDrop) {
      for (let i = 0; i < live.length; i++) {
        live[i].y += STEP_DOWN;
      }
      direction *= -1;
      pendingDrop = false;
    } else {
      for (let i = 0; i < live.length; i++) {
        live[i].x += dx;
      }
    }

    // ---- Czy ktoś dotarł do poziomu gracza? -> game over ----
    const playerTop = Game.player ? Game.player.y : (CANVAS_H - 40);
    for (let i = 0; i < live.length; i++) {
      const e = live[i];
      if (e.y + e.h >= playerTop) {
        Game.state = 'gameover';
        break;
      }
    }

    // ---- AI strzelania ----
    updateShooting(Game, live, dt);
  }

  function updateShooting(Game, live, dt) {
    shootTimer -= dt;
    if (shootTimer > 0) return;

    // odstęp salwy skraca się wraz ze spadkiem liczby wrogów
    const ratio = totalEnemies > 0 ? live.length / totalEnemies : 1;
    let interval = SHOOT_INTERVAL_MIN +
      (SHOOT_INTERVAL_BASE - SHOOT_INTERVAL_MIN) * ratio;
    // odrobina losowości
    interval *= 0.6 + Math.random() * 0.8;
    shootTimer = interval;

    // Najniżsi kosmici w każdej kolumnie (tylko oni strzelają)
    const bottomByColumn = {};
    for (let i = 0; i < live.length; i++) {
      const e = live[i];
      const key = Math.round(e.x); // kolumna wg pozycji x
      const cur = bottomByColumn[key];
      if (!cur || e.y > cur.y) bottomByColumn[key] = e;
    }

    const shooters = Object.keys(bottomByColumn).map(function (k) {
      return bottomByColumn[k];
    });
    if (shooters.length === 0) return;

    // wybierz losowo jednego strzelca
    const shooter = shooters[Math.floor(Math.random() * shooters.length)];

    if (!Array.isArray(Game.bullets)) Game.bullets = [];
    Game.bullets.push({
      x: shooter.x + shooter.w / 2 - ENEMY_BULLET_W / 2,
      y: shooter.y + shooter.h,
      w: ENEMY_BULLET_W,
      h: ENEMY_BULLET_H,
      vy: ENEMY_BULLET_VY, // dodatni -> leci w dół
      from: 'enemy',
    });

    // defensywne wywołanie audio
    try {
      if (window.Audio && typeof window.Audio.playShoot === 'function') {
        window.Audio.playShoot();
      }
    } catch (err) {
      /* ignoruj błędy audio */
    }
  }

  window.Enemies = { init: init, update: update };
})();
