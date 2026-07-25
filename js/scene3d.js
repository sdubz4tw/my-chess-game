/**
 * 3D Scene Setup, Lighting, OrbitControls, Memory Disposal, and Raycasting
 */

import { createWoodMaterials, build3DPieceMesh } from './pieces3d.js';

export class Scene3D {
  constructor(containerId, onSquareClicked) {
    this.container = document.getElementById(containerId);
    this.onSquareClicked = onSquareClicked;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.squareMeshes = [];
    this.pieceMeshes = [];
    this.moveMarkers = [];
    this.highlightRing = null;
    this.checkRing = null;

    this.materials = null;
    this.themeMaterials = {};
    this.currentTheme = 'woodcut';

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 8.5, 9.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.minDistance = 4.5;
    this.controls.maxDistance = 20;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5ea, 1.25);
    dirLight.position.set(6, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x80b3ff, 0.45);
    fillLight.position.set(-6, 8, -6);
    this.scene.add(fillLight);

    this.materials = createWoodMaterials();

    this.applyThemeMaterials('woodcut');
    this.buildBoard3D();
    this.createSelectionHighlights();

    window.addEventListener('resize', () => this.onWindowResize());
    this.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));

    this.animate();
  }

  applyThemeMaterials(themeName) {
    this.currentTheme = themeName;

    if (themeName === 'porcelain') {
      this.themeMaterials = {
        lightSq: new THREE.MeshStandardMaterial({ color: 0xedd6b1, roughness: 0.35 }),
        darkSq: new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.4 }),
        frame: new THREE.MeshStandardMaterial({ color: 0x1f140e, roughness: 0.2 }),
        trim: new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.8 }),
        bg: new THREE.Color(0x12121e)
      };
    } else if (themeName === 'cyber') {
      this.themeMaterials = {
        lightSq: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.2 }),
        darkSq: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 }),
        frame: new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.1 }),
        trim: new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.9 }),
        bg: new THREE.Color(0x020617)
      };
    } else if (themeName === 'vintage') {
      this.themeMaterials = {
        lightSq: new THREE.MeshStandardMaterial({ color: 0xf2e6ce, roughness: 0.35 }),
        darkSq: new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.4 }),
        frame: new THREE.MeshStandardMaterial({ color: 0x4a301c, roughness: 0.35 }),
        trim: new THREE.MeshStandardMaterial({ color: 0xc69214, roughness: 0.3, metalness: 0.7 }),
        bg: new THREE.Color(0xdcd0bc)
      };
    } else {
      this.themeMaterials = {
        lightSq: new THREE.MeshStandardMaterial({ color: 0xf7f3eb, roughness: 0.3 }),
        darkSq: new THREE.MeshStandardMaterial({ color: 0x3c3836, roughness: 0.35 }),
        frame: new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.25 }),
        trim: new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.3, metalness: 0.5 }),
        bg: new THREE.Color(0xe5dec9)
      };
    }

    if (this.scene) this.scene.background = this.themeMaterials.bg;
  }

  buildBoard3D() {
    const existingFrame = this.scene.getObjectByName("boardFrame");
    if (existingFrame) {
      this.disposeObject(existingFrame);
      this.scene.remove(existingFrame);
    }

    const boardGroup = new THREE.Group();
    boardGroup.name = "boardFrame";

    const frameGeo = new THREE.BoxGeometry(9.6, 0.4, 9.6);
    const frameMesh = new THREE.Mesh(frameGeo, this.themeMaterials.frame);
    frameMesh.position.y = -0.22;
    frameMesh.receiveShadow = true;
    boardGroup.add(frameMesh);

    const trimGeo = new THREE.BoxGeometry(8.5, 0.38, 8.5);
    const trimMesh = new THREE.Mesh(trimGeo, this.themeMaterials.trim);
    trimMesh.position.y = -0.20;
    boardGroup.add(trimMesh);

    this.squareMeshes = [];
    for (let r = 0; r < 8; r++) {
      this.squareMeshes[r] = [];
      for (let c = 0; c < 8; c++) {
        const isLight = (r + c) % 2 === 0;
        const sqGeo = new THREE.BoxGeometry(1, 0.2, 1);
        const sqMesh = new THREE.Mesh(sqGeo, isLight ? this.themeMaterials.lightSq : this.themeMaterials.darkSq);
        sqMesh.position.set(c - 3.5, 0.0, r - 3.5);
        sqMesh.receiveShadow = true;
        sqMesh.userData = { row: r, col: c };
        boardGroup.add(sqMesh);
        this.squareMeshes[r][c] = sqMesh;
      }
    }

    this.scene.add(boardGroup);
  }

  createSelectionHighlights() {
    const ringGeo = new THREE.RingGeometry(0.35, 0.46, 32);
    this.highlightRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xd97706, side: THREE.DoubleSide }));
    this.highlightRing.rotation.x = Math.PI / 2;
    this.highlightRing.position.y = 0.105;
    this.highlightRing.visible = false;
    this.scene.add(this.highlightRing);

    const checkGeo = new THREE.RingGeometry(0.32, 0.48, 32);
    this.checkRing = new THREE.Mesh(checkGeo, new THREE.MeshBasicMaterial({ color: 0xdc2626, side: THREE.DoubleSide }));
    this.checkRing.rotation.x = Math.PI / 2;
    this.checkRing.position.y = 0.106;
    this.checkRing.visible = false;
    this.scene.add(this.checkRing);
  }

  updatePieces(boardState) {
    this.pieceMeshes.forEach(p => {
      this.disposeObject(p.mesh);
      this.scene.remove(p.mesh);
    });
    this.pieceMeshes = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const type = boardState[r][c];
        if (type) {
          const mesh = build3DPieceMesh(type, this.materials);
          mesh.position.set(c - 3.5, 0.1, r - 3.5);
          if (type === type.toLowerCase()) {
            mesh.rotation.y = Math.PI;
          }
          this.scene.add(mesh);
          this.pieceMeshes.push({ mesh, row: r, col: c, type });
        }
      }
    }
  }

  renderValidMoveMarkers(validMoves, boardState) {
    this.moveMarkers.forEach(m => {
      this.disposeObject(m);
      this.scene.remove(m);
    });
    this.moveMarkers = [];

    validMoves.forEach(m => {
      const isCapture = boardState[m.r][m.c] !== '' || m.isEnPassant;
      const markerGeo = (isCapture || m.isCastling)
        ? new THREE.RingGeometry(0.34, 0.46, 32)
        : new THREE.CircleGeometry(0.20, 32);

      const markerMat = new THREE.MeshBasicMaterial({
        color: m.isCastling ? 0x2563eb : (isCapture ? 0xdc2626 : 0x4caf50),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
        depthWrite: false
      });
      const markerMesh = new THREE.Mesh(markerGeo, markerMat);
      markerMesh.rotation.x = Math.PI / 2;
      markerMesh.position.set(m.c - 3.5, 0.102, m.r - 3.5);
      this.scene.add(markerMesh);
      this.moveMarkers.push(markerMesh);
    });
  }

  setHighlight(r, c) {
    if (r !== null && c !== null) {
      this.highlightRing.position.set(c - 3.5, 0.105, r - 3.5);
      this.highlightRing.visible = true;
    } else {
      this.highlightRing.visible = false;
    }
  }

  setCheckHighlight(r, c) {
    if (r !== null && c !== null) {
      this.checkRing.position.set(c - 3.5, 0.106, r - 3.5);
      this.checkRing.visible = true;
    } else {
      this.checkRing.visible = false;
    }
  }

  setCameraView(view) {
    if (view === 'perspective') {
      this.camera.position.set(0, 8.5, 9.5);
    } else if (view === 'top') {
      this.camera.position.set(0, 12, 0.01);
    } else if (view === 'flip') {
      this.camera.position.set(0, 8.5, -9.5);
    }
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  onPointerDown(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    let hitSquare = null;
    for (let hit of intersects) {
      let obj = hit.object;
      while (obj) {
        if (obj.userData && obj.userData.row !== undefined) {
          hitSquare = obj.userData;
          break;
        }
        obj = obj.parent;
      }
      if (hitSquare) break;
    }

    if (hitSquare && this.onSquareClicked) {
      this.onSquareClicked(hitSquare.row, hitSquare.col);
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  disposeObject(obj) {
    if (!obj) return;
    obj.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    this.pieceMeshes.forEach(p => {
      if (p.mesh.userData && p.mesh.userData.spriteMesh) {
        p.mesh.userData.spriteMesh.rotation.y = this.camera.rotation.y;
      }
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
