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
  const [isExiting, setIsExiting] = useState(false);
  const windChimesRef = useRef<HTMLAudioElement | null>(null);
  const windChimesFadeRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTitle(false);
    }, 7000);
    return () => clearTimeout(timer);
  }, []);

  // Wind chimes ambient audio with 1.5s delay, slowed playback, and gentle fade in
  useEffect(() => {
    const windChimes = new Audio('/audio/wind-chimes.mp3');
    windChimes.loop = true;
    windChimes.volume = 0;
    windChimes.playbackRate = 0.75; // Even slower for mesmerizing dreamy effect
    windChimesRef.current = windChimes;

    // Start after 1.5 second delay
    const delayTimer = setTimeout(() => {
      windChimes.play().catch(console.error);
      
      // Fade in over 3.5 seconds to volume 0.35 (slower, more spacious)
      let currentVolume = 0;
      const targetVolume = 0.35;
      const fadeStep = targetVolume / 70; // 70 steps over 3.5 seconds (50ms each)
      
      const fadeIn = setInterval(() => {
        currentVolume += fadeStep;
        if (currentVolume >= targetVolume) {
          currentVolume = targetVolume;
          clearInterval(fadeIn);
        }
        if (windChimesRef.current) {
          windChimesRef.current.volume = currentVolume;
        }
      }, 50);
      
      windChimesFadeRef.current = fadeIn as unknown as number;
    }, 1500);

    return () => {
      clearTimeout(delayTimer);
      if (windChimesFadeRef.current) {
        clearInterval(windChimesFadeRef.current);
      }
      // Gentle fade out on cleanup (matches the spacious feel)
      if (windChimesRef.current) {
        const audio = windChimesRef.current;
        let vol = audio.volume;
        const fadeOut = setInterval(() => {
          vol -= 0.025; // Slower fade out
          if (vol <= 0) {
            vol = 0;
            audio.pause();
            clearInterval(fadeOut);
          }
          audio.volume = Math.max(0, vol);
        }, 50);
      }
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 50;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ============================================
    // LAVA LAMP BACKGROUND - Fullscreen shader quad
    // ============================================
    const lavaGeometry = new THREE.PlaneGeometry(2, 2);
    const lavaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(width, height) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float u_time;
        uniform vec2 u_resolution;
        varying vec2 vUv;
        
        // Simplex noise functions
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        
        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m; m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
          vec3 g;
          g.x = a0.x * x0.x + h.x * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }
        
        // Soft glowing orb with bloom effect - 30% stronger
        float glowOrb(vec2 uv, vec2 center, float radius) {
          float d = length(uv - center);
          float core = smoothstep(radius, radius * 0.2, d);
          float glow = exp(-d * d / (radius * radius * 1.5)) * 1.2;
          float bloom = exp(-d / (radius * 4.0)) * 0.5;
          return core * 0.8 + glow + bloom;
        }
        
        // Light ray emanating from orb - 30% stronger
        float lightRay(vec2 uv, vec2 center, float angle, float width, float length) {
          vec2 dir = vec2(cos(angle), sin(angle));
          vec2 toPoint = uv - center;
          float along = dot(toPoint, dir);
          float perp = abs(dot(toPoint, vec2(-dir.y, dir.x)));
          float ray = smoothstep(width, 0.0, perp) * smoothstep(length, 0.0, along) * smoothstep(-0.02, 0.1, along);
          return ray * 0.25;
        }
        
        void main() {
          vec2 uv = vUv;
          float aspect = u_resolution.x / u_resolution.y;
          uv.x *= aspect;
          
          float t = u_time * 0.06;
          
          // Premium warm cream background
          vec3 bgColor = vec3(0.988, 0.973, 0.953);
          
          // Subtle radial gradient for depth
          float vignette = 1.0 - length(vUv - 0.5) * 0.3;
          bgColor *= vignette;
          
          // Color palette - VIBRANT saturated tones
          vec3 sageGlow = vec3(0.4, 0.75, 0.55);      // Rich teal-sage
          vec3 roseGlow = vec3(0.95, 0.55, 0.65);     // Vibrant rose
          vec3 goldGlow = vec3(1.0, 0.8, 0.4);        // Bright gold
          vec3 pearlGlow = vec3(0.95, 0.92, 1.0);     // Luminous pearl
          vec3 coralGlow = vec3(1.0, 0.6, 0.5);       // Warm coral
          
          vec3 color = bgColor;
          float totalGlow = 0.0;
          
          // Orb 1 - Large sage aura with bright core
          vec2 c1 = vec2(
            0.35 * aspect + sin(t * 0.5) * 0.15 * aspect,
            0.65 + cos(t * 0.4) * 0.12
          );
          float orb1 = glowOrb(uv, c1, 0.4);
          color += sageGlow * orb1 * 0.7;
          totalGlow += orb1;
          
          // Light rays from orb 1
          for (float i = 0.0; i < 5.0; i++) {
            float angle = t * 0.25 + i * 1.256;
            color += sageGlow * lightRay(uv, c1, angle, 0.05, 0.6) * 1.2;
          }
          
          // Orb 2 - Vibrant rose aura
          vec2 c2 = vec2(
            0.65 * aspect + sin(t * 0.7 + 2.0) * 0.18 * aspect,
            0.35 + cos(t * 0.5 + 1.5) * 0.15
          );
          float orb2 = glowOrb(uv, c2, 0.35);
          color += roseGlow * orb2 * 0.65;
          totalGlow += orb2;
          
          // Light rays from orb 2
          for (float i = 0.0; i < 4.0; i++) {
            float angle = -t * 0.2 + i * 1.57 + 0.5;
            color += roseGlow * lightRay(uv, c2, angle, 0.045, 0.55) * 1.0;
          }
          
          // Orb 3 - Bright golden accent
          vec2 c3 = vec2(
            0.5 * aspect + sin(t * 0.9 + 4.0) * 0.22 * aspect,
            0.5 + cos(t * 0.6 + 3.0) * 0.2
          );
          float orb3 = glowOrb(uv, c3, 0.3);
          color += goldGlow * orb3 * 0.6;
          totalGlow += orb3;
          
          // Light rays from gold orb
          for (float i = 0.0; i < 3.0; i++) {
            float angle = t * 0.3 + i * 2.094;
            color += goldGlow * lightRay(uv, c3, angle, 0.04, 0.5) * 0.9;
          }
          
          // Orb 4 - Pearl highlight top
          vec2 c4 = vec2(
            0.4 * aspect + sin(t * 0.4 + 1.0) * 0.12 * aspect,
            0.78 + cos(t * 0.35 + 2.5) * 0.08
          );
          float orb4 = glowOrb(uv, c4, 0.28);
          color += pearlGlow * orb4 * 0.5;
          
          // Orb 5 - Coral bottom accent
          vec2 c5 = vec2(
            0.6 * aspect + sin(t * 0.55 + 5.0) * 0.16 * aspect,
            0.22 + cos(t * 0.45 + 4.0) * 0.1
          );
          float orb5 = glowOrb(uv, c5, 0.32);
          color += coralGlow * orb5 * 0.55;
          
          // Light rays from coral
          for (float i = 0.0; i < 3.0; i++) {
            float angle = -t * 0.18 + i * 2.094 + 1.0;
            color += coralGlow * lightRay(uv, c5, angle, 0.04, 0.45) * 0.8;
          }
          
          // Vibrant color field gradients
          float fieldNoise = snoise(uv * 1.5 + t * 0.2) * 0.5 + 0.5;
          vec3 fieldColor = mix(sageGlow, roseGlow, fieldNoise);
          color += fieldColor * 0.1;
          
          // Strong bloom effect
          float bloomIntensity = totalGlow * 0.2;
          color += vec3(1.0, 0.98, 0.95) * bloomIntensity;
          
          // Tone mapping instead of hard clamp - preserves HDR feel
          float exposure = 1.2;
          color = 1.0 - exp(-color * exposure);
          
          // Subtle film grain for texture
          float grain = snoise(uv * 200.0 + t * 10.0) * 0.015;
          color += grain;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: false,
      depthTest: false
    });
    
    const lavaQuad = new THREE.Mesh(lavaGeometry, lavaMaterial);
    lavaQuad.renderOrder = -1;
    scene.add(lavaQuad);

    const createRichVariations = (baseColors: number[]): THREE.Color[] => {
      const result: THREE.Color[] = [];
      baseColors.forEach(hex => {
        const base = new THREE.Color(hex);
        result.push(base);
        result.push(new THREE.Color().copy(base).lerp(new THREE.Color(0xffffff), 0.15));
        result.push(new THREE.Color().copy(base).lerp(new THREE.Color(0xffffff), 0.3));
        result.push(new THREE.Color().copy(base).lerp(new THREE.Color(0xffffff), 0.5));
        result.push(new THREE.Color().copy(base).lerp(new THREE.Color(0xffffff), 0.7));
        result.push(new THREE.Color().copy(base).lerp(new THREE.Color(0x000000), 0.1));
        result.push(new THREE.Color().copy(base).lerp(new THREE.Color(0x000000), 0.25));
        result.push(new THREE.Color().copy(base).lerp(new THREE.Color(0x000000), 0.4));
      });
      return result;
    };

    const colorFamilies = [
      createRichVariations([0x3D6B6E, 0x4A7C7E, 0x5A8B8D, 0x2D5558, 0x6A9B9E, 0x1E4548]),
      createRichVariations([0x6B9E8C, 0x7AAE9C, 0x5A8E7C, 0x8ABEA8, 0x4A7E6C, 0x9DCEB8]),
      createRichVariations([0xD97B3D, 0xE88B4D, 0xC96B2D, 0xF09B5D, 0xB85B1D, 0xF5AB6D]),
      createRichVariations([0xF5EFE6, 0xE8DED1, 0xD4C9BC, 0xEDE4D8, 0xFAF6F0, 0xC9BEB1]),
    ];

    const clusterBurstDuration = 22.75; // 30% slower than before (17.5 * 1.3)
    const clusterGap = 0; // No gap - flows seamlessly
    const fullCycleDuration = 4 * clusterBurstDuration;

    // ============================================
    // DENSE BACKGROUND PARTICLES
    // ============================================
    const bgParticleCount = 20000;
    const bgGeometry = new THREE.BufferGeometry();
    const bgPositions = new Float32Array(bgParticleCount * 3);
    const bgColors = new Float32Array(bgParticleCount * 3);
    const bgSizes = new Float32Array(bgParticleCount);
    const bgPhases = new Float32Array(bgParticleCount);
    const bgHomePositions = new Float32Array(bgParticleCount * 3);

    for (let i = 0; i < bgParticleCount; i++) {
      const i3 = i * 3;
      const cluster = Math.floor(Math.random() * 4);
      
      let homeX = (Math.random() - 0.5) * 95;
      let homeY = (Math.random() - 0.5) * 80;
      
      const clusterBias = 0.55;
      switch (cluster) {
        case 0: homeY = homeY * (1 - clusterBias) + (8 + Math.random() * 28) * clusterBias; break;
        case 1: homeX = homeX * (1 - clusterBias) + (12 + Math.random() * 35) * clusterBias; break;
        case 2: homeY = homeY * (1 - clusterBias) + (-8 - Math.random() * 28) * clusterBias; break;
        case 3: homeX = homeX * (1 - clusterBias) + (-12 - Math.random() * 35) * clusterBias; break;
      }
      
      bgHomePositions[i3] = homeX;
      bgHomePositions[i3 + 1] = homeY;
      bgHomePositions[i3 + 2] = -12 + Math.random() * 50;
      
      bgPositions[i3] = homeX;
      bgPositions[i3 + 1] = homeY;
      bgPositions[i3 + 2] = bgHomePositions[i3 + 2];

      const family = colorFamilies[cluster];
      const color = family[Math.floor(Math.random() * family.length)];
      bgColors[i3] = color.r;
      bgColors[i3 + 1] = color.g;
      bgColors[i3 + 2] = color.b;

      const sizeRand = Math.random();
      if (sizeRand < 0.06) {
        bgSizes[i] = 4.5 + Math.random() * 7;
      } else if (sizeRand < 0.2) {
        bgSizes[i] = 2.5 + Math.random() * 3.5;
      } else if (sizeRand < 0.55) {
        bgSizes[i] = 1.2 + Math.random() * 2;
      } else {
        bgSizes[i] = 0.3 + Math.random() * 1.2;
      }
      bgPhases[i] = Math.random() * Math.PI * 2;
    }

    bgGeometry.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
    bgGeometry.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));
    bgGeometry.setAttribute('size', new THREE.BufferAttribute(bgSizes, 1));

    const bgMaterial = new THREE.ShaderMaterial({
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
          float sizeAtten = size * u_pixelRatio * (320.0 / -mvPosition.z);
          gl_PointSize = clamp(sizeAtten, 1.0, 120.0);
          vAlpha = 0.6;
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
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      vertexColors: true
    });

    const bgParticles = new THREE.Points(bgGeometry, bgMaterial);
    scene.add(bgParticles);

    // ============================================
    // BURST PARTICLES
    // ============================================
    const particleCount = 32000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colorAttrib = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const homePositions = new Float32Array(particleCount * 3);
    const phases = new Float32Array(particleCount);
    const rotationSpeeds = new Float32Array(particleCount);
    const clusterIds = new Float32Array(particleCount);
    const burstOffsets = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      const cluster = Math.floor(Math.random() * 4);
      clusterIds[i] = cluster;
      
      let homeX = 0, homeY = 0;
      const spreadX = 30 + Math.random() * 25;
      const spreadY = 25 + Math.random() * 22;
      
      switch (cluster) {
        case 0:
          homeX = (Math.random() - 0.5) * 75;
          homeY = 6 + Math.random() * spreadY;
          break;
        case 1:
          homeX = 10 + Math.random() * spreadX;
          homeY = (Math.random() - 0.5) * 68;
          break;
        case 2:
          homeX = (Math.random() - 0.5) * 75;
          homeY = -6 - Math.random() * spreadY;
          break;
        case 3:
          homeX = -10 - Math.random() * spreadX;
          homeY = (Math.random() - 0.5) * 68;
          break;
      }
      
      homePositions[i3] = homeX;
      homePositions[i3 + 1] = homeY;
      homePositions[i3 + 2] = -12 + Math.random() * 55;
      
      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = -12;

      const family = colorFamilies[cluster];
      const color = family[Math.floor(Math.random() * family.length)];
      colorAttrib[i3] = color.r;
      colorAttrib[i3 + 1] = color.g;
      colorAttrib[i3 + 2] = color.b;

      const sizeType = Math.random();
      if (sizeType < 0.05) {
        sizes[i] = 7 + Math.random() * 10;
      } else if (sizeType < 0.16) {
        sizes[i] = 3.5 + Math.random() * 5;
      } else if (sizeType < 0.42) {
        sizes[i] = 1.8 + Math.random() * 2.8;
      } else {
        sizes[i] = 0.5 + Math.random() * 1.5;
      }

      phases[i] = Math.random() * Math.PI * 2;
      rotationSpeeds[i] = 0.12 + Math.random() * 0.35;
      burstOffsets[i] = Math.random() * 9.0; // Wider stagger for slower burst
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
          
          float sizeAtten = size * u_pixelRatio * (360.0 / -mvPosition.z);
          gl_PointSize = clamp(sizeAtten, 1.0, 180.0);
          
          float distFromCenter = length(position.xy);
          vAlpha = smoothstep(0.0, 2.0, distFromCenter) * 0.96;
          
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
          
          float glow = exp(-dist * 1.8) * 0.22;
          vec3 finalColor = vColor + vec3(1.0) * glow * 0.05;
          
          if (alpha < 0.003) discard;
          
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

    // Grain particles
    const grainCount = 10000;
    const grainGeometry = new THREE.BufferGeometry();
    const grainPositions = new Float32Array(grainCount * 3);
    const grainColors = new Float32Array(grainCount * 3);
    const grainSizes = new Float32Array(grainCount);
    const grainHomes = new Float32Array(grainCount * 3);
    const grainPhases = new Float32Array(grainCount);
    const grainClusters = new Float32Array(grainCount);
    const grainBurstOffsets = new Float32Array(grainCount);

    for (let i = 0; i < grainCount; i++) {
      const i3 = i * 3;
      
      const cluster = Math.floor(Math.random() * 4);
      grainClusters[i] = cluster;
      
      let gHomeX = 0, gHomeY = 0;
      const gSpreadX = 35 + Math.random() * 22;
      const gSpreadY = 28 + Math.random() * 18;
      
      switch (cluster) {
        case 0: gHomeX = (Math.random() - 0.5) * 80; gHomeY = 4 + Math.random() * gSpreadY; break;
        case 1: gHomeX = 8 + Math.random() * gSpreadX; gHomeY = (Math.random() - 0.5) * 72; break;
        case 2: gHomeX = (Math.random() - 0.5) * 80; gHomeY = -4 - Math.random() * gSpreadY; break;
        case 3: gHomeX = -8 - Math.random() * gSpreadX; gHomeY = (Math.random() - 0.5) * 72; break;
      }
      
      grainHomes[i3] = gHomeX;
      grainHomes[i3 + 1] = gHomeY;
      grainHomes[i3 + 2] = Math.random() * 35;
      
      grainPositions[i3] = 0;
      grainPositions[i3 + 1] = 0;
      grainPositions[i3 + 2] = 0;
      
      const family = colorFamilies[cluster];
      const gColor = family[Math.floor(Math.random() * family.length)];
      grainColors[i3] = gColor.r;
      grainColors[i3 + 1] = gColor.g;
      grainColors[i3 + 2] = gColor.b;
      
      grainSizes[i] = 0.2 + Math.random() * 0.9;
      grainPhases[i] = Math.random() * Math.PI * 2;
      grainBurstOffsets[i] = Math.random() * 9.0;
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
          gl_PointSize = size * u_pixelRatio * (240.0 / -mvPosition.z);
          
          float distFromCenter = length(position.xy);
          vAlpha = smoothstep(0.0, 1.5, distFromCenter) * 0.5;
          
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

      // Update lava lamp shader
      (lavaMaterial as THREE.ShaderMaterial).uniforms.u_time.value = elapsed;

      // Get tilt offset for particles
      const tiltOffsetX = tiltRef.current.x * 15;
      const tiltOffsetY = tiltRef.current.y * 10;

      // Animate background particles
      const bgPosAttr = bgParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < bgParticleCount; i++) {
        const i3 = i * 3;
        const homeX = bgHomePositions[i3];
        const homeY = bgHomePositions[i3 + 1];
        const homeZ = bgHomePositions[i3 + 2];
        
        bgPosAttr[i3] = homeX + Math.sin(elapsed * 0.22 + bgPhases[i]) * 2.2 + tiltOffsetX;
        bgPosAttr[i3 + 1] = homeY + Math.cos(elapsed * 0.18 + bgPhases[i] * 1.2) * 1.8 + tiltOffsetY;
        bgPosAttr[i3 + 2] = homeZ + Math.sin(elapsed * 0.12 + bgPhases[i] * 0.8) * 1.2;
      }
      bgParticles.geometry.attributes.position.needsUpdate = true;
      (bgMaterial as THREE.ShaderMaterial).uniforms.u_time.value = elapsed;

      const cycleTime = elapsed % fullCycleDuration;
      
      const posAttr = particles.geometry.attributes.position.array as Float32Array;
      const posCount = posAttr.length / 3;
      
      (material as THREE.ShaderMaterial).uniforms.u_time.value = elapsed;

      for (let i = 0; i < posCount; i++) {
        const i3 = i * 3;
        const cluster = clusterIds[i];
        
        const clusterStartTime = cluster * (clusterBurstDuration + clusterGap);
        const particleStartTime = clusterStartTime + burstOffsets[i];
        
        let timeSinceBurst = cycleTime - particleStartTime;
        
        if (timeSinceBurst < -fullCycleDuration + clusterBurstDuration + 3) {
          timeSinceBurst += fullCycleDuration;
        }
        
        if (timeSinceBurst < 0) {
          posAttr[i3] = 0;
          posAttr[i3 + 1] = 0;
          posAttr[i3 + 2] = -12;
          continue;
        }
        
        const burstDuration = 22.75; // 30% slower burst
        const burstT = Math.min(1.0, timeSinceBurst / burstDuration);
        const easeOut = 1.0 - Math.pow(1.0 - burstT, 2.3);
        
        const homeX = homePositions[i3];
        const homeY = homePositions[i3 + 1];
        const homeZ = homePositions[i3 + 2];
        
        let currentX = homeX * easeOut;
        let currentY = homeY * easeOut;
        let currentZ = -12 + (homeZ + 12) * easeOut;
        
        if (burstT >= 0.65) {
          const rotTime = elapsed * rotationSpeeds[i];
          const rotRadius = 1.0 + Math.sin(phases[i] * 3) * 0.8;
          
          currentX += Math.sin(rotTime + phases[i]) * rotRadius;
          currentY += Math.cos(rotTime + phases[i] * 1.3) * rotRadius;
          currentZ += Math.sin(rotTime * 0.3 + phases[i]) * 0.6;
          
          currentX += Math.sin(elapsed * 0.1 + phases[i] * 2) * 0.5;
          currentY += Math.cos(elapsed * 0.08 + phases[i] * 1.5) * 0.4;
        }
        
        posAttr[i3] = currentX + tiltOffsetX;
        posAttr[i3 + 1] = currentY + tiltOffsetY;
        posAttr[i3 + 2] = currentZ;
      }
      particles.geometry.attributes.position.needsUpdate = true;

      const grainPos = grainParticles.geometry.attributes.position.array as Float32Array;
      const grainCnt = grainPos.length / 3;
      
      for (let i = 0; i < grainCnt; i++) {
        const i3 = i * 3;
        const cluster = grainClusters[i];
        
        const clusterStartTime = cluster * (clusterBurstDuration + clusterGap);
        const particleStartTime = clusterStartTime + grainBurstOffsets[i];
        
        let timeSinceBurst = cycleTime - particleStartTime;
        
        if (timeSinceBurst < -fullCycleDuration + clusterBurstDuration + 3) {
          timeSinceBurst += fullCycleDuration;
        }
        
        if (timeSinceBurst < 0) {
          grainPos[i3] = 0;
          grainPos[i3 + 1] = 0;
          grainPos[i3 + 2] = 0;
          continue;
        }
        
        const burstT = Math.min(1.0, timeSinceBurst / 22.75);
        const easeOut = 1.0 - Math.pow(1.0 - burstT, 2.3);
        
        const gHomeX = grainHomes[i3];
        const gHomeY = grainHomes[i3 + 1];
        const gHomeZ = grainHomes[i3 + 2];
        
        let gX = gHomeX * easeOut;
        let gY = gHomeY * easeOut;
        let gZ = gHomeZ * easeOut;
        
        if (burstT >= 0.65) {
          const rotTime = elapsed * 0.22;
          gX += Math.sin(rotTime + grainPhases[i]) * 0.8;
          gY += Math.cos(rotTime + grainPhases[i] * 1.2) * 0.6;
        }
        
        grainPos[i3] = gX + tiltOffsetX;
        grainPos[i3 + 1] = gY + tiltOffsetY;
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
      (lavaMaterial as THREE.ShaderMaterial).uniforms.u_resolution.value.set(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      bgGeometry.dispose();
      bgMaterial.dispose();
      grainGeometry.dispose();
      grainMaterial.dispose();
      lavaGeometry.dispose();
      lavaMaterial.dispose();
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
    <motion.div 
      className="relative w-full h-full overflow-hidden" 
      style={{ background: '#ffffff' }}
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.5 }}
    >
      <div 
        ref={containerRef} 
        className="absolute inset-0"
        style={{ zIndex: 1 }}
      />

      {/* TRACE Brand Name at top - cream/white with strong glow for visibility */}
      <motion.div
        className="absolute z-10 w-full text-center pointer-events-none"
        style={{ top: '7%' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 1.5, ease: [0.22, 0.61, 0.36, 1] }}
      >
        <h1 style={{ 
          fontFamily: 'ALORE, Georgia, serif',
          color: '#FAF6F0',
          fontWeight: 400,
          letterSpacing: '1em',
          fontSize: '11px',
          textShadow: '0 0 20px rgba(255, 255, 255, 0.9), 0 0 40px rgba(255, 255, 255, 0.6), 0 0 60px rgba(255, 255, 255, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3)',
          paddingLeft: '1em',
        }}>
          TRACE
        </h1>
      </motion.div>

      <AnimatePresence>
        {showTitle && (
          <motion.div
            className="absolute z-10 pointer-events-none"
            style={{
              top: '38%',
              left: 0,
              right: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              transform: 'translateY(-50%)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: 0.5, duration: 1.2, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <p
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '19px',
                fontWeight: 400,
                color: 'rgba(250, 246, 240, 0.7)',
                margin: 0,
                padding: '0 20px',
                width: '100%',
                letterSpacing: '0.02em',
                textShadow: '0 0 20px rgba(255, 255, 255, 0.6), 0 0 40px rgba(255, 255, 255, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)',
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
    </motion.div>
  );
}
