import * as THREE from "three";
import Stats from "stats.js";
import SkyShader from "./shaders/SkyShader";
import TextShader from "./shaders/TextShader";
import { InitSpringSystem, UpdateSpringSystem, SetPause, ResetSpringSystem } from "./scripts/SpringSystem";
import "./style.css"

// HACK: Needed to make OBJLoader loader to work
// since it expect TREE as a global variable in a browser
if (typeof window !== "undefined") {
  window.THREE = THREE;
} else {
  global.THREE = THREE;
}
require("three/examples/js/loaders/OBJLoader");
require("three/examples/js/controls/OrbitControls");

var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

//** BASIC THREE SETUP **//
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  36,
  window.innerWidth / window.innerHeight,
  0.0001,
  100000
);
camera.position.set(0, 2, 21);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let controls;

if(isMobile)
{
  camera.position.z = 26;
} else {
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 3, 0);
  controls.enableZoom = false;
  controls.maxAzimuthAngle = Math.PI / 15;
  controls.minAzimuthAngle = -Math.PI / 15;
  controls.maxPolarAngle = Math.PI / 2 + Math.PI / 15;
  controls.minPolarAngle = Math.PI / 2 - Math.PI / 15;
  controls.update();
}

var stats = new Stats();
document.body.appendChild(stats.domElement);

// sky sphere
const mUniforms = {
  time: { value: 0 },
  paused: { value: 0 },
  shake: { value: 0 },
  mousePos: { value: new THREE.Vector3(100, 100, 100) },
  positionTex: { value: 0.0 },
  lightCol: { value: new THREE.Color("#ff0776") },
  shadowCol: { value: new THREE.Color("#0150ff") },
};

const skyMat = new THREE.ShaderMaterial({
  uniforms: mUniforms,
  vertexShader: SkyShader.vertex,
  fragmentShader: SkyShader.fragment,
  side: THREE.DoubleSide
});
const skySphere = new THREE.Mesh(new THREE.PlaneBufferGeometry(60, 60), skyMat);
skySphere.position.set(0, 0, -10)
scene.add(skySphere)

//"UI" elements 
let objLoader = new THREE.OBJLoader();
objLoader.load("assets/ground_rect.obj", (tex) => {
  let mesh = tex.children[0];
  mesh.material = new THREE.MeshBasicMaterial();
  mesh.position.y = -2.5;
  scene.add(mesh);
});

objLoader.load("assets/frame_rect.obj", (tex) => {
  let mesh = tex.children[0];
  mesh.material = new THREE.MeshBasicMaterial();
  mesh.position.y = 3.5;
  mesh.scale.multiplyScalar(1.04);
  scene.add(mesh);
});

const tUniforms = {
  time: { value: 0 },
  mousePos: { value: new THREE.Vector3(100, 100, 100) },
};

const buttonMat = new THREE.ShaderMaterial({
  uniforms: tUniforms,
  vertexShader: TextShader.vertexShader,
  fragmentShader: TextShader.fragmentShader,
});

let buttonBoundingBoxes = [];
["assets/melt_text.obj", "assets/pause_text.obj", "assets/reset_text.obj"].forEach((path) => {
  objLoader.load(path, (tex) => {
    let mesh = tex.children[0];
    mesh.material = buttonMat;
    mesh.position.y = 3.5;
    mesh.scale.multiplyScalar(1.04)
    mesh.geometry.computeBoundingBox()
    mesh.geometry.boundingBox.min.y += 3.5;
    mesh.geometry.boundingBox.max.y += 3.5;
    mesh.geometry.boundingBox.min.multiplyScalar(1.04)
    mesh.geometry.boundingBox.max.multiplyScalar(1.04)
    buttonBoundingBoxes.push(mesh)
    scene.add(mesh);
  });
})
let buttonFunctions = [() => { togglePause(false) }, () => { togglePause(true) }, () => { reset() }]

//** LOAD ASSET WITH GLITCH MATERIAL **//
let meltMesh;
InitSpringSystem().then((mesh) => {
  meltMesh = mesh;
  scene.add(meltMesh);
});

//** INTERACTIVE **//
let mouse = new THREE.Vector3(100, 100, 100);
let tMouse = new THREE.Vector3(100, 100, 100);
let dMouse = new THREE.Vector3(100, 100, 100);
const worldMouse = new THREE.Vector3();

