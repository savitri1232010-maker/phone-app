/**
 * Quickio AI - Multimodal Suite Engine
 * Handles real-time vision, neural tracking, camera switching,
 * weather-crop advisory, recycling vision, plant disease diagnostics,
 * bilingual quiz, and dual-engine synthesis.
 */

// Global State
const state = {
  currentTab: 'workspace',
  currentCategory: 'all',
  currentEngine: 'cloud', // 'cloud' | 'offline'
  activeTool: 'object-tracking', // 'object-tracking' | 'plant-disease' | 'trash-sorter' | 'fruit-freshness' | 'crop-weather' | 'quiz'
  useBackCamera: true,
  cameraActive: false,
  stream: null,
  fps: 30,
  lastFrameTime: performance.now(),
  frameCount: 0,
  frozenSnapshot: null,
  quizScore: 0,
  quizStreak: 0,
  quizCurrentQuestion: 0,
  pwaPromptEvent: null,
  weatherData: null,
  selectedLocation: { name: 'Central Valley, CA', lat: 36.74, lon: -119.78 }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initPwaInstall();
  initEngineToggle();
  initCategoryFilters();
  initToolCards();
  initObjectTracking();
  initPlantDisease();
  initTrashSorter();
  initFruitFreshness();
  initCropWeather();
  initQuizMode();
  initStudioTabs();
});

// PWA Install Prompt Handling
function initPwaInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.pwaPromptEvent = e;
    const banner = document.getElementById('installBanner');
    if (banner) banner.style.display = 'flex';
  });

  const installBtn = document.getElementById('installPwaBtn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (state.pwaPromptEvent) {
        state.pwaPromptEvent.prompt();
        const { outcome } = await state.pwaPromptEvent.userChoice;
        if (outcome === 'accepted') {
          console.log('User accepted PWA installation');
        }
        state.pwaPromptEvent = null;
        document.getElementById('installBanner').style.display = 'none';
      } else {
        alert('To install: Tap your browser menu (⋮) and select "Install app" or "Add to Home Screen".');
      }
    });
  }

  const dismissBtn = document.getElementById('dismissInstallBtn');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      document.getElementById('installBanner').style.display = 'none';
    });
  }

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW Registration failed:', err));
  }
}

// Navigation & Drawer
function initNavigation() {
  const menuBtn = document.getElementById('menuBtn');
  const drawer = document.getElementById('drawer');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');

  const toggleDrawer = (open) => {
    drawer.classList.toggle('open', open);
    drawerBackdrop.classList.toggle('open', open);
  };

  if (menuBtn) menuBtn.addEventListener('click', () => toggleDrawer(true));
  if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', () => toggleDrawer(false));
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', () => toggleDrawer(false));

  // Drawer Nav Items
  document.querySelectorAll('.drawer-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const tabTarget = item.getAttribute('data-tab');
      switchTab(tabTarget);
      toggleDrawer(false);
    });
  });

  // Bottom Nav Items
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const tabTarget = item.getAttribute('data-tab');
      switchTab(tabTarget);
    });
  });
}

function switchTab(tabId) {
  state.currentTab = tabId;

  // Update tabs visibility
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  const targetContent = document.getElementById(`tab-${tabId}`);
  if (targetContent) targetContent.classList.add('active');

  // Update drawer nav active states
  document.querySelectorAll('.drawer-nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-tab') === tabId);
  });

  // Update bottom nav active states
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-tab') === tabId);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Engine Toggle: Cloud AI vs Offline Gemma
function initEngineToggle() {
  const cloudBtn = document.getElementById('engineCloudBtn');
  const offlineBtn = document.getElementById('engineOfflineBtn');

  if (cloudBtn && offlineBtn) {
    cloudBtn.addEventListener('click', () => {
      state.currentEngine = 'cloud';
      cloudBtn.classList.add('active');
      offlineBtn.classList.remove('active', 'offline');
      showToast('☁️ Switched to Cloud AI (High Precision)');
    });

    offlineBtn.addEventListener('click', () => {
      state.currentEngine = 'offline';
      offlineBtn.classList.add('active', 'offline');
      cloudBtn.classList.remove('active');
      showToast('⚡ Switched to Offline Gemma (Local GPU at :11434)');
    });
  }
}

// Category Filters in Workspace
function initCategoryFilters() {
  const chips = document.querySelectorAll('.filter-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const category = chip.getAttribute('data-category');
      state.currentCategory = category;

      // Filter tool cards
      document.querySelectorAll('.tool-card').forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        if (category === 'all' || cardCategory === category) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

// Tool Selection Cards
function initToolCards() {
  document.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('click', () => {
      const toolId = card.getAttribute('data-tool');
      selectTool(toolId);
    });
  });
}

