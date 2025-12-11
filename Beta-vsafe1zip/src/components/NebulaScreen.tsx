import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { useEntries } from '../state/EntriesContext';
import * as THREE from 'three';

interface NebulaScreenProps {
  onBack: () => void;
  onReturnToChat: () => void;
  onNavigateToActivities: () => void;
  onNavigateToJournal: () => void;
  onNavigateToProfile: () => void;
  onNavigateToHelp: () => void;
}

export function NebulaScreen({
  onBack,
  onReturnToChat,
  onNavigateToActivities,
  onNavigateToJournal,
  onNavigateToProfile,
  onNavigateToHelp,
}: NebulaScreenProps) {
  const { addSessionEntry } = useEntries();
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationRef = useRef<number>(0);
  const uniformsRef = useRef<{
    u_time: { value: number };
    u_resolution: { value: THREE.Vector2 };
    u_tilt: { value: THREE.Vector2 };
  } | null>(null);
  const startTimeRef = useRef<number>(0);
  const hasSavedRef = useRef(false);
  
  const [tiltEnabled, setTiltEnabled] = useState(false);
  const [showTiltButton, setShowTiltButton] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_tilt: { value: new THREE.Vector2(0.0, 0.0) }
    };
    uniformsRef.current = uniforms;

    const geometry = new THREE.PlaneGeometry(2, 2);

    const fragmentShader = `
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_tilt;

      float noise(vec2 p) {
        return sin(p.x * 1.5) * sin(p.y * 1.5) * 0.5 + 
               sin(p.x * 0.7 + p.y * 1.3) * 0.3 +
               sin(p.x * 2.1 - p.y * 0.9) * 0.2;
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
          value += amplitude * noise(p);
          p *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 p = (uv - 0.5) * 2.0;
        
        p.x += u_tilt.x * 0.15;
        p.y += u_tilt.y * 0.15;

        float t = u_time * 0.02;

        float n = fbm(p * 1.2 + vec2(t * 0.3, t * 0.2))
                + fbm(p * 2.4 - vec2(t * 0.15, t * 0.25)) * 0.5
                + fbm(p * 0.8 + vec2(t * 0.1, -t * 0.1)) * 0.25;

        vec3 colA = vec3(0.02, 0.03, 0.08);
        vec3 colB = vec3(0.12, 0.18, 0.32);
        vec3 colC = vec3(0.25, 0.45, 0.65);
        vec3 colD = vec3(0.65, 0.50, 0.35);

        vec3 color = mix(colA, colB, smoothstep(-0.8, 0.2, n));
        color = mix(color, colC, smoothstep(0.0, 0.8, n));
        color = mix(color, colD, smoothstep(0.6, 1.2, n) * 0.4);

        float vignette = 1.0 - length(p) * 0.3;
        color *= vignette;

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms,
      fragmentShader,
      vertexShader
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    startTimeRef.current = performance.now();

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startTimeRef.current) / 1000.0;
      uniforms.u_time.value = elapsed;
      setTimeElapsed(Math.floor(elapsed));
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      uniforms.u_resolution.value.set(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
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
      if (uniformsRef.current) {
        const tx = (e.gamma || 0) / 30;
        const ty = (e.beta || 0) / 30;
        uniformsRef.current.u_tilt.value.set(tx, ty);
      }
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
      addSessionEntry('Nebula', {
        title: 'Nebula – Settled',
        body: 'You took a moment to let stillness find you.',
        tags: ['calm', 'ambient', 'nebula'],
        metadata: { duration: timeElapsed }
      });
    }
    onBack();
  };

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#020308' }}>
      <div 
        ref={containerRef} 
        className="absolute inset-0"
        style={{ zIndex: 1 }}
      />

      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(2,3,8,0.4) 100%)',
          }}
        />
      </div>

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
          top: '42%',
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
            color: 'rgba(232, 232, 255, 0.95)',
            letterSpacing: '0.02em',
            margin: 0,
            textShadow: '0 2px 20px rgba(0,0,0,0.5)',
          }}
        >
          Nebula
        </h1>
        <p
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '15px',
            fontWeight: 300,
            color: 'rgba(232, 232, 255, 0.65)',
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
