/**
 * Genera los íconos PWA (192x192 y 512x512) en public/icons/
 * Requiere: npm install -D canvas (o sharp)
 *
 * Alternativa sin dependencias:
 *   Usa Favicon.io → https://favicon.io/favicon-generator/
 *   Color de fondo: #E05C00  |  Texto: CV  |  Color texto: #FFFFFF
 *   Descarga y coloca icon-192.png e icon-512.png en public/icons/
 *
 * O genera con Node.js (si tienes canvas instalado):
 *   node scripts/generate-icons.mjs
 */

import { createCanvas } from 'canvas'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const iconsDir = path.join(__dirname, '../public/icons')
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true })

function generateIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Fondo naranja con esquinas redondeadas
  const radius = size * 0.15
  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(size - radius, 0)
  ctx.quadraticCurveTo(size, 0, size, radius)
  ctx.lineTo(size, size - radius)
  ctx.quadraticCurveTo(size, size, size - radius, size)
  ctx.lineTo(radius, size)
  ctx.quadraticCurveTo(0, size, 0, size - radius)
  ctx.lineTo(0, radius)
  ctx.quadraticCurveTo(0, 0, radius, 0)
  ctx.closePath()
  ctx.fillStyle = '#E05C00'
  ctx.fill()

  // Texto CV
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `bold ${size * 0.38}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('CV', size / 2, size / 2)

  return canvas.toBuffer('image/png')
}

try {
  fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), generateIcon(192))
  fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), generateIcon(512))
  console.log('✓ Íconos generados en public/icons/')
} catch (e) {
  console.log('Instala canvas primero: npm install -D canvas')
  console.log('O usa favicon.io con color #E05C00')
}
