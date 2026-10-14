/**
 * Nine Dots Task Cognitive Experiment (Vanilla JS + jsPsych 8 + DataPipe)
 *
 * - Group selection (Control, Inertia, Mirror)
 * - Attention check, 3 training trials, 15-minute main task
 * - Inertia / mirror cursor manipulations, debug HUD (key Y)
 * - Survey, local CSV / JSON / PNG export (key E on the final screen)
 * - Automatic upload of the CSV and of a PNG per attempt to DataPipe → Google Drive
 *
 * Add ?offline to the URL to switch the DataPipe upload off (e.g. lab runs without internet).
 */

const DATAPIPE_EXPERIMENT_ID = "44YekFZ9nNPl";
const PIPE_ENABLED = !new URLSearchParams(location.search).has("offline");

document.addEventListener('DOMContentLoaded', () => {
  // --- jsPsych + DataPipe ---
  // The whole experiment runs as one jsPsych trial that ends when the survey is done.
  // When it ends, the DataPipe extension uploads the CSV built by generateCSVData().
  // If the libraries failed to load, the experiment still runs and data can be exported manually (key E).
  let endSessionTrial = () => {};
  const libsLoaded = typeof initJsPsych === 'function' && typeof jsPsychExtensionPipe === 'function';
  const pipeActive = PIPE_ENABLED && libsLoaded;

  function NineDotsSessionPlugin() {}
  NineDotsSessionPlugin.info = { name: 'nine-dots-session', version: '1.0.0', parameters: {}, data: {} };
  NineDotsSessionPlugin.prototype.trial = function () {
    return new Promise(resolve => { endSessionTrial = () => resolve({}); });
  };

  let jsPsych = null;
  if (libsLoaded) {
    try {
      jsPsych = initJsPsych({
        display_element: 'jspsych-target',
        extensions: [
          {
            type: jsPsychExtensionPipe,
            params: {
              experiment_id: DATAPIPE_EXPERIMENT_ID,
              filename: () => `${subject_id}.csv`,
              data_string: () => generateCSVData(),
              stream: false,
              enabled: PIPE_ENABLED,
              wait_message: '',
              done_message: '',
              on_save: (result) => {
                if (!result.ok) console.error(`DataPipe refused the CSV (HTTP ${result.status})`, result.body);
                setSaveStatus(result.ok && !imageUploadFailed ? 'ok' : 'error');
              }
            }
          }
        ]
      });
    } catch (err) {
      console.error('jsPsych could not be initialized', err);
    }
  } else {
    console.error('vendor/jspsych-8.3.0.min.js or vendor/extension-pipe-0.2.0.min.js did not load: data will not be sent to DataPipe.');
  }

  const subject_id = jsPsych
    ? jsPsych.randomization.randomID(10)
    : Array.from(crypto.getRandomValues(new Uint8Array(10)), n => 'abcdefghijklmnopqrstuvwxyz0123456789'[n % 36]).join('');
  const participantID = subject_id;

  if (jsPsych) jsPsych.run([{ type: NineDotsSessionPlugin }]);

  // --- Constants ---
  const NINE_DOTS_SPACING = 116;
  const NINE_DOTS_PADDING = 50;
  const NINE_DOTS_SIZE = NINE_DOTS_SPACING * 2 + NINE_DOTS_PADDING * 2; // 332px
  const DOT_RADIUS = 23.5;
  const BRUSH_COLOR = '#ff0000';
  const BRUSH_WIDTH = 4;
  const TASK_LIMIT_SEC = 900; // 15 min

  const SLIDER_QUESTIONS = [
    { field: 'Удовольствие', title: 'В момент, когда я нашел решение, я испытал', left: 'неприятные чувства', right: 'приятные чувства' },
    { field: 'Удивление', title: 'Момент, когда я нашел решение, был для меня', left: 'ожидаемым', right: 'удивительным' },
    { field: 'Внезапность', title: 'Это решение пришло ко мне', left: 'шаг за шагом', right: 'целиком' },
    { field: 'Облегчение', title: 'Когда я решил задачу, то почувствовал', left: 'напряжение', right: 'облегчение' },
    { field: 'Уверенность', title: 'В момент обнаружения решения я был уверен в правильности полученного решения', left: 'не уверен', right: 'уверен' },
    { field: 'Драйв', title: 'Я с нетерпением жду следующего задания', left: 'не согласен', right: 'согласен' }
  ];
  const SURVEY_FIRST_SLIDER_STEP = 3;
  const SURVEY_GENDER_STEP = SURVEY_FIRST_SLIDER_STEP + SLIDER_QUESTIONS.length; // 9
  const SURVEY_AGE_STEP = SURVEY_GENDER_STEP + 1; // 10

  const GROUP_PARAMS = {
    INERTIA: ['inertiaStep', 'inertiaInc', 'inertiaSmoothing'],
    MIRROR: ['mirrorSize', 'mirrorThickness', 'mirrorDuration']
  };
  const ALL_PARAM_KEYS = [...GROUP_PARAMS.INERTIA, ...GROUP_PARAMS.MIRROR];

  // Debug sliders shown in the settings panel (key Y)
  const SETTINGS_SLIDERS = {
    INERTIA: {
      labelClass: 'text-red-600 bg-red-50',
      inputClass: 'accent-red-600 accent-red',
      items: [
        { key: 'inertiaStep', label: 'Шаг инерции', min: 5, max: 1000, step: 5, parse: parseInt, fmt: v => `${v} px`, hint: 'Через сколько пикселей пути чувствительность вырастет' },
        { key: 'inertiaInc', label: 'Прирост', min: 0.01, max: 2.00, step: 0.01, parse: parseFloat, fmt: v => `${(v * 100).toFixed(0)}%`, hint: 'На сколько процентов растет чувствительность за каждый шаг' },
        { key: 'inertiaSmoothing', label: 'Сглаживание', min: 0, max: 0.95, step: 0.01, parse: parseFloat, fmt: v => `${(v * 100).toFixed(0)}%`, hint: 'Уменьшает эффект "лесенки" при высокой скорости движения' }
      ]
    },
    MIRROR: {
      labelClass: 'text-purple-600 bg-purple-50',
      inputClass: 'accent-purple-600 accent-purple',
      items: [
        { key: 'mirrorSize', label: 'Размер рамки', min: 50, max: 1500, step: 10, parse: parseInt, fmt: v => `${v} px`, redraw: true },
        { key: 'mirrorThickness', label: 'Толщина границ', min: 2, max: 250, step: 1, parse: parseInt, fmt: v => `${v} px`, hint: 'Активная зона инверсии работает только на границах рамки', redraw: true },
        { key: 'mirrorDuration', label: 'Длительность инверсии', min: 100, max: 3000, step: 50, parse: parseInt, fmt: v => `${v} ms` }
      ]
    }
  };

  const defaultSurveyAnswers = () => ({
    solvedBefore: null,
    insight: null,
    ...Object.fromEntries(SLIDER_QUESTIONS.map(q => [q.field, 50])),
    gender: null,
    age: ""
  });

  // --- App state ---
  const state = {
    appState: 'SELECT', // 'SELECT' | 'ATTENTION_CHECK' | 'TRAINING' | 'INSTRUCTION' | 'TASK' | 'TIMEOUT_INFO' | 'SURVEY' | 'FINISHED' | 'EXPORT'
    finishReason: null, // 'TIMEOUT' | 'EARLY'
    taskStartTime: null,
    elapsedTime: 0, // seconds
    timerInterval: null,
    trainingStep: 1,
    surveyStep: 0,
    surveyAnswers: defaultSurveyAnswers(),
    selectedGroup: 'CONTROL', // 'CONTROL' | 'INERTIA' | 'MIRROR'
    allTrials: [],
    currentTrialNumber: 1,
    isLocked: false,
    showSettings: false,
    attentionPassed: false,
    attentionAttempts: 0,
    saveStatus: PIPE_ENABLED ? 'idle' : 'offline', // 'idle' | 'pending' | 'ok' | 'error' | 'offline'

    // Inertia parameters
    inertiaStep: 5,
    inertiaInc: 0.20,
    inertiaSmoothing: 0.50,

    // Mirror parameters
    mirrorSize: 580,
    mirrorThickness: 100, // active zone border width
    mirrorDuration: 350, // ms control inversion timeframe
    mirrorVisible: false,
    showGrid: false
  };

  const rawMetadata = collectBrowserMetadata();
  const pendingUploads = [];
  let imageUploadFailed = false;

  // Timing (performance.now)
  let trialStartTimeMs = 0;
  let firstStrokeStartTimeMs = 0;

  // Drawing
  const canvas = document.getElementById('experiment-canvas');
  const ctx = canvas.getContext('2d');
  let isDrawing = false;
  let currentStrokePoints = []; // {x, y, t, isInverted}
  let lastActualPos = null;
  let lastVirtualPos = null;
  let redrawQueued = false;

  // Inertia / mirror runtime values
  let cumulativeDistance = 0;
  let currentSensitivity = 1.0;
  let lastDelta = { dx: 0, dy: 0 };
  let inversionEndTime = 0;

  const $ = (id) => document.getElementById(id);
  const isCanvasState = () => state.appState === 'TASK' || state.appState === 'TRAINING';

  function collectBrowserMetadata() {
    return {
      id: participantID,
      userAgent: navigator.userAgent,
      language: navigator.language,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      devicePixelRatio: window.devicePixelRatio || 1,
      platform: navigator.platform || 'unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
      timestamp: new Date().toISOString()
    };
  }

  // --- Fullscreen ---
  const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

  function checkFullscreen() {
    $('fullscreen-prompt-banner').classList.toggle('hidden', isFullscreen());
  }

  function enterFullscreen() {
    const el = document.documentElement;
    const request = el.requestFullscreen || el.webkitRequestFullscreen;
    Promise.resolve(request && request.call(el)).catch(() => {
      showNotice("Не удалось войти в полноэкранный режим. Попробуйте нажать F11.", "error");
    });
  }

  function exitFullscreen() {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  }

  document.addEventListener('fullscreenchange', checkFullscreen);
  document.addEventListener('webkitfullscreenchange', checkFullscreen);
  $('request-fullscreen-btn').addEventListener('click', enterFullscreen);

  // --- Keyboard shortcuts ---
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    if (key === 'f') {
      isFullscreen() ? exitFullscreen() : enterFullscreen();
      return;
    }

    if (key === 'y') {
      state.showSettings = !state.showSettings;
      renderSettingsHUDs();
      return;
    }

    if (state.appState === 'SURVEY' && state.surveyStep === 0 && e.code === 'Space') {
      e.preventDefault();
      setSurveyStep(1);
    } else if (state.appState === 'FINISHED' && key === 'e') {
      setAppState('EXPORT');
    } else if (state.appState === 'TRAINING' && key === 'r') {
      currentStrokePoints = [];
      redrawCanvas();
    } else if (state.appState === 'TASK') {
      if (key === 'r') startNextAttempt();
      else if (key === 't') finishTask('EARLY');
    }
  });

  // --- Screen routing ---
  const SCREENS = ['screen-select', 'screen-attention', 'screen-training-hud', 'screen-instruction', 'screen-timeout-info', 'screen-survey', 'screen-finished', 'screen-export', 'canvas-container'];

  function setAppState(next) {
    state.appState = next;
    renderActiveScreen();
  }

  function renderActiveScreen() {
    SCREENS.forEach(id => $(id).classList.add('hidden'));
    document.body.classList.toggle('cursor-none-custom', isCanvasState() && state.selectedGroup !== 'CONTROL');

    switch (state.appState) {
      case 'SELECT':
        $('screen-select').classList.remove('hidden');
        break;
      case 'ATTENTION_CHECK':
        renderAttentionCheckUI();
        break;
      case 'TRAINING':
        $('canvas-container').classList.remove('hidden');
        $('screen-training-hud').classList.remove('hidden');
        $('training-step-number').innerText = state.trainingStep;
        startDrawingSystem();
        break;
      case 'INSTRUCTION':
        $('screen-instruction').classList.remove('hidden');
        break;
      case 'TASK':
        $('canvas-container').classList.remove('hidden');
        startDrawingSystem();
        break;
      case 'TIMEOUT_INFO':
        $('screen-timeout-info').classList.remove('hidden');
        break;
      case 'SURVEY':
        renderSurveyUI();
        break;
      case 'FINISHED':
        $('screen-finished').classList.remove('hidden');
        renderSaveStatus();
        break;
      case 'EXPORT':
        $('screen-export').classList.remove('hidden');
        $('export-csv-preview').innerText = generateCSVData();
        break;
    }

    renderSettingsHUDs();
    checkFullscreen();
  }

  document.querySelectorAll('.group-btn-selector').forEach(btn => {
    btn.addEventListener('click', (e) => {
      state.selectedGroup = e.currentTarget.dataset.group;
      setAppState('ATTENTION_CHECK');
    });
  });

  // --- Attention check ---
  const ATTENTION_OPTIONS = [
    'Я просто кликаю наугад',
    'Я решаю задачу в уме',
    'Я не хочу проходить тест',
    'Я читаю все инструкции очень внимательно',
    'Ни один из вариантов не подходит'
  ];
  const ATTENTION_CORRECT = 4;

  function renderAttentionCheckUI() {
    const space = $('screen-attention');
    space.classList.remove('hidden');
    space.innerHTML = `
      <div class="bg-white p-10 max-w-2xl w-full mx-auto rounded-3xl border-2 border-gray-100 shadow-2xl text-center fade-in">
        <div class="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-8">
          <svg class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <h2 class="text-3xl font-extrabold text-gray-900 mb-6 font-display">Проверка устойчивости внимания</h2>
        <p class="text-lg text-gray-600 mb-8 leading-relaxed">
          Внимательно прочитайте условие ниже! Для подтверждения вашей концентрации и продолжения исследований, пожалуйста, выберите вариант <strong>№4 («Я читаю все инструкции очень внимательно»)</strong> в списке ответов.
        </p>
        <div class="space-y-3 text-left max-w-md mx-auto mb-10" id="attention-options">
          ${ATTENTION_OPTIONS.map((text, i) => `
          <button data-index="${i + 1}" class="w-full text-left py-4 px-6 rounded-xl border-2 border-gray-100 hover:border-blue-400 font-semibold text-gray-700 bg-gray-50 hover:bg-blue-50/50 transition-all">
            ${i + 1}. ${text}
          </button>`).join('')}
        </div>
        <div id="attention-feedback-msg" class="text-sm font-bold text-red-500 h-6"></div>
      </div>
    `;

    const buttons = space.querySelectorAll('#attention-options button');
    const msg = $('attention-feedback-msg');
    const FAIL_CLASSES = ['border-red-500', 'bg-red-50/50', 'text-red-700'];

    buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        if (state.attentionPassed) return;
        state.attentionAttempts += 1;

        if (Number(e.currentTarget.dataset.index) === ATTENTION_CORRECT) {
          state.attentionPassed = true;
          msg.className = "text-sm font-bold text-emerald-500";
          msg.innerText = "Проверено! Переходим к обучению...";
          setTimeout(() => {
            state.trainingStep = 1;
            setAppState('TRAINING');
          }, 1200);
          return;
        }

        msg.className = "text-sm font-bold text-red-500";
        msg.innerText = "Ответ неверный. Пожалуйста, будьте внимательны.";
        e.currentTarget.classList.add(...FAIL_CLASSES);
        // Lock options briefly to prevent spam clicking
        buttons.forEach(b => { b.disabled = true; });
        setTimeout(() => {
          buttons.forEach(b => {
            b.disabled = false;
            b.classList.remove(...FAIL_CLASSES);
          });
          msg.innerText = "";
        }, 2000);
      });
    });
  }

  // --- Task start / end ---
  $('start-task-btn').addEventListener('click', () => {
    state.isLocked = false;
    state.taskStartTime = performance.now();
    state.elapsedTime = 0;

    state.timerInterval = setInterval(() => {
      state.elapsedTime = Math.floor((performance.now() - state.taskStartTime) / 1000);
      updateHUDStats();
      if (state.elapsedTime >= TASK_LIMIT_SEC) finishTask('TIMEOUT');
    }, 1000);

    setAppState('TASK');
  });

  function finishTask(reason) {
    clearInterval(state.timerInterval);
    registerTrialRecord();
    state.finishReason = reason;
    hideTaskLockButtons();
    if (reason === 'TIMEOUT') {
      setAppState('TIMEOUT_INFO');
    } else {
      state.elapsedTime = Math.round((performance.now() - state.taskStartTime) / 1000);
      state.surveyStep = 0;
      setAppState('SURVEY');
    }
  }

  $('timeout-survey-btn').addEventListener('click', () => {
    state.surveyStep = 0;
    setAppState('SURVEY');
  });

  // 'Продолжить' (or key R): store the attempt and clear the board
  function startNextAttempt() {
    registerTrialRecord();
    state.currentTrialNumber += 1;
    state.isLocked = false;
    trialStartTimeMs = performance.now();
    currentStrokePoints = [];
    cumulativeDistance = 0;
    currentSensitivity = 1.0;
    inversionEndTime = 0;
    hideTaskLockButtons();
    redrawCanvas();
    updateHUDStats();
  }

  $('task-action-continue').addEventListener('click', startNextAttempt);
  $('task-action-save').addEventListener('click', () => finishTask('EARLY'));

  const showTaskLockButtons = () => $('task-lock-hud').classList.remove('hidden');
  const hideTaskLockButtons = () => $('task-lock-hud').classList.add('hidden');

  // --- Canvas drawing ---
  function getMouseCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const src = (e.touches && e.touches.length > 0) ? e.touches[0] : e;
    return {
      x: Math.round(src.clientX - rect.left),
      y: Math.round(src.clientY - rect.top)
    };
  }

  function resetMotionState() {
    cumulativeDistance = 0;
    currentSensitivity = 1.0;
    lastDelta = { dx: 0, dy: 0 };
    inversionEndTime = 0;
  }

  function startDrawingSystem() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    isDrawing = false;
    currentStrokePoints = [];
    lastActualPos = null;
    lastVirtualPos = null;
    firstStrokeStartTimeMs = 0;
    trialStartTimeMs = performance.now();
    resetMotionState();
    redrawCanvas();
    updateHUDStats();
  }

  canvas.addEventListener('mousedown', canvasMouseDown);
  canvas.addEventListener('touchstart', canvasMouseDown, { passive: true });
  window.addEventListener('mousemove', canvasMouseMove);
  window.addEventListener('touchmove', canvasMouseMove, { passive: false });
  window.addEventListener('mouseup', canvasMouseUp);
  window.addEventListener('touchend', canvasMouseUp);

  function canvasMouseDown(e) {
    if (state.isLocked || !isCanvasState()) return;

    const coords = getMouseCoords(e);
    isDrawing = true;
    lastActualPos = { ...coords };
    lastVirtualPos = { ...coords };
    if (currentStrokePoints.length === 0) firstStrokeStartTimeMs = performance.now();
    resetMotionState();

    currentStrokePoints = [{ x: coords.x, y: coords.y, t: Date.now(), isInverted: false }];
    redrawCanvas();
  }

  function canvasMouseMove(e) {
    if (!isCanvasState()) return;

    const coords = getMouseCoords(e);
    const absNow = Date.now();

    if (!isDrawing) {
      lastVirtualPos = { ...coords };
      // The free cursor is only painted for the manipulated groups
      if (state.selectedGroup !== 'CONTROL') requestRedraw();
      return;
    }

    if (state.isLocked) return;
    e.preventDefault(); // suppress panning on touchscreen drag

    let dx = coords.x - lastActualPos.x;
    let dy = coords.y - lastActualPos.y;

    // A - Inertia: sensitivity grows with travelled distance
    if (state.selectedGroup === 'INERTIA') {
      const stepDist = Math.sqrt(dx * dx + dy * dy);
      if (stepDist === 0) {
        currentSensitivity = 1.0;
        cumulativeDistance = 0;
        lastDelta = { dx: 0, dy: 0 };
      } else {
        cumulativeDistance += stepDist;
        currentSensitivity = 1.0 + (Math.floor(cumulativeDistance / state.inertiaStep) * state.inertiaInc);
      }
      // Low-pass smoothing against high-velocity "ladder" steps
      dx = dx * currentSensitivity * (1 - state.inertiaSmoothing) + lastDelta.dx * state.inertiaSmoothing;
      dy = dy * currentSensitivity * (1 - state.inertiaSmoothing) + lastDelta.dy * state.inertiaSmoothing;
      lastDelta = { dx, dy };
    }

    // B - Mirror: crossing the frame border inverts control for mirrorDuration ms
    let isCurrentlyInverted = absNow < inversionEndTime;
    if (state.selectedGroup === 'MIRROR') {
      const halfSize = state.mirrorSize / 2;
      const innerHalf = halfSize - state.mirrorThickness;
      const dxFromCenter = Math.abs(lastVirtualPos.x - window.innerWidth / 2);
      const dyFromCenter = Math.abs(lastVirtualPos.y - window.innerHeight / 2);

      const onBorder = (dxFromCenter <= halfSize && dyFromCenter <= halfSize) &&
                       !(dxFromCenter <= innerHalf && dyFromCenter <= innerHalf);

      if (onBorder && absNow >= inversionEndTime) {
        inversionEndTime = absNow + state.mirrorDuration;
        isCurrentlyInverted = true;
      }
      if (isCurrentlyInverted) {
        dx *= -1;
        dy *= -1;
      }
    }

    const safeX = Math.max(0, Math.min(window.innerWidth, lastVirtualPos.x + dx));
    const safeY = Math.max(0, Math.min(window.innerHeight, lastVirtualPos.y + dy));

    currentStrokePoints.push({
      x: Math.round(safeX),
      y: Math.round(safeY),
      t: absNow,
      isInverted: isCurrentlyInverted
    });

    lastVirtualPos = { x: safeX, y: safeY };
    lastActualPos = { ...coords };
    requestRedraw();
  }

  function canvasMouseUp() {
    if (!isDrawing) return;
    isDrawing = false;
    if (currentStrokePoints.length === 0) return;

    if (state.appState === 'TASK') {
      state.isLocked = true;
      redrawCanvas();
      showTaskLockButtons();
    } else if (state.appState === 'TRAINING') {
      currentStrokePoints = [];
      if (state.trainingStep < 3) {
        state.trainingStep += 1;
        $('training-step-number').innerText = state.trainingStep;
        redrawCanvas();
      } else {
        setAppState('INSTRUCTION');
      }
    }
  }

  window.addEventListener('resize', () => {
    if (!isCanvasState()) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    redrawCanvas();
  });

  // --- Dots layout ---
  // Training pairs as [row, col] cells of the 3x3 grid
  const TRAINING_PAIRS = {
    1: [[0, 0], [2, 2]],
    2: [[1, 0], [1, 2]],
    3: [[0, 1], [2, 1]]
  };
  const ALL_CELLS = [0, 1, 2].flatMap(r => [0, 1, 2].map(c => [r, c]));

  function getDots(width, height, cells) {
    const startX = width / 2 - NINE_DOTS_SIZE / 2 + NINE_DOTS_PADDING;
    const startY = height / 2 - NINE_DOTS_SIZE / 2 + NINE_DOTS_PADDING;
    return cells.map(([r, c]) => ({ cx: startX + c * NINE_DOTS_SPACING, cy: startY + r * NINE_DOTS_SPACING }));
  }

  function drawDots(c, dots) {
    c.fillStyle = '#000000';
    dots.forEach(d => {
      c.beginPath();
      c.arc(d.cx, d.cy, DOT_RADIUS, 0, Math.PI * 2);
      c.fill();
    });
  }

  function drawStroke(c, pts) {
    if (pts.length < 2) return;
    c.beginPath();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = BRUSH_COLOR;
    c.lineWidth = BRUSH_WIDTH;
    c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
    c.stroke();
  }

  // --- Canvas rendering ---
  // Pointer events can fire much faster than the screen refreshes, so movement
  // redraws are batched to one per animation frame. Every point is still recorded.
  function requestRedraw() {
    if (redrawQueued) return;
    redrawQueued = true;
    requestAnimationFrame(() => {
      redrawQueued = false;
      redrawCanvas();
    });
  }

  function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.showGrid) drawCoordinateGridLines();
    if (state.selectedGroup === 'MIRROR' && state.mirrorVisible) drawActiveMirrorFrame();

    const cells = state.appState === 'TRAINING' ? TRAINING_PAIRS[state.trainingStep] : ALL_CELLS;
    drawDots(ctx, getDots(window.innerWidth, window.innerHeight, cells));
    drawStroke(ctx, currentStrokePoints);

    // Virtual brush cursor (blue while control is inverted)
    if (lastVirtualPos && (isDrawing || state.selectedGroup !== 'CONTROL')) {
      ctx.beginPath();
      ctx.arc(lastVirtualPos.x, lastVirtualPos.y, BRUSH_WIDTH + 1, 0, Math.PI * 2);
      ctx.fillStyle = Date.now() < inversionEndTime ? '#0000ff' : BRUSH_COLOR;
      ctx.fill();
    }
  }

  function drawGridLines(step, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
    for (let y = 0; y < canvas.height; y += step) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
    ctx.stroke();
  }

  function drawCoordinateGridLines() {
    ctx.save();
    drawGridLines(NINE_DOTS_SPACING / 2, 'rgba(156, 163, 175, 0.15)', 0.5);
    drawGridLines(NINE_DOTS_SPACING, 'rgba(75, 85, 99, 0.35)', 1.0);

    // Center crosshair
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.moveTo(0, canvas.height / 2); ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawActiveMirrorFrame() {
    const size = state.mirrorSize;
    const thickness = state.mirrorThickness;
    ctx.save();
    ctx.strokeStyle = 'rgba(124, 58, 237, 0.15)';
    ctx.lineWidth = thickness;
    ctx.strokeRect(window.innerWidth / 2 - size / 2 + thickness / 2, window.innerHeight / 2 - size / 2 + thickness / 2, size - thickness, size - thickness);
    ctx.restore();
  }

  // --- Trial records ---
  function registerTrialRecord() {
    const reactionTimeMs = firstStrokeStartTimeMs > 0 ? (firstStrokeStartTimeMs - trialStartTimeMs) : -1;
    const activeParams = GROUP_PARAMS[state.selectedGroup] || [];

    const trial = {
      trialNumber: state.currentTrialNumber,
      group: state.selectedGroup,
      points: [...currentStrokePoints],
      trialDuration: Math.round(performance.now() - trialStartTimeMs),
      reactionTime: Math.round(reactionTimeMs),
      // Manipulation parameters of the participant's group only
      ...Object.fromEntries(ALL_PARAM_KEYS.map(k => [k, activeParams.includes(k) ? state[k] : undefined]))
    };
    state.allTrials.push(trial);
    firstStrokeStartTimeMs = 0;

    uploadTrialImage(trial);
  }

  // --- Debug HUD (key Y) ---
  function updateHUDStats() {
    const names = { MIRROR: 'Mirror', INERTIA: 'Inertia', CONTROL: 'Control' };
    const minutes = Math.floor(state.elapsedTime / 60);
    const seconds = state.elapsedTime % 60;
    $('hud-group-badge').innerText = names[state.selectedGroup];
    $('hud-trial-badge').innerText = state.currentTrialNumber;
    $('hud-timer-badge').innerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function renderSettingsHUDs() {
    const visible = state.showSettings && isCanvasState();
    $('top-hud-stats').classList.toggle('hidden', !visible);
    $('hud-timer-container').classList.toggle('hidden', state.appState !== 'TASK');
    $('settings-control-panel').classList.toggle('hidden', !visible);
    if (!visible) return;

    const config = SETTINGS_SLIDERS[state.selectedGroup];
    let html;
    if (config) {
      html = config.items.map(s => `
        <div class="mb-6">
          <div class="flex justify-between text-base mb-2">
            <span class="text-gray-800 font-semibold">${s.label}</span>
            <span class="font-bold ${config.labelClass} px-2 rounded" id="label-${s.key}">${s.fmt(state[s.key])}</span>
          </div>
          <input type="range" min="${s.min}" max="${s.max}" step="${s.step}" value="${state[s.key]}" data-key="${s.key}" class="w-full h-3 bg-gray-200 rounded-lg appearance-none ${config.inputClass} cursor-pointer" />
          ${s.hint ? `<p class="text-[11px] text-gray-500 mt-1">${s.hint}</p>` : ''}
        </div>`).join('');

      if (state.selectedGroup === 'MIRROR') {
        html += `
        <div class="mt-4 flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
          <input type="checkbox" id="checkbox-mirror-visible" ${state.mirrorVisible ? 'checked' : ''} class="w-5 h-5 accent-purple-600 cursor-pointer" />
          <label for="checkbox-mirror-visible" class="text-sm font-semibold text-gray-800 cursor-pointer">Видимость рамки</label>
        </div>`;
      }
    } else {
      html = `
        <div class="text-gray-500 italic text-center py-6">
          Для контрольной группы дополнительные настройки отсутствуют
        </div>`;
    }

    html += `
      <div class="mt-6 pt-4 border-t border-gray-100">
        <label class="flex items-center gap-3 cursor-pointer group">
          <input type="checkbox" id="checkbox-grid-visible" ${state.showGrid ? 'checked' : ''} class="w-5 h-5 accent-blue-600 cursor-pointer" />
          <span class="text-sm font-bold text-gray-700 group-hover:text-blue-600 transition-colors uppercase tracking-wider">Режим сетки (Grid)</span>
        </label>
        <p class="text-[10px] text-gray-400 mt-1 uppercase tracking-tight">Включает координатную сетку для проверки выравнивания точек</p>
      </div>`;

    $('settings-panel-inputs').innerHTML = html;
  }

  // One delegated listener for every control in the settings panel
  $('settings-panel-inputs').addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'checkbox-grid-visible') {
      state.showGrid = t.checked;
    } else if (t.id === 'checkbox-mirror-visible') {
      state.mirrorVisible = t.checked;
    } else if (t.dataset.key) {
      const s = SETTINGS_SLIDERS[state.selectedGroup].items.find(i => i.key === t.dataset.key);
      state[s.key] = s.parse(t.value);
      $(`label-${s.key}`).innerText = s.fmt(state[s.key]);
      if (!s.redraw) return;
    }
    redrawCanvas();
  });

  // --- Survey ---
  function setSurveyStep(step) {
    state.surveyStep = step;
    renderSurveyUI();
  }

  const choiceButtons = (prefix, options, sizeClasses) => `
    <div class="flex gap-6 justify-center">
      ${options.map((label, i) => `<button data-choice="${i}" class="${prefix} bg-gray-50 border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-gray-800 font-extrabold ${sizeClasses} rounded-2xl shadow-md transition-all">${label}</button>`).join('')}
    </div>`;

  function renderSurveyUI() {
    const box = $('screen-survey');
    box.classList.remove('hidden');
    const step = state.surveyStep;
    const sliderQ = SLIDER_QUESTIONS[step - SURVEY_FIRST_SLIDER_STEP];

    if (step === 0) {
      box.innerHTML = `
        <div class="max-w-3xl mx-auto text-center py-10 px-6 fade-in">
          <p class="text-2xl text-gray-800 leading-relaxed font-semibold mb-8">
            Пожалуйста, ответьте на вопросы о том, как проходил Ваш поиск решения. Если задача не была решена, отвечайте о чувствах, которые вы испытали, когда увидели правильный ответ.
          </p>
          <div class="mt-8">
            <span class="inline-block animate-pulse bg-blue-100 text-blue-800 font-bold px-6 py-3 rounded-full text-lg">
              Если готовы, нажмите ПРОБЕЛ
            </span>
          </div>
        </div>`;
    } else if (step === 1) {
      box.innerHTML = `
        <div class="max-w-2xl mx-auto text-center py-10 fade-in">
          <h2 class="text-3xl font-extrabold text-gray-900 mb-12">Решали ли Вы данную задачу ранее?</h2>
          ${choiceButtons('survey-choice', ['Да', 'Нет'], 'py-5 px-16 text-2xl')}
        </div>`;
      bindChoice(['Да', 'Нет'], v => { state.surveyAnswers.solvedBefore = v; });
    } else if (step === 2) {
      box.innerHTML = `
        <div class="max-w-4xl mx-auto text-center py-10 px-6 fade-in">
          <h2 class="text-2xl text-gray-900 leading-relaxed mb-10">
            Испытали ли Вы инсайт во время решения данной задачи? Инсайт - это своего рода Ага-реакция, характеризующаяся внезапностью и очевидностью. Как озарение. Вы относительно уверены в правильности своего решения без проверки. И наоборот, Вы не испытываете Ага-реакции, если решение произошло для вас медленно и пошагово, если вам необходимо проверить решение ещё раз. В качестве примера представьте лампочку, которая включается сразу в отличие от медленно разгорающейся. Мы просим Вас дать личную оценку о наличии или отсутствии Ага, здесь нет правильных или неправильных ответов. Просто следуйте своей интуиции. Испытали ли Вы инсайт во время решения?
          </h2>
          ${choiceButtons('survey-choice', ['Да', 'Нет'], 'py-5 px-16 text-2xl')}
        </div>`;
      bindChoice(['Да', 'Нет'], v => { state.surveyAnswers.insight = v; });
    } else if (sliderQ) {
      box.innerHTML = `
        <div class="max-w-3xl mx-auto text-center py-10 px-6 fade-in">
          <h2 class="text-3xl font-extrabold text-gray-900 leading-tight mb-16">${sliderQ.title}</h2>
          <div class="w-full mb-12">
            <input type="range" min="0" max="100" step="1" value="${state.surveyAnswers[sliderQ.field]}" id="survey-slider-input"
              class="w-full h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
            <div class="flex justify-between mt-6 text-xl font-bold text-gray-700">
              <span class="max-w-[180px] text-left">${sliderQ.left}</span>
              <span class="max-w-[180px] text-right">${sliderQ.right}</span>
            </div>
          </div>
          <button id="survey-slider-save" class="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-5 px-16 rounded-2xl shadow-xl transition-all transform hover:scale-105 text-xl">
            сохранить ответ
          </button>
        </div>`;
      $('survey-slider-input').addEventListener('input', (e) => {
        state.surveyAnswers[sliderQ.field] = parseInt(e.target.value);
      });
      $('survey-slider-save').addEventListener('click', () => setSurveyStep(step + 1));
    } else if (step === SURVEY_GENDER_STEP) {
      box.innerHTML = `
        <div class="max-w-2xl mx-auto text-center py-10 fade-in">
          <h2 class="text-3xl font-extrabold text-gray-800 mb-12">Укажите ваш пол</h2>
          ${choiceButtons('survey-choice', ['Мужской', 'Женский'], 'py-4 px-14 text-xl')}
        </div>`;
      bindChoice(['Мужской', 'Женский'], v => { state.surveyAnswers.gender = v; });
    } else if (step === SURVEY_AGE_STEP) {
      box.innerHTML = `
        <div class="max-w-2xl mx-auto text-center py-10 fade-in">
          <h2 class="text-3xl font-extrabold text-gray-800 mb-10">Укажите ваш возраст</h2>
          <div class="mb-10">
            <input type="number" id="survey-age-input" placeholder="--" min="5" max="110" required
              value="${state.surveyAnswers.age}"
              class="text-5xl text-center border-b-4 border-blue-500 outline-none w-48 font-extrabold bg-transparent text-gray-900" />
          </div>
          <button id="survey-btn-complete" class="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-4 px-16 rounded-2xl shadow-xl transition-all transform hover:scale-105 text-xl">
            закончить
          </button>
          <div id="survey-age-error" class="text-red-500 font-semibold mt-4 h-6"></div>
        </div>`;
      const ageInput = $('survey-age-input');
      ageInput.focus();
      $('survey-btn-complete').addEventListener('click', () => {
        const val = ageInput.value.trim();
        const age = parseInt(val);
        if (!val || isNaN(val) || age < 6 || age > 115) {
          $('survey-age-error').innerText = "Пожалуйста, введите корректный возраст.";
          return;
        }
        state.surveyAnswers.age = val;
        completeExperiment();
      });
    }
  }

  function bindChoice(values, save) {
    $('screen-survey').querySelectorAll('.survey-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        save(values[Number(btn.dataset.choice)]);
        setSurveyStep(state.surveyStep + 1);
      });
    });
  }

  // --- Finishing & DataPipe upload ---
  // Images are uploaded as each attempt is stored; the CSV goes last, when the jsPsych run ends.
  function uploadTrialImage(trial) {
    if (!pipeActive || trial.points.length === 0) return;
    const filename = `${subject_id}_trial${String(trial.trialNumber).padStart(2, '0')}.png`;
    const base64 = renderTrialImage(trial).toDataURL('image/png').split(',')[1];
    pendingUploads.push(
      jsPsychExtensionPipe.saveBase64Data(DATAPIPE_EXPERIMENT_ID, filename, base64).then(result => {
        if (!result.ok) {
          imageUploadFailed = true;
          console.error(`DataPipe refused ${filename} (HTTP ${result.status})`, result.body);
        }
      })
    );
  }

  async function completeExperiment() {
    setAppState('FINISHED');
    if (!PIPE_ENABLED) return;
    if (!pipeActive || !jsPsych) {
      setSaveStatus('error');
      return;
    }
    setSaveStatus('pending');
    await Promise.all(pendingUploads);
    endSessionTrial(); // ends the jsPsych run → the extension uploads the CSV → on_save
  }

  const SAVE_STATUS_TEXT = {
    idle: ['', ''],
    offline: ['', ''],
    pending: ['Идёт сохранение данных. Пожалуйста, не закрывайте страницу.', 'text-amber-600'],
    ok: ['Данные сохранены. Страницу можно закрыть.', 'text-emerald-600'],
    error: ['Не удалось отправить данные на сервер. Сообщите об этом экспериментатору.', 'text-red-600']
  };

  function setSaveStatus(status) {
    state.saveStatus = status;
    renderSaveStatus();
    if (status === 'ok') showNotice("Данные эксперимента успешно сохранены в DataPipe!", "success");
    if (status === 'error') showNotice("Ошибка сохранения в DataPipe. Скачайте результаты вручную на странице экспорта.", "error");
  }

  function renderSaveStatus() {
    const [text, color] = SAVE_STATUS_TEXT[state.saveStatus];
    const el = $('save-status');
    if (!el) return;
    el.innerText = text;
    el.className = `text-base font-semibold mb-8 min-h-6 ${color}`;
  }

  // --- CSV output (semicolon separated, Matlab format) ---
  const CSV_HEADERS = [
    "isElement", "trialNumber", "lineLength", "x", "y", "time1", "time2", "group",
    "isInverted", ...ALL_PARAM_KEYS,
    "solvedBefore", "insight", ...SLIDER_QUESTIONS.map(q => q.field), "gender", "age",
    "trialDuration", "totalTaskTime", "pId", "attentionAttempts", "rtDrawStart", "trial_type"
  ];

  // Fixed circle layout rows expected by the Matlab analysis
  const CSV_META_ROWS = [
    ["0", "900", "seconds", "10,1", "-1", "1920", "1081", "96"],
    ["1", "631", "278", "40", "45", "0", "0"],
    ["1", "747", "278", "40", "45", "0", "0"],
    ["1", "863", "278", "40", "45", "0", "0"],
    ["1", "631", "394", "40", "45", "0", "0"],
    ["1", "747", "394", "40", "45", "0", "0"],
    ["1", "863", "394", "40", "45", "0", "0"],
    ["1", "631", "510", "40", "45", "0", "0"],
    ["1", "747", "510", "40", "45", "0", "0"],
    ["1", "863", "510", "40", "45", "0", "0"],
    ["1", "515", "510", "0", "0", "0", "0"]
  ];

  function generateCSVData() {
    const delimiter = ';';
    const a = state.surveyAnswers;
    const surveyCols = [a.solvedBefore, a.insight, ...SLIDER_QUESTIONS.map(q => a[q.field]), a.gender, a.age].map(v => v ?? "");
    const totalTaskTime = state.elapsedTime.toString().replace('.', ',');

    const rows = [CSV_HEADERS.join(delimiter)];
    CSV_META_ROWS.forEach(meta => {
      const padded = [...meta];
      while (padded.length < CSV_HEADERS.length) padded.push("");
      rows.push(padded.join(delimiter));
    });

    state.allTrials.forEach(trial => {
      const row = (pointCols, isInverted, rt) => [
        "0", trial.trialNumber, ...pointCols, trial.group, isInverted,
        ...ALL_PARAM_KEYS.map(k => trial[k] ?? ""),
        ...surveyCols,
        (trial.trialDuration / 1000).toFixed(3).replace('.', ','),
        totalTaskTime, participantID, state.attentionAttempts, rt, "nine-dots-trial"
      ].join(delimiter);

      const pts = trial.points;
      if (pts.length === 0) {
        rows.push(row(["-1", "", "", "", ""], "", "-1"));
        return;
      }
      const t0 = pts[0].t;
      pts.forEach((pt, index) => {
        const timeOffset = pt.t - t0;
        rows.push(row([index, pt.x, pt.y, timeOffset, Math.floor(timeOffset / 16) * 16], pt.isInverted ? "1" : "0", trial.reactionTime));
      });
    });

    return rows.join('\n');
  }

  function generateJSONString() {
    return JSON.stringify({
      metadata: rawMetadata,
      attentionAttempts: state.attentionAttempts,
      totalTaskDurationSeconds: state.elapsedTime,
      finishReason: state.finishReason,
      group: state.selectedGroup,
      survey: state.surveyAnswers,
      trials: state.allTrials
    }, null, 2);
  }

  // --- PNG of an attempt (9 dots + drawn line on a white background) ---
  function renderTrialImage(trial) {
    const out = document.createElement('canvas');
    out.width = window.innerWidth;
    out.height = window.innerHeight;
    const c = out.getContext('2d');
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, out.width, out.height);
    drawDots(c, getDots(out.width, out.height, ALL_CELLS));
    if (trial) drawStroke(c, trial.points);
    return out;
  }

  // --- Export screen ---
  function downloadFile(href, filename) {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function downloadText(content, type, filename) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    downloadFile(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  $('btn-download-csv').addEventListener('click', () => {
    downloadText(generateCSVData(), 'text/csv;charset=utf-8;', `nine_dots_results_${participantID}_${Date.now()}.csv`);
    showNotice("Сводная ведомость CSV успешно сохранена!", "success");
  });

  $('btn-download-json').addEventListener('click', () => {
    downloadText(generateJSONString(), 'application/json;charset=utf-8;', `nine_dots_results_${participantID}_${Date.now()}.json`);
    showNotice("Сенсорные данные JSON успешно сохранены!", "success");
  });

  $('btn-download-img').addEventListener('click', () => {
    const lastTrial = state.allTrials[state.allTrials.length - 1];
    downloadFile(renderTrialImage(lastTrial).toDataURL('image/png'), `nine_dots_solution_${participantID}_${Date.now()}.png`);
    showNotice("Трасса решения сохранена как PNG графическая схема!", "success");
  });

  // A new participant needs a new ID and a fresh jsPsych run, so the page is reloaded
  $('btn-reset-app').addEventListener('click', () => {
    if (state.saveStatus === 'pending' && !confirm('Данные ещё отправляются на сервер. Всё равно начать заново?')) return;
    location.reload();
  });

  // --- Toast notifications ---
  let noticeTimer = null;
  function showNotice(text, type = 'info') {
    const box = $('notice-toast');
    box.innerText = text;
    box.className = `fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-4 rounded-xl font-bold text-white shadow-2xl z-50 transition-all font-sans ${
      type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-emerald-600' : 'bg-gray-800'
    }`;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { box.className = 'hidden'; }, 4500);
  }

  renderActiveScreen();
});
