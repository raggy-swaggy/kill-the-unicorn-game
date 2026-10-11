export const DISPLAY = {
  /** Internal render resolution (16:9). */
  width: 320,
  height: 180,
  /**
   * Use whole-number zoom (crisp, even pixels) when it fills at least this share
   * of the space a free fit would use. Otherwise fall back to a free fit so small
   * phone screens are not left with big black borders.
   */
  integerZoomThreshold: 0.85,
  backgroundColor: '#07061a',
} as const;
