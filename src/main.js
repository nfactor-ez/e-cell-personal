import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import logoUrl from './logo.png';

/* ---------------- CONFIG ---------------- */
const CONFIG = {
  bg: 0x050106,
  colors: [0xD50B7E, 0x00F3FF, 0x9D00FF, 0xFFEA00],
  gridColor: 0x222222,
  bloomStrength: 1.5,
  bloomRadius: 0.4,
  bloomThreshold: 0,
  cubeCount: 5,
  cubeStep: 1.2
};

/* ---------------- SCENE ---------------- */
const canvas = document.querySelector('#webgl');
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.bg);
scene.fog = new THREE.Fog(CONFIG.bg, 10, 50);

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};

/* 🔑 Deployment-safe logo scroll window */
const LOGO_SCROLL_RANGE = window.innerHeight * 1.2;

const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(0, 2, 10);

/* ---------------- RENDERER ---------------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const DPR = Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.25 : 2);
renderer.setPixelRatio(DPR);
renderer.setSize(sizes.width, sizes.height);
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.physicallyCorrectLights = true;

/* ---------------- POST PROCESS ---------------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomScale = window.innerWidth < 768 ? 0.6 : 1;
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(sizes.width * bloomScale, sizes.height * bloomScale),
  CONFIG.bloomStrength,
  CONFIG.bloomRadius,
  CONFIG.bloomThreshold
);
composer.addPass(bloomPass);

/* ---------------- ASSETS ---------------- */
const texLoader = new THREE.TextureLoader();
const logoTexture = texLoader.load(logoUrl);

/* ---------------- GEOMETRY ---------------- */
const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
const edgeGeo = new THREE.EdgesGeometry(cubeGeo);

const baseMaterial = new THREE.MeshStandardMaterial({
  color: 0x111111,
  roughness: 0.1,
  metalness: 0.9,
  transparent: true
});

const edgeMaterials = CONFIG.colors.map(
  c => new THREE.LineBasicMaterial({ color: c, transparent: true })
);

/* ---------------- CUBES ---------------- */
const cubeGroup = new THREE.Group();
scene.add(cubeGroup);

const blocks = [];
const offset = (CONFIG.cubeCount * CONFIG.cubeStep) / 2 - CONFIG.cubeStep / 2;

for (let x = 0; x < CONFIG.cubeCount; x++) {
  for (let y = 0; y < CONFIG.cubeCount; y++) {
    for (let z = 0; z < CONFIG.cubeCount; z++) {
      if (x > 1 && x < 3 && y > 1 && y < 3 && z > 1 && z < 3) continue;

      const mesh = new THREE.Mesh(cubeGeo, baseMaterial);

      const px = x * CONFIG.cubeStep - offset;
      const py = y * CONFIG.cubeStep - offset;
      const pz = z * CONFIG.cubeStep - offset;

      mesh.position.set(px, py, pz);

      const edge = new THREE.LineSegments(
        edgeGeo,
        edgeMaterials[Math.floor(Math.random() * edgeMaterials.length)]
      );
      mesh.add(edge);

      mesh.userData = {
        home: new THREE.Vector3(px, py, pz),
        rotSpeed: (Math.random() - 0.5) * 0.02
      };

      cubeGroup.add(mesh);
      blocks.push(mesh);
    }
  }
}

/* ---------------- LOGO ---------------- */
/* Responsive logo size (desktop vs mobile) */
const logoSize = window.innerWidth < 768 ? 3 : 4;

const logo = new THREE.Mesh(
  new THREE.PlaneGeometry(logoSize, logoSize),
  new THREE.MeshBasicMaterial({
    map: logoTexture,
    transparent: true,
    opacity: 0,
    depthTest: false,
    toneMapped: false
  })
);
scene.add(logo);

/* ---------------- LIGHTS ---------------- */
scene.add(new THREE.AmbientLight(0xffffff, 0.2));