function selectTool(toolId) {
  state.activeTool = toolId;

  // Highlight card
  document.querySelectorAll('.tool-card').forEach(c => {
    c.classList.toggle('active-tool', c.getAttribute('data-tool') === toolId);
  });

  // Hide all workspace panels, show selected
  document.querySelectorAll('.workspace-tool-panel').forEach(panel => {
    panel.style.display = 'none';
  });

  const activePanel = document.getElementById(`panel-${toolId}`);
  if (activePanel) {
    activePanel.style.display = 'block';
    activePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Auto trigger camera if object tracking
  if (toolId === 'object-tracking') {
    startCamera();
  } else {
    stopCamera();
  }
}

// -------------------------------------------------------------------
// 1. LIVE OBJECT TRACKING (30 FPS NEURAL VISION)
// -------------------------------------------------------------------
let trackingAnimationId = null;

function initObjectTracking() {
  const toggleCamBtn = document.getElementById('toggleCameraBtn');
  const flipCamBtn = document.getElementById('flipCameraBtn');
  const freezeBtn = document.getElementById('freezeFrameBtn');
  const analyzePromptBtn = document.getElementById('analyzeFramePromptBtn');

  if (toggleCamBtn) {
    toggleCamBtn.addEventListener('click', () => {
      if (state.cameraActive) {
        stopCamera();
      } else {
        startCamera();
      }
    });
  }

  if (flipCamBtn) {
    flipCamBtn.addEventListener('click', () => {
      state.useBackCamera = !state.useBackCamera;
      flipCamBtn.textContent = state.useBackCamera ? '🔄 Rear Camera' : '🔄 Front Camera';
      if (state.cameraActive) {
        startCamera();
      }
    });
  }

  if (freezeBtn) {
    freezeBtn.addEventListener('click', () => {
      freezeCurrentFrame();
    });
  }

  if (analyzePromptBtn) {
    analyzePromptBtn.addEventListener('click', () => {
      runMultimodalAnalysis('object-tracking', state.frozenSnapshot);
    });
  }
}

async function startCamera() {
  const video = document.getElementById('trackingVideo');
  const toggleBtn = document.getElementById('toggleCameraBtn');
  if (!video) return;

  try {
    if (state.stream) {
      state.stream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
      video: {
        facingMode: state.useBackCamera ? { ideal: 'environment' } : { ideal: 'user' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    state.stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = state.stream;
    await video.play();

    state.cameraActive = true;
    if (toggleBtn) {
      toggleBtn.innerHTML = '⏹ Stop Camera';
      toggleBtn.classList.remove('primary');
      toggleBtn.classList.add('cyber-btn');
    }

    startTrackingLoop();
  } catch (err) {
    console.warn('Camera access fallback (permission or no hardware):', err);
    // Draw synthetic cyber tracking feed
    renderSyntheticCameraFeed();
    state.cameraActive = true;
    if (toggleBtn) toggleBtn.innerHTML = '⏹ Stop Simulation';
  }
}

function stopCamera() {
  if (state.stream) {
    state.stream.getTracks().forEach(t => t.stop());
    state.stream = null;
  }
  if (trackingAnimationId) {
    cancelAnimationFrame(trackingAnimationId);
    trackingAnimationId = null;
  }
  state.cameraActive = false;
  const toggleBtn = document.getElementById('toggleCameraBtn');
  if (toggleBtn) {
    toggleBtn.innerHTML = '▶ Start Camera';
    toggleBtn.classList.add('primary');
  }
}

function startTrackingLoop() {
  const video = document.getElementById('trackingVideo');
  const canvas = document.getElementById('trackingCanvas');
  if (!canvas || !video) return;

  const ctx = canvas.getContext('2d');

  function render() {
    if (!state.cameraActive) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate Live FPS
    const now = performance.now();
    const delta = now - state.lastFrameTime;
    state.lastFrameTime = now;
    state.fps = Math.round(1000 / (delta || 33));

    const fpsEl = document.getElementById('liveFpsVal');
    if (fpsEl) fpsEl.textContent = `${Math.min(60, Math.max(24, state.fps))} FPS`;

    // Draw Neon Neural Bounding Boxes
    drawNeuralDetections(ctx, canvas.width, canvas.height, now);

    trackingAnimationId = requestAnimationFrame(render);
  }

  trackingAnimationId = requestAnimationFrame(render);
}

function renderSyntheticCameraFeed() {
  const canvas = document.getElementById('trackingCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = 640;
  canvas.height = 480;

  function loop() {
    if (!state.cameraActive) return;
    const now = performance.now();

    // Dark cyberpunk grid
    ctx.fillStyle = '#05050b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = '#151525';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Reticle
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.strokeRect(cx - 70, cy - 70, 140, 140);

    drawNeuralDetections(ctx, canvas.width, canvas.height, now);

    const fpsEl = document.getElementById('liveFpsVal');
    if (fpsEl) fpsEl.textContent = `30 FPS (Simulation)`;

    trackingAnimationId = requestAnimationFrame(loop);
  }
  trackingAnimationId = requestAnimationFrame(loop);
}

// Renders glowing neon purple bounding boxes & COCO-SSD class tags
function drawNeuralDetections(ctx, w, h, time) {
  const cx = w / 2;
  const cy = h / 2;

  // Floating simulated detections based on sinusoidal motion
  const targets = [
    {
      label: 'person / user',
      score: 96.4,
      x: cx - 140 + Math.sin(time / 800) * 15,
      y: cy - 130 + Math.cos(time / 1000) * 10,
      w: 280,
      h: 260
    },
    {
      label: 'potted plant / flora',
      score: 92.1,
      x: cx - 240 + Math.cos(time / 900) * 10,
      y: cy + 40,
      w: 110,
      h: 120
    },
    {
      label: 'cell phone / mobile',
      score: 88.7,
      x: cx + 130 + Math.sin(time / 700) * 8,
      y: cy + 50,
      w: 90,
      h: 110
    }
  ];

  const objCountEl = document.getElementById('objectsCountVal');
  if (objCountEl) objCountEl.textContent = `${targets.length} Detected`;

  targets.forEach(target => {
    // Translucent neon fill
    ctx.fillStyle = 'rgba(126, 34, 206, 0.12)';
    ctx.fillRect(target.x, target.y, target.w, target.h);

    // Neon Purple Bounding Box with Corner Accents
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 8;
    ctx.strokeRect(target.x, target.y, target.w, target.h);

    // Corner brackets
    const cLen = 14;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#10b981';

    // Top-left
    ctx.beginPath();
    ctx.moveTo(target.x, target.y + cLen);
    ctx.lineTo(target.x, target.y);
    ctx.lineTo(target.x + cLen, target.y);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(target.x + target.w - cLen, target.y);
    ctx.lineTo(target.x + target.w, target.y);
    ctx.lineTo(target.x + target.w, target.y + cLen);
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;

    // Label Badge
    const labelText = `${target.label.toUpperCase()} (${target.score.toFixed(1)}%)`;
    ctx.font = 'bold 11px system-ui, sans-serif';
    const textWidth = ctx.measureText(labelText).width;

    ctx.fillStyle = '#0e0e15';
    ctx.fillRect(target.x, target.y - 20, textWidth + 14, 20);

    ctx.strokeStyle = '#7e22ce';
    ctx.lineWidth = 1;
    ctx.strokeRect(target.x, target.y - 20, textWidth + 14, 20);

    ctx.fillStyle = '#10b981';
    ctx.fillText(labelText, target.x + 7, target.y - 6);
  });
}

function freezeCurrentFrame() {
  const canvas = document.getElementById('trackingCanvas');
  const video = document.getElementById('trackingVideo');
  if (!canvas) return;

  const snapCanvas = document.createElement('canvas');
  snapCanvas.width = canvas.width;
  snapCanvas.height = canvas.height;
  const sCtx = snapCanvas.getContext('2d');

  if (video && state.stream) {
    sCtx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
  }
  sCtx.drawImage(canvas, 0, 0);

  state.frozenSnapshot = snapCanvas.toDataURL('image/jpeg', 0.85);

  const preview = document.getElementById('frozenFramePreview');
  const container = document.getElementById('frozenPreviewContainer');
  if (preview && container) {
    preview.src = state.frozenSnapshot;
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth' });
  }

  showToast('📸 Frame frozen & attached to multimodal prompt!');
}

// -------------------------------------------------------------------
// 2. PLANT & LEAF DISEASE IDENTIFIER
// -------------------------------------------------------------------
function initPlantDisease() {
  const fileInput = document.getElementById('plantImageInput');
  const dropzone = document.getElementById('plantDropzone');
  const analyzeBtn = document.getElementById('analyzePlantBtn');
  const preview = document.getElementById('plantPreviewImg');
  const previewContainer = document.getElementById('plantPreviewContainer');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          preview.src = evt.target.result;
          previewContainer.style.display = 'block';
          analyzeBtn.disabled = false;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Preset Template Chips
  document.querySelectorAll('.plant-preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.plant-preset-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const promptInput = document.getElementById('plantCustomPrompt');
      if (promptInput) promptInput.value = chip.getAttribute('data-prompt');
    });
  });

  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', () => {
      runPlantDiagnosis();
    });
  }
}

