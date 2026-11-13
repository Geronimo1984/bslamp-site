// Задний план склада: окна с лучами света, фермы и лампы, ворота доков, надписи, колонны, дальние ряды, мелочи.
// Всё процедурное (без моделей) и по возможности инстансами — чтобы не утяжелять сцену.
// Склад: стены x = ±17, дальняя стена z = −38, потолок y = 8; основной проход вдоль x = 0.
import * as THREE from 'three';

const YELLOW = 0xffd400;
const RED = 0xe5332a;

// ---------- текстуры на canvas ----------

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// трафаретная надпись краской по стене (прозрачный фон)
function stencil(text, { color = '#2a2824', w = 1024, h = 256, font = 'Unbounded, Arial Black, sans-serif', weight = 700 } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = color;
    g.font = `${weight} ${Math.round(h * 0.62)}px ${font}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2, w * 0.96);
  });
}

// жёлто-чёрная «зебра» безопасности
const hazardTex = () => canvasTex(256, 64, (g, w, h) => {
  g.fillStyle = '#ffd400';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#1d1c1a';
  for (let x = -h; x < w + h; x += 48) {
    g.beginPath();
    g.moveTo(x, h); g.lineTo(x + 24, h); g.lineTo(x + 24 + h, 0); g.lineTo(x + h, 0);
    g.fill();
  }
});

// рольставня: горизонтальные ламели
const shutterTex = () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#c9c4b8';
  g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 12) {
    g.fillStyle = 'rgba(0,0,0,0.13)';
    g.fillRect(0, y + 9, w, 3);
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.fillRect(0, y, w, 2);
  }
});

// луч света: мягкий вертикальный градиент, к краям прозрачный
const shaftTex = () => canvasTex(64, 256, (g, w, h) => {
  const v = g.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0, 'rgba(255,248,225,0.9)');
  v.addColorStop(1, 'rgba(255,248,225,0)');
  g.fillStyle = v;
  g.fillRect(0, 0, w, h);
  const s = g.createLinearGradient(0, 0, w, 0);
  s.addColorStop(0, 'rgba(0,0,0,1)'); s.addColorStop(0.25, 'rgba(0,0,0,0)'); s.addColorStop(0.75, 'rgba(0,0,0,0)'); s.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = s;
  g.fillRect(0, 0, w, h);
});

// табличка: цветная плашка с надписью
const signTex = (text, bg, fg = '#fff') => canvasTex(512, 160, (g, w, h) => {
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = fg;
  g.lineWidth = 8;
  g.strokeRect(10, 10, w - 20, h - 20);
  g.fillStyle = fg;
  g.font = `700 ${Math.round(h * 0.42)}px Inter, Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 4, w * 0.9);
});

