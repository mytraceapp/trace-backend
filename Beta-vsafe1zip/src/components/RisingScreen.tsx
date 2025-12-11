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
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 50;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Helper to create lighter/darker ambient variations
    const createVariations = (baseColors: number[]): THREE.Color[] => {
      const result: THREE.Color[] = [];
      baseColors.forEach(hex => {
        const base = new THREE.Color(hex);
        result.push(base);
        result.push(new THREE.Color().copy(base).lerp(new THREE.Color(0xffffff), 0.25));
        result.push(new THREE.Color().copy(base).lerp(new THREE.Color(0xffffff), 0.45));
        result.push(new THREE.Color().copy(base).lerp(new THREE.Color(0x000000), 0.15));
        result.push(new THREE.Color().copy(base).lerp(new THREE.Color(0x000000), 0.3));
      });
      return result;
    };

    // Vibes palette with ambient variations
    const colorFamilies = [
      createVariations([0x3D6B6E, 0x4A7C7E, 0x5A8B8D, 0x2D5558]), // Teal - TOP
      createVariations([0x6B9E8C, 0x7AAE9C, 0x5A8E7C, 0x8ABEA8]), // Sage - RIGHT
      createVariations([0xD97B3D, 0xE88B4D, 0xC96B2D, 0xF09B5D]), // Orange - BOTTOM
      createVariations([0xF5EFE6, 0xE8DED1, 0xD4C9BC, 0xEDE4D8]), // Cream - LEFT
    ];

    // Burst timing for sequential appearance
    const clusterBurstDelays = [0.0, 2.0, 4.0, 6.0];
    
    // Screen-filling particles that STAY in their cluster area
    const particleCount = 20000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colorAttrib = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const homePositions = new Float32Array(particleCount * 3); // Where they settle
    const phases = new Float32Array(particleCount);
    const rotationSpeeds = new Float32Array(particleCount);
    const clusterIds = new Float32Array(particleCount);
    const burstProgress = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      const cluster = Math.floor(Math.random() * 4);
      clusterIds[i] = cluster;
      
      // Home positions - where particles STAY and rotate
      // Each cluster fills a quadrant of the screen
      let homeX = 0, homeY = 0;
      const spreadX = 25 + Math.random() * 20;
      const spreadY = 20 + Math.random() * 18;
      
      switch (cluster) {
        case 0: // Teal - TOP area
          homeX = (Math.random() - 0.5) * 50;
          homeY = 8 + Math.random() * spreadY;
          break;
        case 1: // Sage - RIGHT area
          homeX = 10 + Math.random() * spreadX;
          homeY = (Math.random() - 0.5) * 45;
          break;
        case 2: // Orange - BOTTOM area
          homeX = (Math.random() - 0.5) * 50;
          homeY = -8 - Math.random() * spreadY;
          break;
        case 3: // Cream - LEFT area
          homeX = -10 - Math.random() * spreadX;
          homeY = (Math.random() - 0.5) * 45;
          break;
      }
      
      homePositions[i3] = homeX;
      homePositions[i3 + 1] = homeY;
      homePositions[i3 + 2] = -5 + Math.random() * 30;
      
      // Start at center (will burst out to home position)
      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = -5;

      // Color from the cluster's family
      const family = colorFamilies[cluster];
      const color = family[Math.floor(Math.random() * family.length)];
      colorAttrib[i3] = color.r;
      colorAttrib[i3 + 1] = color.g;
      colorAttrib[i3 + 2] = color.b;

      // Varied sizes
      const sizeType = Math.random();
      if (sizeType < 0.08) {
        sizes[i] = 5 + Math.random() * 7;
      } else if (sizeType < 0.25) {
        sizes[i] = 2.5 + Math.random() * 3.5;
      } else {
        sizes[i] = 0.6 + Math.random() * 2;
      }

      phases[i] = Math.random() * Math.PI * 2;
      rotationSpeeds[i] = 0.3 + Math.random() * 0.6;
      burstProgress[i] = Math.random() * 0.5; // Stagger within cluster
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
          
          float sizeAtten = size * u_pixelRatio * (300.0 / -mvPosition.z);
          gl_PointSize = clamp(sizeAtten, 1.0, 130.0);
          
          // Full opacity once in place
          float distFromCenter = length(position.xy);
          vAlpha = smoothstep(0.0, 3.0, distFromCenter) * 0.9;
          
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
          
          float glow = exp(-dist * 2.5) * 0.3;
          vec3 finalColor = vColor + vec3(1.0) * glow * 0.1;
          
          if (alpha < 0.005) discard;
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      vertexColors: true
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Grain particles - also stay in their areas
    const grainCount = 4000;
    const grainGeometry = new THREE.BufferGeometry();
    const grainPositions = new Float32Array(grainCount * 3);
    const grainColors = new Float32Array(grainCount * 3);
    const grainSizes = new Float32Array(grainCount);
    const grainHomes = new Float32Array(grainCount * 3);
    const grainPhases = new Float32Array(grainCount);
    const grainClusters = new Float32Array(grainCount);

    for (let i = 0; i < grainCount; i++) {
      const i3 = i * 3;
      
      const cluster = Math.floor(Math.random() * 4);
      grainClusters[i] = cluster;
      
      let gHomeX = 0, gHomeY = 0;
      const gSpreadX = 28 + Math.random() * 15;
      const gSpreadY = 22 + Math.random() * 12;
      
      switch (cluster) {
        case 0: gHomeX = (Math.random() - 0.5) * 55; gHomeY = 5 + Math.random() * gSpreadY; break;
        case 1: gHomeX = 8 + Math.random() * gSpreadX; gHomeY = (Math.random() - 0.5) * 50; break;
        case 2: gHomeX = (Math.random() - 0.5) * 55; gHomeY = -5 - Math.random() * gSpreadY; break;
        case 3: gHomeX = -8 - Math.random() * gSpreadX; gHomeY = (Math.random() - 0.5) * 50; break;
      }
      
      grainHomes[i3] = gHomeX;
      grainHomes[i3 + 1] = gHomeY;
      grainHomes[i3 + 2] = Math.random() * 20;
      
      grainPositions[i3] = 0;
      grainPositions[i3 + 1] = 0;
      grainPositions[i3 + 2] = 0;
      
      const family = colorFamilies[cluster];
      const gColor = family[Math.floor(Math.random() * family.length)];
      grainColors[i3] = gColor.r;
      grainColors[i3 + 1] = gColor.g;
      grainColors[i3 + 2] = gColor.b;
      
      grainSizes[i] = 0.3 + Math.random() * 1.0;
      grainPhases[i] = Math.random() * Math.PI * 2;
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
          gl_PointSize = size * u_pixelRatio * (180.0 / -mvPosition.z);
          
          float distFromCenter = length(position.xy);
          vAlpha = smoothstep(0.0, 2.0, distFromCenter) * 0.6;
          
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
      blending: THREE.NormalBlending,
      depthWrite: false,
      vertexColors: true
    });

    const grainParticles = new THREE.Points(grainGeometry, grainMaterial);
    scene.add(grainParticles);

    startTimeRef.current = performance.now();

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startTimeRef.current) / 1000.0;
      setTimeElapsed(Math.floor(elapsed));

      if (cameraRef.current) {
        cameraRef.current.position.x = tiltRef.current.x * 5;
        cameraRef.current.position.y = tiltRef.current.y * 3;
        cameraRef.current.lookAt(0, 0, 0);
      }

      const posAttr = particles.geometry.attributes.position.array as Float32Array;
      const posCount = posAttr.length / 3;
      
      (material as THREE.ShaderMaterial).uniforms.u_time.value = elapsed;

      for (let i = 0; i < posCount; i++) {
        const i3 = i * 3;
        const cluster = clusterIds[i];
        
        // Calculate burst progress for this cluster
        const clusterDelay = clusterBurstDelays[cluster];
        const timeSinceBurst = elapsed - clusterDelay - burstProgress[i] * 1.5;
        
        // Smooth burst out to home position over 3 seconds
        const burstT = Math.max(0, Math.min(1, timeSinceBurst / 3.0));
        const easeOut = 1.0 - Math.pow(1.0 - burstT, 3);
        
        // Interpolate from center to home position
        const homeX = homePositions[i3];
        const homeY = homePositions[i3 + 1];
        const homeZ = homePositions[i3 + 2];
        
        // Current position based on burst progress
        let currentX = homeX * easeOut;
        let currentY = homeY * easeOut;
        let currentZ = -5 + (homeZ + 5) * easeOut;
        
        // Once burst complete, add rotation/swirl within cluster area
        if (burstT >= 1.0) {
          const rotTime = elapsed * rotationSpeeds[i];
          const rotRadius = 2 + Math.sin(phases[i] * 3) * 1.5;
          
          // Gentle rotation around home position
          currentX += Math.sin(rotTime + phases[i]) * rotRadius;
          currentY += Math.cos(rotTime + phases[i] * 1.3) * rotRadius;
          currentZ += Math.sin(rotTime * 0.5 + phases[i]) * 1.5;
          
          // Gentle drift
          currentX += Math.sin(elapsed * 0.3 + phases[i] * 2) * 1.0;
          currentY += Math.cos(elapsed * 0.25 + phases[i] * 1.5) * 0.8;
        }
        
        posAttr[i3] = currentX;
        posAttr[i3 + 1] = currentY;
        posAttr[i3 + 2] = currentZ;
      }
      particles.geometry.attributes.position.needsUpdate = true;

      // Update grain with same logic
      const grainPos = grainParticles.geometry.attributes.position.array as Float32Array;
      const grainCnt = grainPos.length / 3;
      
      for (let i = 0; i < grainCnt; i++) {
        const i3 = i * 3;
        const cluster = grainClusters[i];
        
        const clusterDelay = clusterBurstDelays[cluster];
        const timeSinceBurst = elapsed - clusterDelay - (grainPhases[i] / Math.PI) * 1.5;
        
        const burstT = Math.max(0, Math.min(1, timeSinceBurst / 3.0));
        const easeOut = 1.0 - Math.pow(1.0 - burstT, 3);
        
        const gHomeX = grainHomes[i3];
        const gHomeY = grainHomes[i3 + 1];
        const gHomeZ = grainHomes[i3 + 2];
        
        let gX = gHomeX * easeOut;
        let gY = gHomeY * easeOut;
        let gZ = gHomeZ * easeOut;
        
        if (burstT >= 1.0) {
          const rotTime = elapsed * 0.4;
          gX += Math.sin(rotTime + grainPhases[i]) * 1.5;
          gY += Math.cos(rotTime + grainPhases[i] * 1.2) * 1.2;
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
      grainGeometry.dispose();
      grainMaterial.dispose();
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
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#ffffff' }}>
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
                color: 'rgba(60, 60, 60, 0.9)',
                letterSpacing: '0.02em',
                margin: 0,
                textShadow: '0 2px 20px rgba(255,255,255,0.8)',
              }}
            >
              Rising
            </h1>
            <p
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '16px',
                fontWeight: 300,
                color: 'rgba(80, 80, 80, 0.7)',
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
              background: 'rgba(0,0,0,0.06)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '50%',
              color: 'rgba(0,0,0,0.5)',
              cursor: 'pointer',
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            whileHover={{ scale: 1.05, background: 'rgba(0,0,0,0.1)' }}
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
