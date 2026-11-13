// 3D-склад из примитивов: стеллажи → ТСД → грузовик логиста → серверная.
// Камера летит по сплайну; положение на сплайне задаёт скролл (setProgress).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { loadModels } from './models.js';
import { TSD_LAYOUT } from './layout.js';

const YELLOW = 0xffd400;
const RED = 0xe5332a;
const BG = 0xe9e3d6; // дневной склад: тёплая светлая дымка, в тон фону сайта

// Две темы склада: день (светлая тема сайта) и вечер (тёмная). Ссылки на свет и материалы — в LOOK.
const THEMES = {
  light: { bg: 0xe9e3d6, fog: 0.032, exposure: 1.0, hemi: [0xfffaf0, 0xb8ad98, 1.6], key: 1.6, fill: 0.5, points: 1, strip: 0xffffff,
    floor: 0xcfc8ba, wall: 0xe2dccf, grid: [0xb3aa96, 0xbfb7a5], dock: 0xbdb5a5, deck: 0x8d8a83, bloom: 0.18, particles: [0x2f2a22, 0.7] },
  dark: { bg: 0x1d1c1f, fog: 0.04, exposure: 1.05, hemi: [0xfff2cc, 0x2a2a30, 0.7], key: 0.7, fill: 0.15, points: 2.6, strip: 0xfff3c4,
    floor: 0x2c2b2f, wall: 0x232327, grid: [0x4a4536, 0x36332a], dock: 0x3a3a40, deck: 0x3a3a40, bloom: 0.5, particles: [0xffd400, 0.5] },
};
const LOOK = {};

// Станции камеры: по одной на секцию страницы (порядок = порядок секций)
const STATIONS = [ // кадры выставлены в редакторе 14.11.2026
  { pos: [1.7, 6.1, 15.8], look: [1.14, 5.292, 12.966], fov: 39.5 },    // первый экран
  { pos: [0.4, 2.3, 7], look: [0.313, 2.208, 4.003], fov: 50 },         // услуги — проход между стеллажами
  { pos: [-0.3, 3.9, -1.0], look: [-0.2, 2.9, -4.8], via: true },          // промежуточная: над погрузчиком
  { pos: [-1.31, 2.78, -3.572], look: [-0.563, 2.294, -6.436], fov: 50 }, // кейсы — ТСД
  { pos: [-1.5, 2.8, -15.5], look: [-3.34, 2.142, -17.776], fov: 50 },  // этапы — погрузка в грузовик
  { pos: [4.591, 2.2, -30.929], look: [7.493, 1.634, -31.434], fov: 50 }, // о нас — серверная
  { pos: [0, 7, -2], look: [-0.065, 5.379, -4.524], fov: 50 },          // заявка
];

