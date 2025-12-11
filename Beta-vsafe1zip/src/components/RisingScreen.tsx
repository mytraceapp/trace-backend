import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
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
  onBack,
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
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const startTimeRef = useRef<number>(0);
  const hasSavedRef = useRef(false);
  const tiltRef = useRef({ x: 0, y: 0 });
  
  const [tiltEnabled, setTiltEnabled] = useState(false);
  const [showTiltButton, setShowTiltButton] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0c);
    sceneRef.current = scene;

    // Perspective camera - particles will fly toward this
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 30;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // TRACE color palette
    const colors = [
      new THREE.Color(0x8C9E85), // sage
      new THREE.Color(0x94695B), // mocha
      new THREE.Color(0xF2EBD9), // cream
      new THREE.Color(0xA8B5A0), // light sage
      new THREE.Color(0xD4C4B5), // warm cream
      new THREE.Color(0x6B7D65), // deep sage
      new THREE.Color(0x7A5548), // deep mocha
    ];

    // Create multiple burst particle systems
    const particleSystems: {
      points: THREE.Points;
      velocities: Float32Array;
      startTimes: Float32Array;
      lifespans: Float32Array;
      origins: Float32Array;
    }[] = [];

    const createBurstSystem = (particleCount: number, baseSpeed: number, size: number) => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colorAttrib = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);
      const velocities = new Float32Array(particleCount * 3);
      const startTimes = new Float32Array(particleCount);
      const lifespans = new Float32Array(particleCount);
      const origins = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Start at center with slight random offset
        origins[i3] = (Math.random() - 0.5) * 4;
        origins[i3 + 1] = (Math.random() - 0.5) * 4;
        origins[i3 + 2] = -50 + Math.random() * 20; // Start behind
        
        positions[i3] = origins[i3];
        positions[i3 + 1] = origins[i3 + 1];
        positions[i3 + 2] = origins[i3 + 2];

        // Velocity - burst outward in all directions, biased toward camera (+Z)
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const speed = baseSpeed * (0.5 + Math.random() * 1.0);
        
        velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed * 0.6;
        velocities[i3 + 1] = Math.sin(phi) * Math.sin(theta) * speed * 0.6;
        velocities[i3 + 2] = Math.abs(Math.cos(phi)) * speed * 1.5 + speed * 0.5; // Bias toward camera

        // Random color from palette
        const color = colors[Math.floor(Math.random() * colors.length)];
        colorAttrib[i3] = color.r;
        colorAttrib[i3 + 1] = color.g;
        colorAttrib[i3 + 2] = color.b;

        // Random size with variation
        sizes[i] = size * (0.3 + Math.random() * 1.0);

        // Staggered start times for continuous effect
        startTimes[i] = Math.random() * 3.0;
        lifespans[i] = 2.0 + Math.random() * 2.0;
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
            
            // Size attenuation - particles get bigger as they come closer
            float sizeAtten = size * u_pixelRatio * (300.0 / -mvPosition.z);
            gl_PointSize = clamp(sizeAtten, 1.0, 100.0);
            
            // Alpha based on distance
            float dist = length(position.xy);
            vAlpha = smoothstep(80.0, 0.0, dist) * smoothstep(-10.0, 30.0, position.z);
            
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vAlpha;
          
          void main() {
            // Soft circular particle
            vec2 center = gl_PointCoord - 0.5;
            float dist = length(center);
            float alpha = smoothstep(0.5, 0.1, dist) * vAlpha;
            
            // Add glow
            float glow = exp(-dist * 3.0) * 0.5;
            
            vec3 finalColor = vColor + vColor * glow;
            
            if (alpha < 0.01) discard;
            
            gl_FragColor = vec4(finalColor, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true
      });

      const points = new THREE.Points(geometry, material);
      scene.add(points);

      return { points, velocities, startTimes, lifespans, origins };
    };

    // Create main burst system - large colorful particles
    particleSystems.push(createBurstSystem(800, 15, 3.0));
    
    // Create secondary system - medium particles for depth
    particleSystems.push(createBurstSystem(1200, 20, 2.0));
    
    // Create dust system - fine grain particles
    particleSystems.push(createBurstSystem(2000, 25, 1.0));

    // Create ambient floating particles
    const ambientGeometry = new THREE.BufferGeometry();
    const ambientCount = 500;
    const ambientPositions = new Float32Array(ambientCount * 3);
    const ambientColors = new Float32Array(ambientCount * 3);
    const ambientSizes = new Float32Array(ambientCount);

    for (let i = 0; i < ambientCount; i++) {
      const i3 = i * 3;
      ambientPositions[i3] = (Math.random() - 0.5) * 100;
      ambientPositions[i3 + 1] = (Math.random() - 0.5) * 100;
      ambientPositions[i3 + 2] = (Math.random() - 0.5) * 100;
      
      const color = colors[Math.floor(Math.random() * colors.length)];
      ambientColors[i3] = color.r;
      ambientColors[i3 + 1] = color.g;
      ambientColors[i3 + 2] = color.b;
      
      ambientSizes[i] = 0.5 + Math.random() * 1.5;
    }

    ambientGeometry.setAttribute('position', new THREE.BufferAttribute(ambientPositions, 3));
    ambientGeometry.setAttribute('color', new THREE.BufferAttribute(ambientColors, 3));
    ambientGeometry.setAttribute('size', new THREE.BufferAttribute(ambientSizes, 1));

    const ambientMaterial = new THREE.ShaderMaterial({
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
          
          // Gentle floating motion
          vec3 pos = position;
          pos.x += sin(u_time * 0.3 + position.y * 0.1) * 2.0;
          pos.y += cos(u_time * 0.2 + position.x * 0.1) * 2.0;
          pos.z += sin(u_time * 0.1 + position.z * 0.1) * 1.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * u_pixelRatio * (200.0 / -mvPosition.z);
          
          vAlpha = 0.3;
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          float alpha = smoothstep(0.5, 0.2, dist) * vAlpha;
          
          if (alpha < 0.01) discard;
          
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    const ambientParticles = new THREE.Points(ambientGeometry, ambientMaterial);
    scene.add(ambientParticles);

    startTimeRef.current = performance.now();

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startTimeRef.current) / 1000.0;
      setTimeElapsed(Math.floor(elapsed));

      // Apply tilt to camera
      if (cameraRef.current) {
        cameraRef.current.position.x = tiltRef.current.x * 5;
        cameraRef.current.position.y = tiltRef.current.y * 3;
        cameraRef.current.lookAt(0, 0, 0);
      }

      // Update particle systems
      particleSystems.forEach((system) => {
        const positions = system.points.geometry.attributes.position.array as Float32Array;
        const particleCount = positions.length / 3;
        
        (system.points.material as THREE.ShaderMaterial).uniforms.u_time.value = elapsed;

        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          
          // Calculate particle age with loop
          const cycleTime = 3.0; // Burst cycle duration
          const particleTime = (elapsed - system.startTimes[i]) % cycleTime;
          const lifeProgress = particleTime / system.lifespans[i];

          if (lifeProgress < 1.0 && lifeProgress >= 0) {
            // Particle is alive - update position
            const easeOut = 1.0 - Math.pow(1.0 - lifeProgress, 2);
            
            positions[i3] = system.origins[i3] + system.velocities[i3] * particleTime * easeOut;
            positions[i3 + 1] = system.origins[i3 + 1] + system.velocities[i3 + 1] * particleTime * easeOut;
            positions[i3 + 2] = system.origins[i3 + 2] + system.velocities[i3 + 2] * particleTime * easeOut;
            
            // Add wobble
            const wobble = Math.sin(elapsed * 3 + i) * 0.5;
            positions[i3] += wobble;
            positions[i3 + 1] += wobble * 0.5;
          } else {
            // Reset particle to origin for next burst
            positions[i3] = system.origins[i3];
            positions[i3 + 1] = system.origins[i3 + 1];
            positions[i3 + 2] = system.origins[i3 + 2];
          }
        }

        system.points.geometry.attributes.position.needsUpdate = true;
      });

      // Update ambient material time
      (ambientMaterial as THREE.ShaderMaterial).uniforms.u_time.value = elapsed;

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
      particleSystems.forEach(system => {
        system.points.geometry.dispose();
        (system.points.material as THREE.Material).dispose();
      });
      ambientGeometry.dispose();
      ambientMaterial.dispose();
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
      tiltRef.current.x = (e.gamma || 0) / 30;
      tiltRef.current.y = (e.beta || 0) / 30;
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

  const handleBack = () => {
    if (!hasSavedRef.current && timeElapsed >= 10) {
      hasSavedRef.current = true;
      addSessionEntry('Rising', {
        title: 'Rising – Grounded',
        body: 'You took a moment to let stillness find you.',
        tags: ['calm', 'ambient', 'rising'],
        metadata: { duration: timeElapsed }
      });
    }
    onBack();
  };

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#0a0a0c' }}>
      <div 
        ref={containerRef} 
        className="absolute inset-0"
        style={{ zIndex: 1 }}
      />

      <motion.button
        onClick={handleBack}
        className="absolute z-20 flex items-center gap-2 transition-all duration-300"
        style={{
          top: '60px',
          left: '20px',
          padding: '8px 14px',
          borderRadius: '999px',
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '14px',
        }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <ArrowLeft size={16} />
        <span>Back</span>
      </motion.button>

      <motion.div
        className="absolute z-10 text-center"
        style={{
          top: '38%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 1.2, ease: [0.22, 0.61, 0.36, 1] }}
      >
        <h1
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '32px',
            fontWeight: 400,
            color: 'rgba(245, 240, 230, 0.95)',
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
            fontSize: '15px',
            fontWeight: 300,
            color: 'rgba(245, 240, 230, 0.65)',
            marginTop: '10px',
            letterSpacing: '0.01em',
          }}
        >
          Let this moment settle you.
        </p>
      </motion.div>

      <AnimatePresence>
        {showTiltButton && (
          <motion.button
            onClick={enableTilt}
            className="absolute z-20"
            style={{
              bottom: '100px',
              right: '20px',
              padding: '8px 14px',
              fontSize: '12px',
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '999px',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Enable Tilt
          </motion.button>
        )}
      </AnimatePresence>

      <BottomNav
        activeScreen="activities"
        onNavigateHome={onReturnToChat}
        onNavigateActivities={onNavigateToActivities}
        onNavigateJournal={onNavigateToJournal}
        onNavigateProfile={onNavigateToProfile}
        onNavigateHelp={onNavigateToHelp}
        variant="transparent"
      />
    </div>
  );
}
