// game.js - main loop & collision system for Space Invaders
(function () {
  'use strict';

  var WIDTH = 800;
  var HEIGHT = 600;

  var PLAYER_W = 50;
  var PLAYER_H = 20;
  var PLAYER_SPEED = 350;      // px/s
  var PLAYER_BULLET_SPEED = -500; // px/s (upwards)
  var SHOOT_COOLDOWN = 0.35;   // seconds
  var BULLET_W = 4;
  var BULLET_H = 12;
  var SCORE_PER_KILL = 10;

  var Game = {
    state: 'playing',
    score: 0,
    lives: 3,
    player: {
      x: WIDTH / 2 - PLAYER_W / 2,
      y: HEIGHT - PLAYER_H - 10,
      w: PLAYER_W,
      h: PLAYER_H
    },
    bullets: [],
    enemies: [],
    keys: {}
  };

  window.Game = Game;

  var shootTimer = 0;

  function aabb(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
  }

  function shoot() {
    Game.bullets.push({
      x: Game.player.x + Game.player.w / 2 - BULLET_W / 2,
      y: Game.player.y - BULLET_H,
      w: BULLET_W,
      h: BULLET_H,
      vy: PLAYER_BULLET_SPEED,
      from: 'player'
    });
    if (window.Audio && typeof window.Audio.playShoot === 'function') {
      window.Audio.playShoot();
    }
  }

  function handleInput(dt) {
    var k = Game.keys;
    var p = Game.player;

    if (k['ArrowLeft'] || k['Left']) {
      p.x -= PLAYER_SPEED * dt;
    }
    if (k['ArrowRight'] || k['Right']) {
      p.x += PLAYER_SPEED * dt;
    }
    if (p.x < 0) p.x = 0;
    if (p.x + p.w > WIDTH) p.x = WIDTH - p.w;

    shootTimer -= dt;
    if ((k[' '] || k['Spacebar'] || k['Space']) && shootTimer <= 0) {
      shoot();
      shootTimer = SHOOT_COOLDOWN;
    }
  }

  function updateBullets(dt) {
    for (var i = Game.bullets.length - 1; i >= 0; i--) {
      var b = Game.bullets[i];
      b.y += b.vy * dt;
      if (b.y + b.h < 0 || b.y > HEIGHT) {
        Game.bullets.splice(i, 1);
      }
    }
  }

  function handleCollisions() {
    for (var i = Game.bullets.length - 1; i >= 0; i--) {
      var b = Game.bullets[i];
      if (!b) continue;

      if (b.from === 'player') {
        for (var j = Game.enemies.length - 1; j >= 0; j--) {
          var e = Game.enemies[j];
          if (aabb(b, e)) {
            Game.enemies.splice(j, 1);
            Game.bullets.splice(i, 1);
            Game.score += SCORE_PER_KILL;
            if (window.Audio && typeof window.Audio.playExplosion === 'function') {
              window.Audio.playExplosion();
            }
            break;
          }
        }
      } else if (b.from === 'enemy') {
        if (aabb(b, Game.player)) {
          Game.bullets.splice(i, 1);
          Game.lives -= 1;
          if (window.Audio && typeof window.Audio.playExplosion === 'function') {
            window.Audio.playExplosion();
          }
        }
      }
    }
  }

  function checkEndConditions() {
    if (Game.lives <= 0) {
      Game.lives = 0;
      setState('gameover');
      return;
    }

    // enemy reaches player line => game over
    for (var i = 0; i < Game.enemies.length; i++) {
      var e = Game.enemies[i];
      if (e.y + e.h >= Game.player.y) {
        setState('gameover');
        return;
      }
    }

    if (Game.enemies.length === 0) {
      setState('win');
    }
  }

  function setState(newState) {
    if (Game.state !== 'playing') return; // only transition once
    Game.state = newState;
    if (newState === 'gameover' &&
        window.Audio && typeof window.Audio.playGameOver === 'function') {
      window.Audio.playGameOver();
    }
  }

  var lastTime = 0;

  function loop(now) {
    if (!lastTime) lastTime = now;
    var dt = (now - lastTime) / 1000;
    lastTime = now;
    // clamp dt to avoid huge jumps (e.g. tab switch)
    if (dt > 0.1) dt = 0.1;

    if (Game.state === 'playing') {
      handleInput(dt);

      if (window.Enemies && typeof window.Enemies.update === 'function') {
        window.Enemies.update(Game, dt);
      }

      updateBullets(dt);
      handleCollisions();
      checkEndConditions();
    }

    if (window.Renderer && typeof window.Renderer.draw === 'function') {
      window.Renderer.draw(Game);
    }

    requestAnimationFrame(loop);
  }

  function reset() {
    Game.state = 'playing';
    Game.score = 0;
    Game.lives = 3;
    Game.player.x = WIDTH / 2 - PLAYER_W / 2;
    Game.player.y = HEIGHT - PLAYER_H - 10;
    Game.bullets.length = 0;
    Game.enemies.length = 0;
    Game.keys = {};
    shootTimer = 0;
    if (window.Enemies && typeof window.Enemies.init === 'function') {
      window.Enemies.init(Game);
    }
  }

  function onKeyDown(e) {
    // restart after game over / win
    if ((e.key === 'r' || e.key === 'R') && Game.state !== 'playing') {
      reset();
      return;
    }
    Game.keys[e.key] = true;
    // prevent page scroll on arrows/space
    if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    Game.keys[e.key] = false;
  }

  function init() {
    var canvas = document.getElementById('game');
    if (canvas) {
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    if (window.Enemies && typeof window.Enemies.init === 'function') {
      window.Enemies.init(Game);
    }

    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
