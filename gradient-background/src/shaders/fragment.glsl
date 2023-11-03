precision mediump float;

varying vec3 vColor;

in vec2 vUv;

void main() {
  gl_FragColor = vec4(vColor, 1.0);
}