export function createScene(canvas, { mobile }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(BG, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.FogExp2(BG, 0.032);

  // Угол обзора: у станции свой (fov) или общий; на телефоне шире в той же пропорции
  const BASE_FOV = 50;
  const fovScale = mobile ? 62 / 50 : 1;
  // Точки пути: кадры секций + промежуточные (via) — облёт предметов; прогресс скролла считается по кадрам
  const KEYS = STATIONS.filter((s) => !s.via);
  const keyIdx = STATIONS.map((s, i) => (s.via ? -1 : i)).filter((i) => i >= 0);
  const stationFov = KEYS.map((s) => (s.fov ?? BASE_FOV) * fovScale);
  const camera = new THREE.PerspectiveCamera(stationFov[0], 1, 0.1, 120);
  // Разработка: сцена доступна редактору ракурсов (tools/scene-constructor/editor.js)
  if (import.meta.env.DEV) window.__room = { scene, camera, THREE, stations: KEYS, path: STATIONS };

  addLights(scene);
  addFloor(scene);
  const shelves = addShelves(scene, mobile);
  const tsd = addTSD(scene);
  const truck = addTruck(scene);
  const servers = addServerRoom(scene);
  // Детальные модели подгружаются после первого кадра и заменяют простые фигуры
  loadModels(scene, { boxes: shelves.boxes, tsd, tsdRotY: Math.PI, truck: truck.group, racks: servers.racks, leds: servers.leds });
  const barcodes = addBarcodeParticles(scene, mobile ? 90 : 260);

  // Сплайны пути камеры и точки взгляда
  const posCurve = new THREE.CatmullRomCurve3(STATIONS.map((s) => new THREE.Vector3(...s.pos)), false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3(STATIONS.map((s) => new THREE.Vector3(...s.look)), false, 'centripetal');
  // Положение каждой точки пути по длине кривой — чтобы камера летела с постоянной скоростью
  const SAMPLES = 600;
  const lengths = posCurve.getLengths(SAMPLES);
  const pointU = STATIONS.map((_, i) => lengths[Math.round((i / (STATIONS.length - 1)) * SAMPLES)] / lengths[SAMPLES]);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.18, 0.4, 0.97) // днём свечение едва заметно;
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let useBloom = true;

  let target = 0;
  let current = 0;
  const mouse = new THREE.Vector2();
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (e) => {
    mouse.set(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5);
  });

  // Автоснижение качества, если кадры не успевают
  let frames = 0;
  let fpsStart = performance.now();
  let degraded = false;
  function watchFps(now) {
    frames++;
    if (degraded || now - fpsStart < 2500) return;
    const fps = (frames * 1000) / (now - fpsStart);
    frames = 0;
    fpsStart = now;
    if (fps < 40) {
      degraded = true;
      useBloom = false;
      pixelRatio = 1;
      renderer.setPixelRatio(pixelRatio);
      resize();
    }
  }

  const clock = new THREE.Clock();
  let running = true;
  let last = performance.now();
  const lookSmooth = new THREE.Vector3(...STATIONS[0].look);
  const mouseSmooth = new THREE.Vector2();
  const damp = (speed, dt) => 1 - Math.exp(-speed * dt); // сглаживание по времени, не по кадрам
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const t = clock.getElapsedTime();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    current += (target - current) * damp(2.4, dt);

    const u = THREE.MathUtils.clamp(current, 0, 1);
    const k = u * (KEYS.length - 1);
    const i0 = Math.min(Math.floor(k), KEYS.length - 2);
    // доля между кадрами → доля длины пути: скорость камеры постоянная на всём участке
    const uArc = THREE.MathUtils.lerp(pointU[keyIdx[i0]], pointU[keyIdx[i0 + 1]], k - i0);
    posCurve.getPointAt(uArc, camPos);
    lookCurve.getPoint(posCurve.getUtoTmapping(uArc), camLook);
    // взгляд догоняет плавно — без рывков на поворотах, как у операторской камеры
    lookSmooth.lerp(camLook, damp(3.2, dt));
    mouseSmooth.lerp(mouse, damp(2.5, dt));
    camPos.x += mouseSmooth.x * 0.5;
    camPos.y -= mouseSmooth.y * 0.3;
    camera.position.copy(camPos);
    camera.lookAt(lookSmooth);
    const fov = THREE.MathUtils.lerp(stationFov[i0], stationFov[i0 + 1], k - i0);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    tsd.update(t);
    truck.update(t);
    servers.update(t);
    barcodes.update(t);

    if (useBloom) composer.render();
    else renderer.render(scene, camera);
    watchFps(now);
  }
  requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) {
      clock.getDelta();
      last = performance.now(); // после паузы вкладки — без скачка
      requestAnimationFrame(frame);
    }
  });

  // Смена темы: день ↔ вечер, без перезагрузки сцены
  function setTheme(name) {
    const th = THEMES[name] ?? THEMES.light;
    scene.background.setHex(th.bg);
    scene.fog.color.setHex(th.bg);
    scene.fog.density = th.fog;
    renderer.setClearColor(th.bg, 1);
    renderer.toneMappingExposure = th.exposure;
    LOOK.hemi.color.setHex(th.hemi[0]);
    LOOK.hemi.groundColor.setHex(th.hemi[1]);
    LOOK.hemi.intensity = th.hemi[2];
    LOOK.key.intensity = th.key;
    LOOK.fill.intensity = th.fill;
    LOOK.points.forEach(([light, base]) => { light.intensity = base * th.points; });
    LOOK.strip.color.setHex(th.strip);
    LOOK.floor.color.setHex(th.floor);
    LOOK.wall.color.setHex(th.wall);
    LOOK.dock.color.setHex(th.dock);
    LOOK.deck.color.setHex(th.deck);
    LOOK.particles.color.setHex(th.particles[0]);
    LOOK.particles.opacity = th.particles[1];
    LOOK.particles.blending = name === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending;
    LOOK.particles.needsUpdate = true;
    // сетку пола проще пересоздать: её цвета зашиты в вершины
    const old = LOOK.grid;
    LOOK.grid = new THREE.GridHelper(90, 45, ...th.grid);
    LOOK.grid.position.y = 0.005;
    scene.remove(old);
    old.geometry.dispose();
    scene.add(LOOK.grid);
    bloom.strength = th.bloom;
  }

  return {
    setTheme,
    stations: KEYS.length,
    setProgress(p) { target = p; },
  };
}