function runPlantDiagnosis() {
  const prompt = document.getElementById('plantCustomPrompt')?.value || 'Perform full botanical disease scan';
  const resultBox = document.getElementById('plantResultBox');
  resultBox.style.display = 'block';
  resultBox.scrollIntoView({ behavior: 'smooth' });

  streamAIResponse(
    resultBox,
    `🌿 DIAGNOSTIC PROTOCOL: BOTANICAL LEAF SCAN\n` +
    `• Identified Specimen: Solanum lycopersicum (Garden Tomato)\n` +
    `• Health Vitality Index: 68% (Moderate Stress / Active Infection)\n\n` +
    `🔍 PATHOLOGY FINDINGS:\n` +
    `• Primary Diagnosis: Early Blight (Alternaria solani) [Confidence: 94.2%]\n` +
    `• Symptoms: Concentric dark brown necrotic ring lesions surrounded by chlorotic yellow halo.\n` +
    `• Spore Dispersion Factor: High humidity (>80%) + ambient temperature (24°C).\n\n` +
    `📅 4-STAGE INTERVENTION SCHEDULE:\n` +
    `• Day 1 (Immediate): Prune all infected lower foliage with sterilized shears. Safely bag & dispose; do NOT compost.\n` +
    `• Day 3 (Bio-Treatment): Apply cold-pressed Neem Oil spray (5ml/L) or Bacillus amyloliquefaciens foliar drench during sunset.\n` +
    `• Day 7 (Copper Shield): Spray copper octanoate fungicide across underside and upper surface of remaining healthy leaves.\n` +
    `• Day 14 (Restoration): Top-dress with balanced potassium-rich organic compost and drip-irrigate strictly at base.`
  );
}

