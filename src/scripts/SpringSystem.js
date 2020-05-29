import MeltShader from "../shaders/MeltShader";
import ComputeShader from "../shaders/ComputeShader";
import { InitFaceFilter } from "./FaceFilter";

import * as THREE from "three";
// HACK: Needed to make FBXLoader loader to work
// since it expect TREE as a global variable in a browser
if (typeof window !== "undefined") {
  window.THREE = THREE;
} else {
  global.THREE = THREE;
}
const z = require("three/examples/js/libs/inflate.min.js");
window.Zlib = z.Zlib
require("three/examples/js/loaders/FBXLoader");
require("three/examples/js/loaders/GLTFLoader");
require("three/examples/js/utils/BufferGeometryUtils");

const load = filePath =>
new Promise((resolve, reject) => {
  let loader = new THREE.GLTFLoader();
  loader.load(
    filePath,
    gltf => {
      resolve(gltf);
    },
    () => {
    },
    err => {
      reject(err);
    }
    );
  });
  
  let springMesh, computeRenderer;
  async function InitSpringSystem() {
    const mUniforms = {
      time: { value: 0 },
      shake: { value: 0 },
      mousePos: { value: new THREE.Vector3(100, 100, 100) },
      positionTex: { value: 0.0 },
      offsetTex: { value: 0.0 },
      mouthOpenAmt: { value: 0.0 },
      headRot: { value: new THREE.Quaternion() },
      lightCol: { value: new THREE.Color("#ff0776") },
      shadowCol: { value: new THREE.Color("#0150ff") }
    };
    const material = new THREE.ShaderMaterial({
      uniforms: mUniforms,
      vertexShader: MeltShader.vertex,
      fragmentShader: MeltShader.fragment,
      side: THREE.DoubleSide
    });
    
    const gltf = await load(
      "/assets/face.gltf"
      );
      let geo;
      if (gltf.scene && gltf.scene.children) {
        geo = gltf.scene.children[0].geometry;
      } else {
        geo = new THREE.TorusBufferGeometry(1, 0.6, 16, 100);
      }
      //make sure geo is an instanced geo
      // let indexGeo = THREE.BufferGeometryUtils.mergeVertices(geo)
      // let connectedVerts = GetConnectedVertices(indexGeo);

      InitSpringGeo(geo);
      springMesh = new THREE.Mesh(geo, material);
      InitFaceFilter(updateWithFaceTrackingVals);
      InitComputation();
      computeRenderer = new THREE.WebGLRenderer();
      
      return springMesh;
    }
    
    function SetPause(p) {
      paused = p;
    }
    
    function GetConnectedVertices(geometry) {
      // want an array of arrays that goes [0] --> [1,2,3]
      let connectedVerts = new Array(geometry.attributes.position.count);
  for (var i = 0; i < connectedVerts.length; i++) {
    connectedVerts[i] = [];
  }
  for (var i = 0; i < geometry.index.count; i += 3) {
    let e1 = geometry.index.array[i];
    let e2 = geometry.index.array[i + 1];
    let e3 = geometry.index.array[i + 2];
    if (!connectedVerts[e1].includes(e2)) {
      connectedVerts[e1].push(e2);
      connectedVerts[e2].push(e1);
    }
    if (!connectedVerts[e2].includes(e3)) {
      connectedVerts[e2].push(e3);
      connectedVerts[e3].push(e2);
    }
    if (!connectedVerts[e1].includes(e3)) {
      connectedVerts[e3].push(e1);
      connectedVerts[e1].push(e3);
    }
  }
  return connectedVerts;
  //velo attribute needs reference
  //each point stores a velocity,
  //[1,2,3,4].
  // lets come back to this later
}

