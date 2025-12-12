import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

let SkiaAvailable = false;
let Canvas: any;
let Circle: any;
let Group: any;
let RadialGradient: any;
let Blur: any;
let Blend: any;
let vec: any;
let Paint: any;
let Rect: any;
let FractalNoise: any;
let ColorMatrix: any;
let Fill: any;

try {
  const Skia = require('@shopify/react-native-skia');
  Canvas = Skia.Canvas;
  Circle = Skia.Circle;
  Group = Skia.Group;
  RadialGradient = Skia.RadialGradient;
  Blur = Skia.Blur;
  Blend = Skia.Blend;
  vec = Skia.vec;
  Paint = Skia.Paint;
  Rect = Skia.Rect;
  FractalNoise = Skia.FractalNoise;
  ColorMatrix = Skia.ColorMatrix;
  Fill = Skia.Fill;
  SkiaAvailable = true;
  console.log('[Orb] Skia loaded successfully - using Skia renderer');
} catch (e) {
  SkiaAvailable = false;
  console.log('[Orb] Skia not available - using fallback renderer');
}

interface OrbProps {
  size: number;
  animated?: boolean;
  scale?: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  z: number;
  baseSize: number;
  cluster: number;
  color: string;
  highlightBias: number;
}

interface Cluster {
  id: number;
  centerX: number;
  centerY: number;
  zCenter: number;
  radius: number;
  color: string;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function gaussianRandom(random: () => number): number {
  let u = 0, v = 0;
  while (u === 0) u = random();
  while (v === 0) v = random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const PARTICLE_COLORS = [
  'rgba(210, 225, 212, OPACITY)',
  'rgba(185, 202, 188, OPACITY)',
  'rgba(235, 245, 238, OPACITY)',
  'rgba(220, 235, 222, OPACITY)',
  'rgba(195, 212, 198, OPACITY)',
  'rgba(245, 250, 246, OPACITY)',
  'rgba(200, 218, 205, OPACITY)',
  'rgba(175, 195, 180, OPACITY)',
];

const CLUSTER_COLORS = [
  'rgba(210, 225, 212, 0.12)',
  'rgba(185, 202, 188, 0.10)',
  'rgba(220, 235, 222, 0.08)',
  'rgba(195, 212, 198, 0.10)',
];

function generateClusters(random: () => number, canvasSize: number, radius: number): Cluster[] {
  const center = canvasSize / 2;
  const clusters: Cluster[] = [];
  const clusterCount = 4;
  
  for (let i = 0; i < clusterCount; i++) {
    const angle = (i / clusterCount) * Math.PI * 2 + random() * 0.5;
    const dist = radius * (0.2 + random() * 0.5);
    clusters.push({
      id: i,
      centerX: center + Math.cos(angle) * dist,
      centerY: center + Math.sin(angle) * dist,
      zCenter: 0.3 + random() * 0.5,
      radius: radius * (0.25 + random() * 0.3),
      color: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
    });
  }
  
  return clusters;
}

function generateParticles(
  random: () => number,
  clusters: Cluster[],
  canvasSize: number,
  radius: number,
  count: number
): Particle[] {
  const center = canvasSize / 2;
  const particles: Particle[] = [];
  
  for (let i = 0; i < count; i++) {
    const clusterIdx = Math.floor(random() * clusters.length);
    const cluster = clusters[clusterIdx];
    
    const zSpread = 0.15;
    const z = clamp(cluster.zCenter + gaussianRandom(random) * zSpread, 0, 1);
    
    const angle = random() * Math.PI * 2;
    const dist = Math.abs(gaussianRandom(random)) * cluster.radius * 0.7;
    const x = cluster.centerX + Math.cos(angle) * dist;
    const y = cluster.centerY + Math.sin(angle) * dist;
    
    const distFromCenter = Math.sqrt((x - center) ** 2 + (y - center) ** 2);
    if (distFromCenter > radius * 1.4) continue;
    
    const baseSize = 2 + random() * 6;
    const colorIdx = Math.floor(random() * PARTICLE_COLORS.length);
    const highlightBias = z > 0.6 ? (random() * 0.15) : 0;
    
    particles.push({
      id: i,
      x,
      y,
      z,
      baseSize,
      cluster: clusterIdx,
      color: PARTICLE_COLORS[colorIdx],
      highlightBias,
    });
  }
  
  return particles.sort((a, b) => a.z - b.z);
}

function SkiaOrb({ size, scale = 1 }: OrbProps) {
  const canvasSize = size * 1.8;
  const center = canvasSize / 2;
  const radius = (size / 2) * scale;
  
  const outerHaloRadius = radius * 1.6;
  const bloomRadius = radius * 1.25;
  
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  
  const updateOffset = useCallback((x: number, y: number) => {
    setPanOffset({ x, y });
  }, []);
  
  const random = useMemo(() => seededRandom(42), []);
  const clusters = useMemo(() => generateClusters(random, canvasSize, radius), [canvasSize, radius]);
  const particles = useMemo(() => generateParticles(random, clusters, canvasSize, radius, 180), [clusters, canvasSize, radius]);
  
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      panX.value = event.translationX;
      panY.value = event.translationY;
      runOnJS(updateOffset)(event.translationX, event.translationY);
    })
    .onEnd(() => {
      panX.value = withSpring(0, { damping: 15, stiffness: 150 });
      panY.value = withSpring(0, { damping: 15, stiffness: 150 });
      runOnJS(updateOffset)(0, 0);
    });
  