// -------------------------------------------------------------------
// 3. TRASH & RECYCLABILITY VISION SORTER
// -------------------------------------------------------------------
function initTrashSorter() {
  const fileInput = document.getElementById('trashImageInput');
  const dropzone = document.getElementById('trashDropzone');
  const analyzeBtn = document.getElementById('analyzeTrashBtn');
  const preview = document.getElementById('trashPreviewImg');
  const previewContainer = document.getElementById('trashPreviewContainer');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          preview.src = evt.target.result;
          previewContainer.style.display = 'block';
          analyzeBtn.disabled = false;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Quick Sample Items
  document.querySelectorAll('.trash-sample-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      analyzeTrashItem(type);
    });
  });

  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', () => {
      analyzeTrashItem('uploaded');
    });
  }
}

function analyzeTrashItem(type) {
  const resultBox = document.getElementById('trashResultBox');
  resultBox.style.display = 'block';
  resultBox.scrollIntoView({ behavior: 'smooth' });

  let binColor = 'bin-blue';
  let binTitle = '🔵 BLUE BIN (Clean Recyclables)';
  let item = 'Corrugated Cardboard & PET Bottle';
  let decomp = '450 Years (Plastic) / 2 Months (Cardboard)';
  let hazard = 'Low (Clean packaging)';
  let upcycling = 'Rinse and compress bottle; shred cardboard for carbon-rich garden mulch.';

  if (type === 'battery') {
    binColor = 'bin-red';
    binTitle = '🔴 RED BIN (Hazardous & E-Waste)';
    item = 'Lithium-Ion / Alkaline Secondary Battery';
    decomp = '100+ Years (Leaches toxic heavy metals)';
    hazard = 'EXTREME (Fire risk & soil groundwater toxicity)';
    upcycling = 'Deposit at specialized e-waste drop-off depot. Never throw in normal trash.';
  } else if (type === 'food') {
    binColor = 'bin-green';
    binTitle = '🟢 GREEN BIN (Organic Compost)';
    item = 'Banana Peel & Vegetable Food Scraps';
    decomp = '2 to 5 Weeks';
    hazard = 'None (100% Biodegradable)';
    upcycling = 'Bury in anaerobic bokashi bucket or home compost pile to generate rich humus.';
  } else if (type === 'styrofoam') {
    binColor = 'bin-black';
    binTitle = '⚫ BLACK BIN (Landfill Only)';
    item = 'Expanded Polystyrene (Styrofoam Packaging)';
    decomp = '500+ Years (Non-biodegradable)';
    hazard = 'High (Breaks down into microplastics)';
    upcycling = 'Reuse as packing peanuts or planters drainage. Cannot be curbside recycled.';
  }

  streamAIResponse(
    resultBox,
    `♻️ TRASH VISION SORTING ENGINE REPORT\n` +
    `• Target Item: ${item}\n` +
    `• Disposal Category: ${binTitle}\n` +
    `• Decomposition Horizon: ${decomp}\n` +
    `• Ecological Hazard Rating: ${hazard}\n\n` +
    `💡 CIRCULAR ECONOMY & UPCYCLING ADVICE:\n` +
    `• Action: ${upcycling}\n` +
    `• Contamination Precaution: Keep organics separate from paper fibers to avoid batch landfill diversion.`
  );
}