// ---------- свет и пол ----------

function addLights(scene) {
  // Днём: рассеянный свет из окон + мягкое солнце; цветные точечные — слабые акценты
  const hemi = new THREE.HemisphereLight(0xfffaf0, 0xb8ad98, 1.6);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff4e0, 1.6);
  key.position.set(8, 16, 10);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe8eefc, 0.5);
  fill.position.set(-10, 8, -20);
  scene.add(fill);
  const warm = new THREE.PointLight(YELLOW, 6, 14, 1.6);
  warm.position.set(0, 4.5, -4);
  scene.add(warm);
  const dockLamp = new THREE.PointLight(0xfff0d0, 8, 14, 1.5);
  dockLamp.position.set(-6, 5, -24);
  scene.add(dockLamp);
  const cold = new THREE.PointLight(0x9cc2ff, 8, 14, 1.4);
  cold.position.set(10, 3.5, -29);
  scene.add(cold);
  Object.assign(LOOK, { hemi, key, fill, points: [[warm, 6], [dockLamp, 8], [cold, 8]] });

  // Световые полосы под потолком вдоль прохода
  const stripMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  LOOK.strip = stripMat;
  for (let z = 4; z > -18; z -= 4.5) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 3), stripMat);
    strip.position.set(0, 5.2, z);
    scene.add(strip);
  }
}

function addFloor(scene) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshStandardMaterial({ color: 0xcfc8ba, roughness: 0.9, metalness: 0.0 }) // светлый бетон
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  LOOK.floor = floor.material;

  const grid = new THREE.GridHelper(90, 45, 0xb3aa96, 0xbfb7a5);
  grid.position.y = 0.005;
  scene.add(grid);
  LOOK.grid = grid;

  // Стены и потолок склада — чтобы за кадром не было «неба»
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe2dccf, roughness: 0.95 });
  LOOK.wall = wallMat;
  const walls = [
    [[60, 8, 0.3], [0, 4, -38]],
    [[0.3, 8, 60], [-17, 4, -10]],
    [[0.3, 8, 60], [17, 4, -10]],
    [[60, 0.3, 60], [0, 8, -10]],
  ];
  for (const [size, pos] of walls) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(...size), wallMat);
    w.position.set(...pos);
    scene.add(w);
  }

  // Жёлтая разметка прохода
  const lineMat = new THREE.MeshBasicMaterial({ color: YELLOW });
  for (const x of [-1.6, 1.6]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 26), lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, 0.01, -7);
    scene.add(line);
  }
}

// ---------- стеллажи с коробками ----------

