import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Send, ExternalLink } from 'lucide-react';
import './TelegramParticlePortal.css';

export default function TelegramParticlePortal() {
  const containerRef = useRef(null);
  const mountRef = useRef(null);
  const btnHudRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  // Store mutable refs for 60fps animation loop
  const stateRef = useRef({
    progress: 0,
    targetProgress: 0,
    mouse: new THREE.Vector3(9999, 9999, 0),
    targetMouse: new THREE.Vector3(9999, 9999, 0),
    mouseNDC: new THREE.Vector2(9999, 9999),
    cursorInfluence: 0,
    isCursorOnScreen: false,
    shockwaves: [],
    targetRotation: new THREE.Euler(0, 0, 0)
  });

  const BOT_URL = 'https://t.me/TheLiarArtist_bot';

  const handleOpenBot = () => {
    window.open(BOT_URL, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    const container = containerRef.current;
    const mount = mountRef.current;
    if (!container || !mount) return;

    // --- 1. Scene, Camera, Renderer ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 3000);
    const isMobile = mount.clientWidth < 640;
    camera.position.z = isMobile ? 980 : 650;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !isMobile, powerPreference: 'high-performance' });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    mount.appendChild(renderer.domElement);

    // --- 2. Soft Radial Glow Particle Sprite ---
    const particleTexture = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.22, 'rgba(255, 255, 255, 0.95)');
      gradient.addColorStop(0.55, 'rgba(251, 113, 133, 0.45)');
      gradient.addColorStop(0.8, 'rgba(225, 29, 72, 0.22)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    })();

    // --- 3. Sample Telegram Geometry (Adaptive for Mobile) ---
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 240;
    sampleCanvas.height = 240;
    const ctx = sampleCanvas.getContext('2d');

    // Circular disc
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(120, 120, 110, 0, Math.PI * 2);
    ctx.fill();

    // White paper airplane
    ctx.save();
    ctx.translate(112, 126);
    ctx.scale(0.62, 0.62);
    ctx.translate(-120, -120);

    const airplanePath = new Path2D(
      'M98.5 155.5L94 195c6.5 0 9.3-2.8 12.7-6.1l30.5-29.3 63.3 46.5c11.6 6.4 19.8 3.1 23-10.7l41.5-194.5c4.2-16.7-6.3-23.9-17.2-19.8L12.5 76.5c-16.4 6.5-16.2 15.6-2.8 19.7l63.1 19.7L219 43.5c6.9-4.2 13.2-1.9 8 2.7z'
    );
    ctx.fillStyle = '#ffffff';
    ctx.fill(airplanePath);
    ctx.restore();

    const imgData = ctx.getImageData(0, 0, 240, 240).data;
    const pointsList = [];
    const scale = 1.45;
    // Mobile uses step 5 (~1,350 particles) for silky 60fps; desktop uses step 3 (~4,200)
    const step = isMobile ? 5 : 3;

    for (let y = 0; y < 240; y += step) {
      for (let x = 0; x < 240; x += step) {
        const idx = (y * 240 + x) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];

        if (r > 200 && g > 200 && b > 200) {
          const px = (x - 120) * scale;
          const py = -(y - 120) * scale;
          const distFromNose = Math.hypot(px - 60, py - 50);
          const pz = 26 + Math.sin(distFromNose * 0.05) * 8;

          pointsList.push({
            isPlane: true,
            x: px + (Math.random() - 0.5) * 2,
            y: py + (Math.random() - 0.5) * 2,
            z: pz + (Math.random() - 0.5) * 4,
            r: 1.0,
            g: 0.96 + Math.random() * 0.04,
            b: 0.98 + Math.random() * 0.02,
            size: isMobile ? 14.0 : 11.5,
            delay: Math.random() * 0.35
          });
        } else if (r > 150 || b > 150) {
          const px = (x - 120) * scale;
          const py = -(y - 120) * scale;
          const rad = Math.hypot(px, py) / (110 * scale);
          const pz = (Math.random() - 0.5) * 12;

          const cr = THREE.MathUtils.lerp(0.98, 0.68, Math.min(1, rad));
          const cg = THREE.MathUtils.lerp(0.32, 0.07, Math.min(1, rad));
          const cb = THREE.MathUtils.lerp(0.48, 0.18, Math.min(1, rad));

          pointsList.push({
            isPlane: false,
            x: px + (Math.random() - 0.5) * 2,
            y: py + (Math.random() - 0.5) * 2,
            z: pz,
            r: cr,
            g: cg,
            b: cb,
            size: isMobile ? 12.0 : 9.0,
            delay: Math.random() * 0.5
          });
        }
      }
    }

    const count = pointsList.length;

    // --- 4. Geometry and Attributes ---
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const targetPositions = new Float32Array(count * 3);
    const chaosPositions = new Float32Array(count * 3);
    const offsets = new Float32Array(count * 3);
    const offsetVelocities = new Float32Array(count * 3);
    const delays = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const p = pointsList[i];

      targetPositions[i * 3] = p.x;
      targetPositions[i * 3 + 1] = p.y;
      targetPositions[i * 3 + 2] = p.z;

      const spreadX = isMobile ? 900 : 1400;
      const spreadY = isMobile ? 800 : 1000;
      const spreadZ = 700;
      const cx = (Math.random() - 0.5) * spreadX;
      const cy = (Math.random() - 0.5) * spreadY;
      const cz = (Math.random() - 0.5) * spreadZ;
      chaosPositions[i * 3] = cx;
      chaosPositions[i * 3 + 1] = cy;
      chaosPositions[i * 3 + 2] = cz;

      positions[i * 3] = cx;
      positions[i * 3 + 1] = cy;
      positions[i * 3 + 2] = cz;

      colors[i * 3] = p.r;
      colors[i * 3 + 1] = p.g;
      colors[i * 3 + 2] = p.b;

      delays[i] = p.delay;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: isMobile ? 12 : 11,
      map: particleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    const pointsMesh = new THREE.Points(geometry, material);
    scene.add(pointsMesh);

    // Subtle background ambient dust
    const ambientCount = isMobile ? 100 : 250;
    const ambientGeo = new THREE.BufferGeometry();
    const ambientPos = new Float32Array(ambientCount * 3);
    for (let i = 0; i < ambientCount; i++) {
      ambientPos[i * 3] = (Math.random() - 0.5) * 1400;
      ambientPos[i * 3 + 1] = (Math.random() - 0.5) * 1100;
      ambientPos[i * 3 + 2] = (Math.random() - 0.5) * 900;
    }
    ambientGeo.setAttribute('position', new THREE.BufferAttribute(ambientPos, 3));
    const ambientMat = new THREE.PointsMaterial({
      size: 6,
      map: particleTexture,
      color: 0xfb7185,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ambientMesh = new THREE.Points(ambientGeo, ambientMat);
    scene.add(ambientMesh);

    // --- 5. Scroll Assembly Listener with Target Progress ---
    const updateScrollProgress = () => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const scrollHeight = container.offsetHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const current = -rect.top;
      const rawProgress = Math.min(1, Math.max(0, current / scrollHeight));
      
      // Extended assembly range: starts smoothly at 0.02 and reaches 100% completion at 0.82
      const start = 0.02;
      const end = 0.82;
      const assembleFactor = Math.min(1, Math.max(0, (rawProgress - start) / (end - start)));
      stateRef.current.targetProgress = assembleFactor;

      if (btnHudRef.current) {
        const isShown = assembleFactor > 0.65 && rawProgress < 0.95;
        btnHudRef.current.style.opacity = isShown ? '1' : '0';
        btnHudRef.current.style.pointerEvents = isShown ? 'auto' : 'none';
      }
    };

    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    updateScrollProgress();

    // --- 6. Smooth Mouse & Touch Repulsion ---
    const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const raycaster = new THREE.Raycaster();

    const handlePointerMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const rect = mount.getBoundingClientRect();

      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((clientY - rect.top) / rect.height) * 2 + 1;

      stateRef.current.mouseNDC.set(x, y);

      raycaster.setFromCamera(stateRef.current.mouseNDC, camera);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(planeZ, intersection);
      if (intersection) {
        stateRef.current.targetMouse.copy(intersection);
        stateRef.current.isCursorOnScreen = true;
      }

      stateRef.current.targetRotation.x = -y * 0.16;
      stateRef.current.targetRotation.y = x * 0.20;
    };

    const handlePointerLeave = () => {
      stateRef.current.isCursorOnScreen = false;
      stateRef.current.targetRotation.set(0, 0, 0);
      setIsHovered(false);
    };

    const handleClick = (e) => {
      const rect = mount.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
      const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY);
      if (clientX === undefined) {
        handleOpenBot();
        return;
      }
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const hit = new THREE.Vector3();
      raycaster.ray.intersectPlane(planeZ, hit);

      if (hit) {
        stateRef.current.shockwaves.push({
          x: hit.x,
          y: hit.y,
          radius: 0,
          maxRadius: 360,
          speed: 16,
          strength: 20,
          decay: 0.94
        });
      }
      handleOpenBot();
    };

    mount.addEventListener('mousemove', handlePointerMove);
    mount.addEventListener('touchmove', handlePointerMove, { passive: true });
    mount.addEventListener('mouseleave', handlePointerLeave);
    mount.addEventListener('touchend', handlePointerLeave);
    mount.addEventListener('click', handleClick);

    // --- 7. Window Resize ---
    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      const mob = w < 640;
      camera.position.z = mob ? 980 : 650;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // --- 8. IntersectionObserver (Pause when offscreen) ---
    let isVisible = false;
    let animationFrameId = null;
    let clock = new THREE.Clock();

    const startAnimate = () => {
      if (!animationFrameId && isVisible) {
        clock.getDelta(); // reset clock delta
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    const stopAnimate = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) {
        startAnimate();
      } else {
        stopAnimate();
      }
    }, { rootMargin: '100px 0px' });
    observer.observe(container);

    const animate = () => {
      if (!isVisible) {
        animationFrameId = null;
        return;
      }
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Fluid, critically damped exponential filter for scroll progress
      // Eliminates discrete mouse-wheel steps and feels like dragging the scrollbar slider directly
      const targetP = stateRef.current.targetProgress;
      const blend = 1.0 - Math.exp(-Math.min(delta, 0.05) * (isMobile ? 4.8 : 4.2));
      stateRef.current.progress += (targetP - stateRef.current.progress) * blend;
      if (Math.abs(targetP - stateRef.current.progress) < 0.0001) {
        stateRef.current.progress = targetP;
      }
      const progress = stateRef.current.progress;

      // Smooth cursor coordinate & influence
      if (stateRef.current.isCursorOnScreen) {
        stateRef.current.cursorInfluence = Math.min(1, stateRef.current.cursorInfluence + 0.12);
        stateRef.current.mouse.lerp(stateRef.current.targetMouse, 0.16);
      } else {
        stateRef.current.cursorInfluence = Math.max(0, stateRef.current.cursorInfluence - 0.04);
      }
      const curInf = stateRef.current.cursorInfluence;
      const mouse = stateRef.current.mouse;

      // Smooth 3D tilt
      pointsMesh.rotation.x = THREE.MathUtils.lerp(pointsMesh.rotation.x, stateRef.current.targetRotation.x, 0.06);
      pointsMesh.rotation.y = THREE.MathUtils.lerp(pointsMesh.rotation.y, stateRef.current.targetRotation.y, 0.06);

      // Subtle levitation when assembled
      const levitate = Math.max(0, (progress - 0.7) / 0.3);
      pointsMesh.position.y = Math.sin(time * 1.5) * (5 * levitate);
      pointsMesh.rotation.z = Math.sin(time * 0.8) * (0.015 * levitate);

      // Update Shockwaves
      const activeWaves = stateRef.current.shockwaves;
      for (let w = activeWaves.length - 1; w >= 0; w--) {
        const wave = activeWaves[w];
        wave.radius += wave.speed;
        wave.strength *= wave.decay;
        if (wave.radius > wave.maxRadius || wave.strength < 0.2) {
          activeWaves.splice(w, 1);
        }
      }

      const repulsionRadius = isMobile ? 180 : 220;
      const repulsionRadiusSq = repulsionRadius * repulsionRadius;
      const springStiffness = 0.065;
      const damping = 0.88;

      const posArr = geometry.attributes.position.array;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const i3p1 = i3 + 1;
        const i3p2 = i3 + 2;

        const tx = targetPositions[i3];
        const ty = targetPositions[i3p1];
        const tz = targetPositions[i3p2];

        const cx = chaosPositions[i3];
        const cy = chaosPositions[i3p1];
        const cz = chaosPositions[i3p2];

        // Smooth quintic smootherstep trajectory (zero jerk, zero bouncing)
        const delay = delays[i];
        const pNorm = Math.min(1, Math.max(0, (progress - delay * 0.2) / (1 - 0.2)));
        const t = pNorm * pNorm * pNorm * (pNorm * (pNorm * 6 - 15) + 10);

        // Elegant swirling inward path
        const spiralAngle = (1 - t) * 1.1;
        const cosS = Math.cos(spiralAngle);
        const sinS = Math.sin(spiralAngle);

        const lerpX = cx * (1 - t) + tx * t;
        const lerpY = cy * (1 - t) + ty * t;
        const lerpZ = cz * (1 - t) + tz * t;

        const baseX = lerpX * cosS - lerpY * sinS;
        const baseY = lerpX * sinS + lerpY * cosS;
        const baseZ = lerpZ;

        // Micro-ambient float that calms down when assembled for crisp icon readability
        const ambScale = (1 - t) * 0.85 + 0.15;
        const ambX = Math.sin(time * 0.8 + i * 0.3) * (2.2 * ambScale);
        const ambY = Math.cos(time * 0.7 + i * 0.4) * (2.2 * ambScale);

        let ox = offsets[i3];
        let oy = offsets[i3p1];
        let oz = offsets[i3p2];

        let ovx = offsetVelocities[i3];
        let ovy = offsetVelocities[i3p1];
        let ovz = offsetVelocities[i3p2];

        // Soft, organic, velvety cursor repulsion
        if (curInf > 0.01) {
          const px = baseX + ox;
          const py = baseY + oy;
          const dx = px - mouse.x;
          const dy = py - mouse.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < repulsionRadiusSq && distSq > 0.01) {
            const dist = Math.sqrt(distSq);
            const factor = Math.pow(1 - dist / repulsionRadius, 1.8);
            const force = factor * 2.4 * curInf;

            const nx = dx / dist;
            const ny = dy / dist;

            ovx += nx * force - ny * (force * 0.08);
            ovy += ny * force + nx * (force * 0.08);
          }
        }

        // Click Shockwaves
        for (let w = 0; w < activeWaves.length; w++) {
          const wave = activeWaves[w];
          const px = baseX + ox;
          const py = baseY + oy;
          const wdx = px - wave.x;
          const wdy = py - wave.y;
          const wdist = Math.hypot(wdx, wdy);
          const diff = Math.abs(wdist - wave.radius);
          if (diff < 42) {
            const wFactor = (1 - diff / 42) * wave.strength * 0.45;
            ovx += (wdx / (wdist + 0.01)) * wFactor;
            ovy += (wdy / (wdist + 0.01)) * wFactor;
          }
        }

        // Return spring pulling offsets back to 0
        ovx = (ovx - ox * springStiffness) * damping;
        ovy = (ovy - oy * springStiffness) * damping;
        ovz = (ovz - oz * springStiffness) * damping;

        ox += ovx;
        oy += ovy;
        oz += ovz;

        // Clean micro-jitter deadzone
        if (Math.abs(ox) < 0.005 && Math.abs(ovx) < 0.005) { ox = 0; ovx = 0; }
        if (Math.abs(oy) < 0.005 && Math.abs(ovy) < 0.005) { oy = 0; ovy = 0; }
        if (Math.abs(oz) < 0.005 && Math.abs(ovz) < 0.005) { oz = 0; ovz = 0; }

        offsets[i3] = ox;
        offsets[i3p1] = oy;
        offsets[i3p2] = oz;

        offsetVelocities[i3] = ovx;
        offsetVelocities[i3p1] = ovy;
        offsetVelocities[i3p2] = ovz;

        posArr[i3] = baseX + ambX + ox;
        posArr[i3p1] = baseY + ambY + oy;
        posArr[i3p2] = baseZ + oz;
      }

      geometry.attributes.position.needsUpdate = true;

      ambientMesh.rotation.y = time * 0.02;
      ambientMesh.rotation.x = time * 0.01;

      renderer.render(scene, camera);
    };

    // Render loop is driven exclusively by observer
    return () => {
      stopAnimate();
      observer.disconnect();
      window.removeEventListener('scroll', updateScrollProgress);
      window.removeEventListener('resize', handleResize);
      mount.removeEventListener('mousemove', handlePointerMove);
      mount.removeEventListener('touchmove', handlePointerMove);
      mount.removeEventListener('mouseleave', handlePointerLeave);
      mount.removeEventListener('touchend', handlePointerLeave);
      mount.removeEventListener('click', handleClick);

      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      ambientGeo.dispose();
      ambientMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <section 
      ref={containerRef}
      id="telegram-portal"
      className="telegram-portal-section"
    >
      <div className="telegram-portal-sticky">
        {/* Soft atmospheric gradient transitions */}
        <div className="section-vignette-top" />
        <div className="section-vignette-bottom" />

        {/* WebGL 3D Interactive Canvas */}
        <div 
          ref={mountRef} 
          className="telegram-portal-canvas"
        />

        {/* Bottom Clean Action Link */}
        <div 
          ref={btnHudRef} 
          className="telegram-portal-bottom-hud"
          style={{ opacity: 0, pointerEvents: 'none', transition: 'opacity 0.3s ease' }}
        >
          <button 
            onClick={handleOpenBot}
            className="telegram-portal-btn"
          >
            <Send size={15} />
            <span>ЗАПУСТИТЬ @TheLiarArtist_bot</span>
            <ExternalLink size={13} style={{ opacity: 0.8 }} />
          </button>
        </div>
      </div>
    </section>
  );
}