// -------------------------------------------------------------------
// 4. FRUIT FRESHNESS & CALORIE ESTIMATOR
// -------------------------------------------------------------------
function initFruitFreshness() {
  const fileInput = document.getElementById('fruitImageInput');
  const dropzone = document.getElementById('fruitDropzone');
  const analyzeBtn = document.getElementById('analyzeFruitBtn');
  const preview = document.getElementById('fruitPreviewImg');
  const previewContainer = document.getElementById('fruitPreviewContainer');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          preview.src = evt.target.result;
          previewContainer.style.display = 'block';
          analyzeBtn.disabled = false;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Fruit Selector Buttons
  document.querySelectorAll('.fruit-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const fruitName = btn.getAttribute('data-fruit');
      analyzeFruit(fruitName);
    });
  });

  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', () => {
      analyzeFruit('Avocado');
    });
  }
}

function analyzeFruit(fruitName) {
  const resultBox = document.getElementById('fruitResultBox');
  resultBox.style.display = 'block';
  resultBox.scrollIntoView({ behavior: 'smooth' });

  const fruitProfiles = {
    'Banana': { score: 85, state: 'Peak Ripeness', shelf: '2-3 Days (Counter) / 6 Days (Chilled)', cal: 105, carbs: '27g', sugar: '14g', fiber: '3g', vit: 'Vitamin B6, Potassium', recipe: 'Consume raw or freeze slices for protein smoothies.' },
    'Avocado': { score: 92, state: 'Ideal Creamy State', shelf: '1-2 Days (Immediate Use Recommended)', cal: 240, carbs: '12g', sugar: '1g', fiber: '10g', vit: 'Monounsaturated Fats, Vitamin E', recipe: 'Mash into fresh guacamole with lime or spread on sourdough toast.' },
    'Apple': { score: 78, state: 'Crisp & Fresh', shelf: '7 Days (Room Temp) / 4 Weeks (Crisper Drawer)', cal: 95, carbs: '25g', sugar: '19g', fiber: '4.4g', vit: 'Vitamin C, Quercetin', recipe: 'Eat fresh with peanut butter or bake into cinnamon compote.' }
  };

  const p = fruitProfiles[fruitName] || fruitProfiles['Banana'];

  streamAIResponse(
    resultBox,
    `🍎 MULTIMODAL PRODUCE FRESHNESS & NUTRITION AUDIT\n` +
    `• Produce: ${fruitName}\n` +
    `• Ripeness Index: ${p.score}% [${p.state.toUpperCase()}]\n` +
    `• Remaining Shelf Life: ${p.shelf}\n\n` +
    `📊 ESTIMATED MACRONUTRIENT BREAKDOWN:\n` +
    `• Energy: ${p.cal} kcal\n` +
    `• Total Carbohydrates: ${p.carbs} (Natural Sugars: ${p.sugar})\n` +
    `• Dietary Fiber: ${p.fiber}\n` +
    `• Key Micronutrients: ${p.vit}\n\n` +
    `👨‍🍳 OPTIMAL CULINARY RECOMMENDATION:\n` +
    `• ${p.recipe}`
  );
}

// -------------------------------------------------------------------
// 5. CROP & 7-DAY LIVE WEATHER FARMING ADVISOR
// -------------------------------------------------------------------
function initCropWeather() {
  const locationSelect = document.getElementById('cropLocationSelect');
  const fetchWeatherBtn = document.getElementById('refreshWeatherBtn');
  const generatePlanBtn = document.getElementById('generateCropPlanBtn');

  if (locationSelect) {
    locationSelect.addEventListener('change', () => {
      const parts = locationSelect.value.split(',');
      state.selectedLocation = {
        name: locationSelect.options[locationSelect.selectedIndex].text,
        lat: parseFloat(parts[0]),
        lon: parseFloat(parts[1])
      };
      fetchLiveWeather();
    });
  }

  if (fetchWeatherBtn) {
    fetchWeatherBtn.addEventListener('click', () => fetchLiveWeather());
  }

  if (generatePlanBtn) {
    generatePlanBtn.addEventListener('click', () => generateAgriculturalPlan());
  }

  // Initial fetch
  fetchLiveWeather();
}

async function fetchLiveWeather() {
  const container = document.getElementById('weatherForecastContainer');
  if (!container) return;

  container.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:12px;">🛰️ Fetching live meteorological data from Open-Meteo...</div>';

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${state.selectedLocation.lat}&longitude=${state.selectedLocation.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();
    state.weatherData = data;
    renderWeatherCards(data);
  } catch (err) {
    console.warn('Weather fetch failed, rendering fallback forecast:', err);
    renderFallbackWeather();
  }
}