function addShelves(scene, mobile) {
  const uprightMat = new THREE.MeshStandardMaterial({ color: YELLOW, roughness: 0.5, metalness: 0.3 });
  const beamMat = new THREE.MeshStandardMaterial({ color: RED, roughness: 0.5, metalness: 0.3 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x8d8a83, roughness: 0.8 }); // сетчатый настил стеллажа
  LOOK.deck = deckMat;

  const bayLen = 2.4;
  const levels = [0.15, 1.45, 2.75, 4.05];
  const bays = [];
  // два ряда у прохода + внешние ряды, чтобы склад не обрывался в пустоту
  for (const x of [-3.2, 3.2, -7.6, 7.6]) {
    for (let z = 4; z > -14; z -= bayLen) bays.push({ x, z });
  }

  const upright = new THREE.BoxGeometry(0.09, 4.4, 0.09);
  const beam = new THREE.BoxGeometry(0.07, 0.12, bayLen);
  const deck = new THREE.BoxGeometry(1.1, 0.04, bayLen);

  const uprights = new THREE.InstancedMesh(upright, uprightMat, bays.length * 4 + 4);
  const beams = new THREE.InstancedMesh(beam, beamMat, bays.length * levels.length * 2);
  const decks = new THREE.InstancedMesh(deck, deckMat, bays.length * levels.length);
  const m = new THREE.Matrix4();
  let ui = 0, bi = 0, di = 0;
  for (const b of bays) {
    for (const dx of [-0.55, 0.55]) {
      for (const dz of [0, -bayLen]) {
        m.makeTranslation(b.x + dx, 2.2, b.z + dz);
        if (ui < uprights.count) uprights.setMatrixAt(ui++, m);
      }
    }
    for (const y of levels) {
      for (const dx of [-0.55, 0.55]) {
        m.makeTranslation(b.x + dx, y + 0.06, b.z - bayLen / 2);
        beams.setMatrixAt(bi++, m);
      }
      m.makeTranslation(b.x, y + 0.12, b.z - bayLen / 2);
      decks.setMatrixAt(di++, m);
    }
  }
  uprights.count = ui;
  scene.add(uprights, beams, decks);

  // Коробки: случайное заполнение полок
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const boxMat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
  const maxBoxes = mobile ? 220 : 440;
  const boxes = new THREE.InstancedMesh(boxGeo, boxMat, maxBoxes);
  const color = new THREE.Color();
  const palette = [0xffffff, 0xf3e6d2, 0xe8d4b4, 0xffffff, 0xd9c09a]; // оттенки поверх текстуры картона
  const rnd = mulberry32(7);
  let n = 0;
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (const b of bays) {
    for (const y of levels) {
      let z = b.z - 0.15;
      while (z > b.z - bayLen + 0.4 && n < maxBoxes) {
        if (rnd() < 0.18) { z -= 0.6; continue; }
        const w = 0.45 + rnd() * 0.35;
        const h = 0.35 + rnd() * 0.6;
        const d = 0.4 + rnd() * 0.3;
        s.set(w, h, d);
        p.set(b.x + (rnd() - 0.5) * 0.2, y + 0.14 + h / 2, z - d / 2);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (rnd() - 0.5) * 0.15);
        m.compose(p, q, s);
        boxes.setMatrixAt(n, m);
        boxes.setColorAt(n, color.setHex(palette[Math.floor(rnd() * palette.length)]));
        n++;
        z -= d + 0.08;
      }
    }
  }
  boxes.count = n;
  scene.add(boxes);
  return { boxes };
}

// ---------- ТСД со сканирующим лучом ----------

