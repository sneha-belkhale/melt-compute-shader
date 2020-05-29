const TextShader = {

  vertexShader: `
  vec3 lerp (vec3 a, vec3 b, float t) {
      return (1. - t) * a + t * b;
  }
  float lerp (float a, float b, float t) {
      return (1. - t) * a + t * b;
  }
  float noise_hash_alt(vec3 p)
  {
      p = fract(p * 0.3183099 + .1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise_alt (vec3 x)
  {
      vec3 p = floor(x);
      vec3 f = fract(x);
      f = f * f * (3. - 2. * f);

      return lerp(lerp(lerp(noise_hash_alt(p), noise_hash_alt(p + vec3(1.0, 0, 0)), f.x),
          lerp(noise_hash_alt(p + vec3(0, 1.0, 0)), noise_hash_alt(p + vec3(1.0, 1.0, 0)), f.x), f.y),
          lerp(lerp(noise_hash_alt(p + vec3(0, 0, 1.0)), noise_hash_alt(p + vec3(1.0, 0, 1.0)), f.x),
              lerp(noise_hash_alt(p + vec3(0, 1.0, 1.0)), noise_hash_alt(p + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
  }


    varying float glitchColorAmt;
    uniform float time;
    uniform vec3 mousePos;
    void main() {
      float glitchNoise = noise_alt(position.xyz + 10. * vec3(sin(time), cos(time), -sin(time))) - 0.5;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      glitchColorAmt = 1.0 - min(length(mousePos - worldPos.xyz) / 2., 1.);
      worldPos.x += glitchColorAmt * glitchNoise;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,

  fragmentShader: `
    varying float glitchColorAmt;
    uniform float time;

    vec3 lerp (vec3 a, vec3 b, float t) {
        return (1. - t) * a + t * b;
    }
    void main() {
      float rgbAmount = glitchColorAmt;
      vec3 fractBy3 = vec3(
          floor(fract(7. * time) + 0.5),
          floor(fract(7. * time+0.3) + 0.5),
          floor(fract(7. * time+0.6) + 0.5)
      );
      gl_FragColor = vec4(1.,1.,1.,1.);
      // gl_FragColor.rgb = lerp(gl_FragColor.rgb, fractBy3, rgbAmount);
    }
  `,
};

export default TextShader;