function plane(tex, w, h, { transparent = true, basic = false, opacity = 1 } = {}) {
  const mat = basic
    ? new THREE.MeshBasicMaterial({ map: tex, transparent, opacity, depthWrite: !transparent })
    : new THREE.MeshStandardMaterial({ map: tex, transparent, opacity, roughness: 0.9, depthWrite: !transparent });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

export function addBackdrop(scene, { mobile }) {
  const look = {}; // что меняется при смене темы
  const anim = []; // что двигается каждый кадр

  // ---------- 1. ленточные окна под потолком + лучи света с пылинками ----------
  const winMat = new THREE.MeshBasicMaterial({ color: 0xf6f9ff });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x8c8a84, roughness: 0.6, metalness: 0.4 });
  look.win = winMat;
  const winGeo = new THREE.PlaneGeometry(3.2, 1.1);
  const mullion = new THREE.BoxGeometry(0.08, 1.2, 0.08);
  const windows = [];
  for (let z = 16; z > -36; z -= 3.6) {
    for (const side of [-1, 1]) windows.push([side * 16.84, 6.6, z, side]);
  }
  const winMesh = new THREE.InstancedMesh(winGeo, winMat, windows.length);
  const mulMesh = new THREE.InstancedMesh(mullion, frameMat, windows.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  windows.forEach(([x, y, z, side], i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), side * -Math.PI / 2);
    m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
    winMesh.setMatrixAt(i, m);
    m.makeTranslation(x - side * 0.02, y, z + 1.8);
    mulMesh.setMatrixAt(i, m);
  });
  scene.add(winMesh, mulMesh);
  // окна на дальней стене — свет в конце проходов
  for (let x = -14; x <= 14; x += 3.6) {
    const w = new THREE.Mesh(winGeo, winMat);
    w.position.set(x, 6.6, -37.8);
    scene.add(w);
  }

  // лучи: косые полупрозрачные полосы от левых окон к полу
  const shaftMat = new THREE.MeshBasicMaterial({ map: shaftTex(), transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  look.shafts = shaftMat;
  const shafts = new THREE.Group();
  for (let z = 12; z > -30; z -= 7.2) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 9), shaftMat);
    s.position.set(-12.5, 3.6, z);
    s.rotation.set(0, Math.PI / 2, 0.62); // падает внутрь склада, к проходу
    shafts.add(s);
  }
  scene.add(shafts);

  // пылинки в лучах
  const dustCount = mobile ? 120 : 320;
  const dustGeo = new THREE.BufferGeometry();
  const dp = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dp[i * 3] = -15 + Math.random() * 8;
    dp[i * 3 + 1] = Math.random() * 7;
    dp[i * 3 + 2] = 14 - Math.random() * 46;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0xfff6dc, size: 0.05, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending });
  look.dust = dustMat;
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);
  anim.push((t) => {
    const a = dustGeo.attributes.position.array;
    for (let i = 0; i < dustCount; i++) {
      a[i * 3 + 1] += Math.sin(t * 0.4 + i) * 0.0015;
      a[i * 3] += 0.0015;
      if (a[i * 3] > -7) a[i * 3] = -15;
    }
    dustGeo.attributes.position.needsUpdate = true;
  });

  // ---------- 2. фермы потолка + подвесные лампы ----------
  const steel = new THREE.MeshStandardMaterial({ color: 0x8f8d88, roughness: 0.55, metalness: 0.5 });
  look.steel = steel;
  const chord = new THREE.BoxGeometry(34, 0.14, 0.14);
  const diag = new THREE.BoxGeometry(0.07, 0.75, 0.07);
  const trussZ = [];
  for (let z = 14; z > -38; z -= 6) trussZ.push(z);
  const chords = new THREE.InstancedMesh(chord, steel, trussZ.length * 2);
  const diags = new THREE.InstancedMesh(diag, steel, trussZ.length * 34);
  let di = 0;
  trussZ.forEach((z, k) => {
    m.makeTranslation(0, 7.85, z); chords.setMatrixAt(k * 2, m);
    m.makeTranslation(0, 7.15, z); chords.setMatrixAt(k * 2 + 1, m);
    for (let x = -16.5; x < 16.5; x += 1) {
      q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), (Math.round(x) % 2 ? 1 : -1) * 0.75);
      m.compose(new THREE.Vector3(x + 0.5, 7.5, z), q, new THREE.Vector3(1, 1, 1));
      diags.setMatrixAt(di++, m);
    }
  });
  diags.count = di;
  scene.add(chords, diags);

  // лампы-«колокола» на тросах над проходами
  const shadeGeo = new THREE.ConeGeometry(0.45, 0.4, 20, 1, true);
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0x3b3a38, roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff1c9 });
  look.bulb = bulbMat;
  const cable = new THREE.BoxGeometry(0.02, 1.2, 0.02);
  const lampSpots = [];
  for (const z of trussZ) for (const x of [-5.4, 0, 5.4]) if (z < 12) lampSpots.push([x, z + 3]);
  const shades = new THREE.InstancedMesh(shadeGeo, shadeMat, lampSpots.length);
  const bulbs = new THREE.InstancedMesh(new THREE.CircleGeometry(0.34, 20), bulbMat, lampSpots.length);
  const cables = new THREE.InstancedMesh(cable, steel, lampSpots.length);
  lampSpots.forEach(([x, z], i) => {
    m.makeTranslation(x, 6.35, z); shades.setMatrixAt(i, m);
    q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    m.compose(new THREE.Vector3(x, 6.16, z), q, new THREE.Vector3(1, 1, 1)); bulbs.setMatrixAt(i, m);
    m.makeTranslation(x, 7.15, z); cables.setMatrixAt(i, m);
  });
  scene.add(shades, bulbs, cables);

  // ---------- 3. ворота доков за грузовиком ----------
  const dockWall = new THREE.Group();
  dockWall.name = 'Стена доков';
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xdcd5c7, roughness: 0.95 });
  look.dockWall = wallMat;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 0.25), wallMat);
  wall.position.set(-9, 4, -30.5);
  dockWall.add(wall);
  const hz = hazardTex();
  hz.wrapS = THREE.RepeatWrapping;
  const shutter = shutterTex();
  [-13, -9, -5].forEach((x, i) => {
    const open = i === 1; // средние ворота приоткрыты — за ними свет улицы
    const door = plane(shutter, 3.4, open ? 1.6 : 3.6, { transparent: false });
    door.position.set(x, open ? 3.0 : 1.95, -30.36);
    dockWall.add(door);
    if (open) {
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.1), new THREE.MeshBasicMaterial({ color: 0xfff8e6 }));
      glow.position.set(x, 1.1, -30.37);
      dockWall.add(glow);
      look.dockGlow = glow.material;
    }
    // рамка «зебра»
    const fr = new THREE.MeshStandardMaterial({ map: hz, roughness: 0.7 });
    for (const dx of [-1.85, 1.85]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.9, 0.12), fr);
      post.position.set(x + dx, 1.95, -30.3);
      dockWall.add(post);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.92, 0.22, 0.12), fr);
    top.position.set(x, 3.95, -30.3);
    dockWall.add(top);
    const num = plane(stencil(`ДОК 0${i + 2}`, { color: '#1f1d19' }), 2.2, 0.55);
    num.position.set(x, 4.6, -30.36);
    dockWall.add(num);
  });
  scene.add(dockWall);

  // ---------- 4. надписи на стенах ----------
  const big = plane(canvasTex(2048, 512, (g, w, h) => {
    g.fillStyle = 'rgba(31,29,25,0.82)';
    g.font = `700 ${h * 0.6}px Unbounded, Arial Black, sans-serif`;
    g.textBaseline = 'middle';
    g.textAlign = 'center';
    g.fillText('BSLamp', w / 2 + 120, h / 2);
    // лампочка-логотип
    g.save();
    g.translate(w / 2 - h * 1.55, h / 2);
    g.fillStyle = '#ffd400';
    g.beginPath(); g.arc(0, -h * 0.08, h * 0.26, 0, Math.PI * 2); g.fill();
    g.fillRect(-h * 0.12, h * 0.1, h * 0.24, h * 0.14);
    g.fillStyle = '#e5332a';
    g.fillRect(-h * 0.12, h * 0.26, h * 0.24, h * 0.07);
    g.fillStyle = '#1f1d19';
    [-0.1, -0.04, 0.02, 0.08].forEach((dx, k) => g.fillRect(dx * h, -h * 0.2, (k % 2 ? 0.025 : 0.045) * h, h * 0.22));
    g.restore();
  }), 16, 4);
  big.position.set(0, 3.4, -37.82);
  scene.add(big);
  look.bigLogo = big.material;

  const zoneLeft = plane(stencil('ЗОНА ПРИЁМКИ'), 9, 2.2);
  zoneLeft.position.set(-16.82, 4.2, -18);
  zoneLeft.rotation.y = Math.PI / 2;
  const zoneRight = plane(stencil('ЗОНА ХРАНЕНИЯ'), 9, 2.2);
  zoneRight.position.set(16.82, 4.2, -2);
  zoneRight.rotation.y = -Math.PI / 2;
  scene.add(zoneLeft, zoneRight);
  look.stencils = [zoneLeft.material, zoneRight.material];

  // подвесные таблички рядов над проходами
  [['РЯД A-06', -5.4], ['РЯД A-07', 0], ['РЯД A-08', 5.4]].forEach(([text, x]) => {
    const sign = plane(signTex(text, '#ffd400', '#1f1d19'), 1.7, 0.53, { transparent: false, basic: true });
    sign.position.set(x, 5.45, 5.2);
    const back = sign.clone();
    back.rotation.y = Math.PI;
    back.position.z -= 0.01;
    const rod = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.5, 0.02), steel);
    rod.position.set(x, 6.45, 5.2);
    scene.add(sign, back, rod);
  });

  // ---------- 5. колонны с номерами + дальние ряды стеллажей ----------
  const colMat = new THREE.MeshStandardMaterial({ color: 0xb7b3aa, roughness: 0.8 });
  look.col = colMat;
  const colBase = new THREE.MeshStandardMaterial({ map: (() => { const t = hazardTex(); t.wrapS = THREE.RepeatWrapping; t.repeat.set(1.5, 1); return t; })(), roughness: 0.7 });
  const colGeo = new THREE.BoxGeometry(0.55, 8, 0.55);
  const baseGeo = new THREE.BoxGeometry(0.6, 1.1, 0.6);
  let n = 1;
  for (const z of [10, 2, -6, -14, -22]) {
    for (const x of [-14.6, 14.6]) {
      const c = new THREE.Mesh(colGeo, colMat);
      c.position.set(x, 4, z);
      const b = new THREE.Mesh(baseGeo, colBase);
      b.position.set(x, 0.55, z);
      const label = plane(stencil(`К-${String(n++).padStart(2, '0')}`, { color: '#1f1d19', w: 256, h: 128 }), 0.5, 0.25);
      label.position.set(x - Math.sign(x) * 0.29, 2.4, z);
      label.rotation.y = -Math.sign(x) * Math.PI / 2;
      scene.add(c, b, label);
    }
  }

  // дальние ряды: упрощённые стеллажи-блоки у стен, уходят в дымку
  const farFrame = new THREE.MeshStandardMaterial({ color: 0xd8a800, roughness: 0.6 });
  const farBox = new THREE.MeshStandardMaterial({ color: 0xb48a58, roughness: 0.9 });
  const farUp = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 4.4, 0.08), farFrame, 120);
  const farBoxes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), farBox, mobile ? 120 : 240);
  let fu = 0;
  let fb = 0;
  const rnd = (() => { let s = 99; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  for (const x of [-11.8, 11.8]) {
    for (let z = 8; z > -22; z -= 2.4) {
      for (const dx of [-0.55, 0.55]) { m.makeTranslation(x + dx, 2.2, z); if (fu < 120) farUp.setMatrixAt(fu++, m); }
      for (const y of [0.15, 1.45, 2.75, 4.05]) {
        if (fb >= farBoxes.count || rnd() < 0.25) continue;
        const h = 0.5 + rnd() * 0.5;
        m.compose(new THREE.Vector3(x, y + h / 2 + 0.1, z - 1.2), new THREE.Quaternion(), new THREE.Vector3(0.9, h, 1.9));
        farBoxes.setMatrixAt(fb++, m);
      }
    }
  }
  farUp.count = fu;
  farBoxes.count = fb;
  scene.add(farUp, farBoxes);

  // ---------- 6. мелочи: огнетушители, знаки, столбики, конвейер ----------
  const extMat = new THREE.MeshStandardMaterial({ color: RED, roughness: 0.4, metalness: 0.2 });
  for (const z of [10, -6, -22]) {
    for (const x of [-14.6, 14.6]) {
      const e = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.5, 14), extMat);
      e.position.set(x - Math.sign(x) * 0.42, 1.55, z + 0.1);
      scene.add(e);
    }
  }
  const exit = plane(signTex('ВЫХОД', '#1f9d55'), 1.4, 0.44, { transparent: false, basic: true });
  exit.position.set(9, 5.1, -37.8);
  scene.add(exit);
  const careful = plane(signTex('ОСТОРОЖНО: ПОГРУЗЧИК', '#ffd400', '#1f1d19'), 2.6, 0.8, { transparent: false });
  careful.position.set(-16.8, 2.5, 6);
  careful.rotation.y = Math.PI / 2;
  scene.add(careful);

  // жёлто-чёрные столбики у рампы
  const bollardMat = new THREE.MeshStandardMaterial({ map: (() => { const t = hazardTex(); t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1); t.rotation = Math.PI / 2; return t; })(), roughness: 0.6 });
  [[-3.6, -24], [-3.6, -26.5], [-3.6, -29]].forEach(([x, z]) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.1, 16), bollardMat);
    b.position.set(x, 0.55, z);
    scene.add(b);
  });

  // конвейер вдоль левой стены зоны приёмки: по роликам едут коробки
  const conv = new THREE.Group();
  conv.name = 'Конвейер';
  const convLen = 10;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, convLen), steel);
  frame.position.y = 0.85;
  conv.add(frame);
  const legs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), steel, 12);
  let li = 0;
  for (let z = -convLen / 2 + 0.4; z < convLen / 2; z += 1.9) for (const x of [-0.5, 0.5]) { m.makeTranslation(x, 0.4, z); legs.setMatrixAt(li++, m); }
  legs.count = li;
  conv.add(legs);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.04, convLen), new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.9 }));
  belt.position.y = 0.93;
  conv.add(belt);
  const parcels = [];
  const parcelMat = new THREE.MeshStandardMaterial({ color: 0xb98a55, roughness: 0.9 });
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.5), parcelMat);
    p.position.set(0, 1.15, -convLen / 2 + i * (convLen / 4));
    conv.add(p);
    parcels.push(p);
  }
  conv.position.set(-13.4, 0, -19);
  scene.add(conv);
  anim.push((t) => {
    parcels.forEach((p, i) => {
      p.position.z = ((t * 0.6 + i * (convLen / 4)) % convLen) - convLen / 2;
    });
  });

  return {
    update(t) { anim.forEach((f) => f(t)); },
    setTheme(name) {
      const dark = name === 'dark';
      look.win.color.setHex(dark ? 0x1f2a3d : 0xf6f9ff); // днём светлые окна, вечером — синие сумерки
      look.shafts.opacity = dark ? 0 : 0.32;
      look.dust.opacity = dark ? 0.25 : 0.7;
      look.bulb.color.setHex(dark ? 0xffe9a6 : 0xfff1c9);
      look.dockWall.color.setHex(dark ? 0x2f2f34 : 0xdcd5c7);
      look.dockGlow.color.setHex(dark ? 0x6f7d96 : 0xfff8e6);
      look.col.color.setHex(dark ? 0x3d3d43 : 0xb7b3aa);
      look.steel.color.setHex(dark ? 0x55545a : 0x8f8d88);
      look.bigLogo.opacity = dark ? 0.0 : 1;
      look.stencils.forEach((mt) => { mt.opacity = dark ? 0.35 : 1; });
    },
  };
}