  const noiseOpacityMatrix = useMemo(() => [
    1, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, 0.02, 0,
  ], []);

  const computeParticleRender = useCallback((particle: Particle) => {
    const parallaxScale = lerp(0.15, 1.0, particle.z);
    const px = particle.x + panOffset.x * parallaxScale * 0.3;
    const py = particle.y + panOffset.y * parallaxScale * 0.3;
    
    const sizeScale = lerp(0.6, 1.6, particle.z);
    const finalSize = particle.baseSize * sizeScale;
    
    const opacity = lerp(0.20, 0.90, particle.z);
    const blurAmount = lerp(8, 1, particle.z);
    
    const lightBias = particle.highlightBias;
    const adjustedOpacity = Math.min(1, opacity + lightBias);
    
    const colorWithOpacity = particle.color.replace('OPACITY', adjustedOpacity.toFixed(2));
    
    return {
      cx: px,
      cy: py,
      r: finalSize,
      blur: blurAmount,
      color: colorWithOpacity,
      key: particle.id,
    };
  }, [panOffset]);

  const computeClusterFog = useCallback((cluster: Cluster) => {
    const parallaxScale = lerp(0.15, 1.0, cluster.zCenter);
    const px = cluster.centerX + panOffset.x * parallaxScale * 0.15;
    const py = cluster.centerY + panOffset.y * parallaxScale * 0.15;
    
    return {
      cx: px,
      cy: py,
      r: cluster.radius * 1.5,
      color: cluster.color,
      key: cluster.id,
    };
  }, [panOffset]);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View>
        <Canvas style={{ width: canvasSize, height: canvasSize }}>
          <Group>
            <Blend mode="screen">
              <Circle cx={center} cy={center} r={outerHaloRadius}>
                <RadialGradient
                  c={vec(center, center)}
                  r={outerHaloRadius}
                  colors={[
                    'rgba(210, 225, 212, 0.30)',
                    'rgba(185, 202, 188, 0.18)',
                    'rgba(160, 180, 164, 0.06)',
                    'rgba(154, 176, 156, 0)',
                  ]}
                  positions={[0, 0.4, 0.7, 1]}
                />
                <Blur blur={28} />
              </Circle>
            </Blend>