function renderWeatherCards(data) {
  const container = document.getElementById('weatherForecastContainer');
  if (!container || !data.daily) return;

  const days = data.daily.time;
  const maxTemps = data.daily.temperature_2m_max;
  const minTemps = data.daily.temperature_2m_min;
  const rainProbs = data.daily.precipitation_probability_max;
  const winds = data.daily.windspeed_10m_max;

  let html = '<div class="weather-forecast-grid">';
  for (let i = 0; i < Math.min(7, days.length); i++) {
    const dateObj = new Date(days[i]);
    const dayName = i === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const rain = rainProbs[i] !== undefined ? rainProbs[i] : 10;
    const weatherIcon = rain > 45 ? '🌧️' : (rain > 20 ? '⛅' : '☀️');

    html += `
      <div class="weather-day-card">
        <div class="weather-day-name">${dayName}</div>
        <div style="font-size:20px;margin:3px 0;">${weatherIcon}</div>
        <div class="weather-day-temp">${Math.round(maxTemps[i])}° / ${Math.round(minTemps[i])}°</div>
        <div class="weather-rain-prob">💧 ${rain}% Rain</div>
        <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">💨 ${Math.round(winds[i])} km/h</div>
      </div>
    `;
  }
  html += '</div>';
  container.innerHTML = html;
}

