// Source: assets/icon-source.png, the logo exactly as supplied. It is only read and scaled, never changed.
// The output goes to public/icons/ and is committed.
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const outputDirectory = `${root}public/icons/`;
const source = `${root}assets/icon-source.png`;

// The app background, the same as the manifest's background_color and theme_color. The maskable and Apple icons
// must be opaque, so the logo is placed on it; the others keep the logo's own transparent surround.
const BACKGROUND = '#1e1e1e';
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-maskable-512.png', size: 512, opaque: true },
  { file: 'apple-touch-icon.png', size: 180, opaque: true },
  { file: 'favicon-32.png', size: 32 },
];

if (!existsSync(source)) throw new Error('Missing assets/icon-source.png. Add the Dettavo logo there.');

await mkdir(outputDirectory, { recursive: true });

for (const { file, size, opaque } of targets) {
  // contain: the whole logo, scaled to fit the square, never cropped or stretched.
  let image = sharp(source).resize(size, size, { fit: 'contain', background: TRANSPARENT });
  if (opaque) image = image.flatten({ background: BACKGROUND });
  await image.png().toFile(`${outputDirectory}${file}`);
  console.log(`public/icons/${file}  ${size}x${size}`);
}
