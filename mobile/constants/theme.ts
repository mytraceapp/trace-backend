import { Colors as ColorsImport } from './colors';
import { Spacing as SpacingImport } from './spacing';
import { BorderRadius as BorderRadiusImport } from './radius';
import { Shadows, ShadowsNight } from './shadows';
import { FontFamily, FontWeight, Typography as TypographyImport } from './typography';

export const Colors = ColorsImport;
export const Spacing = SpacingImport;
export const BorderRadius = BorderRadiusImport;

export const Typography = {
  fontFamily: FontFamily,
  fontSize: TypographyImport.fontSize,
  fontWeight: FontWeight,
  lineHeight: {
    tight: 18,
    normal: 22,
    relaxed: 26,
  },
  letterSpacing: {
    tight: -0.56,
    normal: 0.15,
    wide: 0.3,
  },
};

export {
  Shadows,
  ShadowsNight,
  FontFamily,
  FontWeight,
};
