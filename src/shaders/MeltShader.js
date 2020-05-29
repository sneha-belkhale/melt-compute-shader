const MeltShader = {

    vertex: `
      uniform float time;
      uniform float shake;
      uniform float mouthOpenAmt;
      uniform vec4 headRot;
      uniform vec3 mousePos;
      uniform sampler2D positionTex;
      uniform sampler2D offsetTex;
      
      attribute vec2 uv2;
      
      varying vec3 vNormal;
      varying vec3 vPos;


      vec3 rotate_vertex(vec3 position, vec4 quat)
      { 
        vec3 v = position.xyz;
        return v + 2.0 * cross(quat.xyz, cross(quat.xyz, v) + quat.w * v);
      }

      void main() {
        vec3 offset = texture2D(offsetTex, uv2).xyz;
        vec3 newPos = texture2D(positionTex, uv2).xyz+ mouthOpenAmt * offset;
        newPos = rotate_vertex(newPos, clamp(0.3 * (newPos.y + 2.0), 0.0, 1.0) * headRot);
        vNormal = normal;

        float z = 1.0 - min(length(mousePos - newPos) / 2., 1.);
        newPos.x += 2.5 * (shake+z) * sin(30. * (normal.x + time));

        gl_Position = projectionMatrix * modelViewMatrix * vec4( newPos, 1.0 );
      }
      `,

      fragment: `
      uniform float time;
      varying vec3 vNormal;
      varying vec3 vPos;

      uniform vec3 lightCol;
      uniform vec3 shadowCol;

      void main() {

        vec3 lightDir = normalize(vec3(0.7,-1.0,0.3));
        float dir = 1. - dot(vNormal,lightDir);

        gl_FragColor += mix(vec4(lightCol, 1.), vec4(shadowCol, 1.), min(dir, 1.0));
        gl_FragColor.z += 0.1 * step(fract(dir + 2.0 * time), 0.5);

      }
    `,
  };

  export default MeltShader;
