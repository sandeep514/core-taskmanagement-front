/**
 * Regenerates PWA / iOS icons from public/favicon.svg
 * Run: node scripts/generate-pwa-icons.mjs
 */
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'public/favicon.svg'))

for (const size of [192, 512]) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(join(root, `public/pwa-${size}x${size}.png`))
}

const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" fill="#4f46e5"/>
  <path d="M140 268l72 72L372 180" stroke="white" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

for (const size of [192, 512]) {
  await sharp(Buffer.from(maskableSvg))
    .resize(size, size)
    .png()
    .toFile(join(root, `public/pwa-maskable-${size}x${size}.png`))
}

await sharp(svg).resize(180, 180).png().toFile(join(root, 'public/apple-touch-icon.png'))
await sharp(svg)
  .resize(152, 152)
  .png()
  .toFile(join(root, 'public/apple-touch-icon-152x152.png'))

console.log('PWA icons regenerated in public/')
