// audio.js — efekty dźwiękowe przez Web Audio API (synteza oscylatorami)
// Wystawia window.Audio = { playShoot, playExplosion, playGameOver, playWin }
// UWAGA: świadomie nadpisujemy natywny konstruktor Audio naszym obiektem efektów.
(function () {
  'use strict';

  var ctx = null;

  // Lazy init jednego AudioContext.
  function getCtx() {
    try {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      // Przeglądarki blokują audio bez gestu — próbujemy wznowić.
      if (ctx.state === 'suspended' && ctx.resume) {
        ctx.resume();
      }
      return ctx;
    } catch (e) {
      return null;
    }
  }

  // Resume AudioContext przy pierwszym geście użytkownika.
  function resumeOnGesture() {
    try {
      var c = getCtx();
      if (c && c.state === 'suspended' && c.resume) c.resume();
    } catch (e) {}
    window.removeEventListener('keydown', resumeOnGesture);
    window.removeEventListener('click', resumeOnGesture);
    window.removeEventListener('touchstart', resumeOnGesture);
  }
  window.addEventListener('keydown', resumeOnGesture);
  window.addEventListener('click', resumeOnGesture);
  window.addEventListener('touchstart', resumeOnGesture);

  // Pomocnik: pojedynczy ton z obwiednią.
  function tone(c, type, freqStart, freqEnd, startTime, duration, peakGain) {
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freqStart, startTime);
    if (freqEnd != null && freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, freqEnd),
        startTime + duration
      );
    }
    var g = peakGain == null ? 0.15 : peakGain;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(g, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  // playShoot: krótki "laser" — opadająca częstotliwość.
  function playShoot() {
    try {
      var c = getCtx();
      if (!c) return;
      var t = c.currentTime;
      tone(c, 'square', 900, 200, t, 0.15, 0.12);
    } catch (e) {}
  }

  // playExplosion: szum (noise burst) z gasnącą obwiednią.
  function playExplosion() {
    try {
      var c = getCtx();
      if (!c) return;
      var t = c.currentTime;
      var duration = 0.4;

      // Bufor białego szumu.
      var bufferSize = Math.floor(c.sampleRate * duration);
      var buffer = c.createBuffer(1, bufferSize, c.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      var noise = c.createBufferSource();
      noise.buffer = buffer;

      // Lowpass dla "dudniącego" wybuchu.
      var filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.frequency.exponentialRampToValueAtTime(200, t + duration);

      var gain = c.createGain();
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      noise.start(t);
      noise.stop(t + duration);
    } catch (e) {}
  }

  // playGameOver: opadająca sekwencja tonów.
  function playGameOver() {
    try {
      var c = getCtx();
      if (!c) return;
      var t = c.currentTime;
      var seq = [440, 349, 261, 196]; // A4, F4, C4, G3
      var step = 0.22;
      for (var i = 0; i < seq.length; i++) {
        tone(c, 'sawtooth', seq[i], seq[i], t + i * step, step * 0.9, 0.16);
      }
    } catch (e) {}
  }

  // playWin: wznosząca wesoła sekwencja.
  function playWin() {
    try {
      var c = getCtx();
      if (!c) return;
      var t = c.currentTime;
      var seq = [523, 659, 784, 1047]; // C5, E5, G5, C6
      var step = 0.16;
      for (var i = 0; i < seq.length; i++) {
        tone(c, 'square', seq[i], seq[i], t + i * step, step * 0.95, 0.14);
      }
    } catch (e) {}
  }

  // Świadome nadpisanie natywnego Audio naszym obiektem efektów.
  window.Audio = {
    playShoot: playShoot,
    playExplosion: playExplosion,
    playGameOver: playGameOver,
    playWin: playWin
  };
})();
