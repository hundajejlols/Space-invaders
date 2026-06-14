// renderer.js — HTML5 Canvas renderer for Space Invaders
// Wystawia window.Renderer = { draw(Game) }
// Czyta wyłącznie z przekazanego obiektu Game; nie zależy od innych modułów.
(function () {
  'use strict';

  var W = 800;
  var H = 600;

  // ---- Canvas / kontekst (pobierane leniwie, defensywnie) ----
  var _canvas = null;
  var _ctx = null;

  function getCtx() {
    if (_ctx) return _ctx;
    _canvas = document.getElementById('game');
    if (!_canvas) return null;
    if (_canvas.width !== W) _canvas.width = W;
    if (_canvas.height !== H) _canvas.height = H;
    _ctx = _canvas.getContext('2d');
    return _ctx;
  }

  // ---- Wewnętrzny licznik czasu do animacji sprite ----
  var FRAME_INTERVAL = 400; // ms — przełączanie klatek co ~0.4s
  function spriteFrame() {
    var t = (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();
    return Math.floor(t / FRAME_INTERVAL) % 2; // 0 lub 1
  }

  // ---- Gwiazdy tła (stałe rozmieszczenie) ----
  var _stars = null;
  function getStars() {
    if (_stars) return _stars;
    _stars = [];
    // deterministyczny pseudo-random, by gwiazdy się nie "migotały"
    var seed = 12345;
    function rnd() {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    }
    for (var i = 0; i < 80; i++) {
      _stars.push({
        x: Math.floor(rnd() * W),
        y: Math.floor(rnd() * H),
        s: rnd() > 0.85 ? 2 : 1
      });
    }
    return _stars;
  }

  // ---- Pixel-art aliens: 2 klatki (11x8) ----
  // 1 = piksel zapalony, 0 = pusty.
  var ALIEN_FRAMES = [
    [
      '00100000100',
      '00010001000',
      '00111111100',
      '01101110110',
      '11111111111',
      '10111111101',
      '10100000101',
      '00011011000'
    ],
    [
      '00100000100',
      '10010001001',
      '10111111101',
      '11101110111',
      '11111111111',
      '00111111100',
      '00100000100',
      '01000000010'
    ]
  ];

  var TYPE_COLORS = {
    0: '#00ff66',
    1: '#ff5555',
    2: '#55aaff',
    3: '#ffcc00'
  };

  function alienColor(type) {
    return TYPE_COLORS[type] || '#ffffff';
  }

  function drawAlien(ctx, e, frame) {
    var grid = ALIEN_FRAMES[frame];
    var rows = grid.length;
    var cols = grid[0].length;
    var w = (e.w || 30);
    var h = (e.h || 24);
    var px = w / cols;
    var py = h / rows;
    ctx.fillStyle = alienColor(e.type);
    for (var r = 0; r < rows; r++) {
      var line = grid[r];
      for (var c = 0; c < cols; c++) {
        if (line.charAt(c) === '1') {
          // +1 zaokrąglenie unika szczelin między pikselami
          ctx.fillRect(
            e.x + c * px,
            e.y + r * py,
            Math.ceil(px) + 0.5,
            Math.ceil(py) + 0.5
          );
        }
      }
    }
  }

  // ---- Statek gracza (prosty pixel-art) ----
  function drawPlayer(ctx, p) {
    var w = p.w || 40;
    var h = p.h || 20;
    var x = p.x;
    var y = p.y;
    ctx.fillStyle = '#33ff99';
    // kadłub
    ctx.fillRect(x, y + h * 0.5, w, h * 0.5);
    // skrzydła/podstawa
    ctx.fillRect(x + w * 0.15, y + h * 0.3, w * 0.7, h * 0.4);
    // wieżyczka
    ctx.fillRect(x + w * 0.42, y, w * 0.16, h * 0.5);
  }

  // ---- Pociski ----
  function drawBullets(ctx, bullets) {
    for (var i = 0; i < bullets.length; i++) {
      var b = bullets[i];
      if (!b) continue;
      ctx.fillStyle = (b.from === 'enemy') ? '#ff4444' : '#ffffff';
      ctx.fillRect(b.x, b.y, b.w || 3, b.h || 10);
    }
  }

  // ---- HUD ----
  function drawHUD(ctx, Game) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    var score = (typeof Game.score === 'number') ? Game.score : 0;
    ctx.fillText('SCORE: ' + score, 12, 10);

    var lives = (typeof Game.lives === 'number') ? Game.lives : 0;
    ctx.textAlign = 'right';
    ctx.fillText('LIVES: ' + lives, W - 12, 10);
    ctx.textAlign = 'left';
  }

  // ---- Ekran końcowy ----
  function drawEndScreen(ctx, state) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);

    var text = (state === 'win') ? 'YOU WIN' : 'GAME OVER';
    ctx.fillStyle = (state === 'win') ? '#00ff66' : '#ff4444';
    ctx.font = 'bold 56px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, W / 2, H / 2);

    ctx.fillStyle = '#cccccc';
    ctx.font = '20px monospace';
    ctx.fillText('Press R to restart', W / 2, H / 2 + 50);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  // ---- Główna metoda rysująca klatkę ----
  function draw(Game) {
    var ctx = getCtx();
    if (!ctx) return;
    Game = Game || {};

    // tło
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    // gwiazdy
    var stars = getStars();
    ctx.fillStyle = '#ffffff';
    for (var s = 0; s < stars.length; s++) {
      ctx.fillRect(stars[s].x, stars[s].y, stars[s].s, stars[s].s);
    }

    // gracz
    if (Game.player && typeof Game.player.x === 'number') {
      drawPlayer(ctx, Game.player);
    }

    // kosmici z animacją sprite
    var frame = spriteFrame();
    if (Array.isArray(Game.enemies)) {
      for (var i = 0; i < Game.enemies.length; i++) {
        var e = Game.enemies[i];
        if (!e || e.alive === false) continue;
        if (typeof e.x !== 'number' || typeof e.y !== 'number') continue;
        drawAlien(ctx, e, frame);
      }
    }

    // pociski
    if (Array.isArray(Game.bullets)) {
      drawBullets(ctx, Game.bullets);
    }

    // HUD
    drawHUD(ctx, Game);

    // ekran końcowy
    if (Game.state && Game.state !== 'playing') {
      drawEndScreen(ctx, Game.state);
    }
  }

  window.Renderer = { draw: draw };
})();