            {clusters.map((cluster) => {
              const fog = computeClusterFog(cluster);
              return (
                <Blend key={`fog-${fog.key}`} mode="screen">
                  <Circle cx={fog.cx} cy={fog.cy} r={fog.r}>
                    <RadialGradient
                      c={vec(fog.cx, fog.cy)}
                      r={fog.r}
                      colors={[
                        fog.color,
                        fog.color.replace(/[\d.]+\)$/, '0.05)'),
                        'rgba(0,0,0,0)',
                      ]}
                      positions={[0, 0.5, 1]}
                    />
                    <Blur blur={20} />
                  </Circle>
                </Blend>
              );
            })}

            <Blend mode="screen">
              <Circle cx={center} cy={center} r={bloomRadius}>
                <RadialGradient
                  c={vec(center, center)}
                  r={bloomRadius}
                  colors={[
                    'rgba(245, 250, 246, 0.45)',
                    'rgba(220, 235, 222, 0.32)',
                    'rgba(195, 212, 198, 0.15)',
                    'rgba(175, 195, 180, 0)',
                  ]}
                  positions={[0, 0.3, 0.6, 1]}
                />
                <Blur blur={16} />
              </Circle>
            </Blend>

            <Circle cx={center} cy={center} r={radius * 0.85}>
              <RadialGradient
                c={vec(center - radius * 0.12, center - radius * 0.12)}
                r={radius * 1.2}
                colors={[
                  'rgba(252, 254, 252, 0.92)',
                  'rgba(235, 245, 238, 0.85)',
                  'rgba(210, 225, 215, 0.72)',
                  'rgba(180, 200, 185, 0.58)',
                ]}
                positions={[0, 0.25, 0.55, 1]}
              />
              <Blur blur={3} />
            </Circle>

            {particles.map((particle) => {
              const p = computeParticleRender(particle);
              return (
                <Group key={p.key}>
                  <Blend mode="screen">
                    <Circle cx={p.cx} cy={p.cy} r={p.r}>
                      <RadialGradient
                        c={vec(p.cx - p.r * 0.2, p.cy - p.r * 0.2)}
                        r={p.r * 1.5}
                        colors={[
                          p.color,
                          p.color.replace(/[\d.]+\)$/, `${parseFloat(p.color.match(/[\d.]+\)$/)?.[0] || '0.5') * 0.4})`),
                          'rgba(0,0,0,0)',
                        ]}
                        positions={[0, 0.4, 1]}
                      />
                      <Blur blur={p.blur} />
                    </Circle>
                  </Blend>
                </Group>
              );
            })}

            <Blend mode="softLight">
              <Circle cx={center - radius * 0.18} cy={center - radius * 0.22} r={radius * 0.38}>
                <RadialGradient
                  c={vec(center - radius * 0.18, center - radius * 0.22)}
                  r={radius * 0.38}
                  colors={[
                    'rgba(255, 255, 255, 0.65)',
                    'rgba(255, 255, 255, 0.28)',
                    'rgba(255, 255, 255, 0)',
                  ]}
                  positions={[0, 0.5, 1]}
                />
                <Blur blur={12} />
              </Circle>
            </Blend>

            <Blend mode="overlay">
              <Circle cx={center - radius * 0.28} cy={center - radius * 0.28} r={radius * 0.12}>
                <RadialGradient
                  c={vec(center - radius * 0.28, center - radius * 0.28)}
                  r={radius * 0.12}
                  colors={[
                    'rgba(255, 255, 255, 0.85)',
                    'rgba(255, 255, 255, 0.4)',
                    'rgba(255, 255, 255, 0)',
                  ]}
                  positions={[0, 0.35, 1]}
                />
              </Circle>
            </Blend>

            <Blend mode="overlay">
              <Group>
                <ColorMatrix matrix={noiseOpacityMatrix} />
                <Circle cx={center} cy={center} r={radius}>
                  <FractalNoise
                    freqX={0.7}
                    freqY={0.7}
                    octaves={3}
                    seed={42}
                  />
                </Circle>
              </Group>
            </Blend>
          </Group>
        </Canvas>
      </Animated.View>
    </GestureDetector>
  );
}

function FallbackOrb({ size, scale = 1 }: OrbProps) {
  const scaledSize = size * scale;
  const haloSize = scaledSize * 1.6;
  const bloomSize = scaledSize * 1.3;
  
  return (
    <View style={[styles.fallbackContainer, { width: haloSize, height: haloSize }]}>
      <View style={[styles.halo, { width: haloSize, height: haloSize, borderRadius: haloSize / 2 }]}>
        <LinearGradient
          colors={[
            'rgba(200, 218, 205, 0.3)',
            'rgba(185, 202, 188, 0.18)',
            'rgba(170, 188, 175, 0.06)',
            'transparent',
          ]}
          locations={[0, 0.35, 0.65, 1]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      
      <View style={[styles.bloom, { 
        width: bloomSize, 
        height: bloomSize, 
        borderRadius: bloomSize / 2,
      }]}>
        <LinearGradient
          colors={[
            'rgba(235, 245, 238, 0.55)',
            'rgba(210, 225, 215, 0.35)',
            'rgba(190, 208, 195, 0.12)',
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.35, y: 0.3 }}
          end={{ x: 0.75, y: 0.8 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      
      <View style={[styles.sphere, { 
        width: scaledSize, 
        height: scaledSize, 
        borderRadius: scaledSize / 2,
      }]}>
        <LinearGradient
          colors={[
            'rgba(252, 255, 253, 0.98)',
            'rgba(230, 242, 233, 0.9)',
            'rgba(200, 218, 205, 0.8)',
            'rgba(175, 195, 182, 0.7)',
          ]}
          locations={[0, 0.28, 0.58, 1]}
          start={{ x: 0.22, y: 0.18 }}
          end={{ x: 0.88, y: 0.92 }}
          style={StyleSheet.absoluteFill}
        />
        
        <View style={[styles.highlight, {
          width: scaledSize * 0.22,
          height: scaledSize * 0.22,
          borderRadius: scaledSize * 0.11,
          top: scaledSize * 0.16,
          left: scaledSize * 0.22,
        }]} />
        
        <View style={[styles.softHighlight, {
          width: scaledSize * 0.48,
          height: scaledSize * 0.48,
          borderRadius: scaledSize * 0.24,
          top: scaledSize * 0.1,
          left: scaledSize * 0.14,
        }]} />
      </View>
    </View>
  );
}

export default function Orb(props: OrbProps) {
  if (SkiaAvailable) {
    return <SkiaOrb {...props} />;
  }
  return <FallbackOrb {...props} />;
}

export { SkiaAvailable };

const styles = StyleSheet.create({
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    overflow: 'hidden',
  },
  bloom: {
    position: 'absolute',
    overflow: 'hidden',
  },
  sphere: {
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  softHighlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
});
