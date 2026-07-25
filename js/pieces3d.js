/**
 * 360° Photorealistic 3D Piece Geometries & Custom Donkey Knight Asset
 */

let texWhiteWood = null;
let texBlackWood = null;
let bumpTexWood = null;
let texDonkeyKnight = null;
export let dataUrlDonkey = 'assets/donkey_knight.png';

function generateProceduralWoodTextures() {
  if (texWhiteWood && texBlackWood) return;

  const canvasW = document.createElement('canvas');
  canvasW.width = 512;
  canvasW.height = 512;
  const ctxW = canvasW.getContext('2d');
  ctxW.fillStyle = '#f4e8d1';
  ctxW.fillRect(0, 0, 512, 512);

  ctxW.fillStyle = 'rgba(180, 140, 100, 0.12)';
  for (let i = 0; i < 300; i++) {
    const y = Math.random() * 512;
    const h = 1 + Math.random() * 3;
    ctxW.fillRect(0, y, 512, h);
  }

  ctxW.strokeStyle = 'rgba(160, 120, 80, 0.15)';
  ctxW.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    ctxW.beginPath();
    ctxW.arc(256 + Math.random() * 100, 256 + Math.random() * 100, 50 + i * 35, 0, Math.PI * 2);
    ctxW.stroke();
  }

  const canvasB = document.createElement('canvas');
  canvasB.width = 512;
  canvasB.height = 512;
  const ctxB = canvasB.getContext('2d');
  ctxB.fillStyle = '#422213';
  ctxB.fillRect(0, 0, 512, 512);

  ctxB.fillStyle = 'rgba(20, 10, 5, 0.25)';
  for (let i = 0; i < 350; i++) {
    const y = Math.random() * 512;
    const h = 1 + Math.random() * 4;
    ctxB.fillRect(0, y, 512, h);
  }

  ctxB.strokeStyle = 'rgba(25, 12, 6, 0.3)';
  ctxB.lineWidth = 3;
  for (let i = 0; i < 15; i++) {
    ctxB.beginPath();
    ctxB.arc(256 + Math.random() * 80, 256 + Math.random() * 80, 40 + i * 30, 0, Math.PI * 2);
    ctxB.stroke();
  }

  const canvasBump = document.createElement('canvas');
  canvasBump.width = 256;
  canvasBump.height = 256;
  const ctxBump = canvasBump.getContext('2d');
  ctxBump.fillStyle = '#808080';
  ctxBump.fillRect(0, 0, 256, 256);
  ctxBump.fillStyle = '#a0a0a0';
  for (let i = 0; i < 150; i++) {
    ctxBump.fillRect(0, Math.random() * 256, 256, 1 + Math.random() * 2);
  }

  texWhiteWood = new THREE.CanvasTexture(canvasW);
  texBlackWood = new THREE.CanvasTexture(canvasB);
  bumpTexWood = new THREE.CanvasTexture(canvasBump);

  [texWhiteWood, texBlackWood, bumpTexWood].forEach(t => {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 2);
  });

  // Load and Process Custom Donkey Image Cutout
  loadDonkeyTexture();
}

function loadDonkeyTexture() {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imgData.data;

    // Key out light gray background (#e0e0e0 - #f5f5f5)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      if (r > 210 && g > 210 && b > 210) {
        data[i+3] = 0;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    dataUrlDonkey = canvas.toDataURL('image/png');
    texDonkeyKnight = new THREE.CanvasTexture(canvas);
  };
  img.src = 'assets/donkey_knight.png';
}

export function createWoodMaterials() {
  generateProceduralWoodTextures();

  const matFeltBase = new THREE.MeshStandardMaterial({ color: 0x1b4d2e, roughness: 0.85 });

  const matWhitePiece = new THREE.MeshStandardMaterial({
    map: texWhiteWood,
    bumpMap: bumpTexWood,
    bumpScale: 0.008,
    roughness: 0.28,
    metalness: 0.04
  });

  const matBlackPiece = new THREE.MeshStandardMaterial({
    map: texBlackWood,
    bumpMap: bumpTexWood,
    bumpScale: 0.012,
    roughness: 0.32,
    metalness: 0.08
  });

  const matWhiteAccent = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.75 });
  const matBlackAccent = new THREE.MeshStandardMaterial({ color: 0x22120a, roughness: 0.3, metalness: 0.2 });

  return { matWhitePiece, matBlackPiece, matWhiteAccent, matBlackAccent, matFeltBase };
}

