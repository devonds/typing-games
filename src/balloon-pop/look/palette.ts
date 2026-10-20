/** The 16 colours of the "Sweetie 16" palette by GrafxKid. Everything on screen uses only these. */
export const C = {
  black: "#1a1c2c",
  purple: "#5d275d",
  red: "#b13e53",
  orange: "#ef7d57",
  yellow: "#ffcd75",
  lime: "#a7f070",
  green: "#38b764",
  teal: "#257179",
  navy: "#29366f",
  blue: "#3b5dc9",
  sky: "#41a6f6",
  cyan: "#73eff7",
  white: "#f4f4f4",
  silver: "#94b0c2",
  slate: "#566c86",
  charcoal: "#333c57",
} as const;

/** Balloon fill and the letter colour that reads best on it. Length must match BALLOON_COLOUR_COUNT. */
export const BALLOON_COLOURS = [
  { fill: C.red, ink: C.white },
  { fill: C.orange, ink: C.black },
  { fill: C.yellow, ink: C.black },
  { fill: C.green, ink: C.white },
  { fill: C.purple, ink: C.white },
  { fill: C.cyan, ink: C.black },
] as const;
