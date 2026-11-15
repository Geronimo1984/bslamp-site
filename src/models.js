// Детальные 3D-модели (Sketchfab, CC Attribution — авторы в подвале сайта).
// Сцена сначала собирается из простых фигур, затем модели подгружаются и заменяют их.
// Если модель не загрузилась, остаётся простая фигура.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { applyLayout, TSD_LAYOUT } from './layout.js';

const BASE = `${import.meta.env.BASE_URL}models/`;

const loader = new GLTFLoader();
// полоска на заставке: сколько моделей уже загружено
THREE.DefaultLoadingManager.onProgress = (_url, loaded, total) => {
  document.getElementById('boot')?.style.setProperty('--p', String(Math.max(0.05, loaded / total)));
};
loader.setMeshoptDecoder(MeshoptDecoder);

// Вписать модель в нужный размер: по высоте или по длине; низ — на y = 0, центр — в начале координат.
// rotY — поворот самой модели внутри обёртки (у разных авторов «вперёд» смотрит в разные стороны).
function fit(model, { height, length, rotY = 0, centerY = false }) {
  model.rotation.y = rotY;
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const k = height ? height / size.y : length / Math.max(size.x, size.z);
  model.scale.multiplyScalar(k);
  model.updateMatrixWorld(true);
  box.setFromObject(model);
  const c = box.getCenter(new THREE.Vector3());
  model.position.x -= c.x;
  model.position.z -= c.z;
  model.position.y -= centerY ? c.y : box.min.y;
  const wrap = new THREE.Group();
  wrap.add(model);
  return wrap;
}

// Геометрия первой сетки модели в единичном кубе — для InstancedMesh (коробки, паллеты).
// Сжатые (квантованные) атрибуты сначала переводим в float, иначе преобразование их испортит.
function unitGeometry(model) {
  let mesh = null;
  model.updateMatrixWorld(true);
  model.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
  const geo = mesh.geometry.clone();
  for (const name of Object.keys(geo.attributes)) {
    const a = geo.attributes[name];
    if (a.array instanceof Float32Array && !a.normalized) continue;
    const f = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) for (let j = 0; j < a.itemSize; j++) f[i * a.itemSize + j] = a.getComponent(i, j);
    geo.setAttribute(name, new THREE.BufferAttribute(f, a.itemSize));
  }
  geo.applyMatrix4(mesh.matrixWorld);
  geo.computeBoundingBox();
  const size = geo.boundingBox.getSize(new THREE.Vector3());
  const center = geo.boundingBox.getCenter(new THREE.Vector3());
  geo.translate(-center.x, -center.y, -center.z);
  geo.scale(1 / size.x, 1 / size.y, 1 / size.z);
  geo.computeVertexNormals();
  return { geo, material: mesh.material };
}

export function loadModels(scene, refs) {
  // Сначала то, что видно на первых экранах (коробки, погрузчик, паллеты), остальное — следом.
  // На медленном интернете первый экран оживает быстрее: ТСД (1,8 МБ) не отнимает канал.
  const FIRST = ['box', 'forklift', 'pallet'];
  const firstLoads = [];
  let openGate;
  const gate = new Promise((resolve) => { openGate = resolve; });
  const load = (name) => {
    const fetchModel = () => loader.loadAsync(`${BASE}${name}.glb`).then((g) => g.scene);
    if (!FIRST.includes(name)) return gate.then(fetchModel);
    const p = fetchModel();
    firstLoads.push(p);
    return p;
  };
  const tasks = [
    // Коробки на стеллажах: та же расстановка, но с текстурой картона
    load('box').then((m) => {
      const { geo, material } = unitGeometry(m);
      refs.boxes.geometry.dispose();
      refs.boxes.geometry = geo;
      refs.boxes.material = material;
    }),

    // ТСД: модель вместо корпуса из фигур; луч сканера остаётся
    load('tsd').then((m) => {
      const model = fit(m, { height: TSD_LAYOUT.height, centerY: true, rotY: refs.tsdRotY ?? 0 });
      model.name = 'ТСД';
      refs.tsd.prim.visible = false;
      refs.tsd.group.add(model);
    }),

    // Грузовик у рампы
    load('truck').then((m) => {
      const model = fit(m, { length: 7.2, rotY: refs.truckRotY ?? 0 });
      refs.truck.name = 'Грузовик';
      refs.truck.children.forEach((c) => { c.visible = false; });
      refs.truck.add(model);
    }),

    // Серверная: стойка-модель на месте каждой стойки из фигур
    load('server').then((m) => {
      const rack = fit(m, { height: 2.6, rotY: refs.serverRotY ?? 0 });
      rack.name = 'Серверная стойка';
      refs.racks.forEach((r) => {
        r.visible = false;
        const copy = rack.clone();
        copy.position.set(r.position.x, 0, r.position.z);
        r.parent.add(copy);
      });
      // мигающие индикаторы оставляем поверх: так серверная «живая»
    }),

    // Погрузчик в проходе — новый предмет
    load('forklift').then((m) => {
      const model = fit(m, { length: 3.9, rotY: refs.forkliftRotY ?? 0 });
      model.name = 'Погрузчик';
      model.position.set(-0.55, 0, -1.2);
      model.rotation.y = 0.35;
      scene.add(model);
    }),

    // Паллеты на полу у погрузки и рядом с погрузчиком
    load('pallet').then((m) => {
      const { geo, material } = unitGeometry(m);
      const spots = [[-4.6, -21.2, 0.2], [-4.1, -19.8, -0.3], [-5.4, -20.2, 0.6], [0.9, -3.6, 0.1], [-0.9, -12.2, -0.2]];
      // каждая паллета — отдельный предмет (в редакторе двигается вместе со своим грузом)
      spots.forEach(([x, z, r], i) => {
        const pallet = new THREE.Group();
        pallet.name = `Паллета ${i + 1}`;
        pallet.position.set(x, 0, z);
        pallet.rotation.y = r;
        const mesh = new THREE.Mesh(geo, material);
        mesh.scale.set(0.85, 0.12, 0.6);
        mesh.position.y = 0.06;
        pallet.add(mesh);
        scene.add(pallet);
        const cargo = scene.getObjectByName(`Груз на паллете ${i + 1}`);
        if (cargo) pallet.attach(cargo);
      });
    }),
  ];
  Promise.allSettled(firstLoads).then(() => openGate());
  return Promise.allSettled(tasks).then((res) => {
    applyLayout(scene); // расстановка из редактора поверх начальной
    // погрузчик — колёсами на пол (в редакторе его чуть приподняло)
    const fork = scene.getObjectByName('Погрузчик');
    if (fork) fork.position.y -= new THREE.Box3().setFromObject(fork).min.y;
    res.filter((r) => r.status === 'rejected').forEach((r) => console.warn('Модель не загрузилась, осталась фигура:', r.reason));
  });
}