function addTSD(scene) {
  const group = new THREE.Group();
  group.name = 'ТСД-сцена';
  group.position.set(...TSD_LAYOUT.pos); // место и размер выставлены в редакторе
  const prim = new THREE.Group(); // корпус из фигур — прячется, когда загрузится модель
  group.add(prim);

  const body = new THREE.Mesh(
    new RoundedBoxGeometry(0.62, 1.25, 0.16, 4, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x1d1f24, roughness: 0.45, metalness: 0.4 })
  );
  prim.add(body);

  const grip = new THREE.Mesh(
    new RoundedBoxGeometry(0.66, 0.5, 0.2, 3, 0.05),
    new THREE.MeshStandardMaterial({ color: YELLOW, roughness: 0.6 })
  );
  grip.position.set(0, -0.42, -0.01);
  prim.add(grip);

  // Экран приглушён (color), чтобы bloom его не засвечивал
  const screenTex = new THREE.CanvasTexture(drawTsdScreen());
  screenTex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.62), new THREE.MeshBasicMaterial({ map: screenTex, color: 0x9c9c9c }));
  screen.position.set(0, 0.2, 0.082);
  prim.add(screen);

  // Кнопки клавиатуры
  const keyMat = new THREE.MeshStandardMaterial({ color: 0x3a3d45, roughness: 0.6 });
  const keyGeo = new THREE.BoxGeometry(0.1, 0.05, 0.02);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const k = new THREE.Mesh(keyGeo, keyMat);
      k.position.set(-0.14 + c * 0.14, -0.2 - r * 0.075, 0.085);
      prim.add(k);
    }
  }

  // Красный лазер сканера: из верхнего торца вперёд к коробке
  const beamMat = new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.03, 1.6, 8, 1, true), beamMat);
  beam.rotation.x = Math.PI / 2;
  beam.position.set(0, 0.64, -0.8);
  group.add(beam);
  const fanMat = new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
  const fan = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.02), fanMat);
  fan.position.set(0, 0.64, -1.6);
  group.add(fan);

  // Коробка со штрихкодом, которую сканируем
  const labelTex = new THREE.CanvasTexture(drawBarcode(256, 128, '#111', '#f4f1e8'));
  labelTex.colorSpace = THREE.SRGBColorSpace;
  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.7, 0.7),
    [0, 1, 2, 3, 4, 5].map((i) => new THREE.MeshStandardMaterial(i === 4 ? { map: labelTex } : { color: 0xa8794a, roughness: 0.9 }))
  );
  crate.name = 'Коробка со штрихкодом';
  crate.position.set(0.8, 1.15, -10.6);
  scene.add(crate);
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.9), new THREE.MeshStandardMaterial({ color: 0x8e6438, roughness: 0.9 }));
  base.name = 'Подставка под коробку';
  base.position.set(0.8, 0.4, -10.6);
  scene.add(base);

  scene.add(group);
  return {
    group,
    prim,
    update(t) {
      group.rotation.y = TSD_LAYOUT.rotY + Math.sin(t * 0.6) * 0.12;
      group.position.y = TSD_LAYOUT.pos[1] + Math.sin(t * 1.1) * 0.06;
      group.rotation.x = 0.06;
      const pulse = 0.55 + Math.abs(Math.sin(t * 3.2)) * 0.45;
      beamMat.opacity = 0.85 * pulse;
      fan.scale.x = 0.6 + Math.sin(t * 6) * 0.4;
      fanMat.opacity = 0.35 * pulse;
    },
  };
}

function drawTsdScreen() {
  const c = document.createElement('canvas');
  c.width = 320;
  c.height = 400;
  const g = c.getContext('2d');
  g.fillStyle = '#f7f6f1';
  g.fillRect(0, 0, 320, 400);
  g.fillStyle = '#ffd400';
  g.fillRect(0, 0, 320, 54);
  g.fillStyle = '#1d1d1d';
  g.font = '600 26px Inter, Arial, sans-serif';
  g.fillText('Приёмка', 16, 36);
  g.font = '18px Inter, Arial, sans-serif';
  const rows = [['Кабель ВВГ 3×2,5', '120 м'], ['Автомат 16А', '48 шт'], ['Розетка двойная', '96 шт'], ['Щит ЩРН-12', '6 шт']];
  rows.forEach(([name, qty], i) => {
    const y = 92 + i * 52;
    g.fillStyle = i === 1 ? '#fff3b0' : '#ffffff';
    g.fillRect(10, y - 30, 300, 44);
    g.fillStyle = '#1d1d1d';
    g.fillText(name, 20, y);
    g.fillStyle = '#6b6b6b';
    g.fillText(qty, 240, y);
  });
  g.fillStyle = '#e5332a';
  g.fillRect(10, 320, 300, 56);
  g.fillStyle = '#fff';
  g.font = '600 22px Inter, Arial, sans-serif';
  g.fillText('Сканируйте штрихкод', 30, 356);
  return c;
}

