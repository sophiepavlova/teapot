// script.js

(function () {
  "use strict";

  // ── DOM ──
  const slider = document.getElementById("minuteSlider");
  const timeDisplay = document.getElementById("timeDisplay");
  const statusEl = document.getElementById("status");
  const btnStart = document.getElementById("btnStart");
  const btnPause = document.getElementById("btnPause");
  const btnReset = document.getElementById("btnReset");
  const secondaryBtns = document.getElementById("secondaryBtns");
  const sliderSection = document.getElementById("sliderSection");
  const teapotWrap = document.getElementById("teapotWrap");
  // const teapotSvg = document.querySelector(".teapot-svg");
  const teapotImg = document.getElementById("teapotImg");
  const sliderWrap = slider.closest(".slider-wrap");
  const thumb = sliderWrap.querySelector(".slider-thumb");
  const ticks = sliderWrap.querySelectorAll(".ticks span");

  // ── Состояние ──
  let totalSeconds = 0;
  let remainingSeconds = 0;
  let timerInterval = null;
  let endTime = null;
  let isPaused = false;
  let audioCtx = null;

  const STORAGE_KEY = "teaTimerMinutes";

  // ── Инициализация ──
  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const minutes =
      saved !== null && !isNaN(parseInt(saved))
        ? Math.min(10, Math.max(1, parseInt(saved)))
        : 3;

    slider.value = minutes;

    updateSliderUI(); // ✅ sync donut + active tick
    updateTimeDisplay(minutes, false);
    updateTeapotBackground(Number(slider.value));
    // updateTeapotPose(minutes);
  }

  // ── Слайдер ──
  slider.addEventListener("input", () => {
    const val = Number(slider.value);

    updateSliderUI(); // new: donut + active tick
    updateTimeDisplay(val, false);
    updateTeapotBackground(val);
    // updateTeapotPose(val);

    localStorage.setItem(STORAGE_KEY, val);
  });

  function updateSliderUI() {
    const min = Number(slider.min);
    const max = Number(slider.max);
    const val = Number(slider.value);

    // mark active tick
    ticks.forEach((t) => t.classList.remove("is-active"));
    const idx = val - min; // assumes ticks match min..max
    if (ticks[idx]) ticks[idx].classList.add("is-active");

    // position donut thumb
    const track = sliderWrap.querySelector(".slider-track");
    const trackRect = track.getBoundingClientRect();
    const wrapRect = sliderWrap.getBoundingClientRect();

    const thumbSize = 47;
    const leftPadding = 22; // MUST match .ticks padding
    const rightPadding = 22;

    const usable = trackRect.width - leftPadding - rightPadding;
    const t = (val - min) / (max - min); // 0..1
    const x = leftPadding + t * usable; // center position
    const left = x - thumbSize / 2;

    thumb.style.transform = `translateX(${left}px)`;
  }

  slider.addEventListener("input", updateSliderUI);
  window.addEventListener("resize", updateSliderUI);

  // init
  updateSliderUI();
  // 🍒 Make the pot bigger with sliders

  function updateTeapotPose(minutes) {
    const clamped = Math.min(10, Math.max(1, minutes));
    const p = (clamped - 1) / 9;

    // SCALE: 1x -> 3x
    const scale = 1 + p * 2;

    const rect = teapotWrap.getBoundingClientRect();
    const circleD = Math.min(rect.width, rect.height);

    // Hard padding from edges (never closer than this)
    const EDGE_GAP = 20;

    // Start shifting BEFORE it hits edges (bigger = earlier shifting)
    // Tune this until minute 5 looks good: try 70–90
    const SHIFT_START_GAP = 80;

    // Base teapot size: CSS width is 50% of circle
    const baseW = 0.5 * circleD;
    const ar = teapotImg.naturalHeight / teapotImg.naturalWidth;
    const baseH = baseW * ar;

    const w = baseW * scale;
    const h = baseH * scale;
    const size = Math.max(w, h);

    // Two limits:
    // - startLimit: when shifting begins
    // - edgeLimit: the hard "safe area" we should not visually violate
    const startLimit = Math.max(0, circleD - SHIFT_START_GAP);
    const edgeLimit = Math.max(0, circleD - EDGE_GAP);

    // 0..1 shift progress based on proximity to edge
    // If size <= startLimit => 0 (centered)
    // If size >= edgeLimit  => 1 (full shift)
    let t = 0;
    if (edgeLimit > startLimit) {
      t = (size - startLimit) / (edgeLimit - startLimit);
      t = Math.min(1, Math.max(0, t));
    }

    // Default centered pose
    let x = 0;
    let y = 0;
    // let y = 18;

    // Compute maximum shifts that still preserve EDGE_GAP
    // (same safe-square idea as before)
    const safeHalf = edgeLimit / 2;
    const maxShiftX = Math.max(0, w / 2 - safeHalf);
    const maxShiftY = Math.max(0, h / 2 - safeHalf);

    // Apply shifts gradually after t starts
    x = -maxShiftX * t;
    y = maxShiftY * t;
    // y = 18 + maxShiftY * t;

    teapotWrap.style.setProperty("--tea-scale", scale.toFixed(3));
    teapotWrap.style.setProperty("--tea-x", `${x.toFixed(1)}px`);
    teapotWrap.style.setProperty("--tea-y", `${y.toFixed(1)}px`);
  }

  function updateTeapotBackground(minutes) {
    const min = 1;
    const max = 10;
    const t = (minutes - min) / (max - min); // 0..1

    // начальный и конечный цвета как у слайдера
    const start = { r: 250, g: 214, b: 83 }; // #FAD653
    const end = { r: 248, g: 84, b: 87 }; // #F85457

    const r = Math.round(start.r + (end.r - start.r) * t);
    const g = Math.round(start.g + (end.g - start.g) * t);
    const b = Math.round(start.b + (end.b - start.b) * t);

    const teapotBg = document.querySelector(".teapot-bg");
    teapotBg.style.background = `rgb(${r}, ${g}, ${b})`;
  }
  function updateTimeDisplay(minutes, showSeconds, seconds) {
    if (showSeconds && seconds !== undefined) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      timeDisplay.textContent = `${m}:${s.toString().padStart(2, "0")}`;
      timeDisplay.classList.remove("is-ticking");
      void timeDisplay.offsetWidth;
      timeDisplay.classList.add("is-ticking");
    } else {
      const label = minutes === 1 ? "minute" : "minutes";
      timeDisplay.textContent = `${minutes} ${label}`;
    }
  }

  // ── Старт ──
  btnStart.addEventListener("click", () => {
    const minutes = parseInt(slider.value);

    localStorage.setItem(STORAGE_KEY, minutes);

    // Инициализируем AudioContext при клике пользователя
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    totalSeconds = minutes * 60;
    remainingSeconds = totalSeconds;
    isPaused = false;

    updateTimeDisplay(null, true, remainingSeconds);
    startTimer();
    setRunningUI();
  });

  // ── Пауза/Продолжить ──
  btnPause.addEventListener("click", () => {
    // ✅ Don’t allow pause/continue unless a timer exists
    if (!timerInterval && !isPaused) return;
    if (isPaused) {
      // Continue
      isPaused = false;
      btnPause.textContent = "Pause";
      teapotWrap.classList.add("steaming");

      endTime = Date.now() + remainingSeconds * 1000;
      startInterval();
    } else {
      // Pause
      isPaused = true;
      btnPause.textContent = "Continue";
      teapotWrap.classList.remove("steaming");

      remainingSeconds = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      clearInterval(timerInterval);
      timerInterval = null; // ✅ also set to null for consistency
    }
  });

  // ── Сброс ──
  btnReset.addEventListener("click", () => {
    clearInterval(timerInterval);
    timerInterval = null;
    teapotWrap.classList.remove("steaming");
    setIdleUI();
    const minutes = parseInt(slider.value);
    updateTimeDisplay(minutes, false);
  });

  // ── Логика таймера ──
  function startTimer() {
    teapotWrap.classList.add("steaming");
    endTime = Date.now() + remainingSeconds * 1000;
    startInterval();
  }

  function scheduleNextSecondTick(callback) {
    const delay = 1000 - (Date.now() % 1000);
    setTimeout(callback, delay);
  }

  function startInterval() {
    clearInterval(timerInterval);

    const tick = () => {
      remainingSeconds = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));

      updateTimeDisplay(null, true, remainingSeconds);

      if (remainingSeconds <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        onComplete();
      }
    };

    tick(); // ✅ immediate update so user sees countdown instantly

    const delay = 1000 - (Date.now() % 1000);

    setTimeout(() => {
      tick();
      timerInterval = setInterval(tick, 1000);
    }, delay);
  }

  function onComplete() {
    setDoneUI();
    playChime();
    doSigh();
  }

  // ── UI состояния ──
  function setRunningUI() {
    btnStart.textContent = "Steeping…";
    btnStart.classList.add("running");
    secondaryBtns.hidden = false;
    sliderSection.classList.add("disabled");
    statusEl.textContent = "";
    btnPause.textContent = "Pause";
    btnPause.disabled = false;
  }

  function setDoneUI() {
    btnStart.textContent = "Ready!";
    btnStart.classList.remove("running");
    btnStart.classList.add("done");
    statusEl.textContent = "Your tea is ready";
    teapotWrap.classList.remove("steaming");
    setTimeout(() => {
      secondaryBtns.hidden = true;
      sliderSection.classList.remove("disabled");
      btnStart.classList.remove("done");
      btnStart.textContent = "Begin the steep";
      const minutes = parseInt(slider.value);
      updateTimeDisplay(minutes, false);
      statusEl.textContent = "";
    }, 4000);
  }

  function setIdleUI() {
    btnStart.textContent = "Begin the steep";
    btnStart.classList.remove("running", "done");
    btnPause.disabled = true;
    secondaryBtns.hidden = true;
    sliderSection.classList.remove("disabled");
    statusEl.textContent = "";
    isPaused = false;
    btnPause.textContent = "Pause";
  }

  // ── Анимация вздоха ──
  function doSigh() {
    teapotImg.classList.add("sigh");
    teapotWrap.classList.add("steaming");
    setTimeout(() => {
      teapotWrap.classList.remove("steaming");
      teapotImg.classList.remove("sigh");
    }, 1000);
  }

  // ── Звук колокольчиков ──
  function playChime() {
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume();

    const now = audioCtx.currentTime;

    // Три ноты колокольчика: C5, E5, G5
    const notes = [
      { freq: 523.25, delay: 0 },
      { freq: 659.25, delay: 0.22 },
      { freq: 783.99, delay: 0.44 },
      { freq: 1046.5, delay: 0.72 },
    ];

    notes.forEach(({ freq, delay }) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + delay);

      // Небольшой overtone
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(freq * 2.756, now + delay);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(3000, now + delay);

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.18, now + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 2.5);

      gain2.gain.setValueAtTime(0, now + delay);
      gain2.gain.linearRampToValueAtTime(0.04, now + delay + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + delay + 1.2);

      osc.start(now + delay);
      osc.stop(now + delay + 2.6);
      osc2.start(now + delay);
      osc2.stop(now + delay + 1.3);
    });
  }

  // ── Запуск ──
  init();
})();
