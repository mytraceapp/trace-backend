import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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

function SkiaOrb({ size, scale = 1 }: OrbProps) {
  const canvasSize = size * 1.8;
  const center = canvasSize / 2;
  const radius = (size / 2) * scale;
  
  const outerHaloRadius = radius * 1.6;
  const bloomRadius = radius * 1.25;
  
  const noiseOpacityMatrix = useMemo(() => [
    1, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, 0.025, 0,
  ], []);

  return (
    <Canvas style={{ width: canvasSize, height: canvasSize }}>
      <Group>
        <Blend mode="screen">
          <Circle cx={center} cy={center} r={outerHaloRadius}>
            <RadialGradient
              c={vec(center, center)}
              r={outerHaloRadius}
              colors={[
                'rgba(210, 225, 212, 0.35)',
                'rgba(185, 202, 188, 0.2)',
                'rgba(160, 180, 164, 0.08)',
                'rgba(154, 176, 156, 0)',
              ]}
              positions={[0, 0.4, 0.7, 1]}
            />
            <Blur blur={25} />
          </Circle>
        </Blend>

        <Blend mode="screen">
          <Circle cx={center} cy={center} r={bloomRadius}>
            <RadialGradient
              c={vec(center, center)}
              r={bloomRadius}
              colors={[
                'rgba(245, 250, 246, 0.55)',
                'rgba(220, 235, 222, 0.4)',
                'rgba(195, 212, 198, 0.2)',
                'rgba(175, 195, 180, 0)',
              ]}
              positions={[0, 0.3, 0.6, 1]}
            />
            <Blur blur={18} />
          </Circle>
        </Blend>

        <Circle cx={center} cy={center} r={radius}>
          <RadialGradient
            c={vec(center - radius * 0.18, center - radius * 0.18)}
            r={radius * 1.35}
            colors={[
              'rgba(252, 254, 252, 0.98)',
              'rgba(235, 245, 238, 0.92)',
              'rgba(210, 225, 215, 0.82)',
              'rgba(180, 200, 185, 0.72)',
            ]}
            positions={[0, 0.25, 0.55, 1]}
          />
        </Circle>

        <Blend mode="softLight">
          <Circle cx={center - radius * 0.22} cy={center - radius * 0.28} r={radius * 0.42}>
            <RadialGradient
              c={vec(center - radius * 0.22, center - radius * 0.28)}
              r={radius * 0.42}
              colors={[
                'rgba(255, 255, 255, 0.75)',
                'rgba(255, 255, 255, 0.35)',
                'rgba(255, 255, 255, 0)',
              ]}
              positions={[0, 0.5, 1]}
            />
            <Blur blur={10} />
          </Circle>
        </Blend>

        <Blend mode="overlay">
          <Circle cx={center - radius * 0.32} cy={center - radius * 0.32} r={radius * 0.14}>
            <RadialGradient
              c={vec(center - radius * 0.32, center - radius * 0.32)}
              r={radius * 0.14}
              colors={[
                'rgba(255, 255, 255, 0.95)',
                'rgba(255, 255, 255, 0.5)',
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
                freqX={0.8}
                freqY={0.8}
                octaves={3}
                seed={42}
              />
            </Circle>
          </Group>
        </Blend>
      </Group>
    </Canvas>
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
