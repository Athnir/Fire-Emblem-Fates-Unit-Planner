#!/usr/bin/env node
// Builds public-template/ — a mirror of every filename the app expects under public/art/ and
// public/skills/ (both git-ignored, copyrighted-asset folders — see ART_ASSETS.md), filled with a
// flat gray placeholder PNG instead of real art. Never touches public/ itself, so it's safe to
// re-run any time after adding a new skill/character. Two ways someone can use the result:
//   1. Copy public-template/'s contents into public/, then overwrite individual placeholder PNGs
//      with their own extracted images of the exact same name.
//   2. Use the filenames here as the authoritative list of what the app looks up, and point their
//      own asset pipeline / manual renames at those exact paths.
//
// Usage: node scripts/generate_dummy_assets.mjs

import { deflateSync } from 'node:zlib'
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC_DIR = join(ROOT, 'public')
const TEMPLATE_DIR = join(ROOT, 'public-template')

// --- minimal PNG encoder: flat neutral-gray RGBA square, good enough as an obvious "no art here yet" stand-in ---
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function buildPlaceholderPng(size = 96, rgba = [63, 63, 70, 255]) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const [r, g, b, a] = rgba
  const rowLen = 1 + size * 4 // filter byte + pixels
  const raw = Buffer.alloc(rowLen * size)
  for (let y = 0; y < size; y++) {
    const rowStart = y * rowLen
    raw[rowStart] = 0 // no filter
    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 4
      raw[px] = r
      raw[px + 1] = g
      raw[px + 2] = b
      raw[px + 3] = a
    }
  }
  const idat = deflateSync(raw)

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

const PLACEHOLDER_PNG = buildPlaceholderPng()

// --- collect every relative path the app actually fetches, from what's currently extracted ---
function listPngs(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((f) => f.endsWith('.png'))
}

const relPaths = []

for (const f of listPngs(join(PUBLIC_DIR, 'skills'))) relPaths.push(join('skills', f))

const adultsDir = join(PUBLIC_DIR, 'art', 'portraits', 'adults')
for (const f of listPngs(adultsDir)) relPaths.push(join('art', 'portraits', 'adults', f))

const childrenDir = join(PUBLIC_DIR, 'art', 'portraits', 'children')
if (existsSync(childrenDir)) {
  for (const childId of readdirSync(childrenDir)) {
    const dir = join(childrenDir, childId)
    if (!statSync(dir).isDirectory()) continue
    // base.png and raw.png are what the app fetches at runtime (see src/data/portraitAssets.ts) —
    // template.png/sources/ are dev-only pipeline intermediates, not needed by anyone just dropping
    // in finished art.
    for (const name of ['base.png', 'raw.png']) {
      if (existsSync(join(dir, name))) relPaths.push(join('art', 'portraits', 'children', childId, name))
    }
  }
}

const corrinDir = join(PUBLIC_DIR, 'art', 'portraits', 'corrin')
if (existsSync(corrinDir)) {
  for (const variant of readdirSync(corrinDir)) {
    const dir = join(corrinDir, variant)
    if (!statSync(dir).isDirectory()) continue
    if (existsSync(join(dir, 'base.png'))) relPaths.push(join('art', 'portraits', 'corrin', variant, 'base.png'))
    const hairRawDir = join(dir, 'hair_raw')
    for (const f of listPngs(hairRawDir)) relPaths.push(join('art', 'portraits', 'corrin', variant, 'hair_raw', f))
  }
}

for (const rel of relPaths) {
  const dest = join(TEMPLATE_DIR, rel)
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, PLACEHOLDER_PNG)
}

console.log(`Wrote ${relPaths.length} placeholder PNGs to ${TEMPLATE_DIR}`)
