import * as THREE from 'three';
import {
  MAJOR_RADIUS,
  MINOR_RADIUS,
  U_CELLS,
  V_CELLS,
  PLAYER_ONE,
  normalizeAngle
} from './game.js';

const TAU = Math.PI * 2;
const GRID_POINT_SAMPLES = 160;
const PIECE_RADIUS = 1.75;
const PIECE_HEIGHT_SCALE = 0.56;
const PIECE_SURFACE_OFFSET = 0.58;
const HIGHLIGHT_RADIUS = 2.95;
const HIGHLIGHT_SURFACE_OFFSET = 0.27;
const UP_VECTOR = new THREE.Vector3(0, 0, 1);

function torusPoint(u, v) {
  const cosV = Math.cos(v);
  const ringRadius = MAJOR_RADIUS + MINOR_RADIUS * cosV;
  return new THREE.Vector3(
    ringRadius * Math.cos(u),
    ringRadius * Math.sin(u),
    MINOR_RADIUS * Math.sin(v)
  );
}

function torusNormal(u, v) {
  const position = torusPoint(u, v);
  const center = new THREE.Vector3(
    MAJOR_RADIUS * Math.cos(u),
    MAJOR_RADIUS * Math.sin(u),
    0
  );
  return position.sub(center).normalize();
}

