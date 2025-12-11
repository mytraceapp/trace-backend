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

      // Hash function for pseudo-random values
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      // 2D noise
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      // Fractal Brownian Motion for organic movement
      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        for (int i = 0; i < 6; i++) {
          value += amplitude * noise(p * frequency);
          frequency *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }

      // Particle burst function
      float particles(vec2 uv, float time) {
        float particles = 0.0;
        
        for (float i = 0.0; i < 80.0; i++) {
          vec2 seed = vec2(i * 0.127, i * 0.269);
          
          // Particle position with burst motion from center
          float angle = hash(seed) * 6.28318 + time * 0.3;
          float radius = hash(seed + 0.5) * 0.8 + fbm(seed + time * 0.1) * 0.4;
          radius *= 0.5 + 0.5 * sin(time * 0.5 + i * 0.1);
          
          vec2 particlePos = vec2(cos(angle), sin(angle)) * radius;
          particlePos += u_tilt * 0.3; // Tilt response
          
          // Add swirling motion
          float swirl = sin(time * 0.2 + i * 0.3) * 0.2;
          particlePos.x += cos(time * 0.15 + hash(seed) * 6.28) * swirl;
          particlePos.y += sin(time * 0.12 + hash(seed + 1.0) * 6.28) * swirl;
          
          float dist = length(uv - particlePos);
          float size = 0.003 + hash(seed + 0.3) * 0.008;
          
          // Soft particle glow
          particles += smoothstep(size * 3.0, 0.0, dist) * (0.3 + 0.7 * hash(seed + 0.7));
        }
        
        return particles;
      }

      // Dust field with tilt response
      float dustField(vec2 uv, float time) {
        vec2 p = uv + u_tilt * 0.2;
        float dust = 0.0;
        
        for (float i = 0.0; i < 5.0; i++) {
          vec2 offset = vec2(
            sin(time * 0.1 + i * 1.3) * 0.3,
            cos(time * 0.08 + i * 1.7) * 0.3
          );
          float layer = fbm((p + offset) * (2.0 + i * 0.5) + time * 0.05);
          dust += layer * (0.3 - i * 0.04);
        }
        
        return dust;
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        
        float t = u_time;
        
        // TRACE color palette - sage, mocha, ambient cream
        vec3 sage = vec3(0.55, 0.62, 0.52);        // Soft sage green
        vec3 mocha = vec3(0.58, 0.42, 0.32);       // Warm mocha brown
        vec3 cream = vec3(0.95, 0.92, 0.85);       // Ambient cream
        vec3 deepSage = vec3(0.35, 0.42, 0.35);    // Deep sage
        vec3 warmTan = vec3(0.72, 0.58, 0.45);     // Warm tan
        vec3 dusty = vec3(0.75, 0.70, 0.62);       // Dusty neutral
        
        // Background - dark charcoal with warmth
        vec3 bgColor = vec3(0.06, 0.06, 0.07);
        
        // Create dust field
        float dust = dustField(uv, t);
        
        // Create particle bursts
        float p = particles(uv, t);
        
        // Central burst glow
        float centralGlow = exp(-length(uv + u_tilt * 0.1) * 1.5);
        centralGlow *= 0.6 + 0.4 * sin(t * 0.3);
        
        // Color mixing based on position and time
        float colorMix1 = fbm(uv * 2.0 + t * 0.1);
        float colorMix2 = fbm(uv * 1.5 - t * 0.08 + 5.0);
        float colorMix3 = fbm(uv * 3.0 + vec2(t * 0.05, -t * 0.07));
        
        // Build color layers
        vec3 color = bgColor;
        
        // Add dust field with color variation
        vec3 dustColor = mix(deepSage, mocha, colorMix1);
        dustColor = mix(dustColor, sage, colorMix2 * 0.5);
        color += dustColor * dust * 0.4;
        
        // Add particle bursts
        vec3 particleColor = mix(cream, warmTan, colorMix2);
        particleColor = mix(particleColor, sage, colorMix3 * 0.3);
        color += particleColor * p * 0.8;
        
        // Add central glow
        vec3 glowColor = mix(mocha, cream, 0.5 + 0.5 * sin(t * 0.2));
        glowColor = mix(glowColor, sage, colorMix1 * 0.4);
        color += glowColor * centralGlow * 0.5;
        
        // Add shimmer highlights
        float shimmer = noise(uv * 50.0 + t * 2.0) * noise(uv * 30.0 - t);
        shimmer *= smoothstep(0.6, 1.0, p + dust * 0.5);
        color += cream * shimmer * 0.3;
        
        // Subtle vignette
        float vignette = 1.0 - length(uv) * 0.4;
        color *= vignette;
        
        // Boost saturation slightly
        float gray = dot(color, vec3(0.299, 0.587, 0.114));
        color = mix(vec3(gray), color, 1.2);
        
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
        const tx = (e.gamma || 0) / 25;
        const ty = (e.beta || 0) / 25;
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
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#0F0F11' }}>
      <div 
        ref={containerRef} 
        className="absolute inset-0"
        style={{ zIndex: 1 }}
      />

      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(15,15,17,0.3) 100%)',
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
