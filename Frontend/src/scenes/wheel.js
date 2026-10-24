// Big Wheel segments, shared by the wheel (components/SpinWheel.jsx) and
// the stake buttons.

export const SEGMENTS = [
  { icon: "🍒", name: "Cherry", color: 0xef4444 },
  { icon: "💎", name: "Diamond", color: 0x06b6d4 },
  { icon: "⭐", name: "Star", color: 0xf59e0b },
  { icon: "🔥", name: "Fire", color: 0xf97316 },
  { icon: "🍀", name: "Clover", color: 0x22c55e },
  { icon: "👑", name: "Crown", color: 0xeab308 },
  { icon: "⚡", name: "Bolt", color: 0x8b5cf6 },
  { icon: "🎯", name: "Target", color: 0xdc2626 },
  { icon: "🌙", name: "Moon", color: 0x6366f1 },
  { icon: "🎲", name: "Dice", color: 0x0ea5e9 },
  { icon: "🚀", name: "Rocket", color: 0xec4899 },
  { icon: "🌈", name: "Rainbow", color: 0x14b8a6 },
];

export const cssColor = (n) => `#${n.toString(16).padStart(6, "0")}`;