function InitSpringGeo(geo, connectedVerts) {
  let c = geo.attributes.position.count;
  let uv2At = new Float32Array(c * 2);
  for (var i = 0; i < c; i++) {
    let y = Math.floor(i / 100);
    let x = i % 100;
    uv2At[2 * i] = x / 100;
    uv2At[2 * i + 1] = y / 100;
  }
  geo.setAttribute("uv2", new THREE.BufferAttribute(uv2At, 2));

  // let connectedV1 = new Float32Array(c * 4);
  // for (var i = 0; i < c; i++) {
  //   let i1 = connectedVerts[i][0];
  //   let i2 = connectedVerts[i][1];
  //   connectedV1[4 * i] = uv2At[2 * i1];
  //   connectedV1[4 * i + 1] = uv2At[2 * i1 + 1];
  //   connectedV1[4 * i + 2] = uv2At[2 * i2];
  //   connectedV1[4 * i + 3] = uv2At[2 * i2 + 1];
  // }
  // return new THREE.BufferAttribute(connectedV1, 4);
}

let computePosScene,
computePosCamera,
computePosShader,
computePosMesh,
positionBuffer,
positionBufferTexture,
positionDataTex;
let computeVelScene,
computeVelCamera,
computeVelShader,
computeVelMesh,
velocityBuffer,
velocityBufferTexture,
velocityDataTex;
let paused;

function InitComputation() {
  //SET UP POSITION COMPUTATION VARS
  computePosScene = new THREE.Scene();
  computePosCamera = new THREE.Camera();
  computePosCamera.position.z = 1;

  computePosShader = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      positionTex: { value: 0.0 },
      velocityTex: { value: 0.0 },
    },
    vertexShader: ComputeShader.vertexComputePosShader,
    fragmentShader: ComputeShader.fragmentComputePosShader
  });

  //initialize early positions
  positionBuffer = new Float32Array(100 * 100 * 4);
  let offsetBuffer = new Float32Array(100 * 100 * 4);
  var rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)
  for (var i = 0; i < springMesh.geometry.attributes.uv2.count; i++) {

    var newPos = new THREE.Vector3(springMesh.geometry.attributes.position.array[3 * i],
      springMesh.geometry.attributes.position.array[3 * i + 1],
      springMesh.geometry.attributes.position.array[3 * i + 2]);
    newPos.applyQuaternion(rot).multiplyScalar(20);

    positionBuffer[4 * i] =
      newPos.x;
    positionBuffer[4 * i + 1] =
      newPos.y;
    positionBuffer[4 * i + 2] =
      newPos.z;
    positionBuffer[4 * i + 3] = 1;
    var newOffset = new THREE.Vector3(springMesh.geometry.attributes.mouth.array[3 * i],
      springMesh.geometry.attributes.mouth.array[3 * i + 1],
      springMesh.geometry.attributes.mouth.array[3 * i + 2]);
    newOffset.applyQuaternion(rot).multiplyScalar(20).sub(newPos);


    offsetBuffer[4 * i] =
      newOffset.x;
    offsetBuffer[4 * i + 1] =
      newOffset.y;
    offsetBuffer[4 * i + 2] =
      newOffset.z;
    offsetBuffer[4 * i + 3] = 1;
  }

  //SET UP GEO
  computePosMesh = InitComputeMesh(computePosShader);
  computePosScene.add(computePosMesh);

  //SET UP OFFSET BUFFER
  let ores = InitComputeTexture(offsetBuffer, false);
  springMesh.material.uniforms.offsetTex.value = ores[1];

  //SET UP RENDER TARGET
  let res = InitComputeTexture(positionBuffer, true);
  positionBufferTexture = res[0];
  positionDataTex = res[1];

  //UPDATE MATERIALS ON COMPUTE + PARTICLE MESH
  computePosMesh.material.uniforms.positionTex.value = positionDataTex;
  springMesh.material.uniforms.positionTex.value = positionDataTex;

  //SET UP VELOCITY VARS
  computeVelScene = new THREE.Scene();
  computeVelCamera = new THREE.Camera();
  computeVelCamera.position.z = 1;

  computeVelShader = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      positionTex: { value: 0.0 },
      velocityTex: { value: 0.0 },
      offsetTex: { value: 0.0 },
      mouthOpenAmt: { value: 0.0 },
      time: { value: 0.0 },
      yTimeSpeed: { value: 25 + 5 * (Math.random()-0.5)},
      yDropSpeed: { value: 0.5 + 0.25 * (Math.random())},
      zSpreadSpeed: { value: 1 + 0.25 * (Math.random()-0.5)},
      seed: { value: Math.ceil(100 * Math.random()) + 1 },
      mousePos: { value: new THREE.Vector3() }
    },
    vertexShader: ComputeShader.vertexComputeVelShader,
    fragmentShader: ComputeShader.fragmentComputeVelShader
  });

  // no initial velocity values necessary, can all be 0
  velocityBuffer = new Float32Array(100 * 100 * 4);
  //SET UP GEO
  computeVelMesh = InitComputeMesh(computeVelShader);
  // computeVelMesh.geometry.setAttribute('cv1' , cv1);
  computeVelScene.add(computeVelMesh);

  //SET UP RENDER TARGET
  let res2 = InitComputeTexture(velocityBuffer, true);
  velocityBufferTexture = res2[0];
  velocityDataTex = res2[1];

  //UPDATE MATERIALS ON COMPUTE + PARTICLE MESH
  computeVelMesh.material.uniforms.offsetTex.value = ores[1];
  computeVelMesh.material.uniforms.velocityTex.value = velocityDataTex;
  computePosMesh.material.uniforms.velocityTex.value = velocityDataTex;
  computeVelMesh.material.uniforms.positionTex.value = positionDataTex;
}

