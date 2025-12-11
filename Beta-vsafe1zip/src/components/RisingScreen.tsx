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

    // Vibrant color palette - like the reference burst
    const colors = [
      new THREE.Color(0xE91E63), // pink
      new THREE.Color(0x9C27B0), // purple
      new THREE.Color(0x3F51B5), // indigo
      new THREE.Color(0x2196F3), // blue
      new THREE.Color(0x00BCD4), // cyan
      new THREE.Color(0x4CAF50), // green
      new THREE.Color(0xFFEB3B), // yellow
      new THREE.Color(0xFF9800), // orange
      new THREE.Color(0xFF5722), // deep orange
      new THREE.Color(0x8C9E85), // sage (TRACE)
      new THREE.Color(0x94695B), // mocha (TRACE)
      new THREE.Color(0xF2EBD9), // cream (TRACE)
    ];

    // Screen-within-screen dimensions (phone aspect ratio)
    const aspectRatio = width / height;
    const frameHeight = 35;
    const frameWidth = frameHeight * aspectRatio * 0.85;
    
    // Main burst particle system - dramatic colorful explosion
    const particleCount = 6000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colorAttrib = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);
    const startTimes = new Float32Array(particleCount);
    const lifespans = new Float32Array(particleCount);
    const origins = new Float32Array(particleCount * 3);
    const phases = new Float32Array(particleCount);

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

      // Velocity - dramatic burst outward from center
      const angle = Math.atan2(startY, startX);
      const burstSpeed = 8 + Math.random() * 20;
      const towardCamera = 20 + Math.random() * 35;
      
      // Add swirl motion
      const swirlAngle = angle + (Math.random() - 0.5) * 1.5;
      
      velocities[i3] = Math.cos(swirlAngle) * burstSpeed;
      velocities[i3 + 1] = Math.sin(swirlAngle) * burstSpeed;
      velocities[i3 + 2] = towardCamera;

      // Vibrant random color
      const color = colors[Math.floor(Math.random() * colors.length)];
      colorAttrib[i3] = color.r;
      colorAttrib[i3 + 1] = color.g;
      colorAttrib[i3 + 2] = color.b;

      // Varied sizes - some large color blobs, some fine grain
      const sizeType = Math.random();
      if (sizeType < 0.2) {
        sizes[i] = 4 + Math.random() * 6; // Large blobs
      } else if (sizeType < 0.5) {
        sizes[i] = 2 + Math.random() * 3; // Medium
      } else {
        sizes[i] = 0.5 + Math.random() * 1.5; // Fine grain
      }

      // Staggered start for continuous effect
      startTimes[i] = Math.random() * 3.0;
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
          
          // Size attenuation - dramatic size increase as particles approach
          float sizeAtten = size * u_pixelRatio * (300.0 / -mvPosition.z);
          gl_PointSize = clamp(sizeAtten, 2.0, 150.0);
          
          // Alpha - fade as very close
          vAlpha = smoothstep(90.0, 30.0, position.z) * smoothstep(-10.0, 5.0, position.z);
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          
          // Soft blob with glow
          float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
          
          // Inner glow for vibrancy
          float glow = exp(-dist * 3.0) * 0.8;
          vec3 finalColor = vColor + vec3(1.0) * glow * 0.3;
          
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
      opacity: 0.5 
    });
    const frameLine = new THREE.LineLoop(frameGeometry, frameMaterial);
    scene.add(frameLine);

    // Grain dust around edges
    const grainCount = 1500;
    const grainGeometry = new THREE.BufferGeometry();
    const grainPositions = new Float32Array(grainCount * 3);
    const grainColors = new Float32Array(grainCount * 3);
    const grainSizes = new Float32Array(grainCount);
    const grainVelocities = new Float32Array(grainCount * 3);
    const grainStarts = new Float32Array(grainCount);
    const grainLifes = new Float32Array(grainCount);
    const grainOrigins = new Float32Array(grainCount * 3);

    for (let i = 0; i < grainCount; i++) {
      const i3 = i * 3;
      
      // Start at frame edges
      const edge = Math.floor(Math.random() * 4);
      let gx, gy;
      if (edge === 0) { gx = (Math.random() - 0.5) * frameWidth; gy = hh + Math.random() * 3; }
      else if (edge === 1) { gx = (Math.random() - 0.5) * frameWidth; gy = -hh - Math.random() * 3; }
      else if (edge === 2) { gx = hw + Math.random() * 3; gy = (Math.random() - 0.5) * frameHeight; }
      else { gx = -hw - Math.random() * 3; gy = (Math.random() - 0.5) * frameHeight; }
      
      grainOrigins[i3] = gx;
      grainOrigins[i3 + 1] = gy;
      grainOrigins[i3 + 2] = 0;
      
      grainPositions[i3] = gx;
      grainPositions[i3 + 1] = gy;
      grainPositions[i3 + 2] = 0;
      
      // Outward velocity from edge
      const gAngle = Math.atan2(gy, gx);
      const gSpeed = 3 + Math.random() * 8;
      grainVelocities[i3] = Math.cos(gAngle) * gSpeed;
      grainVelocities[i3 + 1] = Math.sin(gAngle) * gSpeed;
      grainVelocities[i3 + 2] = 5 + Math.random() * 15;
      
      const gColor = colors[Math.floor(Math.random() * colors.length)];
      grainColors[i3] = gColor.r;
      grainColors[i3 + 1] = gColor.g;
      grainColors[i3 + 2] = gColor.b;
      
      grainSizes[i] = 0.3 + Math.random() * 1.0;
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
          gl_PointSize = size * u_pixelRatio * (200.0 / -mvPosition.z);
          vAlpha = smoothstep(60.0, 10.0, position.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          float alpha = smoothstep(0.5, 0.1, dist) * vAlpha * 0.7;
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
        
        const cycleTime = 3.5;
        const particleTime = (elapsed - startTimes[i] + cycleTime) % cycleTime;
        const lifeProgress = particleTime / lifespans[i];

        if (lifeProgress >= 0 && lifeProgress < 1.0) {
          // Smooth easing for dramatic burst
          const easeOut = 1.0 - Math.pow(1.0 - Math.min(lifeProgress * 1.3, 1.0), 4);
          
          posAttr[i3] = origins[i3] + velocities[i3] * particleTime * easeOut;
          posAttr[i3 + 1] = origins[i3 + 1] + velocities[i3 + 1] * particleTime * easeOut;
          posAttr[i3 + 2] = origins[i3 + 2] + velocities[i3 + 2] * particleTime * easeOut;
          
          // Explosion scatter at end
          if (lifeProgress > 0.65) {
            const explodeProgress = (lifeProgress - 0.65) / 0.35;
            const explodeForce = Math.pow(explodeProgress, 1.5) * 20;
            
            posAttr[i3] += Math.sin(phases[i] * 7 + elapsed * 4) * explodeForce;
            posAttr[i3 + 1] += Math.cos(phases[i] * 5 + elapsed * 5) * explodeForce;
            posAttr[i3 + 2] += Math.sin(phases[i] * 3 + elapsed * 3) * explodeForce * 0.3;
          }
          
          // Swirl wobble
          const wobble = Math.sin(elapsed * 3 + phases[i]) * 0.5;
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

      {/* Title - centered in the middle, fades out after 7 seconds */}
      <AnimatePresence>
        {showTitle && (
          <motion.div
            className="absolute z-10 text-center pointer-events-none"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
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
