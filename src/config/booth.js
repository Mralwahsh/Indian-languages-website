// Booth behaviour knobs — tweak these on the day without touching components.
export const BOOTH = {
  // Seconds without mouse/keyboard/touch input before attract mode starts
  idleSeconds: 30,
  // Seconds attract mode must run before the previous visitor's data is wiped
  // (so a guide chatting for a moment doesn't lose the visitor's name)
  attractResetSeconds: 90,
  // How long each "Hello" stays on screen in attract mode (ms)
  attractSlideMs: 2600,
}