function InitComputeTexture(buffer, withTarget) {
  let target, dataTexture;
  if(withTarget)
  {
    target = new THREE.WebGLRenderTarget(100, 100, {
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      type: THREE.FloatType,
    });
  }

  dataTexture = new THREE.DataTexture(
    buffer,
    100,
    100,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  dataTexture.magFilter = THREE.NearestFilter;
  dataTexture.minFilter = THREE.NearestFilter;
  dataTexture.needsUpdate = true;
  return [target, dataTexture];
}

function InitComputeMesh(shader) {
  let geo = new THREE.PlaneBufferGeometry(2, 2, 99, 99);
  let mesh = new THREE.Mesh(geo, shader);
  return mesh;
}

function UpdateSpringSystem(computeRenderer2, mouse, deltaTime) {
  if (!paused) {
    computeRenderer.clear();
    computeRenderer.setRenderTarget(velocityBufferTexture);
    computeRenderer.render(computeVelScene, computeVelCamera);
    computeRenderer.readRenderTargetPixels(
      velocityBufferTexture,
      0,
      0,
      100,
      100,
      velocityBuffer
    );
    velocityDataTex.image.data = velocityBuffer;
    velocityDataTex.needsUpdate = true;

    computeRenderer.setRenderTarget(positionBufferTexture);
    computeRenderer.render(computePosScene, computePosCamera);
    computeRenderer.readRenderTargetPixels(
      positionBufferTexture,
      0,
      0,
      100,
      100,
      positionBuffer
    );
    positionDataTex.image.data = positionBuffer;
    positionDataTex.needsUpdate = true;
    computeRenderer.setRenderTarget(null);
    computeVelMesh.material.uniforms.time.value += deltaTime/80000;
  }
  computeVelMesh.material.uniforms.mousePos.value = mouse;
}

function updateWithFaceTrackingVals(smoothEuler, mouthOpen)
{
  computeVelMesh.material.uniforms.mouthOpenAmt.value = mouthOpen;
  springMesh.material.uniforms.mouthOpenAmt.value = mouthOpen;
  springMesh.material.uniforms.headRot.value.setFromEuler(smoothEuler);
}

function ResetSpringSystem() {
  InitComputation();

}

export { InitSpringSystem, UpdateSpringSystem, SetPause, ResetSpringSystem };
