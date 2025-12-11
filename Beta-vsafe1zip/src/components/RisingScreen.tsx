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

      // High quality hash
      float hash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      float hash3(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.zyx + 31.32);
        return fract((p.x + p.y) * p.z);
      }

      // Smooth noise
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

      // FBM for organic shapes
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

      // Voronoi for grain texture
      float voronoi(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float minDist = 1.0;
        for (int x = -1; x <= 1; x++) {
          for (int y = -1; y <= 1; y++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = vec2(hash(i + neighbor), hash(i + neighbor + 100.0));
            vec2 diff = neighbor + point - f;
            minDist = min(minDist, length(diff));
          }
        }
        return minDist;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 center = vec2(0.5, 0.5);
        
        // Apply tilt offset
        vec2 tiltOffset = u_tilt * 0.08;
        uv += tiltOffset;
        
        float t = u_time * 0.4;
        
        // TRACE color palette - sage, mocha, cream
        vec3 sage = vec3(0.55, 0.65, 0.50);
        vec3 deepSage = vec3(0.35, 0.45, 0.32);
        vec3 mocha = vec3(0.62, 0.45, 0.35);
        vec3 darkMocha = vec3(0.45, 0.30, 0.22);
        vec3 cream = vec3(0.96, 0.93, 0.86);
        vec3 warmCream = vec3(0.92, 0.85, 0.72);
        vec3 dusty = vec3(0.78, 0.72, 0.65);
        
        // Background
        vec3 bgColor = vec3(0.05, 0.05, 0.06);
        
        vec3 color = bgColor;
        float totalIntensity = 0.0;
        
        // Create multiple explosive color bursts
        for (float i = 0.0; i < 8.0; i++) {
          // Each burst has unique timing and position
          float burstPhase = t * 0.3 + i * 0.785;
          float burstCycle = fract(burstPhase * 0.15);
          
          // Burst center position - moves around
          vec2 burstCenter = center;
          burstCenter.x += sin(t * 0.2 + i * 1.2) * 0.15 + sin(i * 2.3) * 0.1;
          burstCenter.y += cos(t * 0.15 + i * 0.9) * 0.12 + cos(i * 1.7) * 0.08;
          burstCenter += tiltOffset * 0.5;
          
          vec2 toCenter = uv - burstCenter;
          float dist = length(toCenter);
          float angle = atan(toCenter.y, toCenter.x);
          
          // Explosive burst pattern - expanding waves
          float burstWave = sin(dist * 15.0 - burstPhase * 2.0 + angle * 3.0);
          burstWave *= exp(-dist * 2.5);
          
          // Organic shape distortion
          float organic = fbm(uv * 3.0 + vec2(cos(burstPhase), sin(burstPhase)) * 0.5);
          float shape = smoothstep(0.6 + organic * 0.3, 0.0, dist);
          
          // Swirling internal motion
          float swirl = fbm(vec2(angle * 2.0 + t * 0.3, dist * 4.0 - t * 0.5) + i);
          
          // Color selection based on burst index
          vec3 burstColor;
          float colorIndex = mod(i, 4.0);
          if (colorIndex < 1.0) {
            burstColor = mix(sage, cream, swirl);
          } else if (colorIndex < 2.0) {
            burstColor = mix(mocha, warmCream, swirl);
          } else if (colorIndex < 3.0) {
            burstColor = mix(deepSage, dusty, swirl);
          } else {
            burstColor = mix(darkMocha, sage, swirl);
          }
          
          // Add color variation within burst
          burstColor = mix(burstColor, cream, smoothstep(0.3, 0.0, dist) * 0.4);
          
          // Intensity falloff
          float intensity = shape * (0.5 + 0.5 * burstWave);
          intensity *= 0.7 + 0.3 * sin(burstPhase + i);
          
          color += burstColor * intensity * 0.35;
          totalIntensity += intensity;
        }
        
        // Add secondary smaller bursts
        for (float j = 0.0; j < 12.0; j++) {
          float phase = t * 0.5 + j * 0.523;
          
          vec2 pos = center;
          pos.x += sin(phase * 0.7 + j * 1.1) * 0.25;
          pos.y += cos(phase * 0.6 + j * 0.8) * 0.2;
          pos += tiltOffset * 0.3;
          
          float d = length(uv - pos);
          float burst = exp(-d * 8.0) * (0.5 + 0.5 * sin(phase * 2.0));
          
          vec3 col = mod(j, 3.0) < 1.0 ? sage : (mod(j, 3.0) < 2.0 ? mocha : cream);
          color += col * burst * 0.25;
        }
        
        // Add grain/dust particles around edges
        float grain = 0.0;
        for (float k = 0.0; k < 150.0; k++) {
          vec2 seed = vec2(hash(vec2(k, 0.0)), hash(vec2(0.0, k)));
          
          // Particles move outward from bursts
          float particleTime = t * 0.3 + k * 0.1;
          float radius = 0.1 + fract(particleTime * 0.2 + seed.x) * 0.6;
          float pAngle = seed.y * 6.28318 + particleTime * 0.2;
          
          vec2 particlePos = center + vec2(cos(pAngle), sin(pAngle)) * radius;
          particlePos += tiltOffset * (0.2 + seed.x * 0.3);
          particlePos.x += sin(particleTime + k) * 0.05;
          particlePos.y += cos(particleTime * 1.1 + k) * 0.04;
          
          float pDist = length(uv - particlePos);
          float pSize = 0.002 + seed.x * 0.004;
          
          float particle = smoothstep(pSize * 2.0, 0.0, pDist);
          particle *= 0.3 + 0.7 * seed.y;
          
          grain += particle;
        }
        
        // Add grain with cream color
        color += cream * grain * 0.4;
        
        // Edge dust cloud
        float edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
        float edgeDust = fbm(uv * 8.0 + t * 0.1) * smoothstep(0.2, 0.0, edgeDist);
        color += dusty * edgeDust * 0.15;
        
        // Fine grain texture overlay
        float fineGrain = hash(uv * u_resolution.xy + t * 100.0);
        color += (fineGrain - 0.5) * 0.03;
        
        // Subtle vignette
        float vignette = 1.0 - length(uv - center) * 0.3;
        color *= vignette;
        
        // Ensure colors stay vibrant
        color = max(color, bgColor);
        
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
        const tx = (e.gamma || 0) / 20;
        const ty = (e.beta || 0) / 20;
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
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#0D0D0F' }}>
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
