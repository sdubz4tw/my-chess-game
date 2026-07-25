/**
 * 3D Action Game Piece-Specific Attack Animations & Visual FX Routines
 */

export class AttackManager {
  constructor(scene3d) {
    this.scene3d = scene3d;
  }

  /**
   * Main Dispatcher for Piece-Specific Cutscene Animations
   */
  triggerPieceAttack(attackerType, fromR, fromC, toR, toC, onComplete) {
    const type = attackerType.toLowerCase();
    this.scene3d.isAnimatingCutscene = true;

    const fromX = fromC - 3.5;
    const fromZ = fromR - 3.5;
    const targetX = toC - 3.5;
    const targetZ = toR - 3.5;

    const attackerObj = this.scene3d.pieceMeshes.find(p => p.row === fromR && p.col === fromC);
    const victimObj = this.scene3d.pieceMeshes.find(p => p.row === toR && p.col === toC);

    const origCamPos = this.scene3d.camera.position.clone();
    const origTarget = this.scene3d.controls.target.clone();

    const cutsceneCamPos = new THREE.Vector3(targetX + 1.2, 2.4, targetZ + 2.5);
    const cutsceneTarget = new THREE.Vector3(targetX, 0.4, targetZ);

    const startTime = performance.now();
    const duration = 1300; // 1.3 second cutscene sequence

    // Create VFX Group
    const attackVFXGroup = new THREE.Group();
    this.scene3d.scene.add(attackVFXGroup);

    // Context object passed to specific animation handlers
    const ctx = {
      attackerObj, victimObj,
      fromX, fromZ, targetX, targetZ,
      origCamPos, origTarget, cutsceneCamPos, cutsceneTarget,
      vfxGroup: attackVFXGroup,
      duration, startTime
    };

    // Pre-build piece-specific VFX elements
    this.setupVFXForPiece(type, ctx);

    const animateLoop = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      // Camera Lerp
      if (progress < 0.45) {
        const f = progress / 0.45;
        this.scene3d.camera.position.lerpVectors(origCamPos, cutsceneCamPos, f);
        this.scene3d.controls.target.lerpVectors(origTarget, cutsceneTarget, f);
      }

      // Execute Piece-Specific Animation
      if (type === 'p') this.animatePawn(ctx, progress);
      else if (type === 'n') this.animateKnight(ctx, progress);
      else if (type === 'b') this.animateBishop(ctx, progress);
      else if (type === 'r') this.animateRook(ctx, progress);
      else if (type === 'q') this.animateQueen(ctx, progress);
      else if (type === 'k') this.animateKing(ctx, progress);

      // Victim Defeat Hit Reaction (0.45 to 0.80)
      if (progress >= 0.45 && victimObj) {
        const df = (progress - 0.45) / 0.35;
        victimObj.mesh.rotation.z = THREE.MathUtils.lerp(0, Math.PI / 2, df);
        victimObj.mesh.position.y = THREE.MathUtils.lerp(0.1, -0.3, df);
        victimObj.mesh.scale.setScalar(Math.max(0.01, 0.9 * (1 - df)));
      }

      // Camera Reset
      if (progress > 0.75) {
        const rf = (progress - 0.75) / 0.25;
        this.scene3d.camera.position.lerpVectors(cutsceneCamPos, origCamPos, rf);
        this.scene3d.controls.target.lerpVectors(cutsceneTarget, origTarget, rf);
      }

      this.scene3d.controls.update();

      if (progress < 1.0) {
        requestAnimationFrame(animateLoop);
      } else {
        // Cleanup VFX
        this.scene3d.disposeObject(attackVFXGroup);
        this.scene3d.scene.remove(attackVFXGroup);

        this.scene3d.camera.position.copy(origCamPos);
        this.scene3d.controls.target.copy(origTarget);
        this.scene3d.controls.update();

        this.scene3d.isAnimatingCutscene = false;
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animateLoop);
  }

