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
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_tilt: { value: new THREE.Vector2(0.0, 0.0) }
    };

    const geometry = new THREE.PlaneGeometry(2, 2);

    // Smooth nebula burst shader with Vibes palette
    const fragmentShader = `
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_tilt;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(23.43, 47.13))) * 34942.234);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 5; i++) {
          value += amplitude * noise(p);
          p *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 p = (uv - 0.5) * 2.0;
        p.x *= u_resolution.x / u_resolution.y;

        // Subtle tilt response
        p.x += u_tilt.x * 0.15;
        p.y += u_tilt.y * 0.15;

        float t = u_time;

        // Smooth burst: starts compressed, expands outward over 4 seconds
        float burst = smoothstep(0.0, 4.0, t);
        float scale = mix(0.1, 1.0, burst);

        // Multi-directional flow using angle
        float angle = atan(p.y, p.x);
        float r = length(p);

        // Scaled coordinates for expansion
        vec2 q = p / scale;

        // Flowing swirl motion - multiple directions
        float flowSpeed = 0.4;
        q += 0.2 * sin(2.5 * q.yx + t * flowSpeed);
        q += 0.15 * sin(3.2 * q.xy - t * flowSpeed * 0.8);
        q += 0.1 * cos(1.8 * q.yx + t * flowSpeed * 1.2);

        // Direction-based distortion for multi-directional burst
        float dirUp = smoothstep(0.3, -0.8, q.y) * smoothstep(-0.5, 0.5, abs(q.x));
        float dirDown = smoothstep(-0.3, 0.8, q.y) * smoothstep(-0.5, 0.5, abs(q.x));
        float dirLeft = smoothstep(0.3, -0.8, q.x) * smoothstep(-0.5, 0.5, abs(q.y));
        float dirRight = smoothstep(-0.3, 0.8, q.x) * smoothstep(-0.5, 0.5, abs(q.y));

        float rq = length(q);

        // Core glow and outer halo
        float core = exp(-rq * rq * 2.5);
        float halo = exp(-rq * rq * 0.8);
        float outer = exp(-rq * rq * 0.3);

        // Vibes palette - teal, sage, orange, cream
        vec3 teal = vec3(0.24, 0.42, 0.43);      // Deep teal
        vec3 sage = vec3(0.42, 0.62, 0.55);      // Sage seafoam
        vec3 orange = vec3(0.85, 0.48, 0.24);    // Vibrant coral orange
        vec3 cream = vec3(0.96, 0.94, 0.90);     // Soft cream
        vec3 bg = vec3(1.0, 1.0, 1.0);           // White background

        vec3 color = bg;

        // Smooth angle-based color blending for unified look
        float band1 = 0.5 + 0.5 * sin(angle * 1.5 + t * 0.25);
        float band2 = 0.5 + 0.5 * cos(angle * 2.0 - t * 0.3);
        float band3 = 0.5 + 0.5 * sin(angle * 0.8 + t * 0.15 + 1.5);

        // Layer colors smoothly
        vec3 blend1 = mix(teal, sage, band1);
        vec3 blend2 = mix(orange, cream, band2);
        vec3 blend3 = mix(sage, orange, band3);

        // Combine with depth layers
        color = mix(color, blend1, core * 0.95);
        color = mix(color, blend2, halo * 0.7);
        color = mix(color, blend3, outer * 0.4);

        // Soft flowing texture
        float n = fbm(q * 2.5 + t * 0.15);
        color += (n - 0.5) * 0.08 * halo;

        // Gentle grain for organic feel
        float grain = hash(uv * 500.0 + t) * 0.03;
        color += grain * halo;

        // Soft vignette to unify the burst
        float v = smoothstep(1.6, 0.2, length(p));
        color = mix(bg, color, v);

        // Phone frame shape (subtle)
        float frameX = smoothstep(0.38, 0.42, abs(p.x));
        float frameY = smoothstep(0.75, 0.80, abs(p.y));
        float frame = max(frameX, frameY);
        
        // Particles/dust overlay
        float dust = 0.0;
        for (float i = 0.0; i < 80.0; i++) {
          vec2 dustPos = vec2(
            hash(vec2(i, 0.0)) - 0.5,
            hash(vec2(0.0, i)) - 0.5
          ) * 2.0;
          
          // Multi-directional particle movement
          float dir = hash(vec2(i, i));
          float particleTime = mod(t + hash(vec2(i * 2.0, 0.0)) * 4.0, 4.0);
          float particleBurst = smoothstep(0.0, 2.0, particleTime);
          
          vec2 velocity;
          if (dir < 0.2) velocity = vec2(0.0, 1.0);        // Up
          else if (dir < 0.4) velocity = vec2(0.0, -1.0);  // Down
          else if (dir < 0.6) velocity = vec2(-1.0, 0.0);  // Left
          else if (dir < 0.8) velocity = vec2(1.0, 0.0);   // Right
          else velocity = normalize(dustPos);              // Outward
          
          dustPos += velocity * particleBurst * 0.8;
          
          float size = hash(vec2(i * 3.0, 0.0)) * 0.015 + 0.003;
          float d = length(p - dustPos);
          float alpha = smoothstep(size, size * 0.3, d) * (1.0 - particleBurst * 0.7);
          
          // Color the dust particles
          vec3 dustColor = mix(mix(teal, sage, hash(vec2(i, 1.0))), 
                              mix(orange, cream, hash(vec2(i, 2.0))), 
                              hash(vec2(i, 3.0)));
          color = mix(color, dustColor, alpha * 0.6);
        }

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms,
      fragmentShader,
      vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    startTimeRef.current = performance.now();

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const elapsed = (now - startTimeRef.current) / 1000.0;
      
      setTimeElapsed(Math.floor(elapsed));
      
      uniforms.u_time.value = elapsed;
      uniforms.u_tilt.value.set(tiltRef.current.x, tiltRef.current.y);
      
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
      geometry.dispose();
      material.dispose();
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
      const maxTilt = 15.0;
      tiltRef.current.x = Math.max(-1, Math.min(1, (e.gamma || 0) / maxTilt));
      tiltRef.current.y = Math.max(-1, Math.min(1, (e.beta || 0) / maxTilt));
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