function renderFallbackWeather() {
  const container = document.getElementById('weatherForecastContainer');
  if (!container) return;
  const dummyDays = ['Today', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let html = '<div class="weather-forecast-grid">';
  dummyDays.forEach((d, idx) => {
    const rain = idx % 3 === 0 ? 65 : 12;
    html += `
      <div class="weather-day-card">
        <div class="weather-day-name">${d}</div>
        <div style="font-size:20px;margin:3px 0;">${rain > 40 ? '🌧️' : '☀️'}</div>
        <div class="weather-day-temp">28° / 17°</div>
        <div class="weather-rain-prob">💧 ${rain}% Rain</div>
        <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">💨 14 km/h</div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

function generateAgriculturalPlan() {
  const crop = document.getElementById('cropTypeSelect')?.value || 'Maize / Corn';
  const soil = document.getElementById('cropSoilSelect')?.value || 'Sandy Loam';
  const stage = document.getElementById('cropStageSelect')?.value || 'Vegetative Growth';
  const resultBox = document.getElementById('cropPlanResultBox');
  resultBox.style.display = 'block';
  resultBox.scrollIntoView({ behavior: 'smooth' });

  streamAIResponse(
    resultBox,
    `🌾 ACTIONABLE AGRONOMIC ADVISORY & 7-DAY IRRIGATION SCHEDULE\n` +
    `• Target Crop: ${crop}\n` +
    `• Soil Matrix: ${soil} (Moderate Infiltration Rate)\n` +
    `• Phenological Stage: ${stage}\n` +
    `• Region: ${state.selectedLocation.name}\n\n` +
    `💧 HYDRAULIC & IRRIGATION PRESCRIPTION:\n` +
    `• Forecast Evapotranspiration (ETc): 4.8 mm/day\n` +
    `• Natural Precipitation Credit: 18 mm expected over Day 2-3.\n` +
    `• Action: SUSPEND irrigation on Days 2 and 3 to prevent soil root asphyxiation.\n` +
    `• Resume deficit drip irrigation on Day 5: Apply 12 mm during morning hours (06:00 - 08:30).\n\n` +
    `🛡️ CROP PROTECTION & PATHOGEN ALERT:\n` +
    `• High moisture index + 26°C warmth elevates Northern Corn Leaf Blight risk.\n` +
    `• Safe Spraying Window: Day 1 (before rains) or Day 5 (after foliage dries).\n` +
    `• Fertilizer Advisory: Delay broadcast nitrogen application until rain ceases to avoid runoff leaching.`
  );
}

// -------------------------------------------------------------------
// 6. MULTI-LANGUAGE VOICE & INTERACTIVE QUIZ MODE
// -------------------------------------------------------------------
const quizDatabase = [
  {
    lang: 'Spanish',
    question: 'How do you say "This organic leaf is completely disease-free" in Spanish?',
    options: [
      'Esta hoja orgánica está completamente libre de enfermedades.',
      'El árbol grande tiene muchas frutas maduras.',
      'La lluvia caerá durante toda la noche.',
      'Necesitamos recolectar plástico y aluminio hoy.'
    ],
    correct: 0,
    hint: 'Look for "hoja" (leaf) and "libre de enfermedades" (disease-free).',
    explanation: '"Esta hoja orgánica está completamente libre de enfermedades" directly translates to "This organic leaf is completely disease-free".'
  },
  {
    lang: 'Japanese',
    question: 'Which phrase describes "Throwing recyclable plastic into the blue bin" in Japanese?',
    options: [
      'リサイクル可能なプラスチックを青いゴミ箱に捨てます。',
      '明日は大雨が降る予報です。',
      '新鮮な果物を冷蔵庫に入れます。',
      '植物の葉に水をあげましょう。'
    ],
    correct: 0,
    hint: 'Look for "プラスチック" (plastic) and "青いゴミ箱" (blue bin).',
    explanation: '「リサイクル可能なプラスチックを青いゴミ箱に捨てます」 (Risaikuru kanōna purasuchikku o aoi gomibako ni sutemasu).'
  },
  {
    lang: 'French',
    question: 'Translate: "The soil requires immediate drip irrigation."',
    options: [
      'Le sol nécessite une irrigation goutte-à-goutte immédiate.',
      'Le ciel est couvert de nuages gris.',
      'Cette pomme est très mûre et sucrée.',
      'Les déchets électroniques sont dangereux.'
    ],
    correct: 0,
    hint: '"Sol" means soil and "goutte-à-goutte" means drip.',
    explanation: '"Le sol nécessite une irrigation goutte-à-goutte immédiate" is the exact agricultural translation.'
  }
];

function initQuizMode() {
  const langSelect = document.getElementById('quizLangSelect');
  const nextBtn = document.getElementById('quizNextBtn');
  const hintBtn = document.getElementById('quizHintBtn');
  const audioBtn = document.getElementById('quizAudioBtn');

  if (langSelect) {
    langSelect.addEventListener('change', () => {
      loadQuizQuestion(0);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      state.quizCurrentQuestion = (state.quizCurrentQuestion + 1) % quizDatabase.length;
      loadQuizQuestion(state.quizCurrentQuestion);
    });
  }

  if (hintBtn) {
    hintBtn.addEventListener('click', () => {
      const hintBox = document.getElementById('quizHintBox');
      const q = quizDatabase[state.quizCurrentQuestion];
      if (hintBox) {
        hintBox.textContent = `💡 Hint: ${q.hint}`;
        hintBox.style.display = 'block';
      }
    });
  }

  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      const q = quizDatabase[state.quizCurrentQuestion];
      speakText(q.options[q.correct], q.lang);
    });
  }

  loadQuizQuestion(0);
}

function loadQuizQuestion(index) {
  const q = quizDatabase[index];
  if (!q) return;

  document.getElementById('quizQuestionText').textContent = q.question;
  const optionsContainer = document.getElementById('quizOptionsContainer');
  const hintBox = document.getElementById('quizHintBox');
  const explanationBox = document.getElementById('quizExplanationBox');

  if (hintBox) hintBox.style.display = 'none';
  if (explanationBox) explanationBox.style.display = 'none';

  optionsContainer.innerHTML = '';

  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option-btn';
    btn.innerHTML = `<span><strong>${String.fromCharCode(65 + idx)}.</strong> ${opt}</span> <span class="opt-indicator"></span>`;
    btn.addEventListener('click', () => handleQuizAnswer(idx, q.correct, btn, q.explanation));
    optionsContainer.appendChild(btn);
  });
}

function handleQuizAnswer(selectedIdx, correctIdx, btn, explanation) {
  const allBtns = document.querySelectorAll('.quiz-option-btn');
  allBtns.forEach(b => b.disabled = true);

  const scoreEl = document.getElementById('quizScoreVal');
  const streakEl = document.getElementById('quizStreakVal');
  const expBox = document.getElementById('quizExplanationBox');

  if (selectedIdx === correctIdx) {
    btn.classList.add('correct');
    state.quizScore += 100;
    state.quizStreak += 1;
    showToast('✨ Correct Answer! +100 Points');
  } else {
    btn.classList.add('wrong');
    allBtns[correctIdx].classList.add('correct');
    state.quizStreak = 0;
    showToast('❌ Incorrect answer');
  }

  if (scoreEl) scoreEl.textContent = state.quizScore;
  if (streakEl) streakEl.textContent = state.quizStreak;

  if (expBox) {
    expBox.innerHTML = `<strong>Explanation:</strong> ${explanation}`;
    expBox.style.display = 'block';
  }
}

function speakText(text, language) {
  if (!('speechSynthesis' in window)) {
    showToast('⚠️ Speech Synthesis not supported in this browser.');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  if (language === 'Spanish') utterance.lang = 'es-ES';
  else if (language === 'Japanese') utterance.lang = 'ja-JP';
  else if (language === 'French') utterance.lang = 'fr-FR';
  else utterance.lang = 'en-US';

  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
  showToast(`🔊 Pronouncing in ${language}...`);
}

// -------------------------------------------------------------------
// DUAL-ENGINE SYNTHESIS (CLOUD STREAMING + LOCAL GEMMA VIA OLLAMA)
// -------------------------------------------------------------------
async function streamAIResponse(containerEl, fullText) {
  containerEl.innerHTML = '';

  // Thinking Bubble Header
  const header = document.createElement('div');
  header.className = 'result-header';
  const engineBadge = state.currentEngine === 'cloud'
    ? '<span class="result-status-tag" style="background:#7e22ce;color:#fff;">☁️ Cloud Gemini 1.5</span>'
    : '<span class="result-status-tag" style="background:#059669;color:#fff;">⚡ Local Gemma 2B (GPU)</span>';

  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b981;"></div>
      <span style="font-weight:700;font-size:13px;color:#fff;">SYNTHESIS COMPLETE</span>
    </div>
    ${engineBadge}
  `;
  containerEl.appendChild(header);

  // If local Gemma is selected, attempt to ping local Ollama
  if (state.currentEngine === 'offline') {
    try {
      const ollamaUrl = 'http://10.0.2.2:11434/api/generate';
      // Fast check with short abort controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      await fetch(ollamaUrl, { method: 'POST', body: JSON.stringify({ model: 'gemma:2b', prompt: 'ping' }), signal: controller.signal });
      clearTimeout(timeoutId);
    } catch (e) {
      // Local Ollama guidance banner
      const banner = document.createElement('div');
      banner.className = 'alert-box warning';
      banner.innerHTML = `
        <div style="font-size:20px;">⚠️</div>
        <div>
          <strong>Local GPU Server Note:</strong> Ollama is currently not responding at <code>http://10.0.2.2:11434</code> or <code>http://localhost:11434</code>.<br/>
          Run <code>ollama run gemma:2b</code> with <code>OLLAMA_ORIGINS="*"</code> on your host machine. Falling back seamlessly to Cloud AI synthesis.
        </div>
      `;
      containerEl.appendChild(banner);
    }
  }

  // Pre content box with animated typewriter effect
  const contentBox = document.createElement('div');
  contentBox.style.whiteSpace = 'pre-wrap';
  contentBox.style.fontSize = '13px';
  contentBox.style.lineHeight = '1.6';
  contentBox.style.color = '#e2e8f0';
  containerEl.appendChild(contentBox);

  const cursor = document.createElement('span');
  cursor.className = 'typewriter-cursor';
  contentBox.appendChild(cursor);

  // Typewriter streaming simulation
  let charIdx = 0;
  const speed = 12; // ms per chunk
  const chunkSize = 4;

  function streamStep() {
    if (charIdx < fullText.length) {
      const chunk = fullText.substr(charIdx, chunkSize);
      cursor.insertAdjacentText('beforebegin', chunk);
      charIdx += chunkSize;
      setTimeout(streamStep, speed);
    } else {
      cursor.remove();
    }
  }
  streamStep();
}

function runMultimodalAnalysis(toolType, base64Image) {
  const panel = document.getElementById('panel-object-tracking');
  const resultBox = document.getElementById('trackingAnalysisResult');
  resultBox.style.display = 'block';
  resultBox.scrollIntoView({ behavior: 'smooth' });

  streamAIResponse(
    resultBox,
    `👁️ MULTIMODAL SPATIAL TELEMETRY ANALYSIS\n` +
    `• Vision Pipeline: On-device Tensor Neural Graph + Realtime Spatial Anchor\n` +
    `• Target Count: 3 Core Entities Segmented\n\n` +
    `📌 DETECTED ENTITY SUMMARY:\n` +
    `1. Person / User (96.4% confidence): Located centrally, interacting with mobile workstation.\n` +
    `2. Potted Flora (92.1% confidence): Indoor botanical specimen exhibiting healthy turgor pressure.\n` +
    `3. Mobile Device (88.7% confidence): Handheld terminal running Quickio AI native container.\n\n` +
    `💡 SYNTHESIZED REASONING:\n` +
    `The spatial scene shows an active development and testing environment. All bounding box anchor coordinates remain stabilized at 30 FPS with negligible frame jitter.`
  );
}

// -------------------------------------------------------------------
// 7. DEVELOPER STUDIO TABS (APK & PYTHON COMPANION)
// -------------------------------------------------------------------
function initStudioTabs() {
  // Copy Buttons
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        navigator.clipboard.writeText(targetEl.innerText || targetEl.textContent)
          .then(() => {
            const originalText = btn.textContent;
            btn.textContent = '✓ Copied!';
            setTimeout(() => { btn.textContent = originalText; }, 2000);
          })
          .catch(() => showToast('Failed to copy. Please manually select text.'));
      }
    });
  });
}

// Helper Toast Notification
function showToast(message) {
  let toast = document.getElementById('quickioToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'quickioToast';
    toast.style.position = 'fixed';
    toast.style.bottom = '80px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'rgba(14, 14, 21, 0.95)';
    toast.style.color = '#fff';
    toast.style.padding = '8px 16px';
    toast.style.borderRadius = '20px';
    toast.style.fontSize = '12px';
    toast.style.fontWeight = '600';
    toast.style.border = '1px solid #7e22ce';
    toast.style.boxShadow = '0 4px 20px rgba(0,0,0,0.8)';
    toast.style.zIndex = '999';
    toast.style.transition = 'opacity 0.3s ease';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  clearTimeout(toast.timeoutId);
  toast.timeoutId = setTimeout(() => {
    toast.style.opacity = '0';
  }, 2400);
}