let raycaster = new THREE.Raycaster();
const handleMouseMove = event => {
  event.preventDefault();
  if(event.changedTouches)
  {
    tMouse.x = (event.changedTouches[0].clientX / window.innerWidth) * 2 - 1;
    tMouse.y = -(event.changedTouches[0].clientY / window.innerHeight) * 2 + 1;
  } else 
  {
    tMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    tMouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
  }

  dMouse.x = tMouse.x - mouse.x;
  dMouse.y = tMouse.y - mouse.y;
  
  mouse.copy(tMouse);

  worldMouse.set(mouse.x, mouse.y, 0.5);
  worldMouse.unproject(camera);
  worldMouse.sub(camera.position).normalize();
  var distance = - camera.position.z / worldMouse.z;
  worldMouse.multiplyScalar(distance).add(camera.position)
  worldMouse.z = 0;
  handleButtonRaycast(false);
  // customControlUpdate();
};
let mouseDown;
const handleMouseDown = event => {
  event.preventDefault();
  handleButtonRaycast(true);
  mouseDown = true;
};
const handleMouseUp = event => {
  mouseDown = false;
};
document.body.addEventListener("mousemove", handleMouseMove);
document.body.addEventListener("mousedown", handleMouseDown);
document.body.addEventListener("mouseup", handleMouseUp);

document.body.addEventListener('touchmove', handleMouseMove, { passive: false, capture: true });
document.body.addEventListener("touchstart", handleMouseDown, { passive: false, capture: true });
document.body.addEventListener("touchend", handleMouseUp, { passive: false, capture: true });

let paused;
let cameraShakeTime = 0;
function handleKeyDown(evt) {
  if (evt.key == "p") {
    togglePause(true);
  }
  if (evt.key == "m") {
    togglePause(false);
  }
  if (evt.key == "r") {
    reset();
  }
}
let colorIndex = 1;
function reset() {
  ResetSpringSystem();
  cameraShakeTime = currentTime + 400;
  colorIndex ++;
  let idx = colorIndex % colorPalettes.length;
  meltMesh.material.uniforms.lightCol.value = colorPalettes[idx].light;
  meltMesh.material.uniforms.shadowCol.value = colorPalettes[idx].shadow;
  skySphere.material.uniforms.lightCol.value = colorPalettes[idx].light;
}

let colorPalettes = [
  { shadow: new THREE.Color("#ff08ff"), light: new THREE.Color("#09e8ff") },
  { shadow: new THREE.Color("#0150ff"), light: new THREE.Color("#ff0776") },
  { shadow: new THREE.Color("#ff0776"), light: new THREE.Color("#ff08ff") },
  { shadow: new THREE.Color("#09e8ff"), light: new THREE.Color("#5d0aff") }
]

function togglePause(pause) {
  paused = pause;
  skySphere.material.uniforms.paused.value = (paused) ? 1 : 0;
  SetPause(paused);
  cameraShakeTime = currentTime + 400;
}
window.addEventListener("keydown", handleKeyDown);


function handleButtonRaycast(mouseDown) {
  raycaster.setFromCamera(mouse, camera);
  let intersecting = false;
  buttonBoundingBoxes.forEach((bb, index) => {
    if (raycaster.ray.intersectsBox(bb.geometry.boundingBox) === true) {
      intersecting = true;
      if (mouseDown) {
        buttonFunctions[index]();
      }
    }
    document.body.style.cursor = (intersecting) ? "pointer" : "default";
  })
}


function shakeCamera() {
  if (!meltMesh) return;
  if (currentTime < cameraShakeTime) {
    meltMesh.material.uniforms.shake.value = (currentTime - cameraShakeTime) / 1000;
  } else {
    meltMesh.material.uniforms.shake.value = 0;
  }
}

let startTime = Date.now();
let currentTime;
function animate() {
  stats.begin();
  let deltaTime = Date.now() - currentTime - startTime;
  currentTime = Date.now() - startTime;
  if (meltMesh) {
    UpdateSpringSystem(renderer, worldMouse, deltaTime);
    if (!paused || (currentTime < cameraShakeTime)) {
      meltMesh.material.uniforms.time.value += deltaTime / 2000;
      meltMesh.material.uniforms.mousePos.value.copy(worldMouse)
    }
    skySphere.material.uniforms.time.value += deltaTime / 2000;

    buttonBoundingBoxes.forEach((bb) => {
      bb.material.uniforms.mousePos.value.copy(worldMouse)
      bb.material.uniforms.time.value += deltaTime / 10000;
    })
  }
  shakeCamera();
  requestAnimationFrame(animate);
  if(!isMobile) {
    controls.update();
  }
  renderer.render(scene, camera);
  stats.end();

}
animate();
