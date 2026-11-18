import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, r, g, b) {
  // A simple solid/rounded PNG generator in pure Node with zlib
  const rowBytes = width * 4;
  const rawData = Buffer.alloc((rowBytes + 1) * height);
  
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowBytes + 1);
    rawData[rowOffset] = 0; // Filter byte 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      // Distance from center for circle/badge effect
      const cx = width / 2;
      const cy = height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = width * 0.44;

      if (dist < radius - 4) {
        // Center chicken-like warm accent
        if (Math.abs(dx) < width * 0.22 && Math.abs(dy) < height * 0.22) {
          rawData[pixelOffset] = 255; // White
          rawData[pixelOffset + 1] = 255;
          rawData[pixelOffset + 2] = 255;
          rawData[pixelOffset + 3] = 255;
        } else {
          rawData[pixelOffset] = r;
          rawData[pixelOffset + 1] = g;
          rawData[pixelOffset + 2] = b;
          rawData[pixelOffset + 3] = 255;
        }
      } else if (dist < radius) {
        // Anti-aliased border
        const alpha = Math.floor((1 - (dist - (radius - 4)) / 4) * 255);
        rawData[pixelOffset] = r;
        rawData[pixelOffset + 1] = g;
        rawData[pixelOffset + 2] = b;
        rawData[pixelOffset + 3] = Math.max(0, Math.min(255, alpha));
      } else {
        // Outside
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    
    // CRC calculation
    let crc = 0xffffffff;
    for (let i = 4; i < 8 + len; i++) {
      let byte = buf[i];
      for (let j = 0; j < 8; j++) {
        if ((crc ^ byte) & 1) {
          crc = (crc >>> 1) ^ 0xedb88320;
        } else {
          crc = crc >>> 1;
        }
        byte >>>= 1;
      }
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate PNG icons (Forest Green #166534: r=22, g=101, b=52)
fs.writeFileSync('public/pwa-192x192.png', createPNG(192, 192, 22, 101, 52));
fs.writeFileSync('public/pwa-512x512.png', createPNG(512, 512, 22, 101, 52));
fs.writeFileSync('public/apple-touch-icon.png', createPNG(180, 180, 22, 101, 52));
fs.writeFileSync('public/pwa-maskable-512x512.png', createPNG(512, 512, 22, 101, 52));
console.log('Generated PNG icons successfully.');
