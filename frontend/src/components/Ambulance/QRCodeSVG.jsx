// src/components/Ambulance/QRCodeSVG.jsx
// esto es parte de from de hoja de chequeo 

export default function QRCodeSVG({ value, size = 200 }) {
  const qrSize = 25;
  const cellSize = size / qrSize;
  const pattern = [];

  for (let y = 0; y < qrSize; y++) {
    for (let x = 0; x < qrSize; x++) {
      const hash = (value.charCodeAt(x % value.length) + x + y * qrSize) % 2;
      if (
        hash === 0 ||
        (x < 7 && y < 7) ||
        (x > qrSize - 8 && y < 7) ||
        (x < 7 && y > qrSize - 8)
      ) {
        pattern.push({ x, y });
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="QR">
      <rect width={size} height={size} />
      {pattern.map((cell, i) => (
        <rect
          key={i}
          x={cell.x * cellSize}
          y={cell.y * cellSize}
          width={cellSize}
          height={cellSize}
        />
      ))}
    </svg>
  );
}
