import { Dimensions, PixelRatio } from "react-native";

// Maintain same visual size across display zoom and system font scaling
export const scaleFont = (size: number) => {
  const { width } = Dimensions.get("window");
  const guidelineBaseWidth = 360; // base design width

  const screenScale = width / guidelineBaseWidth; // handle display zoom / screen size
  const fontScale = PixelRatio.getFontScale(); // handle user font size setting

  // Combine both: scale for screen, neutralize for system font scaling
  const scaled = size * screenScale * (1 / fontScale);

  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};
