import { shaderPartialCurlNoise, shaderPartialSimplexNoise } from "./CurlNoise"

const ComputeShader = {
  vertexComputePosShader: `
      uniform float time;
      uniform vec3 mousePos;

      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,

  fragmentComputePosShader: `
      uniform float time;
      uniform sampler2D positionTex;
      uniform sampler2D velocityTex;

      varying vec2 vUv;
      void main() {
        vec3 prevPos = texture2D(positionTex, vUv).xyz;
        vec3 prevVel = texture2D(velocityTex, vUv).xyz;
        prevPos += prevVel;
        gl_FragColor = vec4(prevPos, 1.);
      }
    `,
  vertexComputeVelShader: `
      uniform float time;
      uniform vec3 mousePos;
      attribute vec4 cv1;
      varying vec4 vcv1;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,

  fragmentComputeVelShader: `
       ${shaderPartialCurlNoise}
       uniform float time;
       uniform float seed;
       uniform sampler2D velocityTex;
       uniform sampler2D positionTex;
       uniform sampler2D offsetTex;
       uniform float mouthOpenAmt;

       uniform vec3 mousePos;

       uniform float yTimeSpeed; // 12 // 25
       uniform float yDropSpeed; // 1 // 0.5
       uniform float zSpreadSpeed; // 1

      varying vec4 vcv1;

      varying vec2 vUv;
      void main() {
        vec3 prevVel = texture2D(velocityTex, vUv).xyz;
        vec3 offsetPos = texture2D(offsetTex, vUv).xyz;
        vec3 prevPos = texture2D(positionTex, vUv).xyz + mouthOpenAmt *  offsetPos;

        // vec3 prevPosC1 = texture2D(positionTex, vcv1.xy).xyz;
        // vec3 prevPosC2 = texture2D(positionTex, vcv1.zw).xyz;

        // vec3 dir1 = prevPosC1 - prevPos;
        // vec3 dir2 = prevPosC2- prevPos;

        // float e1 = length(dir1) - 0.1;
        // float e2 = length(dir2) - 0.1;
        // vec3 F = -0.1 * (e1 * normalize(dir1) + e2 * normalize(dir2));


        // float magn = clamp(length(prevVel) + 0.1, 0., 10.);
        // vec3 curlVelocity = 0.005 * magn * s(0.17 * prevPos + 0.3 * time, 7.) + 0.9 * prevVel;
        vec3 z = 0.002 * (1.0 - min(length(mousePos - prevPos) / 1., 1.)) * (mousePos - prevPos); 
        z.z = 0.0;

        float magn = yDropSpeed * clamp((-prevPos.y + 3.) + yTimeSpeed * time, 0., 6.0);
        float n = s(0.05 * prevPos + 0.4 * time, seed).x;

        float magz = 0.;
        if(prevPos.y < -2.3) {
          magz = zSpreadSpeed * abs(n);
          magn = 0.;
        }

        vec3 flatMove = normalize(prevPos);
        flatMove.y = 0.;

        vec3 final = magz * flatMove + magn * abs(n) * vec3(0., -1., 0.);
        // vec3 curlVelocity = 0.001 * magn * abs(n) * vec3(0., -1., 0.) + 0.9 * prevVel;

        vec3 curlVelocity = 0.001 * final + 0.9 * prevVel + z;
        gl_FragColor = vec4(curlVelocity, 1.);
      }
    `
};

export default ComputeShader;