function drawBarcode(w, h, fg, bg) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  const rnd = mulberry32(42);
  let x = w * 0.08;
  while (x < w * 0.92) {
    const bw = 1 + Math.floor(rnd() * 4) * (w / 256);
    g.fillRect(x, h * 0.12, bw, h * 0.66);
    x += bw + 1 + Math.floor(rnd() * 3) * (w / 256);
  }
  g.font = `${Math.round(h * 0.14)}px JetBrains Mono, monospace`;
  g.fillText('4 607001 771234', w * 0.18, h * 0.93);
  return c;
}

// ---------- грузовик логиста у рампы ----------

function addTruck(scene) {
  const truck = new THREE.Group();
  truck.position.set(-7.6, 0, -23.5);
  truck.rotation.y = 0.5;

  const cargo = new THREE.Mesh(
    new RoundedBoxGeometry(2.3, 2.4, 5.2, 2, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xe9e6dd, roughness: 0.6 })
  );
  cargo.position.set(0, 1.75, 0);
  truck.add(cargo);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.28, 5.22), new THREE.MeshStandardMaterial({ color: YELLOW, roughness: 0.5 }));
  stripe.position.set(0, 1.2, 0);
  truck.add(stripe);

  const cab = new THREE.Mesh(
    new RoundedBoxGeometry(2.2, 1.9, 1.8, 3, 0.18),
    new THREE.MeshStandardMaterial({ color: RED, roughness: 0.4, metalness: 0.2 })
  );
  cab.position.set(0, 1.45, 3.55);
  truck.add(cab);

  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.7), new THREE.MeshStandardMaterial({ color: 0x1a2430, roughness: 0.1, metalness: 0.8 }));
  glass.position.set(0, 1.85, 4.46);
  truck.add(glass);

  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff1b8 });
  for (const x of [-0.75, 0.75]) {
    const hl = new THREE.Mesh(new THREE.CircleGeometry(0.13, 16), lightMat);
    hl.position.set(x, 0.85, 4.46);
    truck.add(hl);
  }

  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.35, 20);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.8 });
  for (const z of [-1.6, 0.4, 3.6]) {
    for (const x of [-1.05, 1.05]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.45, z);
      truck.add(w);
    }
  }

  // Рампа и ворота склада
  const dock = new THREE.Mesh(new THREE.BoxGeometry(6, 1.1, 2.5), new THREE.MeshStandardMaterial({ color: 0xbdb5a5, roughness: 0.9 })); // бетонная рампа
  LOOK.dock = dock.material;
  dock.position.set(-6.2, 0.55, -26.8);
  dock.rotation.y = 0.5;
  scene.add(dock);
  const gateMat = new THREE.MeshBasicMaterial({ color: YELLOW });
  for (const dx of [-1.6, 1.6]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.4, 0.12), gateMat);
    post.position.set(-6.2 + dx * Math.cos(0.5), 2.8, -26.8 - dx * Math.sin(0.5) - 0.9);
    scene.add(post);
  }

  // Палеты на погрузке
  const palletMat = new THREE.MeshStandardMaterial({ color: 0xa8794a, roughness: 0.9 });
  [[-4.6, -21.2], [-4.1, -19.8], [-5.4, -20.2]].forEach(([x, z], i) => {
    const h = 0.45 + i * 0.12; // груз на паллете: по размеру паллеты, стоит на ней
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.62, h, 0.5), palletMat);
    p.name = `Груз на паллете ${i + 1}`;
    p.position.set(x, 0.12 + h / 2, z);
    scene.add(p);
  });

  scene.add(truck);
  return {
    group: truck,
    update(t) {
      truck.position.y = Math.sin(t * 18) * 0.008; // двигатель работает
    },
  };
}

