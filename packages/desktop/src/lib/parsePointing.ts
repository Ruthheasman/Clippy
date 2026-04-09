export interface PointCommand {
  type: 'point';
  x: number;
  y: number;
  label: string;
}

export interface HighlightCommand {
  type: 'highlight';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export interface ArrowCommand {
  type: 'arrow';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
}

export interface CircleCommand {
  type: 'circle';
  x: number;
  y: number;
  radius: number;
  label: string;
}

export type OverlayCommand = PointCommand | HighlightCommand | ArrowCommand | CircleCommand;

const POINT_REGEX = /\[POINT:(\d+),(\d+):([^\]]+)\]/g;
const HIGHLIGHT_REGEX = /\[HIGHLIGHT:(\d+),(\d+),(\d+),(\d+):([^\]]+)\]/g;
const ARROW_REGEX = /\[ARROW:(\d+),(\d+),(\d+),(\d+):([^\]]+)\]/g;
const CIRCLE_REGEX = /\[CIRCLE:(\d+),(\d+),(\d+):([^\]]+)\]/g;

export function parseOverlayCommands(text: string): OverlayCommand[] {
  const commands: OverlayCommand[] = [];
  let match: RegExpExecArray | null;

  // Reset all regex state
  POINT_REGEX.lastIndex = 0;
  HIGHLIGHT_REGEX.lastIndex = 0;
  ARROW_REGEX.lastIndex = 0;
  CIRCLE_REGEX.lastIndex = 0;

  while ((match = POINT_REGEX.exec(text)) !== null) {
    commands.push({
      type: 'point',
      x: parseInt(match[1], 10),
      y: parseInt(match[2], 10),
      label: match[3],
    });
  }

  while ((match = HIGHLIGHT_REGEX.exec(text)) !== null) {
    commands.push({
      type: 'highlight',
      x: parseInt(match[1], 10),
      y: parseInt(match[2], 10),
      width: parseInt(match[3], 10),
      height: parseInt(match[4], 10),
      label: match[5],
    });
  }

  while ((match = ARROW_REGEX.exec(text)) !== null) {
    commands.push({
      type: 'arrow',
      x1: parseInt(match[1], 10),
      y1: parseInt(match[2], 10),
      x2: parseInt(match[3], 10),
      y2: parseInt(match[4], 10),
      label: match[5],
    });
  }

  while ((match = CIRCLE_REGEX.exec(text)) !== null) {
    commands.push({
      type: 'circle',
      x: parseInt(match[1], 10),
      y: parseInt(match[2], 10),
      radius: parseInt(match[3], 10),
      label: match[4],
    });
  }

  return commands;
}

/**
 * Strip all overlay command tags from text for display
 */
export function stripOverlayTags(text: string): string {
  return text
    .replace(/\[POINT:\d+,\d+:[^\]]*\]/g, '')
    .replace(/\[HIGHLIGHT:\d+,\d+,\d+,\d+:[^\]]*\]/g, '')
    .replace(/\[ARROW:\d+,\d+,\d+,\d+:[^\]]*\]/g, '')
    .replace(/\[CIRCLE:\d+,\d+,\d+:[^\]]*\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
