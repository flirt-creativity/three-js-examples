/* eslint-disable unicorn/numeric-separators-style */
/* eslint-disable unicorn/number-literal-case */
import * as T from 'three';
// eslint-disable-next-line import/no-unresolved
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

import fragment from '../shaders/fragment.glsl';
import vertex from '../shaders/vertex.glsl';

const vectorPaths = [
  {
    data: '<svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60.56 89.15"><path d="m53.73,11.97C48.47,4.72,39.93,0,30.28,0S12.09,4.72,6.82,11.97H0v65.21h6.82c5.27,7.25,13.81,11.97,23.46,11.97s18.19-4.72,23.46-11.97h6.82V11.97h-6.82Z" style="fill:none; stroke-width:0px;"/></svg>'
  }
];

const stokeMaterial = new T.LineBasicMaterial({
  color: 'red'
});

var colors = [
  {
    stop: 0,
    color: new T.Color(0xf7b000)
  },
  {
    stop: 0.25,
    color: new T.Color(0xdd0080)
  },
  {
    stop: 0.5,
    color: new T.Color(0x622b85)
  },
  {
    stop: 0.75,
    color: new T.Color(0x007dae)
  },
  {
    stop: 1,
    color: new T.Color(0x77c8db)
  }
];

const renderSVG = (svg) => {
  const loader = new SVGLoader();
  const svgData = loader.parse(svg);
  const svgGroup = new T.Group();

  svgGroup.scale.y *= -1;
  for (const path of svgData.paths) {
    const shapes = SVGLoader.createShapes(path);

    for (const shape of shapes) {
      const meshGeometry = new T.ExtrudeGeometry(shape, {
        depth: 1,
        bevelEnabled: true,
        bevelSegments: 1,
        steps: 1,
        bevelSize: 1,
        bevelThickness: 1,
        curveSegments: 25
      });

      meshGeometry.computeBoundingBox();
      var bbox = meshGeometry.boundingBox;
      var bboxSize = new T.Vector3().subVectors(bbox.max, bbox.min);

      // Access the position attribute
      const positionAttribute = meshGeometry.getAttribute('position');
      const vertexColors = [];
      const color = new T.Color();

      // Iterate over each vertex and assign color based on its y position
      for (let index = 0; index < positionAttribute.count; index++) {
        const vertex = new T.Vector3();
        vertex.fromBufferAttribute(positionAttribute, index);
        const y = (vertex.y - bbox.min.y) / bboxSize.y;

        // Determine which color stops this y value falls between
        let startIndex = 0;
        for (let index = 0; index < colors.length - 1; index++) {
          if (y >= colors[index].stop && y < colors[index + 1].stop) {
            startIndex = index;
            break;
          }
        }

        // Linearly interpolate the color between the two stops
        const startColor = colors[startIndex].color;
        const endColor = colors[startIndex + 1].color;
        const scale =
          (y - colors[startIndex].stop) /
          (colors[startIndex + 1].stop - colors[startIndex].stop);
        color.copy(startColor).lerp(endColor, scale);

        // Push color to array.
        vertexColors.push(color.r, color.g, color.b);
      }

      // Update the geometry with the new colors.
      meshGeometry.setAttribute(
        'color',
        new T.BufferAttribute(new Float32Array(vertexColors), 3)
      );

      console.log(meshGeometry.boundingBox);
      const shaderMaterial = new T.ShaderMaterial({
        side: T.DoubleSide,
        wireframe: false,
        fragmentShader: fragment,
        vertexShader: vertex,
        vertexColors: true,
        uniforms: {
          progress: { type: 'f', value: 0 }
        }
      });

      // const linesGeometry = new T.EdgesGeometry(meshGeometry);
      const mesh = new T.Mesh(meshGeometry, shaderMaterial);

      // const lines = new T.LineSegments(linesGeometry, stokeMaterial);

      svgGroup.add(mesh);
      // svgGroup.add(mesh, lines);
    }
  }

  const box = new T.Box3().setFromObject(svgGroup);
  const size = box.getSize(new T.Vector3());
  const yOffset = size.y / -2;
  const xOffset = size.x / -2;

  // Offset all of group's elements, to center them
  for (const item of svgGroup.children) {
    item.position.x = xOffset;
    item.position.y = yOffset;
  }
  svgGroup.rotateX(-Math.PI / 2);

  return {
    object: svgGroup
  };
};

const device = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: window.devicePixelRatio
};

export default class Three {
  constructor(canvas) {
    this.canvas = canvas;

    this.scene = new T.Scene();

    this.camera = new T.PerspectiveCamera(
      200,
      device.width / device.height,
      0.1,
      500
    );
    this.camera.position.set(0, 0, 40);
    this.scene.add(this.camera);

    this.renderer = new T.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,
      stencil: false
    });
    this.renderer.setSize(device.width, device.height);
    this.renderer.setPixelRatio(Math.min(device.pixelRatio, 2));

    this.controls = new OrbitControls(this.camera, this.canvas);

    this.clock = new T.Clock();

    this.setLights();
    this.setGeometry();
    this.render();
    this.setResize();
  }

  setLights() {
    this.ambientLight = new T.AmbientLight(new T.Color(1, 1, 1, 1));
    this.scene.add(this.ambientLight);
  }

  setGeometry() {
    const axesHelper = new T.AxesHelper(5);

    const { object } = renderSVG(vectorPaths[0].data);
    object.rotation.x = Math.PI;
    this.scene.add(axesHelper);
    this.scene.add(object);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.render.bind(this));
  }

  setResize() {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    device.width = window.innerWidth;
    device.height = window.innerHeight;

    this.camera.aspect = device.width / device.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(device.width, device.height);
    this.renderer.setPixelRatio(Math.min(device.pixelRatio, 2));
  }
}