// ---------- серверная с мигающими индикаторами ----------

function addServerRoom(scene) {
  const room = new THREE.Group();
  room.position.set(10.5, 0, -31.5);
  room.rotation.y = -0.55;

  const rackMat = new THREE.MeshStandardMaterial({ color: 0x15161b, roughness: 0.5, metalness: 0.6 });
  const rackGeo = new RoundedBoxGeometry(0.9, 2.6, 1.1, 2, 0.04);
  const racks = [];
  for (let i = 0; i < 5; i++) {
    const r = new THREE.Mesh(rackGeo, rackMat);
    r.position.set(-2.4 + i * 1.2, 1.3, 0);
    room.add(r);
    racks.push(r);
  }

  // Индикаторы: инстансы с покадровой сменой цвета
  const ledGeo = new THREE.BoxGeometry(0.05, 0.03, 0.01);
  const ledMat = new THREE.MeshBasicMaterial();
  const perRack = 28;
  const leds = new THREE.InstancedMesh(ledGeo, ledMat, racks.length * perRack);
  const m = new THREE.Matrix4();
  const rnd = mulberry32(3);
  const phases = [];
  let n = 0;
  racks.forEach((r) => {
    for (let k = 0; k < perRack; k++) {
      const row = Math.floor(k / 2);
      m.makeTranslation(r.position.x - 0.3 + (k % 2) * 0.12, 0.25 + row * 0.17, 0.56);
      leds.setMatrixAt(n, m);
      leds.setColorAt(n, new THREE.Color(YELLOW));
      phases.push({ speed: 1 + rnd() * 5, offset: rnd() * 10, red: rnd() < 0.18 });
      n++;
    }
  });
  room.add(leds);

  // Подсвеченный «фальшпол»
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.2), new THREE.MeshBasicMaterial({ color: 0x2b5cff, transparent: true, opacity: 0.08 }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(0, 0.02, 1.4);
  room.add(glow);

  scene.add(room);
  const c = new THREE.Color();
  return {
    racks,
    leds,
    update(t) {
      for (let i = 0; i < phases.length; i++) {
        const ph = phases[i];
        const on = Math.sin(t * ph.speed + ph.offset) > 0.2;
        c.setHex(ph.red ? RED : YELLOW).multiplyScalar(on ? 2.2 : 0.15);
        leds.setColorAt(i, c);
      }
      leds.instanceColor.needsUpdate = true;
    },
  };
}

// ---------- частицы-штрихкоды ----------

function addBarcodeParticles(scene, count) {
  const tex = new THREE.CanvasTexture(drawBarcode(64, 64, '#ffffff', 'rgba(0,0,0,0)'));
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const rnd = mulberry32(11);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rnd() - 0.5) * 34;
    pos[i * 3 + 1] = rnd() * 9;
    pos[i * 3 + 2] = 10 - rnd() * 46;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.42, map: tex, color: 0x2f2a22, transparent: true, opacity: 0.7, // на светлом — тёмные штрихкоды
    depthWrite: false, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  LOOK.particles = mat;
  scene.add(points);
  return {
    update(t) {
      const a = geo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        a[i * 3 + 1] += 0.004 + (i % 5) * 0.0008;
        if (a[i * 3 + 1] > 9) a[i * 3 + 1] = 0;
      }
      geo.attributes.position.needsUpdate = true;
      points.rotation.y = Math.sin(t * 0.05) * 0.05;
    },
  };
}

// Детерминированный генератор: склад выглядит одинаково при каждой загрузке
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
