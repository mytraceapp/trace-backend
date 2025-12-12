import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Move } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { useEntries } from '../state/EntriesContext';
import * as THREE from 'three';

interface RisingScreenProps {
  onBack: () => void;
  onReturnToChat: () => void;
  onNavigateToActivities: () => void;
  onNavigateToJournal: () => void;
  onNavigateToProfile: () => void;
  onNavigateToHelp: () => void;
}

export function RisingScreen({
  onBack: _onBack,
  onReturnToChat,
  onNavigateToActivities,
  onNavigateToJournal,
  onNavigateToProfile,
  onNavigateToHelp,
}: RisingScreenProps) {
  const { addSessionEntry } = useEntries();
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationRef = useRef<number>(0);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const startTimeRef = useRef<number>(0);
  const hasSavedRef = useRef(false);
  const tiltRef = useRef({ x: 0, y: 0 });
  
  const [tiltEnabled, setTiltEnabled] = useState(false);
  const [showTiltButton, setShowTiltButton] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showTitle, setShowTitle] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTitle(false);
    }, 7000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0E0F0D); // Dark mode background

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 50;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const createRichVariations = (baseColors: number[]): THREE.Color[] => {
      const result: THREE.Color[] = [];
      baseColors.forEach(hex => {
        const base = new THREE.Color(hex);
        result.push(base);
        result.push(new THREE.Color().copy(base).lerp(new THREE.Color(0xffffff), 0.15));
        result.push(new THREE.Color().copy(base).lerp(new THREE.Color(0xffffff), 0.3));
        result.push(new THREE.Color().copy(base).lerp(new THREE.Color(0xffffff), 0.5));
        result.push(new THREE.Color().copy(base).lerp(new THREE.Color(0xffffff), 0.7));
        result.push(new THREE.Color().copy(base).lerp(new THREE.Color(0x000000), 0.1));
        result.push(new THREE.Color().copy(base).lerp(new THREE.Color(0x000000), 0.25));
        result.push(new THREE.Color().copy(base).lerp(new THREE.Color(0x000000), 0.4));
      });
      return result;
    };

    const colorFamilies = [
      createRichVariations([0x3D6B6E, 0x4A7C7E, 0x5A8B8D, 0x2D5558, 0x6A9B9E, 0x1E4548]), // Teal
      createRichVariations([0x6B9E8C, 0x7AAE9C, 0x5A8E7C, 0x8ABEA8, 0x4A7E6C, 0x9DCEB8]), // Sage
      createRichVariations([0xD97B3D, 0xE88B4D, 0xC96B2D, 0xF09B5D, 0xB85B1D, 0xF5AB6D]), // Orange
      createRichVariations([0xF5EFE6, 0xE8DED1, 0xD4C9BC, 0xEDE4D8, 0xFAF6F0, 0xC9BEB1]), // Cream
    ];

    // Generate random sequence for each cycle
    const generateRandomSequence = (): number[] => {
      const arr = [0, 1, 2, 3];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    // Another 25% slower (6.25 * 1.25 = 7.8125)
    const burstDuration = 7.8;
    const clusterBurstTime = burstDuration;
    const fullCycleDuration = 4 * clusterBurstTime;

    // Pre-generate random sequences
    const randomSequences: number[][] = [];
    for (let i = 0; i < 100; i++) {
      randomSequences.push(generateRandomSequence());
    }

    // ============================================
    // LAVA LAMP BLOBS - Floating and separating
    // ============================================
    const blobCount = 24;
    
    interface Blob {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      radius: number;
      targetRadius: number;
      color: THREE.Color;
      phase: number;
      splitTimer: number;
      mergeTimer: number;
    }
    
    const blobs: Blob[] = [];
    const blobMeshes: THREE.Mesh[] = [];
    
    const blobColors = [
      new THREE.Color(0x3D6B6E).multiplyScalar(1.2), // Teal
      new THREE.Color(0x6B9E8C).multiplyScalar(1.2), // Sage
      new THREE.Color(0xD97B3D).multiplyScalar(1.1), // Orange
      new THREE.Color(0xF5EFE6).multiplyScalar(0.9), // Cream
    ];
    
    for (let i = 0; i < blobCount; i++) {
      const blob: Blob = {
        x: (Math.random() - 0.5) * 60,
        y: (Math.random() - 0.5) * 80,
        z: 20 + Math.random() * 15,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.12,
        radius: 2 + Math.random() * 4,
        targetRadius: 2 + Math.random() * 4,
        color: blobColors[Math.floor(Math.random() * blobColors.length)].clone(),
        phase: Math.random() * Math.PI * 2,
        splitTimer: 8 + Math.random() * 15,
        mergeTimer: 0,
      };
      blobs.push(blob);
      
      const geometry = new THREE.SphereGeometry(1, 32, 32);
      const material = new THREE.MeshBasicMaterial({
        color: blob.color,
        transparent: true,
        opacity: 0.55,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(blob.x, blob.y, blob.z);
      mesh.scale.setScalar(blob.radius);
      scene.add(mesh);
      blobMeshes.push(mesh);
    }

    // ============================================
    // DENSE BACKGROUND PARTICLES
    // ============================================
    const bgParticleCount = 20000;
    const bgGeometry = new THREE.BufferGeometry();
    const bgPositions = new Float32Array(bgParticleCount * 3);
    const bgColors = new Float32Array(bgParticleCount * 3);
    const bgSizes = new Float32Array(bgParticleCount);
    const bgPhases = new Float32Array(bgParticleCount);
    const bgHomePositions = new Float32Array(bgParticleCount * 3);

    for (let i = 0; i < bgParticleCount; i++) {
      const i3 = i * 3;
      const cluster = Math.floor(Math.random() * 4);
      
      let homeX = (Math.random() - 0.5) * 95;
      let homeY = (Math.random() - 0.5) * 80;
      
      const clusterBias = 0.55;
      switch (cluster) {
        case 0: homeY = homeY * (1 - clusterBias) + (8 + Math.random() * 28) * clusterBias; break;
        case 1: homeX = homeX * (1 - clusterBias) + (12 + Math.random() * 35) * clusterBias; break;
        case 2: homeY = homeY * (1 - clusterBias) + (-8 - Math.random() * 28) * clusterBias; break;
        case 3: homeX = homeX * (1 - clusterBias) + (-12 - Math.random() * 35) * clusterBias; break;
      }
      
      bgHomePositions[i3] = homeX;
      bgHomePositions[i3 + 1] = homeY;
      bgHomePositions[i3 + 2] = -12 + Math.random() * 50;
      
      bgPositions[i3] = homeX;
      bgPositions[i3 + 1] = homeY;
      bgPositions[i3 + 2] = bgHomePositions[i3 + 2];

      const family = colorFamilies[cluster];
      const color = family[Math.floor(Math.random() * family.length)];
      bgColors[i3] = color.r;
      bgColors[i3 + 1] = color.g;
      bgColors[i3 + 2] = color.b;

      const sizeRand = Math.random();
      if (sizeRand < 0.06) {
        bgSizes[i] = 4.5 + Math.random() * 7;
      } else if (sizeRand < 0.2) {
        bgSizes[i] = 2.5 + Math.random() * 3.5;
      } else if (sizeRand < 0.55) {
        bgSizes[i] = 1.2 + Math.random() * 2;
      } else {
        bgSizes[i] = 0.3 + Math.random() * 1.2;
      }
      bgPhases[i] = Math.random() * Math.PI * 2;
    }

    bgGeometry.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
    bgGeometry.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));
    bgGeometry.setAttribute('size', new THREE.BufferAttribute(bgSizes, 1));

    const bgMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_pixelRatio: { value: renderer.getPixelRatio() }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float u_pixelRatio;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float sizeAtten = size * u_pixelRatio * (320.0 / -mvPosition.z);
          gl_PointSize = clamp(sizeAtten, 1.0, 120.0);
          vAlpha = 0.5;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    const bgParticles = new THREE.Points(bgGeometry, bgMaterial);
    scene.add(bgParticles);

    // ============================================
    // BURST PARTICLES
    // ============================================
    const particleCount = 32000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colorAttrib = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const homePositions = new Float32Array(particleCount * 3);
    const phases = new Float32Array(particleCount);
    const rotationSpeeds = new Float32Array(particleCount);
    const clusterIds = new Float32Array(particleCount);
    const burstOffsets = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      const cluster = Math.floor(Math.random() * 4);
      clusterIds[i] = cluster;
      
      let homeX = 0, homeY = 0;
      const spreadX = 30 + Math.random() * 25;
      const spreadY = 25 + Math.random() * 22;
      
      switch (cluster) {
        case 0: homeX = (Math.random() - 0.5) * 75; homeY = 6 + Math.random() * spreadY; break;
        case 1: homeX = 10 + Math.random() * spreadX; homeY = (Math.random() - 0.5) * 68; break;
        case 2: homeX = (Math.random() - 0.5) * 75; homeY = -6 - Math.random() * spreadY; break;
        case 3: homeX = -10 - Math.random() * spreadX; homeY = (Math.random() - 0.5) * 68; break;
      }
      
      homePositions[i3] = homeX;
      homePositions[i3 + 1] = homeY;
      homePositions[i3 + 2] = -12 + Math.random() * 55;
      
      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = -12;

      const family = colorFamilies[cluster];
      const color = family[Math.floor(Math.random() * family.length)];
      colorAttrib[i3] = color.r;
      colorAttrib[i3 + 1] = color.g;
      colorAttrib[i3 + 2] = color.b;

      const sizeType = Math.random();
      if (sizeType < 0.05) {
        sizes[i] = 7 + Math.random() * 10;
      } else if (sizeType < 0.16) {
        sizes[i] = 3.5 + Math.random() * 5;
      } else if (sizeType < 0.42) {
        sizes[i] = 1.8 + Math.random() * 2.8;
      } else {
        sizes[i] = 0.5 + Math.random() * 1.5;
      }

      phases[i] = Math.random() * Math.PI * 2;
      rotationSpeeds[i] = 0.12 + Math.random() * 0.35;
      burstOffsets[i] = Math.random() * 3.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colorAttrib, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_pixelRatio: { value: renderer.getPixelRatio() }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float u_time;
        uniform float u_pixelRatio;
        
        void main() {
          vColor = color;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          float sizeAtten = size * u_pixelRatio * (360.0 / -mvPosition.z);
          gl_PointSize = clamp(sizeAtten, 1.0, 180.0);
          
          float distFromCenter = length(position.xy);
          vAlpha = smoothstep(0.0, 2.0, distFromCenter) * 0.9;
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          
          float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
          
          float glow = exp(-dist * 1.8) * 0.3;
          vec3 finalColor = vColor + vec3(1.0) * glow * 0.08;
          
          if (alpha < 0.003) discard;
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Grain particles
    const grainCount = 10000;
    const grainGeometry = new THREE.BufferGeometry();
    const grainPositions = new Float32Array(grainCount * 3);
    const grainColors = new Float32Array(grainCount * 3);
    const grainSizes = new Float32Array(grainCount);
    const grainHomes = new Float32Array(grainCount * 3);
    const grainPhases = new Float32Array(grainCount);
    const grainClusters = new Float32Array(grainCount);
    const grainBurstOffsets = new Float32Array(grainCount);

    for (let i = 0; i < grainCount; i++) {
      const i3 = i * 3;
      
      const cluster = Math.floor(Math.random() * 4);
      grainClusters[i] = cluster;
      
      let gHomeX = 0, gHomeY = 0;
      const gSpreadX = 35 + Math.random() * 22;
      const gSpreadY = 28 + Math.random() * 18;
      
      switch (cluster) {
        case 0: gHomeX = (Math.random() - 0.5) * 80; gHomeY = 4 + Math.random() * gSpreadY; break;
        case 1: gHomeX = 8 + Math.random() * gSpreadX; gHomeY = (Math.random() - 0.5) * 72; break;
        case 2: gHomeX = (Math.random() - 0.5) * 80; gHomeY = -4 - Math.random() * gSpreadY; break;
        case 3: gHomeX = -8 - Math.random() * gSpreadX; gHomeY = (Math.random() - 0.5) * 72; break;
      }
      
      grainHomes[i3] = gHomeX;
      grainHomes[i3 + 1] = gHomeY;
      grainHomes[i3 + 2] = Math.random() * 35;
      
      grainPositions[i3] = 0;
      grainPositions[i3 + 1] = 0;
      grainPositions[i3 + 2] = 0;
      
      const family = colorFamilies[cluster];
      const gColor = family[Math.floor(Math.random() * family.length)];
      grainColors[i3] = gColor.r;
      grainColors[i3 + 1] = gColor.g;
      grainColors[i3 + 2] = gColor.b;
      
      grainSizes[i] = 0.2 + Math.random() * 0.9;
      grainPhases[i] = Math.random() * Math.PI * 2;
      grainBurstOffsets[i] = Math.random() * 3.5;
    }

    grainGeometry.setAttribute('position', new THREE.BufferAttribute(grainPositions, 3));
    grainGeometry.setAttribute('color', new THREE.BufferAttribute(grainColors, 3));
    grainGeometry.setAttribute('size', new THREE.BufferAttribute(grainSizes, 1));

    const grainMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_pixelRatio: { value: renderer.getPixelRatio() }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float u_pixelRatio;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * u_pixelRatio * (240.0 / -mvPosition.z);
          
          float distFromCenter = length(position.xy);
          vAlpha = smoothstep(0.0, 1.5, distFromCenter) * 0.4;
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          float alpha = smoothstep(0.5, 0.1, dist) * vAlpha;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    const grainParticles = new THREE.Points(grainGeometry, grainMaterial);
    scene.add(grainParticles);

    startTimeRef.current = performance.now();
    let lastTime = performance.now();

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const deltaTime = (now - lastTime) / 1000;
      lastTime = now;
      
      const elapsed = (now - startTimeRef.current) / 1000.0;
      setTimeElapsed(Math.floor(elapsed));

      if (cameraRef.current) {
        cameraRef.current.position.x = tiltRef.current.x * 5;
        cameraRef.current.position.y = tiltRef.current.y * 3;
        cameraRef.current.lookAt(0, 0, 0);
      }

      // ============================================
      // ANIMATE LAVA LAMP BLOBS
      // ============================================
      for (let i = 0; i < blobs.length; i++) {
        const blob = blobs[i];
        const mesh = blobMeshes[i];
        
        // Organic floating motion
        blob.x += blob.vx + Math.sin(elapsed * 0.3 + blob.phase) * 0.02;
        blob.y += blob.vy + Math.cos(elapsed * 0.25 + blob.phase * 1.3) * 0.015;
        
        // Gentle velocity changes
        blob.vx += (Math.random() - 0.5) * 0.003;
        blob.vy += (Math.random() - 0.5) * 0.002;
        
        // Damping
        blob.vx *= 0.995;
        blob.vy *= 0.995;
        
        // Boundary wrapping
        if (blob.x > 40) blob.x = -40;
        if (blob.x < -40) blob.x = 40;
        if (blob.y > 50) blob.y = -50;
        if (blob.y < -50) blob.y = 50;
        
        // Smooth radius pulsing
        blob.radius += (blob.targetRadius - blob.radius) * 0.02;
        
        // Occasionally change target radius (breathing effect)
        if (Math.random() < 0.002) {
          blob.targetRadius = 2 + Math.random() * 5;
        }
        
        // Split timer - occasionally spawn a new small blob
        blob.splitTimer -= deltaTime;
        if (blob.splitTimer <= 0 && blobs.length < 40 && blob.radius > 3) {
          blob.splitTimer = 12 + Math.random() * 20;
          
          // Create child blob
          const childBlob: Blob = {
            x: blob.x + (Math.random() - 0.5) * 4,
            y: blob.y + (Math.random() - 0.5) * 4,
            z: blob.z,
            vx: blob.vx + (Math.random() - 0.5) * 0.2,
            vy: blob.vy + (Math.random() - 0.5) * 0.2,
            radius: 0.5,
            targetRadius: 1.5 + Math.random() * 2,
            color: blob.color.clone(),
            phase: Math.random() * Math.PI * 2,
            splitTimer: 15 + Math.random() * 25,
            mergeTimer: 5 + Math.random() * 8,
          };
          blobs.push(childBlob);
          
          const childGeometry = new THREE.SphereGeometry(1, 32, 32);
          const childMaterial = new THREE.MeshBasicMaterial({
            color: childBlob.color,
            transparent: true,
            opacity: 0.55,
          });
          const childMesh = new THREE.Mesh(childGeometry, childMaterial);
          childMesh.position.set(childBlob.x, childBlob.y, childBlob.z);
          childMesh.scale.setScalar(childBlob.radius);
          scene.add(childMesh);
          blobMeshes.push(childMesh);
          
          // Parent shrinks slightly
          blob.targetRadius *= 0.85;
        }
        
        // Merge timer - remove small blobs after a while
        if (blob.mergeTimer > 0) {
          blob.mergeTimer -= deltaTime;
          if (blob.mergeTimer <= 0 && blob.radius < 2 && blobs.length > 12) {
            // Fade out and remove
            blob.targetRadius = 0;
            if (blob.radius < 0.3) {
              scene.remove(mesh);
              mesh.geometry.dispose();
              (mesh.material as THREE.MeshBasicMaterial).dispose();
              blobs.splice(i, 1);
              blobMeshes.splice(i, 1);
              i--;
              continue;
            }
          }
        }
        
        // Update mesh
        mesh.position.set(blob.x, blob.y, blob.z);
        mesh.scale.setScalar(blob.radius);
        
        // Subtle deformation for organic look
        const squish = 1 + Math.sin(elapsed * 0.8 + blob.phase) * 0.08;
        mesh.scale.x *= squish;
        mesh.scale.y *= (2 - squish);
      }

      // Animate background particles
      const bgPosAttr = bgParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < bgParticleCount; i++) {
        const i3 = i * 3;
        const homeX = bgHomePositions[i3];
        const homeY = bgHomePositions[i3 + 1];
        const homeZ = bgHomePositions[i3 + 2];
        
        bgPosAttr[i3] = homeX + Math.sin(elapsed * 0.22 + bgPhases[i]) * 2.2;
        bgPosAttr[i3 + 1] = homeY + Math.cos(elapsed * 0.18 + bgPhases[i] * 1.2) * 1.8;
        bgPosAttr[i3 + 2] = homeZ + Math.sin(elapsed * 0.12 + bgPhases[i] * 0.8) * 1.2;
      }
      bgParticles.geometry.attributes.position.needsUpdate = true;
      (bgMaterial as THREE.ShaderMaterial).uniforms.u_time.value = elapsed;

      // Get current cycle and random sequence
      const cycleIndex = Math.floor(elapsed / fullCycleDuration);
      const cycleTime = elapsed % fullCycleDuration;
      const currentSequence = randomSequences[cycleIndex % randomSequences.length];

      // Animate main burst particles
      const posAttr = particles.geometry.attributes.position.array as Float32Array;
      const posCount = posAttr.length / 3;
      
      (material as THREE.ShaderMaterial).uniforms.u_time.value = elapsed;

      for (let i = 0; i < posCount; i++) {
        const i3 = i * 3;
        const cluster = clusterIds[i];
        
        const sequencePosition = currentSequence.indexOf(cluster);
        const clusterStartTime = sequencePosition * clusterBurstTime;
        const particleStartTime = clusterStartTime + burstOffsets[i];
        
        let timeSinceBurst = cycleTime - particleStartTime;
        
        if (timeSinceBurst < -fullCycleDuration + burstDuration + 5) {
          timeSinceBurst += fullCycleDuration;
        }
        
        const homeX = homePositions[i3];
        const homeY = homePositions[i3 + 1];
        const homeZ = homePositions[i3 + 2];
        
        if (timeSinceBurst < 0) {
          posAttr[i3] = 0;
          posAttr[i3 + 1] = 0;
          posAttr[i3 + 2] = -12;
          continue;
        }
        
        const burstT = Math.min(1.0, timeSinceBurst / burstDuration);
        const easeOut = 1.0 - Math.pow(1.0 - burstT, 2.3);
        
        let currentX = homeX * easeOut;
        let currentY = homeY * easeOut;
        let currentZ = -12 + (homeZ + 12) * easeOut;
        
        if (burstT >= 0.6) {
          const rotTime = elapsed * rotationSpeeds[i];
          const rotRadius = 1.0 + Math.sin(phases[i] * 3) * 0.8;
          
          currentX += Math.sin(rotTime + phases[i]) * rotRadius;
          currentY += Math.cos(rotTime + phases[i] * 1.3) * rotRadius;
          currentZ += Math.sin(rotTime * 0.3 + phases[i]) * 0.6;
          
          currentX += Math.sin(elapsed * 0.1 + phases[i] * 2) * 0.5;
          currentY += Math.cos(elapsed * 0.08 + phases[i] * 1.5) * 0.4;
        }
        
        posAttr[i3] = currentX;
        posAttr[i3 + 1] = currentY;
        posAttr[i3 + 2] = currentZ;
      }
      particles.geometry.attributes.position.needsUpdate = true;

      // Update grain
      const grainPos = grainParticles.geometry.attributes.position.array as Float32Array;
      const grainCnt = grainPos.length / 3;
      
      for (let i = 0; i < grainCnt; i++) {
        const i3 = i * 3;
        const cluster = grainClusters[i];
        
        const sequencePosition = currentSequence.indexOf(cluster);
        const clusterStartTime = sequencePosition * clusterBurstTime;
        const particleStartTime = clusterStartTime + grainBurstOffsets[i];
        
        let timeSinceBurst = cycleTime - particleStartTime;
        
        if (timeSinceBurst < -fullCycleDuration + burstDuration + 5) {
          timeSinceBurst += fullCycleDuration;
        }
        
        const gHomeX = grainHomes[i3];
        const gHomeY = grainHomes[i3 + 1];
        const gHomeZ = grainHomes[i3 + 2];
        
        if (timeSinceBurst < 0) {
          grainPos[i3] = 0;
          grainPos[i3 + 1] = 0;
          grainPos[i3 + 2] = 0;
          continue;
        }
        
        const burstT = Math.min(1.0, timeSinceBurst / burstDuration);
        const easeOut = 1.0 - Math.pow(1.0 - burstT, 2.3);
        
        let gX = gHomeX * easeOut;
        let gY = gHomeY * easeOut;
        let gZ = gHomeZ * easeOut;
        
        if (burstT >= 0.6) {
          const rotTime = elapsed * 0.22;
          gX += Math.sin(rotTime + grainPhases[i]) * 0.8;
          gY += Math.cos(rotTime + grainPhases[i] * 1.2) * 0.6;
        }
        
        grainPos[i3] = gX;
        grainPos[i3 + 1] = gY;
        grainPos[i3 + 2] = gZ;
      }
      grainParticles.geometry.attributes.position.needsUpdate = true;
      
      (grainMaterial as THREE.ShaderMaterial).uniforms.u_time.value = elapsed;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      bgGeometry.dispose();
      bgMaterial.dispose();
      grainGeometry.dispose();
      grainMaterial.dispose();
      blobMeshes.forEach(mesh => {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.MeshBasicMaterial).dispose();
      });
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (container.contains(rendererRef.current.domElement)) {
          container.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!tiltEnabled) return;

    const handleTilt = (e: DeviceOrientationEvent) => {
      tiltRef.current.x = (e.gamma || 0) / 25;
      tiltRef.current.y = (e.beta || 0) / 25;
    };

    window.addEventListener('deviceorientation', handleTilt);
    return () => window.removeEventListener('deviceorientation', handleTilt);
  }, [tiltEnabled]);

  const enableTilt = async () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      'requestPermission' in DeviceOrientationEvent
    ) {
      try {
        const permission = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (permission === 'granted') {
          setTiltEnabled(true);
          setShowTiltButton(false);
        }
      } catch {
        setTiltEnabled(true);
        setShowTiltButton(false);
      }
    } else {
      setTiltEnabled(true);
      setShowTiltButton(false);
    }
  };

  useEffect(() => {
    if (timeElapsed >= 10 && !hasSavedRef.current) {
      hasSavedRef.current = true;
      addSessionEntry('Rising', {
        title: 'Rising – Grounded',
        body: 'You took a moment to let stillness find you.',
        tags: ['calm', 'ambient', 'rising'],
        metadata: { duration: timeElapsed }
      });
    }
  }, [timeElapsed, addSessionEntry]);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#0E0F0D' }}>
      <div 
        ref={containerRef} 
        className="absolute inset-0"
        style={{ zIndex: 1 }}
      />

      <AnimatePresence>
        {showTitle && (
          <motion.div
            className="absolute z-10 pointer-events-none"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: 0.5, duration: 1.2, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <h1
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '36px',
                fontWeight: 400,
                color: 'rgba(242, 240, 236, 0.9)',
                letterSpacing: '0.02em',
                margin: 0,
                textShadow: '0 2px 20px rgba(0,0,0,0.5)',
              }}
            >
              Rising
            </h1>
            <p
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '16px',
                fontWeight: 300,
                color: 'rgba(199, 197, 192, 0.7)',
                marginTop: '12px',
                letterSpacing: '0.01em',
              }}
            >
              Let this moment settle you.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTiltButton && (
          <motion.button
            onClick={enableTilt}
            className="absolute z-20 flex items-center justify-center"
            style={{
              bottom: '90px',
              left: '50%',
              marginLeft: '-24px',
              width: '48px',
              height: '48px',
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '50%',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.12)' }}
            whileTap={{ scale: 0.95 }}
          >
            <Move size={20} strokeWidth={1.5} />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="absolute bottom-0 left-0 right-0 z-30">
        <BottomNav
          activeScreen="activities"
          onNavigateHome={onReturnToChat}
          onNavigateActivities={onNavigateToActivities}
          onNavigateJournal={onNavigateToJournal}
          onNavigateProfile={onNavigateToProfile}
          onNavigateHelp={onNavigateToHelp}
        />
      </div>
    </div>
  );
}
