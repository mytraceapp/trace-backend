import { useWindowDimensions } from 'react-native';

let SkiaAvailable = false;
let Canvas: any;
let Circle: any;
let Group: any;
let RadialGradient: any;
let Blur: any;
let vec: any;
let Fill: any;
let Rect: any;
let FractalNoise: any;
let ColorMatrix: any;
let Blend: any;

try {
  const Skia = require('@shopify/react-native-skia');
  Canvas = Skia.Canvas;
  Circle = Skia.Circle;
  Group = Skia.Group;
  RadialGradient = Skia.RadialGradient;
  Blur = Skia.Blur;
  vec = Skia.vec;
  Fill = Skia.Fill;
  Rect = Skia.Rect;
  FractalNoise = Skia.FractalNoise;
  ColorMatrix = Skia.ColorMatrix;
  Blend = Skia.Blend;
  SkiaAvailable = true;
} catch (e) {
  SkiaAvailable = false;
}

const BASE_SAGE = '#7A8C7B';
const RING_COLOR = 'rgba(122, 140, 123, ';
const HIGHLIGHT_COLOR = 'rgba(243, 241, 234, ';

interface OrbBackgroundProps {
  style?: any;
}

export default function OrbBackground({ style }: OrbBackgroundProps) {
  const { width, height } = useWindowDimensions();
  
  if (!SkiaAvailable) {
    return null;
  }

  const centerX = width * 0.5;
  const centerY = height * 0.38;
  const orbRadius = Math.min(width, height) * 0.55;

  const ringRadii = [
    orbRadius * 0.4,
    orbRadius * 0.55,
    orbRadius * 0.72,
    orbRadius * 0.88,
    orbRadius * 1.0,
  ];

  const ringOpacities = [0.10, 0.08, 0.06, 0.05, 0.03];

  const highlightX = centerX - orbRadius * 0.25;
  const highlightY = centerY - orbRadius * 0.3;
  const highlightRadius = orbRadius * 0.35;

  const noiseMatrix = [
    1, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, 0.015, 0,
  ];

  return (
    <Canvas style={[{ position: 'absolute', top: 0, left: 0, width, height }, style]} pointerEvents="none">
      <Fill color={BASE_SAGE} />

      {ringRadii.map((radius, index) => (
        <Group key={`ring-${index}`}>
          <Circle cx={centerX} cy={centerY} r={radius}>
            <RadialGradient
              c={vec(centerX, centerY)}
              r={radius}
              colors={[
                'rgba(0,0,0,0)',
                `${RING_COLOR}${ringOpacities[index]})`,
                `${RING_COLOR}${ringOpacities[index] * 0.6})`,
                'rgba(0,0,0,0)',
              ]}
              positions={[0, 0.7, 0.85, 1]}
            />
          </Circle>
        </Group>
      ))}

      <Blend mode="softLight">
        <Circle cx={highlightX} cy={highlightY} r={highlightRadius}>
          <RadialGradient
            c={vec(highlightX, highlightY)}
            r={highlightRadius}
            colors={[
              `${HIGHLIGHT_COLOR}0.16)`,
              `${HIGHLIGHT_COLOR}0.08)`,
              'rgba(0,0,0,0)',
            ]}
            positions={[0, 0.5, 1]}
          />
          <Blur blur={20} />
        </Circle>
      </Blend>

      <Blend mode="overlay">
        <Group>
          <ColorMatrix matrix={noiseMatrix} />
          <Rect x={0} y={0} width={width} height={height}>
            <FractalNoise
              freqX={0.5}
              freqY={0.5}
              octaves={2}
              seed={42}
            />
          </Rect>
        </Group>
      </Blend>
    </Canvas>
  );
}

export { SkiaAvailable };