export function build3DPieceMesh(type, materials) {
  const isWhite = type === type.toUpperCase();
  const pieceMat = isWhite ? materials.matWhitePiece : materials.matBlackPiece;
  const accentMat = isWhite ? materials.matWhiteAccent : materials.matBlackAccent;

  const group = new THREE.Group();
  const lowerType = type.toLowerCase();

  // Green Felt Base Pad
  const feltGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.04, 24);
  const feltMesh = new THREE.Mesh(feltGeo, materials.matFeltBase);
  feltMesh.position.y = -0.02;
  group.add(feltMesh);

  let points = [];

  // CUSTOM DONKEY KNIGHT PIECE (N / n)
  if (lowerType === 'n') {
    const baseGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.12, 24);
    const baseMesh = new THREE.Mesh(baseGeo, pieceMat);
    baseMesh.position.y = 0.06;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    const ringGeo = new THREE.TorusGeometry(0.36, 0.025, 12, 24);
    const ringMesh = new THREE.Mesh(ringGeo, accentMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.12;
    group.add(ringMesh);

    const tex = texDonkeyKnight || new THREE.TextureLoader().load('assets/donkey_knight.png');
    const spriteMat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
      roughness: 0.3
    });

    const heightScale = 1.25;
    const planeGeo = new THREE.PlaneGeometry(0.85, heightScale);
    const spriteMesh = new THREE.Mesh(planeGeo, spriteMat);
    spriteMesh.position.y = 0.12 + (heightScale / 2);
    spriteMesh.castShadow = true;
    group.add(spriteMesh);

    group.userData = { spriteMesh };
    return group;
  }

  if (lowerType === 'p') { // PAWN
    points = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.38, 0.06),
      new THREE.Vector2(0.32, 0.14),
      new THREE.Vector2(0.18, 0.36),
      new THREE.Vector2(0.15, 0.50),
      new THREE.Vector2(0.22, 0.54),
      new THREE.Vector2(0.18, 0.58),
      new THREE.Vector2(0, 0.65)
    ];
    const pawnBody = new THREE.Mesh(new THREE.LatheGeometry(points, 24), pieceMat);
    pawnBody.castShadow = true;
    pawnBody.receiveShadow = true;
    group.add(pawnBody);

    const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 24), pieceMat);
    ballMesh.position.y = 0.72;
    ballMesh.castShadow = true;
    group.add(ballMesh);

  } else if (lowerType === 'r') { // ROOK
    points = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.38, 0.06),
      new THREE.Vector2(0.33, 0.15),
      new THREE.Vector2(0.25, 0.68),
      new THREE.Vector2(0.34, 0.78),
      new THREE.Vector2(0.34, 0.98),
      new THREE.Vector2(0.25, 0.98),
      new THREE.Vector2(0, 0.98)
    ];
    const rookBody = new THREE.Mesh(new THREE.LatheGeometry(points, 24), pieceMat);
    rookBody.castShadow = true;
    rookBody.receiveShadow = true;
    group.add(rookBody);

    for (let i = 0; i < 4; i++) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.12), pieceMat);
      const angle = (i * Math.PI) / 2;
      block.position.set(Math.cos(angle) * 0.28, 1.04, Math.sin(angle) * 0.28);
      block.castShadow = true;
      group.add(block);
    }

  } else if (lowerType === 'b') { // BISHOP
    points = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.38, 0.06),
      new THREE.Vector2(0.32, 0.15),
      new THREE.Vector2(0.19, 0.65),
      new THREE.Vector2(0.28, 0.75),
      new THREE.Vector2(0.22, 0.96),
      new THREE.Vector2(0, 1.10)
    ];
    const bishopBody = new THREE.Mesh(new THREE.LatheGeometry(points, 24), pieceMat);
    bishopBody.castShadow = true;
    bishopBody.receiveShadow = true;
    group.add(bishopBody);

    const miter = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 24), pieceMat);
    miter.scale.set(1, 1.35, 1);
    miter.position.y = 1.05;
    miter.castShadow = true;
    group.add(miter);

    const topBall = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), accentMat);
    topBall.position.y = 1.38;
    topBall.castShadow = true;
    group.add(topBall);

  } else if (lowerType === 'q') { // QUEEN
    points = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.40, 0.06),
      new THREE.Vector2(0.34, 0.15),
      new THREE.Vector2(0.21, 0.75),
      new THREE.Vector2(0.35, 0.96),
      new THREE.Vector2(0.31, 1.25),
      new THREE.Vector2(0, 1.35)
    ];
    const queenBody = new THREE.Mesh(new THREE.LatheGeometry(points, 24), pieceMat);
    queenBody.castShadow = true;
    queenBody.receiveShadow = true;
    group.add(queenBody);

    const crownRing = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.03, 12, 24), accentMat);
    crownRing.rotation.x = Math.PI / 2;
    crownRing.position.y = 1.25;
    group.add(crownRing);

    const topBall = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), accentMat);
    topBall.position.y = 1.42;
    topBall.castShadow = true;
    group.add(topBall);

  } else if (lowerType === 'k') { // KING
    points = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.42, 0.06),
      new THREE.Vector2(0.35, 0.15),
      new THREE.Vector2(0.23, 0.8),
      new THREE.Vector2(0.36, 1.05),
      new THREE.Vector2(0.30, 1.32),
      new THREE.Vector2(0, 1.38)
    ];
    const kingBody = new THREE.Mesh(new THREE.LatheGeometry(points, 24), pieceMat);
    kingBody.castShadow = true;
    kingBody.receiveShadow = true;
    group.add(kingBody);

    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 0.07), accentMat);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.26, 0.07), accentMat);
    crossH.position.y = 1.50;
    crossV.position.y = 1.50;
    crossH.castShadow = true;
    crossV.castShadow = true;
    group.add(crossH);
    group.add(crossV);
  }

  // Waist Ring Accent
  if (points[2]) {
    const ringGeo = new THREE.TorusGeometry(points[2].x * 0.9, 0.025, 12, 24);
    const ringMesh = new THREE.Mesh(ringGeo, accentMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = points[2].y;
    group.add(ringMesh);
  }

  group.scale.set(0.9, 0.9, 0.9);
  return group;
}
