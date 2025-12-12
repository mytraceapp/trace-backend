import { Colors as ColorsImport } from './colors';
import { Spacing as SpacingImport, CardSpacing, ScreenPadding } from './spacing';
import { BorderRadius as BorderRadiusImport, CardRadius } from './radius';
import { Shadows, ShadowsNight } from './shadows';
import { FontFamily, FontSize, FontWeight, LineHeight, LetterSpacing, Typography as TypographyStyles } from './typography';
import { Audio } from './index';

export const Colors = ColorsImport;
export const Spacing = SpacingImport;
export const BorderRadius = BorderRadiusImport;

export const Typography = {
  fontFamily: FontFamily,
  fontSize: FontSize,
  fontWeight: FontWeight,
  lineHeight: LineHeight,
  letterSpacing: LetterSpacing,
  styles: TypographyStyles,
};

export {
  CardSpacing,
  ScreenPadding,
  CardRadius,
  Shadows,
  ShadowsNight,
  FontFamily,
  FontSize,
  FontWeight,
  LineHeight,
  LetterSpacing,
  Audio,
};