export class TorusBoard {
  /** @param {HTMLElement} container */
  constructor(container) {
    this.container = container;
    this.cellStepU = TAU / U_CELLS;
    this.cellStepV = TAU / V_CELLS;
    this.vOffset = 0;
    this.zRotation = 0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf4ede2);

    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 500);
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(57, -38, 34);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;

    container.appendChild(this.renderer.domElement);

    this.torusGroup = new THREE.Group();
    this.scene.add(this.torusGroup);

    const torusGeometry = new THREE.TorusGeometry(MAJOR_RADIUS, MINOR_RADIUS, 90, 180);
    const torusMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe2c38f,
      roughness: 0.66,
      metalness: 0.0,
      clearcoat: 0.4,
      clearcoatRoughness: 0.32,
      side: THREE.DoubleSide
    });
    this.baseMesh = new THREE.Mesh(torusGeometry, torusMaterial);
    this.torusGroup.add(this.baseMesh);

    this.gridGroup = new THREE.Group();
    this.torusGroup.add(this.gridGroup);

    this.piecesGroup = new THREE.Group();
    this.torusGroup.add(this.piecesGroup);

    this.highlightGroup = new THREE.Group();
    this.torusGroup.add(this.highlightGroup);

    this.gridMaterial = new THREE.LineBasicMaterial({ color: 0x0f0f0f });
    this.whitePieceMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0x2f2f2f,
      emissiveIntensity: 0.06,
      roughness: 0.16,
      metalness: 0.0,
      clearcoat: 0.92,
      clearcoatRoughness: 0.08
    });
    this.blackPieceMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0a0a0a,
      roughness: 0.25,
      metalness: 0.02,
      clearcoat: 0.82,
      clearcoatRoughness: 0.12
    });
    this.highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd15c,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.pieceMeshes = new Map();
    this.highlightMeshes = new Map();

    this.raycaster = new THREE.Raycaster();
    this.pointerNdc = new THREE.Vector2();

    const ambient = new THREE.AmbientLight(0xfff5e3, 0.27);
    const hemi = new THREE.HemisphereLight(0xfff1cf, 0xb2864e, 0.31);
    const key = new THREE.DirectionalLight(0xffedc8, 1.18);
    key.position.set(74, -60, 90);
    const fill = new THREE.DirectionalLight(0xf7ddb2, 0.32);
    fill.position.set(-70, 55, 28);
    const rim = new THREE.DirectionalLight(0xffffff, 0.29);
    rim.position.set(-20, -95, 70);

    this.scene.add(ambient);
    this.scene.add(hemi);
    this.scene.add(key);
    this.scene.add(fill);
    this.scene.add(rim);

    this.rebuildGrid();
    this.resize();
  }

  getCanvas() {
    return this.renderer.domElement;
  }

  resize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  setZRotation(angle) {
    this.zRotation = normalizeAngle(angle);
    this.torusGroup.rotation.z = this.zRotation;
  }

  setVOffset(angle) {
    this.vOffset = normalizeAngle(angle);
    this.rebuildGrid();
    this.updatePieceTransforms();
    this.updateHighlightTransforms();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  setPieces(occupiedCells) {
    const nextKeys = new Set();

    for (const cell of occupiedCells) {
      const key = `${cell.i},${cell.j}`;
      nextKeys.add(key);

      let mesh = this.pieceMeshes.get(key);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(PIECE_RADIUS, 34, 28),
          cell.player === PLAYER_ONE
            ? this.whitePieceMaterial
            : this.blackPieceMaterial
        );
        mesh.scale.set(1, 1, PIECE_HEIGHT_SCALE);
        mesh.userData = {
          i: cell.i,
          j: cell.j,
          player: cell.player
        };
        this.piecesGroup.add(mesh);
        this.pieceMeshes.set(key, mesh);
      } else {
        mesh.material =
          cell.player === PLAYER_ONE
            ? this.whitePieceMaterial
            : this.blackPieceMaterial;
        mesh.scale.set(1, 1, PIECE_HEIGHT_SCALE);
        mesh.userData.i = cell.i;
        mesh.userData.j = cell.j;
        mesh.userData.player = cell.player;
      }
    }

    for (const [key, mesh] of this.pieceMeshes.entries()) {
      if (!nextKeys.has(key)) {
        this.piecesGroup.remove(mesh);
        mesh.geometry.dispose();
        this.pieceMeshes.delete(key);
      }
    }

    this.updatePieceTransforms();
  }

  updatePieceTransforms() {
    for (const mesh of this.pieceMeshes.values()) {
      this.positionPiece(mesh, mesh.userData.i, mesh.userData.j);
    }
  }

  positionPiece(mesh, i, j) {
    const u = (i + 0.5) * this.cellStepU;
    const v = (j + 0.5) * this.cellStepV + this.vOffset;

    const point = torusPoint(u, v);
    const normal = torusNormal(u, v);

    mesh.position.copy(point).addScaledVector(normal, PIECE_SURFACE_OFFSET);
    mesh.quaternion.setFromUnitVectors(UP_VECTOR, normal);
  }

  setHighlightedCells(highlightedCells) {
    const nextKeys = new Set();

    for (const cell of highlightedCells) {
      const key = `${cell.i},${cell.j}`;
      nextKeys.add(key);

      let mesh = this.highlightMeshes.get(key);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.CircleGeometry(HIGHLIGHT_RADIUS, 52),
          this.highlightMaterial
        );
        mesh.renderOrder = 10;
        mesh.userData = {
          i: cell.i,
          j: cell.j
        };
        this.highlightGroup.add(mesh);
        this.highlightMeshes.set(key, mesh);
      } else {
        mesh.userData.i = cell.i;
        mesh.userData.j = cell.j;
      }
    }

    for (const [key, mesh] of this.highlightMeshes.entries()) {
      if (!nextKeys.has(key)) {
        this.highlightGroup.remove(mesh);
        mesh.geometry.dispose();
        this.highlightMeshes.delete(key);
      }
    }

    this.updateHighlightTransforms();
  }

  updateHighlightTransforms() {
    for (const mesh of this.highlightMeshes.values()) {
      this.positionHighlight(mesh, mesh.userData.i, mesh.userData.j);
    }
  }

  positionHighlight(mesh, i, j) {
    const u = (i + 0.5) * this.cellStepU;
    const v = (j + 0.5) * this.cellStepV + this.vOffset;

    const point = torusPoint(u, v);
    const normal = torusNormal(u, v);

    mesh.position.copy(point).addScaledVector(normal, HIGHLIGHT_SURFACE_OFFSET);
    mesh.quaternion.setFromUnitVectors(UP_VECTOR, normal);
  }

  clearGrid() {
    for (const child of [...this.gridGroup.children]) {
      this.gridGroup.remove(child);
      if (child.geometry) {
        child.geometry.dispose();
      }
    }
  }

  rebuildGrid() {
    this.clearGrid();

    for (let i = 0; i < U_CELLS; i += 1) {
      const u = i * this.cellStepU;
      const points = [];
      for (let s = 0; s < GRID_POINT_SAMPLES; s += 1) {
        const v = (s / GRID_POINT_SAMPLES) * TAU;
        points.push(torusPoint(u, v));
      }
      const line = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(points),
        this.gridMaterial
      );
      this.gridGroup.add(line);
    }

    for (let j = 0; j < V_CELLS; j += 1) {
      const v = j * this.cellStepV + this.vOffset;
      const points = [];
      for (let s = 0; s < GRID_POINT_SAMPLES; s += 1) {
        const u = (s / GRID_POINT_SAMPLES) * TAU;
        points.push(torusPoint(u, v));
      }
      const line = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(points),
        this.gridMaterial
      );
      this.gridGroup.add(line);
    }
  }

  pickCell(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hit = this.raycaster.intersectObject(this.baseMesh, false)[0];
    if (!hit) {
      return null;
    }

    const localPoint = this.torusGroup.worldToLocal(hit.point.clone());
    const u = normalizeAngle(Math.atan2(localPoint.y, localPoint.x));
    const radial = Math.hypot(localPoint.x, localPoint.y);
    const v = normalizeAngle(Math.atan2(localPoint.z, radial - MAJOR_RADIUS));

    const i = Math.floor(u / this.cellStepU) % U_CELLS;
    const vBoard = normalizeAngle(v - this.vOffset);
    const j = Math.floor(vBoard / this.cellStepV) % V_CELLS;

    return { i, j, u, v };
  }
}
