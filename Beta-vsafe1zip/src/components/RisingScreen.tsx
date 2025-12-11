import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Move } from 'lucide-react';
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
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const startTimeRef = useRef<number>(0);
  const hasSavedRef = useRef(false);
  const tiltRef = useRef({ x: 0, y: 0 });
  
  const [tiltEnabled, setTiltEnabled] = useState(false);
  const [showTiltButton, setShowTiltButton] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showTitle, setShowTitle] = useState(true);

  // Fade out title after 7 seconds
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

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0c);

    // Perspective camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 50;
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
      new THREE.Color(0xC4B896), // gold cream
    ];

    // Create rectangular frame geometry (the "frame" that particles burst from)
    const frameWidth = 20;
    const frameHeight = 30;
    
    // Particle system for burst effect
    const particleCount = 4000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colorAttrib = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);
    const startTimes = new Float32Array(particleCount);
    const lifespans = new Float32Array(particleCount);
    const origins = new Float32Array(particleCount * 3);
    const phases = new Float32Array(particleCount); // For explosion timing

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Start positions - particles originate within or around the rectangular frame
      const edgeChance = Math.random();
      let startX, startY;
      
      if (edgeChance < 0.3) {
        // Edge particles - burst from frame edges
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) { startX = (Math.random() - 0.5) * frameWidth; startY = frameHeight / 2; }
        else if (edge === 1) { startX = (Math.random() - 0.5) * frameWidth; startY = -frameHeight / 2; }
        else if (edge === 2) { startX = frameWidth / 2; startY = (Math.random() - 0.5) * frameHeight; }
        else { startX = -frameWidth / 2; startY = (Math.random() - 0.5) * frameHeight; }
      } else {
        // Interior particles - start inside frame
        startX = (Math.random() - 0.5) * frameWidth * 0.9;
        startY = (Math.random() - 0.5) * frameHeight * 0.9;
      }
      
      origins[i3] = startX;
      origins[i3 + 1] = startY;
      origins[i3 + 2] = 0;
      
      positions[i3] = startX;
      positions[i3 + 1] = startY;
      positions[i3 + 2] = 0;

      // Velocity - burst outward from center, then upward, biased toward camera
      const angle = Math.atan2(startY, startX);
      const outwardSpeed = 5 + Math.random() * 15;
      const upwardBias = 8 + Math.random() * 12;
      const towardCamera = 15 + Math.random() * 25;
      
      velocities[i3] = Math.cos(angle) * outwardSpeed * (0.5 + Math.random() * 0.8);
      velocities[i3 + 1] = Math.sin(angle) * outwardSpeed * 0.5 + upwardBias;
      velocities[i3 + 2] = towardCamera;

      // Random color from palette
      const color = colors[Math.floor(Math.random() * colors.length)];
      colorAttrib[i3] = color.r;
      colorAttrib[i3 + 1] = color.g;
      colorAttrib[i3 + 2] = color.b;

      // Random size
      sizes[i] = 0.8 + Math.random() * 2.5;

      // Staggered start times for continuous effect
      startTimes[i] = Math.random() * 4.0;
      lifespans[i] = 2.5 + Math.random() * 2.0;
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
          
          // Size attenuation - particles get bigger as they come closer
          float sizeAtten = size * u_pixelRatio * (250.0 / -mvPosition.z);
          gl_PointSize = clamp(sizeAtten, 1.0, 120.0);
          
          // Alpha based on z position - fade as they get very close
          vAlpha = smoothstep(80.0, 20.0, position.z) * smoothstep(-5.0, 10.0, position.z);
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          
          // Soft circular particle with grain
          float alpha = smoothstep(0.5, 0.05, dist) * vAlpha;
          
          // Add inner glow
          float glow = exp(-dist * 4.0) * 0.6;
          vec3 finalColor = vColor + vColor * glow;
          
          // Add slight grain
          float grain = fract(sin(dot(gl_PointCoord, vec2(12.9898, 78.233))) * 43758.5453);
          alpha *= 0.85 + grain * 0.15;
          
          if (alpha < 0.01) discard;
          
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

    // Add subtle rectangular frame outline (barely visible)
    const frameGeometry = new THREE.BufferGeometry();
    const frameVertices = new Float32Array([
      -frameWidth/2, -frameHeight/2, 0,
      frameWidth/2, -frameHeight/2, 0,
      frameWidth/2, frameHeight/2, 0,
      -frameWidth/2, frameHeight/2, 0,
      -frameWidth/2, -frameHeight/2, 0
    ]);
    frameGeometry.setAttribute('position', new THREE.BufferAttribute(frameVertices, 3));
    const frameMaterial = new THREE.LineBasicMaterial({ 
      color: 0x333333, 
      transparent: true, 
      opacity: 0.15 
    });
    const frameLine = new THREE.Line(frameGeometry, frameMaterial);
    scene.add(frameLine);

    // Grain dust particles floating around
    const dustCount = 800;
    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    const dustColors = new Float32Array(dustCount * 3);
    const dustSizes = new Float32Array(dustCount);

    for (let i = 0; i < dustCount; i++) {
      const i3 = i * 3;
      dustPositions[i3] = (Math.random() - 0.5) * 80;
      dustPositions[i3 + 1] = (Math.random() - 0.5) * 80;
      dustPositions[i3 + 2] = (Math.random() - 0.5) * 60 - 10;
      
      const color = colors[Math.floor(Math.random() * colors.length)];
      dustColors[i3] = color.r;
      dustColors[i3 + 1] = color.g;
      dustColors[i3 + 2] = color.b;
      
      dustSizes[i] = 0.3 + Math.random() * 0.8;
    }

    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
    dustGeometry.setAttribute('size', new THREE.BufferAttribute(dustSizes, 1));

    const dustMaterial = new THREE.ShaderMaterial({
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
          
          vec3 pos = position;
          pos.x += sin(u_time * 0.2 + position.y * 0.05) * 3.0;
          pos.y += cos(u_time * 0.15 + position.x * 0.05) * 2.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * u_pixelRatio * (150.0 / -mvPosition.z);
          
          vAlpha = 0.25;
          
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

    const dustParticles = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dustParticles);

    startTimeRef.current = performance.now();

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startTimeRef.current) / 1000.0;
      setTimeElapsed(Math.floor(elapsed));

      // Apply tilt to camera
      if (cameraRef.current) {
        cameraRef.current.position.x = tiltRef.current.x * 8;
        cameraRef.current.position.y = tiltRef.current.y * 5;
        cameraRef.current.lookAt(0, 0, 0);
      }

      // Update main particle system
      const posAttr = particles.geometry.attributes.position.array as Float32Array;
      const posCount = posAttr.length / 3;
      
      (material as THREE.ShaderMaterial).uniforms.u_time.value = elapsed;

      for (let i = 0; i < posCount; i++) {
        const i3 = i * 3;
        
        // Calculate particle age with loop
        const cycleTime = 4.0;
        const particleTime = (elapsed - startTimes[i] + cycleTime) % cycleTime;
        const lifeProgress = particleTime / lifespans[i];

        if (lifeProgress >= 0 && lifeProgress < 1.0) {
          // Rising phase - particles move outward and toward camera
          const easeProgress = 1.0 - Math.pow(1.0 - Math.min(lifeProgress * 1.2, 1.0), 3);
          
          posAttr[i3] = origins[i3] + velocities[i3] * particleTime * easeProgress;
          posAttr[i3 + 1] = origins[i3 + 1] + velocities[i3 + 1] * particleTime * easeProgress;
          posAttr[i3 + 2] = origins[i3 + 2] + velocities[i3 + 2] * particleTime * easeProgress;
          
          // Explosion/disintegration at end of life - particles scatter
          if (lifeProgress > 0.7) {
            const explodeProgress = (lifeProgress - 0.7) / 0.3;
            const explodeForce = Math.pow(explodeProgress, 2) * 15;
            
            posAttr[i3] += Math.sin(phases[i] * 5 + elapsed * 3) * explodeForce;
            posAttr[i3 + 1] += Math.cos(phases[i] * 3 + elapsed * 4) * explodeForce;
            posAttr[i3 + 2] += Math.sin(phases[i] * 7 + elapsed * 2) * explodeForce * 0.5;
          }
          
          // Add wobble
          const wobble = Math.sin(elapsed * 2 + phases[i]) * 0.3;
          posAttr[i3] += wobble;
          posAttr[i3 + 1] += wobble * 0.5;
        } else {
          // Reset to origin
          posAttr[i3] = origins[i3];
          posAttr[i3 + 1] = origins[i3 + 1];
          posAttr[i3 + 2] = origins[i3 + 2];
        }
      }

      particles.geometry.attributes.position.needsUpdate = true;
      
      // Update dust
      (dustMaterial as THREE.ShaderMaterial).uniforms.u_time.value = elapsed;

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
      dustGeometry.dispose();
      dustMaterial.dispose();
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

      {/* Back button */}
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

      {/* Title - centered in the middle, fades out after 7 seconds */}
      <AnimatePresence>
        {showTitle && (
          <motion.div
            className="absolute z-10 text-center"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
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
                color: 'rgba(245, 240, 230, 0.95)',
                letterSpacing: '0.02em',
                margin: 0,
                textShadow: '0 2px 30px rgba(0,0,0,0.6)',
              }}
            >
              Rising
            </h1>
            <p
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '16px',
                fontWeight: 300,
                color: 'rgba(245, 240, 230, 0.65)',
                marginTop: '12px',
                letterSpacing: '0.01em',
              }}
            >
              Let this moment settle you.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tilt button - centered above nav bar with move icon */}
      <AnimatePresence>
        {showTiltButton && (
          <motion.button
            onClick={enableTilt}
            className="absolute z-20 flex items-center justify-center"
            style={{
              bottom: '90px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '12px',
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
