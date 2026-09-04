const AVATAR_COLORS = [
  { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" }, // Blue
  { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" }, // Green
  { bg: "#faf5ff", text: "#9333ea", border: "#e9d5ff" }, // Purple
  { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" }, // Orange
  { bg: "#fdf2f8", text: "#db2777", border: "#fbcfe8" }, // Pink
  { bg: "#f0fdfa", text: "#0d9488", border: "#99f6e4" }, // Teal
];

export function getAvatarColor(name = "") {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}