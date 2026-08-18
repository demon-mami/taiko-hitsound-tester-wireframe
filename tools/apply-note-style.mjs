import { readFileSync, writeFileSync } from "node:fs";

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) {
    throw new Error(`Patch target not found: ${label}`);
  }
  return source.replace(before, after);
}

let script = readFileSync("script.js", "utf8");

script = replaceRequired(
  script,
  "const BIG_NOTE_SIZE = 70;",
  `const BIG_NOTE_SIZE = NORMAL_NOTE_SIZE;\nconst BIG_MARKER_WIDTH = 28;\nconst BIG_MARKER_HEIGHT = 18;\nconst BIG_MARKER_GAP = 33;`,
  "BIG note geometry",
);

const oldDrawNote = `function drawNote(context, x, y, diameter, type, alpha = 1) {\n  const radius = diameter / 2;\n  const color = noteIsDon(type) ? DON_RGB : KAT_RGB;\n  context.save();\n  context.globalAlpha = clamp(alpha, 0, 1);\n  context.beginPath();\n  context.arc(x, y, radius, 0, Math.PI * 2);\n  context.fillStyle = rgba(color, 0.96);\n  context.fill();\n  context.lineWidth = noteIsBig(type) ? 2 : 1;\n  context.strokeStyle = \"rgba(255,255,255,0.44)\";\n  context.stroke();\n  if (noteIsBig(type)) {\n    context.beginPath();\n    context.arc(x, y, radius - 6, 0, Math.PI * 2);\n    context.lineWidth = 1;\n    context.strokeStyle = \"rgba(255,255,255,0.30)\";\n    context.stroke();\n  }\n  context.restore();\n}`;

const newDrawNote = `function scaleColor(color, factor) {\n  return color.map((channel) => clamp(Math.round(channel * factor), 0, 255));\n}\n\nfunction drawBigMarker(context, x, y, diameter) {\n  const scale = diameter / NORMAL_NOTE_SIZE;\n  const halfWidth = (BIG_MARKER_WIDTH * scale) / 2;\n  const markerHeight = BIG_MARKER_HEIGHT * scale;\n  const apexY = y - diameter / 2 - BIG_MARKER_GAP * scale;\n  const baseY = apexY - markerHeight;\n\n  context.beginPath();\n  context.moveTo(x - halfWidth, baseY);\n  context.lineTo(x + halfWidth, baseY);\n  context.lineTo(x, apexY);\n  context.closePath();\n  context.fillStyle = \"rgba(255,255,255,0.96)\";\n  context.fill();\n}\n\nfunction drawNote(context, x, y, diameter, type, alpha = 1) {\n  const radius = diameter / 2;\n  const color = noteIsDon(type) ? DON_RGB : KAT_RGB;\n  const lightColor = scaleColor(color, 1.13);\n  const darkColor = scaleColor(color, 0.72);\n\n  context.save();\n  context.globalAlpha = clamp(alpha, 0, 1);\n\n  // Material Disc: restrained internal depth without a glossy white reflection band.\n  const material = context.createRadialGradient(\n    x - radius * 0.28,\n    y - radius * 0.32,\n    Math.max(1, radius * 0.10),\n    x + radius * 0.08,\n    y + radius * 0.12,\n    radius * 1.08,\n  );\n  material.addColorStop(0, rgba(lightColor, 1));\n  material.addColorStop(0.48, rgba(color, 1));\n  material.addColorStop(1, rgba(darkColor, 1));\n\n  context.beginPath();\n  context.arc(x, y, radius, 0, Math.PI * 2);\n  context.fillStyle = material;\n  context.fill();\n\n  // Reference-like clear white circumference. The rim scales with the ejected note.\n  context.lineWidth = Math.max(1.25, diameter * (4 / NORMAL_NOTE_SIZE));\n  context.strokeStyle = \"rgba(255,255,255,0.96)\";\n  context.stroke();\n\n  // BIG is deliberately the same disc size/material as Normal; only the upper marker differs.\n  if (noteIsBig(type)) drawBigMarker(context, x, y, diameter);\n\n  context.restore();\n}`;

script = replaceRequired(script, oldDrawNote, newDrawNote, "drawNote material disc renderer");
writeFileSync("script.js", script);

let readme = readFileSync("README_STAGE5.md", "utf8");
const anchor = "- 1340×420 Playback Stage:";
const addition = `- Object Timeline note appearance:\n  - Normal and BIG use the same 56px Material Disc body.\n  - Don = RGB(235,69,44), Ka = RGB(68,141,171).\n  - Clear reference-like white circumference; no glossy white reflection stripe.\n  - BIG adds only a white downward triangle marker above the disc.\n`;
if (!readme.includes(addition)) {
  readme = replaceRequired(readme, anchor, `${addition}${anchor}`, "README note-style anchor");
  writeFileSync("README_STAGE5.md", readme);
}

console.log("Confirmed Object Timeline note style applied.");
