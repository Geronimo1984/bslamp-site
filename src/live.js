// «Живой склад»: текст сайта остаётся плоским и читаемым, а склад отвечает на то, что человек читает.
// Каждой части сайта — своё событие в 3D, короткое и без слов длиннее двух-трёх:
//   услуги  — на стеллаже по очереди загораются таблички мест 01–06, наведение на услугу подсвечивает её табличку;
//   кейсы   — ТСД сканирует коробку, над ней всплывает «✓ принято» (и при каждом переключении кейса);
//   этапы   — табло над доком считает отгрузку 0/6 → 6/6 по мере появления этапов;
//   о нас   — над стойками горит «1С · онлайн» с пульсирующей точкой;
//   заявка  — табло «Заявка · черновик», после «Провести» — «проведена ✓» и вспышка света.
const YELLOW = '#ffd400';
const INK = '#1f1d19';
// «готово» — жёлтый на графите (два акцента сайта: жёлтый — действие и готово, красный — тонкие линии)
const DONE = YELLOW;
const FONT = 'Unbounded, Arial Black, sans-serif';
const MONO = '"JetBrains Mono", Menlo, monospace';

export function initLive(scene3d, { lang, reduced }) {
  const { THREE, scene } = scene3d;
  const ru = lang === 'ru';

  // холст → текстура; draw вызывается заново при каждом обновлении табло
  function board(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    // save/restore: выравнивание и шрифт прошлой отрисовки не переносятся в следующую
    const redraw = (...a) => { g.clearRect(0, 0, w, h); g.save(); draw(g, w, h, ...a); g.restore(); tex.needsUpdate = true; };
    return { tex, redraw };
  }
  function plate(tex, w, h) {
    // fog: false — дымка склада не «съедает» табло, они читаются как светящиеся экраны
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, fog: false });
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  }
  // табло висит на двух тросах и повёрнуто к кадру своей локации (stations: 0 вход … 5 заявка)
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x2c2b29 });
  const cableGeo = new THREE.BoxGeometry(0.015, 1, 0.015);
  function hang(mesh, pos, station) {
    if (!mesh.userData.cables) {
      const w = mesh.geometry.parameters.width;
      mesh.userData.cables = [-w * 0.4, w * 0.4].map((dx) => {
        const c = new THREE.Mesh(cableGeo, cableMat);
        c.position.x = dx;
        mesh.add(c);
        return c;
      });
      scene.add(mesh);
    }
    mesh.position.set(...pos);
    const cam = new THREE.Vector3(...scene3d.keys[station].pos);
    mesh.lookAt(cam.x, pos[1], cam.z); // только поворот вокруг вертикали — табло не заваливается
    const h = mesh.geometry.parameters.height;
    const len = Math.max(0.1, 7.9 - pos[1] - h / 2);
    for (const c of mesh.userData.cables) {
      c.scale.y = len;
      c.position.set(c.position.x, h / 2 + len / 2, -0.01);
    }
  }

  // табло в кадре своей локации: точка экрана (ndc −1…1) на расстоянии dist от камеры этого кадра.
  // Пересчитывается при изменении окна — на узком экране табло сдвигается внутрь и не обрезается краем
  const frameCam = new THREE.PerspectiveCamera();
  const phoneFov = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  const narrow = matchMedia('(max-width: 1020px)').matches;
  const tmpV = new THREE.Vector3();
  const framed = [];
  function placeInFrame(cfg) {
    const { mesh, station, x, y, dist } = cfg;
    const st = scene3d.keys[station];
    frameCam.fov = (st.fov || 50) * (phoneFov ? 62 / 50 : 1); // на телефоне сцена шире по углу (как в scene.js)
    frameCam.aspect = innerWidth / innerHeight;
    frameCam.position.set(...st.pos);
    frameCam.lookAt(...st.look);
    frameCam.updateProjectionMatrix();
    frameCam.updateMatrixWorld();
    mesh.scale.setScalar(cfg.scale ?? 1);
    const halfW = (mesh.geometry.parameters.width * (cfg.scale ?? 1)) / 2;
    const at = (nx) => tmpV.set(nx, y, 0.5).unproject(frameCam).sub(frameCam.position).normalize().multiplyScalar(dist).add(frameCam.position).clone();
    // сдвигаем внутрь, пока правый край табло (с запасом на покачивание камеры мышью) не окажется в кадре
    let nx = x;
    for (let k = 0; k < 40; k++) {
      const c = at(nx);
      const right = c.clone().add(new THREE.Vector3(frameCam.matrixWorld.elements[0], 0, frameCam.matrixWorld.elements[2]).normalize().multiplyScalar(halfW)).project(frameCam);
      if (right.x <= 0.86 || nx < -0.8) break;
      nx -= 0.02;
    }
    hang(mesh, at(nx).toArray(), station);
  }
  function frameBoard(cfg) {
    if (narrow && cfg.narrow) Object.assign(cfg, cfg.narrow); // узкий экран: своё место табло (верхняя часть кадра)
    framed.push(cfg);
    placeInFrame(cfg);
  }
  scene3d.onResize?.(() => framed.forEach(placeInFrame));

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.roundRect(x, y, w, h, r);
  }

  // ---------- 1. таблички мест 01–06 на стеллаже (услуги) ----------
  // флажки торчат из правого стеллажа в проход и смотрят на камеру — как настоящие адресные таблички
  const SLOT_Z = [3.0, 1.2, -0.6, -2.4, -4.2, -6.0];
  const slots = SLOT_Z.map((z, i) => {
    const num = String(i + 1).padStart(2, '0');
    const b = board(256, 160, (g, w, h, on) => {
      roundRect(g, 4, 4, w - 8, h - 8, 18);
      g.fillStyle = on ? YELLOW : '#3a3833';
      g.fill();
      g.fillStyle = on ? INK : '#8b877d';
      g.font = `700 ${h * 0.5}px ${FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(num, w / 2, h / 2 + 4);
    });
    b.redraw(false);
    const m = plate(b.tex, 0.5, 0.31);
    m.position.set(2.32, 3.35, z);
    // крепление к стойке стеллажа
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.03), new THREE.MeshStandardMaterial({ color: 0x2c2b29 }));
    arm.position.set(0.28, 0.17, 0);
    m.add(arm);
    scene.add(m);
    return { m, b, on: false, hot: 0 };
  });
  function setSlot(i, on) {
    const s = slots[i];
    if (!s || s.on === on) return;
    s.on = on;
    s.b.redraw(on);
  }
  let slotTimers = [];
  function slotsOn(on) {
    slotTimers.forEach(clearTimeout);
    slotTimers = slots.map((_, i) => setTimeout(() => setSlot(i, on), reduced ? 0 : (on ? 140 + i * 170 : 0)));
  }
  // глава «Услуги»: горят таблички до текущей, текущая крупнее (k = 6 — все горят, «также делаем»)
  let chapterMode = false;
  function focusSlot(k) {
    chapterMode = true;
    slotTimers.forEach(clearTimeout);
    slots.forEach((sl, i) => { setSlot(i, i <= k); sl.focus = i === k; });
  }
  // наведение на услугу — её табличка «подпрыгивает»
  document.addEventListener('pointerover', (e) => {
    const li = e.target.closest?.('.svc-list .svc');
    if (!li) return;
    const i = [...li.parentElement.children].indexOf(li);
    if (slots[i]) slots[i].hot = 1;
  });

  // ---------- 2. сканирование коробки ТСД (кейсы) ----------
  const tick = board(512, 160, (g, w, h) => {
    roundRect(g, 6, 6, w - 12, h - 12, 40);
    g.fillStyle = INK;
    g.fill();
    g.fillStyle = YELLOW;
    g.font = `700 ${h * 0.4}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(ru ? '✓ Принято' : '✓ Received', w / 2, h / 2 + 3);
  });
  tick.redraw();
  // значок рисуется поверх всего (depthTest: false) и левее ТСД — не «проходит» сквозь модель
  const tickSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tick.tex, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false }));
  tickSprite.scale.set(1.3, 0.4, 1);
  tickSprite.material.fog = false;
  tickSprite.renderOrder = 10;
  tickSprite.visible = false;
  scene.add(tickSprite);
  const crate = scene.getObjectByName('Коробка со штрихкодом');
  const CRATE = crate ? crate.position.clone() : new THREE.Vector3(0.8, 1.15, -10.6);
  let scanAt = -1;
  const scan = () => { scanAt = performance.now(); };

  // ---------- 3. табло отгрузки над доком 04 (этапы) ----------
  const ship = board(1024, 256, (g, w, h, n) => {
    roundRect(g, 0, 0, w, h, 26);
    g.fillStyle = '#1f1d19';
    g.fill();
    const done = n >= 6;
    g.fillStyle = done ? DONE : '#f3efe6';
    g.font = `700 ${h * 0.24}px ${MONO}`;
    g.textBaseline = 'middle';
    g.fillText(done ? (ru ? 'ОТГРУЖЕНО ✓' : 'SHIPPED ✓') : (ru ? 'ОТГРУЗКА' : 'SHIPPING'), 48, h * 0.32);
    g.textAlign = 'right';
    g.fillStyle = '#f3efe6';
    g.fillText(`${n} / 6`, w - 48, h * 0.32);
    // шесть сегментов — шесть этапов
    for (let k = 0; k < 6; k++) {
      g.fillStyle = k < n ? YELLOW : '#3a3833';
      g.fillRect(48 + k * ((w - 96) / 6), h * 0.62, (w - 96) / 6 - 14, h * 0.18);
    }
  });
  ship.redraw(0);
  const shipBoard = plate(ship.tex, 2.2, 0.55);
  frameBoard({ mesh: shipBoard, station: 3, x: 0.48, y: 0.5, dist: 5.8, narrow: { x: -0.32, y: 0.05, dist: 3.6, scale: 0.7 } }); // справа вверху кадра этапов
  let shipN = 0;
  let shipTimer = null;
  function shipTo(n) {
    clearInterval(shipTimer);
    if (reduced) { shipN = n; ship.redraw(n); return; }
    shipTimer = setInterval(() => {
      if (shipN === n) return clearInterval(shipTimer);
      shipN += Math.sign(n - shipN);
      ship.redraw(shipN);
    }, 260);
  }

  // ---------- 4. статус базы над серверными стойками (о нас) ----------
  // текстура рисуется один раз; пульсирует отдельный кружок (без перерисовки холста каждый кадр)
  const status = board(1024, 220, (g, w, h) => {
    roundRect(g, 0, 0, w, h, 26);
    g.fillStyle = INK;
    g.fill();
    g.fillStyle = '#f3efe6';
    g.font = `700 ${h * 0.3}px ${MONO}`;
    g.textBaseline = 'middle';
    g.fillText(ru ? '1С · ОНЛАЙН' : '1C · ONLINE', 136, h / 2);
  });
  status.redraw();
  const statusBoard = plate(status.tex, 1.3, 0.28);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xffd400, transparent: true, toneMapped: false });
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.045, 20), dotMat);
  const sw = statusBoard.geometry.parameters.width;
  dot.position.set(-sw / 2 + (78 / 1024) * sw, 0, 0.005); // точка — на месте кружка в текстуре
  statusBoard.add(dot);
  frameBoard({ mesh: statusBoard, station: 4, x: 0.5, y: 0.5, dist: 3.4, narrow: { x: 0.1, y: 0.55, dist: 3.4 } }); // перед стойками (до них ~5,5 м), в кадре «О нас»

  // ---------- 5. табло заявки (заявка) ----------
  const orderB = board(1024, 256, (g, w, h, posted) => {
    roundRect(g, 0, 0, w, h, 26);
    g.fillStyle = posted ? YELLOW : INK;
    g.fill();
    g.fillStyle = posted ? INK : YELLOW;
    g.font = `700 ${h * 0.26}px ${MONO}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(posted ? (ru ? 'ЗАЯВКА ПРОВЕДЕНА ✓' : 'REQUEST POSTED ✓') : (ru ? 'ЗАЯВКА · ЧЕРНОВИК' : 'REQUEST · DRAFT'), w / 2, h / 2);
  });
  orderB.redraw(false);
  const orderBoard = plate(orderB.tex, 2.0, 0.5);
  hang(orderBoard, [2.33, 4.85, -8.23], 5); // над стеллажом (верх 4,4 м), в 1,7 м от пути камеры
  let flashAt = -1;
  document.addEventListener('order:posted', () => { orderB.redraw(true); flashAt = performance.now(); });

  // ---------- передний план: подвесные лампы у самого пути камеры ----------
  // ставятся между кадрами локаций, в 1,3 м сбоку от пути и выше глаз — проплывают у края кадра и дают глубину
  if (scene3d.curve) {
    const shadeMat = new THREE.MeshStandardMaterial({ color: 0x2c2b29, roughness: 0.5, metalness: 0.4 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff1b0, toneMapped: false });
    const shadeGeo = new THREE.ConeGeometry(0.28, 0.26, 20, 1, true);
    const bulbGeo = new THREE.SphereGeometry(0.07, 12, 8);
    const up = new THREE.Vector3(0, 1, 0);
    [0.09, 0.26, 0.42, 0.58, 0.75, 0.92].forEach((tt, k) => {
      const p = scene3d.curve.getPoint(tt);
      const side = new THREE.Vector3().crossVectors(scene3d.curve.getTangent(tt), up).normalize();
      const pos = p.clone().addScaledVector(side, k % 2 ? 1.3 : -1.3);
      const y = Math.min(6.4, p.y + 1.1);
      const lamp = new THREE.Group();
      lamp.name = `Лампа переднего плана ${k + 1}`;
      lamp.position.set(pos.x, y, pos.z);
      const len = 7.9 - y;
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, len, 6), cableMat);
      cord.position.y = len / 2 + 0.13;
      const shade = new THREE.Mesh(shadeGeo, shadeMat);
      shade.material.side = THREE.DoubleSide;
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.y = -0.1;
      lamp.add(cord, shade, bulb);
      scene.add(lamp);
    });
  }

  // ---------- кадр: плавные мелочи ----------
  scene3d.onFrame((t) => {
    const now = performance.now();
    for (const s of slots) {
      s.hot = Math.max(0, s.hot - 0.03);
      s.zoom = (s.zoom ?? 1) + ((s.focus ? 1.1 : 1) - (s.zoom ?? 1)) * 0.12;
      s.m.scale.setScalar(s.zoom + s.hot * 0.25);
    }
    if (scanAt > 0) {
      const p = (now - scanAt) / 1400;
      tickSprite.visible = p < 1;
      if (p >= 1) scanAt = -1;
      else {
        tickSprite.position.set(CRATE.x - 0.45, CRATE.y + 0.5 + p * 0.3, CRATE.z + 0.3);
        tickSprite.material.opacity = p < 0.15 ? p / 0.15 : 1 - Math.max(0, (p - 0.6) / 0.4);
      }
    }
    if (active === 'p-server' || active === 'about') dotMat.opacity = 0.35 + 0.65 * (Math.sin(t * 3) + 1) / 2;
    if (flashAt > 0) {
      const p = (now - flashAt) / 900;
      scene3d.setExposure(p >= 1 ? 1 : 1 + 0.6 * Math.sin(p * Math.PI));
      if (p >= 1) flashAt = -1;
    }
  });

  // ---------- смена раздела ----------
  let active = null;
  let scanTimer = null;
  function setSection(id) {
    if (id === active) return;
    active = id;
    if (!chapterMode || id !== 'services') slotsOn(id === 'p-forklift' || id === 'services');
    if (id !== 'services') slots.forEach((sl) => { sl.focus = false; });
    clearInterval(scanTimer);
    if (id === 'p-tsd' || id === 'cases') {
      scan();
      scanTimer = setInterval(scan, 3200);
    }
    if (id === 'p-truck') shipTo(0);
    if ((id === 'process' && !shipManual) || id === 'p-server') shipTo(6);
  }
  // переключение кейса — новое сканирование
  document.addEventListener('click', (e) => {
    if (e.target.closest?.('.journal-row, .case-view button')) scan();
  });

  // глава «Этапы» сама ведёт табло: n — сколько этапов пройдено
  let shipManual = false;
  function setShip(n) { shipManual = true; shipTo(n); }
  return { setSection, focusSlot, scan, setShip };
}
