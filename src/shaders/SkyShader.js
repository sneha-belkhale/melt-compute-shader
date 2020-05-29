import {shaderPartialCurlNoise, shaderPartialSimplexNoise} from "./CurlNoise"

const SkyShader = {

    vertex: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }
      `,

      fragment: `
      ${shaderPartialCurlNoise}

      varying vec2 vUv;

      uniform vec3 lightCol;
      uniform vec3 shadowCol;

      uniform sampler2D envMap;

      void main() {
        float lerp = vUv.y;
        float width = 0.3;
        if(vUv.x < width || vUv.x > 1.0 - width) {
          lerp = 1.0 - lerp;
        }
        gl_FragColor = vec4(mix(2.0 * lightCol,lightCol, lerp), 1.0);
      }
    `,
  };

  export default SkyShader;
