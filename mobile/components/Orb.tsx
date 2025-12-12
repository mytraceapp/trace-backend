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
let Image: any;
let useImage: any;
let Rect: any;
let ColorMatrix: any;

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
  Image = Skia.Image;
  useImage = Skia.useImage;
  Rect = Skia.Rect;
  ColorMatrix = Skia.ColorMatrix;
  SkiaAvailable = true;
} catch (e) {
  SkiaAvailable = false;
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
  const bloomRadius = radius * 1.2;
  
  const noiseMatrix = useMemo(() => [
    1, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, 0.02, 0,
  ], []);

  return (
    <Canvas style={{ width: canvasSize, height: canvasSize }}>
      <Group>
        <Circle cx={center} cy={center} r={outerHaloRadius}>
          <RadialGradient
            c={vec(center, center)}
            r={outerHaloRadius}
            colors={[
              'rgba(200, 215, 202, 0.35)',
              'rgba(175, 192, 178, 0.2)',
              'rgba(154, 176, 156, 0.08)',
              'rgba(154, 176, 156, 0)',
            ]}
            positions={[0, 0.4, 0.7, 1]}
          />
        </Circle>

        <Circle cx={center} cy={center} r={bloomRadius}>
          <RadialGradient
            c={vec(center, center)}
            r={bloomRadius}
            colors={[
              'rgba(235, 240, 235, 0.5)',
              'rgba(210, 222, 212, 0.35)',
              'rgba(185, 200, 188, 0.15)',
              'rgba(170, 188, 172, 0)',
            ]}
            positions={[0, 0.35, 0.65, 1]}
          />
          <Blur blur={15} />
        </Circle>

        <Circle cx={center} cy={center} r={radius}>
          <RadialGradient
            c={vec(center - radius * 0.15, center - radius * 0.15)}
            r={radius * 1.3}
            colors={[
              'rgba(245, 248, 245, 0.95)',
              'rgba(225, 235, 228, 0.85)',
              'rgba(195, 210, 198, 0.75)',
              'rgba(165, 185, 170, 0.65)',
            ]}
            positions={[0, 0.3, 0.6, 1]}
          />
        </Circle>

        <Circle cx={center - radius * 0.25} cy={center - radius * 0.3} r={radius * 0.35}>
          <RadialGradient
            c={vec(center - radius * 0.25, center - radius * 0.3)}
            r={radius * 0.35}
            colors={[
              'rgba(255, 255, 255, 0.7)',
              'rgba(255, 255, 255, 0.3)',
              'rgba(255, 255, 255, 0)',
            ]}
            positions={[0, 0.5, 1]}
          />
          <Blur blur={8} />
        </Circle>

        <Circle cx={center - radius * 0.35} cy={center - radius * 0.35} r={radius * 0.12}>
          <RadialGradient
            c={vec(center - radius * 0.35, center - radius * 0.35)}
            r={radius * 0.12}
            colors={[
              'rgba(255, 255, 255, 0.9)',
              'rgba(255, 255, 255, 0.4)',
              'rgba(255, 255, 255, 0)',
            ]}
            positions={[0, 0.4, 1]}
          />
        </Circle>
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
            'rgba(185, 200, 188, 0.25)',
            'rgba(175, 192, 178, 0.15)',
            'rgba(165, 185, 170, 0.05)',
            'transparent',
          ]}
          locations={[0, 0.3, 0.6, 1]}
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
            'rgba(225, 235, 228, 0.5)',
            'rgba(200, 215, 202, 0.3)',
            'rgba(185, 200, 188, 0.1)',
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.3, y: 0.3 }}
          end={{ x: 0.8, y: 0.8 }}
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
            'rgba(245, 250, 246, 0.95)',
            'rgba(220, 232, 223, 0.85)',
            'rgba(190, 208, 194, 0.75)',
            'rgba(165, 185, 170, 0.65)',
          ]}
          locations={[0, 0.3, 0.6, 1]}
          start={{ x: 0.25, y: 0.2 }}
          end={{ x: 0.85, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />
        
        <View style={[styles.highlight, {
          width: scaledSize * 0.25,
          height: scaledSize * 0.25,
          borderRadius: scaledSize * 0.125,
          top: scaledSize * 0.15,
          left: scaledSize * 0.2,
        }]} />
        
        <View style={[styles.softHighlight, {
          width: scaledSize * 0.45,
          height: scaledSize * 0.45,
          borderRadius: scaledSize * 0.225,
          top: scaledSize * 0.12,
          left: scaledSize * 0.15,
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
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  softHighlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
});
