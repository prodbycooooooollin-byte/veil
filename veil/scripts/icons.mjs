// Renders build/logo.svg into the app, taskbar and installer icons.
import { Resvg } from '@resvg/resvg-js'
import pngToIco from 'png-to-ico'
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs'

const svg = readFileSync('build/logo.svg', 'utf8')
const png = (size) => new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
writeFileSync('build/icon.png', png(512))
writeFileSync('resources/icon.png', png(256))
const sizes = [16, 24, 32, 48, 64, 128, 256]
const files = sizes.map((s) => { const f = `build/icon-${s}.png`; writeFileSync(f, png(s)); return f })
writeFileSync('build/icon.ico', await pngToIco(files))
copyFileSync('build/logo.svg', 'src/renderer/src/assets/logo.svg')
mkdirSync('src/renderer/public', { recursive: true }); writeFileSync('src/renderer/public/favicon.png', png(64))
console.log('icons written:', ['build/icon.png', 'build/icon.ico', 'resources/icon.png'].join(', '))
