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

    // Vibes palette - clustered by color family
    const colorFamilies = [
      // Teal family - cluster 0 (UP direction)
      [
        new THREE.Color(0x3D6B6E),
        new THREE.Color(0x4A7C7E),
        new THREE.Color(0x5A8B8D),
        new THREE.Color(0x2D5558),
        new THREE.Color(0x6A9B9E),
      ],
      // Sage family - cluster 1 (RIGHT direction)
      [
        new THREE.Color(0x6B9E8C),
        new THREE.Color(0x7AAE9C),
        new THREE.Color(0x5A8E7C),
        new THREE.Color(0x8ABEA8),
        new THREE.Color(0x4A7E6C),
      ],
      // Orange family - cluster 2 (DOWN direction)
      [
        new THREE.Color(0xD97B3D),
        new THREE.Color(0xE88B4D),
        new THREE.Color(0xC96B2D),
        new THREE.Color(0xF09B5D),
        new THREE.Color(0xB85B1D),
      ],
      // Cream family - cluster 3 (LEFT direction)
      [
        new THREE.Color(0xF5EFE6),
        new THREE.Color(0xE8DED1),
        new THREE.Color(0xD4C9BC),
        new THREE.Color(0xFAF6F0),
        new THREE.Color(0xEDE4D8),
      ],
    ];

    const frameHeight = 35;
    const frameWidth = frameHeight * (width / height) * 0.85;
    
    // Main particles - clustered by color, start invisible at center
    const particleCount = 12000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colorAttrib = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);
    const startTimes = new Float32Array(particleCount);
    const lifespans = new Float32Array(particleCount);
    const origins = new Float32Array(particleCount * 3);
    const phases = new Float32Array(particleCount);
    const clusterIds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Assign to a color cluster (0-3)
      const cluster = Math.floor(Math.random() * 4);
      clusterIds[i] = cluster;
      
      // All particles start at CENTER (invisible until burst)
      origins[i3] = 0;
      origins[i3 + 1] = 0;
      origins[i3 + 2] = -5;
      
      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = -5;

      // Direction based on cluster - each color family goes a different direction
      const speed = 8 + Math.random() * 18;
      const spread = (Math.random() - 0.5) * 12;
      const towardCamera = 12 + Math.random() * 25;
      
      let vx = 0, vy = 0;
      switch (cluster) {
        case 0: // Teal goes UP
          vx = spread;
          vy = speed;
          break;
        case 1: // Sage goes RIGHT
          vx = speed;
          vy = spread;
          break;
        case 2: // Orange goes DOWN
          vx = spread;
          vy = -speed;
          break;
        case 3: // Cream goes LEFT
          vx = -speed;
          vy = spread;
          break;
      }
      
      velocities[i3] = vx;
      velocities[i3 + 1] = vy;
      velocities[i3 + 2] = towardCamera;

      // Color from the cluster's family
      const family = colorFamilies[cluster];
      const color = family[Math.floor(Math.random() * family.length)];
      colorAttrib[i3] = color.r;
      colorAttrib[i3 + 1] = color.g;
      colorAttrib[i3 + 2] = color.b;

      // Varied sizes
      const sizeType = Math.random();
      if (sizeType < 0.12) {
        sizes[i] = 5 + Math.random() * 6;
      } else if (sizeType < 0.35) {
        sizes[i] = 2.5 + Math.random() * 3;
      } else {
        sizes[i] = 0.6 + Math.random() * 1.8;
      }

      // Staggered slow burst
      startTimes[i] = Math.random() * 3.0;
      lifespans[i] = 3.0 + Math.random() * 2.5;
      phases[i] = Math.random() * Math.PI * 2;
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
          
          float sizeAtten = size * u_pixelRatio * (280.0 / -mvPosition.z);
          gl_PointSize = clamp(sizeAtten, 1.0, 120.0);
          
          // Alpha based on distance from center - invisible at center, visible when moving out
          float distFromCenter = length(position.xy);
          float zProgress = smoothstep(-5.0, 30.0, position.z);
          
          // Only visible once burst out from center
          vAlpha = smoothstep(0.0, 5.0, distFromCenter) * smoothstep(-5.0, 5.0, position.z) * (1.0 - zProgress * 0.3);
          
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
          
          float glow = exp(-dist * 3.0) * 0.4;
          vec3 finalColor = vColor + vec3(1.0) * glow * 0.15;
          
          if (alpha < 0.01) discard;
          
          gl_FragColor = vec4(finalColor, alpha * 0.9);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      vertexColors: true
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Phone frame
    const frameShape = new THREE.Shape();
    const cornerRadius = 2;
    const hw = frameWidth / 2;
    const hh = frameHeight / 2;
    
    frameShape.moveTo(-hw + cornerRadius, -hh);
    frameShape.lineTo(hw - cornerRadius, -hh);
    frameShape.quadraticCurveTo(hw, -hh, hw, -hh + cornerRadius);
    frameShape.lineTo(hw, hh - cornerRadius);
    frameShape.quadraticCurveTo(hw, hh, hw - cornerRadius, hh);
    frameShape.lineTo(-hw + cornerRadius, hh);
    frameShape.quadraticCurveTo(-hw, hh, -hw, hh - cornerRadius);
    frameShape.lineTo(-hw, -hh + cornerRadius);
    frameShape.quadraticCurveTo(-hw, -hh, -hw + cornerRadius, -hh);

    const framePoints = frameShape.getPoints(50);
    const frameGeometry = new THREE.BufferGeometry().setFromPoints(
      framePoints.map(p => new THREE.Vector3(p.x, p.y, 0))
    );
    const frameMaterial = new THREE.LineBasicMaterial({ 
      color: 0xdddddd, 
      transparent: true, 
      opacity: 0.3 
    });
    const frameLine = new THREE.LineLoop(frameGeometry, frameMaterial);
    scene.add(frameLine);

    // Edge grain particles
    const grainCount = 2000;
    const grainGeometry = new THREE.BufferGeometry();
    const grainPositions = new Float32Array(grainCount * 3);
    const grainColors = new Float32Array(grainCount * 3);
    const grainSizes = new Float32Array(grainCount);
    const grainVelocities = new Float32Array(grainCount * 3);
    const grainStarts = new Float32Array(grainCount);
    const grainLifes = new Float32Array(grainCount);
    const grainOrigins = new Float32Array(grainCount * 3);
    const grainClusters = new Float32Array(grainCount);

    for (let i = 0; i < grainCount; i++) {
      const i3 = i * 3;
      
      // Start at center
      grainOrigins[i3] = 0;
      grainOrigins[i3 + 1] = 0;
      grainOrigins[i3 + 2] = 0;
      
      grainPositions[i3] = 0;
      grainPositions[i3 + 1] = 0;
      grainPositions[i3 + 2] = 0;
      
      const cluster = Math.floor(Math.random() * 4);
      grainClusters[i] = cluster;
      
      const gSpeed = 5 + Math.random() * 12;
      const gSpread = (Math.random() - 0.5) * 8;
      
      let gvx = 0, gvy = 0;
      switch (cluster) {
        case 0: gvx = gSpread; gvy = gSpeed; break;
        case 1: gvx = gSpeed; gvy = gSpread; break;
        case 2: gvx = gSpread; gvy = -gSpeed; break;
        case 3: gvx = -gSpeed; gvy = gSpread; break;
      }
      
      grainVelocities[i3] = gvx;
      grainVelocities[i3 + 1] = gvy;
      grainVelocities[i3 + 2] = 6 + Math.random() * 12;
      
      const family = colorFamilies[cluster];
      const gColor = family[Math.floor(Math.random() * family.length)];
      grainColors[i3] = gColor.r;
      grainColors[i3 + 1] = gColor.g;
      grainColors[i3 + 2] = gColor.b;
      
      grainSizes[i] = 0.3 + Math.random() * 1.0;
      grainStarts[i] = Math.random() * 3.5;
      grainLifes[i] = 2.5 + Math.random() * 2.0;
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
          gl_PointSize = size * u_pixelRatio * (160.0 / -mvPosition.z);
          
          float distFromCenter = length(position.xy);
          vAlpha = smoothstep(0.0, 3.0, distFromCenter) * smoothstep(-2.0, 8.0, position.z) * 0.7;
          
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
        cameraRef.current.position.x = tiltRef.current.x * 6;
        cameraRef.current.position.y = tiltRef.current.y * 4;
        cameraRef.current.lookAt(0, 0, 0);
      }

      const posAttr = particles.geometry.attributes.position.array as Float32Array;
      const posCount = posAttr.length / 3;
      
      (material as THREE.ShaderMaterial).uniforms.u_time.value = elapsed;

      for (let i = 0; i < posCount; i++) {
        const i3 = i * 3;
        
        const cycleTime = 5.5;
        const particleTime = (elapsed - startTimes[i] + cycleTime) % cycleTime;
        const lifeProgress = particleTime / lifespans[i];

        if (lifeProgress >= 0 && lifeProgress < 1.0) {
          // Very smooth, slow easing for gentle burst
          const easeOut = 1.0 - Math.pow(1.0 - Math.min(lifeProgress * 1.2, 1.0), 3);
          
          posAttr[i3] = origins[i3] + velocities[i3] * particleTime * easeOut;
          posAttr[i3 + 1] = origins[i3 + 1] + velocities[i3 + 1] * particleTime * easeOut;
          posAttr[i3 + 2] = origins[i3 + 2] + velocities[i3 + 2] * particleTime * easeOut;
          
          // Gentle scatter at end
          if (lifeProgress > 0.7) {
            const scatterProgress = (lifeProgress - 0.7) / 0.3;
            const scatterForce = Math.pow(scatterProgress, 2) * 8;
            
            posAttr[i3] += Math.sin(phases[i] * 5 + elapsed * 2) * scatterForce;
            posAttr[i3 + 1] += Math.cos(phases[i] * 4 + elapsed * 2.5) * scatterForce;
          }
          
          // Subtle wobble
          const wobble = Math.sin(elapsed * 1.5 + phases[i]) * 0.3;
          posAttr[i3] += wobble;
        } else {
          posAttr[i3] = origins[i3];
          posAttr[i3 + 1] = origins[i3 + 1];
          posAttr[i3 + 2] = origins[i3 + 2];
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;

      // Update grain
      const grainPos = grainParticles.geometry.attributes.position.array as Float32Array;
      const grainCnt = grainPos.length / 3;
      
      for (let i = 0; i < grainCnt; i++) {
        const i3 = i * 3;
        const cycleTime = 5.5;
        const pTime = (elapsed - grainStarts[i] + cycleTime) % cycleTime;
        const life = pTime / grainLifes[i];
        
        if (life >= 0 && life < 1.0) {
          const ease = 1.0 - Math.pow(1.0 - Math.min(life * 1.3, 1.0), 3);
          grainPos[i3] = grainOrigins[i3] + grainVelocities[i3] * pTime * ease;
          grainPos[i3 + 1] = grainOrigins[i3 + 1] + grainVelocities[i3 + 1] * pTime * ease;
          grainPos[i3 + 2] = grainOrigins[i3 + 2] + grainVelocities[i3 + 2] * pTime * ease;
        } else {
          grainPos[i3] = grainOrigins[i3];
          grainPos[i3 + 1] = grainOrigins[i3 + 1];
          grainPos[i3 + 2] = grainOrigins[i3 + 2];
        }
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
      frameGeometry.dispose();
      frameMaterial.dispose();
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
