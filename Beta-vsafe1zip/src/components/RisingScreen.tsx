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

    // Scene setup - WHITE background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

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

    // TRACE color palette ONLY - mocha, sage, olive, cream, gold, amber, warm earth tones
    const colors = [
      // Sage family
      new THREE.Color(0x8C9E85), // sage
      new THREE.Color(0xA8B5A0), // light sage
      new THREE.Color(0x6B7D65), // deep sage
      new THREE.Color(0x7A8B74), // muted sage
      new THREE.Color(0x9CAF94), // soft sage
      // Olive family
      new THREE.Color(0x6B6B4E), // olive
      new THREE.Color(0x808066), // light olive
      new THREE.Color(0x5C5C42), // deep olive
      new THREE.Color(0x9A9A7A), // pale olive
      // Mocha family
      new THREE.Color(0x94695B), // mocha
      new THREE.Color(0x7A5548), // deep mocha
      new THREE.Color(0xA67C5B), // warm mocha
      new THREE.Color(0x8B6B5A), // soft mocha
      new THREE.Color(0xB8907A), // light mocha
      // Cream/Gold family
      new THREE.Color(0xF2EBD9), // cream
      new THREE.Color(0xE8DFD0), // warm cream
      new THREE.Color(0xD4C4B5), // dusty cream
      new THREE.Color(0xC4B896), // gold cream
      new THREE.Color(0xD9C9A5), // soft gold
      new THREE.Color(0xCCB88C), // muted gold
      // Amber/Warm tones
      new THREE.Color(0xB8976B), // amber
      new THREE.Color(0xA68B5B), // warm amber
      new THREE.Color(0xC9A87C), // light amber
      new THREE.Color(0x9E8A6D), // dusty amber
    ];

    // Screen-within-screen dimensions (phone aspect ratio)
    const aspectRatio = width / height;
    const frameHeight = 35;
    const frameWidth = frameHeight * aspectRatio * 0.85;
    
    // Main burst particle system - MUCH fuller with more particles
    const particleCount = 10000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colorAttrib = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);
    const startTimes = new Float32Array(particleCount);
    const lifespans = new Float32Array(particleCount);
    const origins = new Float32Array(particleCount * 3);
    const phases = new Float32Array(particleCount);
    const directions = new Float32Array(particleCount); // 0=up, 1=down, 2=left, 3=right, 4=outward

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Start positions - within the phone-shaped frame
      const startX = (Math.random() - 0.5) * frameWidth * 0.95;
      const startY = (Math.random() - 0.5) * frameHeight * 0.95;
      
      origins[i3] = startX;
      origins[i3 + 1] = startY;
      origins[i3 + 2] = -5;
      
      positions[i3] = startX;
      positions[i3 + 1] = startY;
      positions[i3 + 2] = -5;

      // MULTI-DIRECTIONAL burst - different particles go different directions
      const direction = Math.floor(Math.random() * 5);
      directions[i] = direction;
      
      const speed = 10 + Math.random() * 25;
      const towardCamera = 15 + Math.random() * 30;
      
      // Add variation based on direction
      let vx = 0, vy = 0;
      switch (direction) {
        case 0: // UP
          vx = (Math.random() - 0.5) * 8;
          vy = speed;
          break;
        case 1: // DOWN
          vx = (Math.random() - 0.5) * 8;
          vy = -speed;
          break;
        case 2: // LEFT
          vx = -speed;
          vy = (Math.random() - 0.5) * 8;
          break;
        case 3: // RIGHT
          vx = speed;
          vy = (Math.random() - 0.5) * 8;
          break;
        case 4: // OUTWARD from center
          const angle = Math.atan2(startY, startX);
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed;
          break;
      }
      
      // Add swirl
      velocities[i3] = vx + (Math.random() - 0.5) * 5;
      velocities[i3 + 1] = vy + (Math.random() - 0.5) * 5;
      velocities[i3 + 2] = towardCamera;

      // Only TRACE colors
      const color = colors[Math.floor(Math.random() * colors.length)];
      colorAttrib[i3] = color.r;
      colorAttrib[i3 + 1] = color.g;
      colorAttrib[i3 + 2] = color.b;

      // Varied sizes for fuller effect
      const sizeType = Math.random();
      if (sizeType < 0.15) {
        sizes[i] = 5 + Math.random() * 7; // Large blobs
      } else if (sizeType < 0.4) {
        sizes[i] = 2.5 + Math.random() * 3.5; // Medium
      } else {
        sizes[i] = 0.5 + Math.random() * 2; // Fine grain
      }

      // Staggered start for continuous effect
      startTimes[i] = Math.random() * 4.0;
      lifespans[i] = 2.0 + Math.random() * 2.5;
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
          
          // Size attenuation
          float sizeAtten = size * u_pixelRatio * (280.0 / -mvPosition.z);
          gl_PointSize = clamp(sizeAtten, 2.0, 140.0);
          
          // Alpha fade
          vAlpha = smoothstep(85.0, 25.0, position.z) * smoothstep(-10.0, 5.0, position.z);
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          
          // Soft blob
          float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
          
          // Subtle glow
          float glow = exp(-dist * 3.5) * 0.5;
          vec3 finalColor = vColor + vec3(1.0) * glow * 0.2;
          
          if (alpha < 0.01) discard;
          
          gl_FragColor = vec4(finalColor, alpha * 0.85);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      vertexColors: true
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Draw phone-screen frame with rounded corners
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
      opacity: 0.4 
    });
    const frameLine = new THREE.LineLoop(frameGeometry, frameMaterial);
    scene.add(frameLine);

    // Edge grain particles - more for fuller effect
    const grainCount = 2500;
    const grainGeometry = new THREE.BufferGeometry();
    const grainPositions = new Float32Array(grainCount * 3);
    const grainColors = new Float32Array(grainCount * 3);
    const grainSizes = new Float32Array(grainCount);
    const grainVelocities = new Float32Array(grainCount * 3);
    const grainStarts = new Float32Array(grainCount);
    const grainLifes = new Float32Array(grainCount);
    const grainOrigins = new Float32Array(grainCount * 3);
    const grainDirs = new Float32Array(grainCount);

    for (let i = 0; i < grainCount; i++) {
      const i3 = i * 3;
      
      // Start at frame edges
      const edge = Math.floor(Math.random() * 4);
      let gx, gy;
      if (edge === 0) { gx = (Math.random() - 0.5) * frameWidth; gy = hh + Math.random() * 2; }
      else if (edge === 1) { gx = (Math.random() - 0.5) * frameWidth; gy = -hh - Math.random() * 2; }
      else if (edge === 2) { gx = hw + Math.random() * 2; gy = (Math.random() - 0.5) * frameHeight; }
      else { gx = -hw - Math.random() * 2; gy = (Math.random() - 0.5) * frameHeight; }
      
      grainOrigins[i3] = gx;
      grainOrigins[i3 + 1] = gy;
      grainOrigins[i3 + 2] = 0;
      
      grainPositions[i3] = gx;
      grainPositions[i3 + 1] = gy;
      grainPositions[i3 + 2] = 0;
      
      // Multi-directional grain
      const dir = Math.floor(Math.random() * 4);
      grainDirs[i] = dir;
      const gSpeed = 4 + Math.random() * 10;
      
      let gvx = 0, gvy = 0;
      switch (dir) {
        case 0: gvx = 0; gvy = gSpeed; break;
        case 1: gvx = 0; gvy = -gSpeed; break;
        case 2: gvx = -gSpeed; gvy = 0; break;
        case 3: gvx = gSpeed; gvy = 0; break;
      }
      
      grainVelocities[i3] = gvx + (Math.random() - 0.5) * 3;
      grainVelocities[i3 + 1] = gvy + (Math.random() - 0.5) * 3;
      grainVelocities[i3 + 2] = 8 + Math.random() * 15;
      
      const gColor = colors[Math.floor(Math.random() * colors.length)];
      grainColors[i3] = gColor.r;
      grainColors[i3 + 1] = gColor.g;
      grainColors[i3 + 2] = gColor.b;
      
      grainSizes[i] = 0.3 + Math.random() * 1.2;
      grainStarts[i] = Math.random() * 4.0;
      grainLifes[i] = 1.5 + Math.random() * 2.0;
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
          vAlpha = smoothstep(55.0, 10.0, position.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          float alpha = smoothstep(0.5, 0.1, dist) * vAlpha * 0.6;
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

      // Apply tilt to camera
      if (cameraRef.current) {
        cameraRef.current.position.x = tiltRef.current.x * 8;
        cameraRef.current.position.y = tiltRef.current.y * 5;
        cameraRef.current.lookAt(0, 0, 0);
      }

      // Update main particles
      const posAttr = particles.geometry.attributes.position.array as Float32Array;
      const posCount = posAttr.length / 3;
      
      (material as THREE.ShaderMaterial).uniforms.u_time.value = elapsed;

      for (let i = 0; i < posCount; i++) {
        const i3 = i * 3;
        
        const cycleTime = 4.0;
        const particleTime = (elapsed - startTimes[i] + cycleTime) % cycleTime;
        const lifeProgress = particleTime / lifespans[i];

        if (lifeProgress >= 0 && lifeProgress < 1.0) {
          // Smooth easing for dramatic burst
          const easeOut = 1.0 - Math.pow(1.0 - Math.min(lifeProgress * 1.3, 1.0), 4);
          
          posAttr[i3] = origins[i3] + velocities[i3] * particleTime * easeOut;
          posAttr[i3 + 1] = origins[i3 + 1] + velocities[i3 + 1] * particleTime * easeOut;
          posAttr[i3 + 2] = origins[i3 + 2] + velocities[i3 + 2] * particleTime * easeOut;
          
          // Explosion scatter at end
          if (lifeProgress > 0.6) {
            const explodeProgress = (lifeProgress - 0.6) / 0.4;
            const explodeForce = Math.pow(explodeProgress, 1.5) * 18;
            
            posAttr[i3] += Math.sin(phases[i] * 7 + elapsed * 4) * explodeForce;
            posAttr[i3 + 1] += Math.cos(phases[i] * 5 + elapsed * 5) * explodeForce;
            posAttr[i3 + 2] += Math.sin(phases[i] * 3 + elapsed * 3) * explodeForce * 0.3;
          }
          
          // Swirl wobble
          const wobble = Math.sin(elapsed * 2.5 + phases[i]) * 0.4;
          posAttr[i3] += wobble;
        } else {
          posAttr[i3] = origins[i3];
          posAttr[i3 + 1] = origins[i3 + 1];
          posAttr[i3 + 2] = origins[i3 + 2];
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;

      // Update grain particles
      const grainPos = grainParticles.geometry.attributes.position.array as Float32Array;
      const grainCnt = grainPos.length / 3;
      
      for (let i = 0; i < grainCnt; i++) {
        const i3 = i * 3;
        const cycleTime = 4.0;
        const pTime = (elapsed - grainStarts[i] + cycleTime) % cycleTime;
        const life = pTime / grainLifes[i];
        
        if (life >= 0 && life < 1.0) {
          const ease = 1.0 - Math.pow(1.0 - Math.min(life * 1.5, 1.0), 3);
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

  // Auto-save entry after 10 seconds
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

      {/* Title - EXACTLY centered in the middle of the page */}
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

      {/* Tilt button - exactly centered above nav bar */}
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

      {/* Bottom Nav - at the very bottom */}
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