  setupVFXForPiece(type, ctx) {
    if (type === 'n') { // KNIGHT: Shockwave Ring + Impact Debris
      const ringGeo = new THREE.RingGeometry(0.1, 0.2, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xff6600, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
      ctx.shockwave = new THREE.Mesh(ringGeo, ringMat);
      ctx.shockwave.rotation.x = Math.PI / 2;
      ctx.shockwave.position.set(ctx.targetX, 0.11, ctx.targetZ);
      ctx.vfxGroup.add(ctx.shockwave);

    } else if (type === 'b') { // BISHOP: Radiant Energy Beam + Diagonal Slash
      const beamGeo = new THREE.CylinderGeometry(0.06, 0.06, 1, 16);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 });
      ctx.beam = new THREE.Mesh(beamGeo, beamMat);
      ctx.vfxGroup.add(ctx.beam);

      const slashGeo = new THREE.TorusGeometry(0.6, 0.04, 16, 32, Math.PI);
      ctx.slash1 = new THREE.Mesh(slashGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true }));
      ctx.slash2 = new THREE.Mesh(slashGeo, new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide, transparent: true }));
      ctx.slash1.position.set(ctx.targetX, 0.4, ctx.targetZ);
      ctx.slash2.position.set(ctx.targetX, 0.4, ctx.targetZ);
      ctx.vfxGroup.add(ctx.slash1);
      ctx.vfxGroup.add(ctx.slash2);

    } else if (type === 'r') { // ROOK: Dust Trail Clouds
      ctx.dustClouds = [];
      for (let i = 0; i < 15; i++) {
        const dMat = new THREE.MeshBasicMaterial({ color: 0x78716c, transparent: true, opacity: 0.6 });
        const dMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.08, 8, 8), dMat);
        dMesh.position.set(ctx.fromX, 0.1, ctx.fromZ);
        ctx.vfxGroup.add(dMesh);
        ctx.dustClouds.push(dMesh);
      }

    } else if (type === 'q') { // QUEEN: Multi-Slash Arcs
      const sGeo = new THREE.TorusGeometry(0.55, 0.05, 16, 32, Math.PI * 0.9);
      ctx.qSlash1 = new THREE.Mesh(sGeo, new THREE.MeshBasicMaterial({ color: 0xdc2626, side: THREE.DoubleSide, transparent: true }));
      ctx.qSlash2 = new THREE.Mesh(sGeo, new THREE.MeshBasicMaterial({ color: 0xd97706, side: THREE.DoubleSide, transparent: true }));
      ctx.qSlash3 = new THREE.Mesh(sGeo, new THREE.MeshBasicMaterial({ color: 0x2563eb, side: THREE.DoubleSide, transparent: true }));
      [ctx.qSlash1, ctx.qSlash2, ctx.qSlash3].forEach(s => {
        s.position.set(ctx.targetX, 0.4, ctx.targetZ);
        ctx.vfxGroup.add(s);
      });

    } else if (type === 'k') { // KING: Regal Golden Shockwave & Gold Sparks
      const goldRingGeo = new THREE.RingGeometry(0.1, 0.2, 32);
      const goldRingMat = new THREE.MeshBasicMaterial({ color: 0xd4af37, side: THREE.DoubleSide, transparent: true, opacity: 1 });
      ctx.kingRing = new THREE.Mesh(goldRingGeo, goldRingMat);
      ctx.kingRing.rotation.x = Math.PI / 2;
      ctx.kingRing.position.set(ctx.targetX, 0.11, ctx.targetZ);
      ctx.vfxGroup.add(ctx.kingRing);

      ctx.sparks = [];
      for (let i = 0; i < 25; i++) {
        const sMesh = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true }));
        sMesh.position.set(ctx.targetX, 0.3, ctx.targetZ);
        ctx.vfxGroup.add(sMesh);
        ctx.sparks.push({ mesh: sMesh, vel: new THREE.Vector3((Math.random()-0.5)*4, 1 + Math.random()*3, (Math.random()-0.5)*4) });
      }
    }
  }

  // --- PAWN ATTACK: Quick Linear Thrust + Spark Burst ---
  animatePawn(ctx, progress) {
    if (!ctx.attackerObj) return;
    if (progress < 0.70) {
      const f = progress / 0.70;
      ctx.attackerObj.mesh.position.x = THREE.MathUtils.lerp(ctx.fromX, ctx.targetX, f);
      ctx.attackerObj.mesh.position.z = THREE.MathUtils.lerp(ctx.fromZ, ctx.targetZ, f);
      ctx.attackerObj.mesh.position.y = 0.1 + Math.sin(f * Math.PI) * 0.15;
    }
  }

  // --- KNIGHT ATTACK: High Parabolic Leap + Heavy Ground Slam Shockwave ---
  animateKnight(ctx, progress) {
    if (!ctx.attackerObj) return;
    if (progress < 0.70) {
      const f = progress / 0.70;
      ctx.attackerObj.mesh.position.x = THREE.MathUtils.lerp(ctx.fromX, ctx.targetX, f);
      ctx.attackerObj.mesh.position.z = THREE.MathUtils.lerp(ctx.fromZ, ctx.targetZ, f);
      // High Parabolic Leap
      ctx.attackerObj.mesh.position.y = 0.1 + Math.sin(f * Math.PI) * 2.6;

      // Ground Slam Shockwave at Impact (f >= 0.7)
      if (f > 0.65 && ctx.shockwave) {
        const sf = (f - 0.65) / 0.35;
        ctx.shockwave.scale.set(1 + sf * 8, 1 + sf * 8, 1);
        ctx.shockwave.material.opacity = Math.max(0, 1 - sf);
      }
    }
  }

  // --- BISHOP ATTACK: Radiant Energy Beam + Diagonal Slash ---
  animateBishop(ctx, progress) {
    if (!ctx.attackerObj) return;
    if (progress < 0.70) {
      const f = progress / 0.70;
      ctx.attackerObj.mesh.position.x = THREE.MathUtils.lerp(ctx.fromX, ctx.targetX, f);
      ctx.attackerObj.mesh.position.z = THREE.MathUtils.lerp(ctx.fromZ, ctx.targetZ, f);
      ctx.attackerObj.mesh.position.y = 0.1 + Math.sin(f * Math.PI) * 0.3;

      if (ctx.beam) {
        const midX = (ctx.fromX + ctx.targetX) / 2;
        const midZ = (ctx.fromZ + ctx.targetZ) / 2;
        ctx.beam.position.set(midX, 0.2, midZ);
        ctx.beam.rotation.z = Math.atan2(ctx.targetZ - ctx.fromZ, ctx.targetX - ctx.fromX);
        ctx.beam.material.opacity = Math.max(0, 1 - f);
      }

      if (f > 0.5 && ctx.slash1 && ctx.slash2) {
        const sf = (f - 0.5) / 0.5;
        ctx.slash1.rotation.x = Math.PI / 4 + sf * Math.PI;
        ctx.slash2.rotation.y = -Math.PI / 4 - sf * Math.PI;
        ctx.slash1.material.opacity = Math.max(0, 1 - sf);
        ctx.slash2.material.opacity = Math.max(0, 1 - sf);
      }
    }
  }

  // --- ROOK ATTACK: Heavy Straight Ram + Dust Trail ---
  animateRook(ctx, progress) {
    if (!ctx.attackerObj) return;
    if (progress < 0.70) {
      const f = progress / 0.70;
      ctx.attackerObj.mesh.position.x = THREE.MathUtils.lerp(ctx.fromX, ctx.targetX, f);
      ctx.attackerObj.mesh.position.z = THREE.MathUtils.lerp(ctx.fromZ, ctx.targetZ, f);

      if (ctx.dustClouds) {
        ctx.dustClouds.forEach((cloud, i) => {
          const cf = Math.max(0, f - (i * 0.04));
          cloud.position.x = THREE.MathUtils.lerp(ctx.fromX, ctx.targetX, cf);
          cloud.position.z = THREE.MathUtils.lerp(ctx.fromZ, ctx.targetZ, cf);
          cloud.position.y = 0.1 + Math.random() * 0.2;
          cloud.material.opacity = Math.max(0, 0.6 - cf);
        });
      }
    }
  }

  // --- QUEEN ATTACK: Rapid Multi-Slash Arc + Camera Shake ---
  animateQueen(ctx, progress) {
    if (!ctx.attackerObj) return;
    if (progress < 0.70) {
      const f = progress / 0.70;
      ctx.attackerObj.mesh.position.x = THREE.MathUtils.lerp(ctx.fromX, ctx.targetX, f);
      ctx.attackerObj.mesh.position.z = THREE.MathUtils.lerp(ctx.fromZ, ctx.targetZ, f);
      ctx.attackerObj.mesh.position.y = 0.1 + Math.sin(f * Math.PI) * 0.6;

      if (f > 0.4 && ctx.qSlash1) {
        const sf = (f - 0.4) / 0.6;
        ctx.qSlash1.rotation.x = sf * Math.PI * 2;
        ctx.qSlash2.rotation.y = sf * Math.PI * 2;
        ctx.qSlash3.rotation.z = sf * Math.PI * 2;
        [ctx.qSlash1, ctx.qSlash2, ctx.qSlash3].forEach(s => s.material.opacity = Math.max(0, 1 - sf));

        // Dramatic Camera Shake Effect
        this.scene3d.camera.position.x += (Math.random() - 0.5) * 0.12;
        this.scene3d.camera.position.y += (Math.random() - 0.5) * 0.12;
      }
    }
  }

  // --- KING ATTACK: Regal Ground Stomp + Golden Shockwave Burst ---
  animateKing(ctx, progress) {
    if (!ctx.attackerObj) return;
    if (progress < 0.70) {
      const f = progress / 0.70;
      ctx.attackerObj.mesh.position.x = THREE.MathUtils.lerp(ctx.fromX, ctx.targetX, f);
      ctx.attackerObj.mesh.position.z = THREE.MathUtils.lerp(ctx.fromZ, ctx.targetZ, f);
      ctx.attackerObj.mesh.position.y = 0.1 + Math.sin(f * Math.PI) * 0.8;

      if (f > 0.6 && ctx.kingRing) {
        const sf = (f - 0.6) / 0.4;
        ctx.kingRing.scale.set(1 + sf * 10, 1 + sf * 10, 1);
        ctx.kingRing.material.opacity = Math.max(0, 1 - sf);

        if (ctx.sparks) {
          ctx.sparks.forEach(s => {
            s.mesh.position.addScaledVector(s.vel, 0.016);
            s.vel.y -= 0.12;
            s.mesh.material.opacity = Math.max(0, 1 - sf);
          });
        }
      }
    }
  }
}