const coreLight = new THREE.PointLight(CONFIG.colors[1], 0, 20);
scene.add(coreLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

/* ---------------- GRID ---------------- */
const grid = new THREE.GridHelper(60, 60, CONFIG.colors[2], CONFIG.gridColor);
grid.position.y = -8;
grid.matrixAutoUpdate = false;
grid.updateMatrix();
scene.add(grid);

/* ---------------- SCROLL ---------------- */
let scroll = { total: 1, current: 0, target: 0 };
let cachedScrollY = 0;

function updateScrollMetrics() {
  scroll.total = document.documentElement.scrollHeight - window.innerHeight || 1;
}
updateScrollMetrics();

window.addEventListener('load', updateScrollMetrics);

window.addEventListener('scroll', () => {
  cachedScrollY = window.scrollY;
}, { passive: true });

/* ---------------- INPUT ---------------- */
let mouseX = 0, mouseY = 0;
window.addEventListener('pointermove', e => {
  mouseX = (e.clientX - sizes.width / 2) * 0.0005;
  mouseY = (e.clientY - sizes.height / 2) * 0.0005;
}, { passive: true });

/* ---------------- LOOP ---------------- */
const clock = new THREE.Clock();
const camTarget = new THREE.Vector3(0, 0, 0);

let isVisible = true;
document.addEventListener('visibilitychange', () => {
  isVisible = !document.hidden;
});

function tick() {
  if (!isVisible) return requestAnimationFrame(tick);

  const time = clock.getElapsedTime();

  scroll.target = Math.min(1, Math.max(0, cachedScrollY / scroll.total));
  scroll.current += (scroll.target - scroll.current) * 0.1;
  const p = scroll.current;

  let footerOffset = 0;
  let fadeOut = 1;

  if (p > 0.85) {
    const fp = (p - 0.85) / 0.15;
      footerOffset = fp * 15;
    fadeOut = 1 - fp;
  }

  const expansion = 1 + p * 6;

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const h = b.userData.home;
    const r = b.userData.rotSpeed + p * 0.02;

    b.position.set(
      h.x * expansion,
      h.y * expansion + footerOffset,
      h.z * expansion
    );

    b.rotation.x += r;
    b.rotation.y += r;
    b.material.opacity = fadeOut;
    b.children[0].material.opacity = fadeOut;
  }

  cubeGroup.rotation.y = time * 0.15;
  cubeGroup.rotation.x = Math.sin(time * 0.3) * 0.1;

  /* -------- LOGO (FIXED + MOBILE SAFE) -------- */
/* -------- LOGO (CENTERED + MOBILE SAFE) -------- */
let logoReveal = cachedScrollY / LOGO_SCROLL_RANGE;
logoReveal = Math.max(0, Math.min(logoReveal, 1));
logoReveal = logoReveal * logoReveal; // ease-in

logo.material.opacity = logoReveal * fadeOut;

/* Bloom trigger */
let bloomFactor = 0;
if (logoReveal > 0.7) {
  bloomFactor = (logoReveal - 0.7) / 0.3;
  bloomFactor = Math.min(bloomFactor, 1);
}
coreLight.intensity = bloomFactor * 10 * fadeOut;

/* 🔑 PERFECT CENTERING LOGIC */
/* -------- LOGO POSITIONING -------- */
const isMobile = window.innerWidth < 768;

// 1. Set Z to be safe (between camera and cubes)
// Camera is at z=10, Cubes are near z=0. z=4 is a safe middle ground.
logo.position.z = 4; 

// 2. Center X
logo.position.x = 0;

// 3. Handle Y offset (scroll + mobile adjustment)
// We add footerOffset to move it up/down with scroll
// We add a slight fixed value to center it visually
logo.position.y = footerOffset + (isMobile ? 0.5 : 0);

// 4. Face camera
logo.lookAt(camera.position);

  camera.position.x += (mouseX * 5 - camera.position.x) * 0.05;
  camera.position.y += (2 - mouseY * 5 - camera.position.y) * 0.05;
  camera.lookAt(camTarget);

  grid.position.z = (time * 4) % 10;
  grid.updateMatrix();

  composer.render();
  requestAnimationFrame(tick);
}

tick();

/* ---------------- RESIZE ---------------- */
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    composer.setSize(sizes.width, sizes.height);

    updateScrollMetrics();
  }, 150);
});
