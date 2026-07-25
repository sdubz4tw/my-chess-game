/**
 * 360° Photorealistic 3D Procedural Piece Geometries & Wood Materials
 */

let canvasWhiteWood = null;
let canvasBlackWood = null;
let texWhiteWood = null;
let texBlackWood = null;
let bumpTexWood = null;

function generateProceduralWoodTextures() {
  if (texWhiteWood && texBlackWood) return;

  // 1. Create Light Maple / Birch Wood Texture Canvas
  const canvasW = document.createElement('canvas');
  canvasW.width = 512;
  canvasW.height = 512;
  const ctxW = canvasW.getContext('2d');
  ctxW.fillStyle = '#f4e8d1';
  ctxW.fillRect(0, 0, 512, 512);

  // Add fine wood grain lines
  ctxW.fillStyle = 'rgba(180, 140, 100, 0.12)';
  for (let i = 0; i < 300; i++) {
    const y = Math.random() * 512;
    const h = 1 + Math.random() * 3;
    ctxW.fillRect(0, y, 512, h);
  }

  // Add organic wood ring curves
  ctxW.strokeStyle = 'rgba(160, 120, 80, 0.15)';
  ctxW.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    ctxW.beginPath();
    ctxW.arc(256 + Math.random() * 100, 256 + Math.random() * 100, 50 + i * 35, 0, Math.PI * 2);
    ctxW.stroke();
  }

  // 2. Create Deep Walnut / Rosewood Texture Canvas
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

  // 3. Create Bump Map Canvas for Subtle Wood Grain Relief
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

  const loader = new THREE.TextureLoader();
  texWhiteWood = new THREE.CanvasTexture(canvasW);
  texBlackWood = new THREE.CanvasTexture(canvasB);
  bumpTexWood = new THREE.CanvasTexture(canvasBump);

  [texWhiteWood, texBlackWood, bumpTexWood].forEach(t => {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 2);
  });
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

/**
 * Build 100% Full 360° Solid Procedural 3D Mesh for any Piece Type
 */
export function build3DPieceMesh(type, materials) {
  const isWhite = type === type.toUpperCase();
  const pieceMat = isWhite ? materials.matWhitePiece : materials.matBlackPiece;
  const accentMat = isWhite ? materials.matWhiteAccent : materials.matBlackAccent;

  const group = new THREE.Group();
  const lowerType = type.toLowerCase();

  // 1. Green Felt Base Pad
  const feltGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.04, 24);
  const feltMesh = new THREE.Mesh(feltGeo, materials.matFeltBase);
  feltMesh.position.y = -0.02;
  group.add(feltMesh);

  let points = [];

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

    // 4 Castle Parapet Battlements
    for (let i = 0; i < 4; i++) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.12), pieceMat);
      const angle = (i * Math.PI) / 2;
      block.position.set(Math.cos(angle) * 0.28, 1.04, Math.sin(angle) * 0.28);
      block.castShadow = true;
      group.add(block);
    }

  } else if (lowerType === 'n') { // FULL 360° STAUNTON 3D KNIGHT
    points = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.38, 0.06),
      new THREE.Vector2(0.32, 0.15),
      new THREE.Vector2(0.24, 0.45),
      new THREE.Vector2(0.28, 0.52),
      new THREE.Vector2(0, 0.55)
    ];
    const knightBase = new THREE.Mesh(new THREE.LatheGeometry(points, 24), pieceMat);
    knightBase.castShadow = true;
    knightBase.receiveShadow = true;
    group.add(knightBase);

    // 360° Photorealistic Sculpted Horse Head Assembly
    const headGroup = new THREE.Group();

    // 1. Arched Neck Base
    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.42, 16), pieceMat);
    neckMesh.position.set(0, 0.72, 0.02);
    neckMesh.rotation.x = 0.25;
    neckMesh.castShadow = true;
    headGroup.add(neckMesh);

    // 2. Sculpted Upper Head & Brow
    const headBox = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.38), pieceMat);
    headBox.position.set(0, 0.88, 0.08);
    headBox.rotation.x = 0.35;
    headBox.castShadow = true;
    headGroup.add(headBox);

    // 3. Tapered Snout & Curved Muzzle
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.24, 0.28), pieceMat);
    snout.position.set(0, 0.76, 0.28);
    snout.rotation.x = 0.55;
    snout.castShadow = true;
    headGroup.add(snout);

    // Nostril Cutouts
    const nosL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), accentMat);
    const nosR = nosL.clone();
    nosL.position.set(-0.06, 0.72, 0.38);
    nosR.position.set(0.06, 0.72, 0.38);
    headGroup.add(nosL);
    headGroup.add(nosR);

    // 4. Carved Mane Ridges along the back (Matching Image 1)
    for (let i = 0; i < 5; i++) {
      const maneSegment = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.14), accentMat);
      maneSegment.position.set(0, 0.95 - i * 0.07, -0.12 - i * 0.02);
      maneSegment.rotation.x = -0.3;
      maneSegment.castShadow = true;
      headGroup.add(maneSegment);
    }

    // 5. Pointed 3D Ears
    const ear1 = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 12), pieceMat);
    const ear2 = ear1.clone();
    ear1.position.set(-0.08, 1.08, -0.04);
    ear2.position.set(0.08, 1.08, -0.04);
    ear1.rotation.x = 0.1;
    ear2.rotation.x = 0.1;
    ear1.castShadow = true;
    ear2.castShadow = true;
    headGroup.add(ear1);
    headGroup.add(ear2);

    group.add(headGroup);

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
