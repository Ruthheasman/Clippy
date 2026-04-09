export interface DisplayInfo {
  displayBounds: { x: number; y: number; width: number; height: number };
  screenshotSize: { width: number; height: number };
}

export interface ScreenPoint {
  x: number;
  y: number;
}

/**
 * Map coordinates from screenshot space to actual screen pixel space.
 * The LLM returns coordinates relative to the resized screenshot dimensions.
 * We need to scale them back to the actual display resolution.
 */
export function mapToScreen(
  point: ScreenPoint,
  displayInfo: DisplayInfo
): ScreenPoint {
  const { displayBounds, screenshotSize } = displayInfo;
  const scaleX = displayBounds.width / screenshotSize.width;
  const scaleY = displayBounds.height / screenshotSize.height;

  return {
    x: displayBounds.x + point.x * scaleX,
    y: displayBounds.y + point.y * scaleY,
  };
}

/**
 * Map a rectangle from screenshot space to screen space
 */
export function mapRectToScreen(
  rect: { x: number; y: number; width: number; height: number },
  displayInfo: DisplayInfo
): { x: number; y: number; width: number; height: number } {
  const { displayBounds, screenshotSize } = displayInfo;
  const scaleX = displayBounds.width / screenshotSize.width;
  const scaleY = displayBounds.height / screenshotSize.height;

  return {
    x: displayBounds.x + rect.x * scaleX,
    y: displayBounds.y + rect.y * scaleY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
  };
}
