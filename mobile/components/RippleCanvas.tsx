import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RippleRing {
  id: number;
  startRadius: number;
  maxRadius: number;
}

interface SingleRippleProps {
  ring: RippleRing;
  delay: number;
  onComplete: () => void;
  cx: number;
  cy: number;
}

function SingleRipple({ ring, delay, onComplete, cx, cy }: SingleRippleProps) {
  const radius = useSharedValue(ring.startRadius);
  const opacity = useSharedValue(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      radius.value = withTiming(ring.maxRadius, {
        duration: 4000,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(0.35, {
        duration: 800,
        easing: Easing.out(Easing.quad),
      }, () => {
        opacity.value = withTiming(0, {
          duration: 3200,
          easing: Easing.in(Easing.quad),
        }, () => {
          runOnJS(setIsActive)(false);
          runOnJS(onComplete)();
        });
      });
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    r: radius.value,
    opacity: opacity.value,
  }));

  if (!isActive) return null;

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      stroke="rgba(180, 165, 145, 0.6)"
      strokeWidth={1.5}
      fill="transparent"
      animatedProps={animatedProps}
    />
  );
}

interface RippleCanvasProps {
  autoPlay?: boolean;
  centerX?: number;
  centerY?: number;
}

export default function RippleCanvas({ 
  autoPlay = true,
  centerX = SCREEN_WIDTH / 2,
  centerY = SCREEN_HEIGHT * 0.42,
}: RippleCanvasProps) {
  const [ripples, setRipples] = useState<RippleRing[]>([]);
  const rippleIdRef = useRef(0);
  const autoPlayIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const spawnRipple = () => {
    const baseId = rippleIdRef.current;
    rippleIdRef.current += 4;

    const newRipples: RippleRing[] = [
      { id: baseId, startRadius: 20, maxRadius: 180 },
      { id: baseId + 1, startRadius: 25, maxRadius: 160 },
      { id: baseId + 2, startRadius: 30, maxRadius: 140 },
      { id: baseId + 3, startRadius: 35, maxRadius: 120 },
    ];

    setRipples((prev) => [...prev, ...newRipples]);
  };

  const removeRipple = (id: number) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  };

  useEffect(() => {
    if (autoPlay) {
      spawnRipple();
      autoPlayIntervalRef.current = setInterval(() => {
        spawnRipple();
      }, 5000);
    }

    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    };
  }, [autoPlay]);

  return (
    <View style={styles.container} pointerEvents="none">
      <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
        {ripples.map((ring, index) => (
          <SingleRipple
            key={ring.id}
            ring={ring}
            delay={(index % 4) * 400}
            onComplete={() => removeRipple(ring.id)}
            cx={centerX}
            cy={centerY}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
});
