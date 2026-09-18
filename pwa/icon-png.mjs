// Dependency-free rasterization of the existing geometric assets/icon.svg.
// PNG icons use an opaque background, as required for clean iOS Home Screen icons.
import { deflateSync } from 'node:zlib';

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, bytes) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4); length.writeUInt32BE(bytes.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([name, bytes])));
  return Buffer.concat([length, name, bytes, crc]);
}
function pathPoints(data) {
  const tokens = data.match(/[MLHVZmlhvz]|[-+]?(?:\d*\.)?\d+/g);
  let i = 0, command = '', x = 0, y = 0;
  const points = [];
  while (i < tokens.length) {
    if (/^[a-z]$/i.test(tokens[i])) command = tokens[i++];
    const relative = command === command.toLowerCase();
    switch (command.toUpperCase()) {
      case 'M': case 'L': {
        const nx = Number(tokens[i++]), ny = Number(tokens[i++]);
        x = relative ? x + nx : nx; y = relative ? y + ny : ny;
        points.push([x, y]);
        if (command.toUpperCase() === 'M') command = relative ? 'l' : 'L';
        break;
      }
      case 'H': { const nx = Number(tokens[i++]); x = relative ? x + nx : nx; points.push([x, y]); break; }
      case 'V': { const ny = Number(tokens[i++]); y = relative ? y + ny : ny; points.push([x, y]); break; }
      case 'Z': return points;
      default: throw new Error('Unsupported icon path; update the local icon rasterizer.');
    }
  }
  return points;
}
function insidePolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const color = (hex) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
export function iconPng(svg, size) {
  if (!svg.includes('viewBox="0 0 100 100"')) throw new Error('The icon viewBox changed. Update the rasterizer.');
  const bg = color(svg.match(/<rect[^>]*fill="(#[a-fA-F0-9]{6})"/)[1]);
  const paths = [...svg.matchAll(/<path\s+([^>]+)\/?\s*>/g)].map(([, attributes]) => ({
    points: pathPoints(attributes.match(/d="([^"]+)"/)[1]),
    fill: attributes.match(/fill="(#[a-fA-F0-9]{6})"/)?.[1],
    stroke: attributes.match(/stroke="(#[a-fA-F0-9]{6})"/)?.[1],
    width: Number(attributes.match(/stroke-width="([\d.]+)"/)?.[1] || 0),
  }));
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const sum = [0, 0, 0];
    for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
      const px = (x + (sx + .5) / 4) * 100 / size, py = (y + (sy + .5) / 4) * 100 / size;
      let rgb = bg;
      for (const shape of paths) {
        if (shape.fill && insidePolygon(px, py, shape.points)) rgb = color(shape.fill);
        if (shape.stroke) {
          // The source icon has one horizontal, butt-capped base line.
          if (shape.points.length !== 2 || shape.points[0][1] !== shape.points[1][1]) throw new Error('Unsupported icon stroke.');
          const [a, b] = shape.points;
          if (px >= Math.min(a[0], b[0]) && px <= Math.max(a[0], b[0]) && Math.abs(py - a[1]) <= shape.width / 2) rgb = color(shape.stroke);
        }
      }
      for (let c = 0; c < 3; c++) sum[c] += rgb[c];
    }
    for (let c = 0; c < 3; c++) raw[y * (1 + size * 3) + 1 + x * 3 + c] = Math.round(sum[c] / 16);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
