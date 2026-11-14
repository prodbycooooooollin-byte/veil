// Source 2 compiled resources (.vcss_c and friends).
//
// A compiled Panorama stylesheet is a resource with blocks RERL, RED2, DATA and SrMa. DATA holds a checksum,
// the list of images the sheet references, and then the stylesheet itself as minified text. The game reads
// rules appended to the end of that text and does not check the checksum, so a mod is: the game's own
// file, with extra CSS added to DATA and the block table and sizes rewritten. Everything else stays byte for
// byte as Valve compiled it.

export type Block = { type: string; offset: number; size: number }

export function readBlocks(buf: Buffer): Block[] {
  const headerVersion = buf.readUInt16LE(4)
  if (headerVersion !== 12) throw new Error(`Unsupported resource header version ${headerVersion}`)
  const tableAt = 8 + buf.readUInt32LE(8)
  const count = buf.readUInt32LE(12)
  const out: Block[] = []
  for (let i = 0; i < count; i++) {
    const e = tableAt + i * 12
    out.push({ type: buf.toString('latin1', e, e + 4), offset: e + 4 + buf.readUInt32LE(e + 4), size: buf.readUInt32LE(e + 8) })
  }
  return out
}

/** Returns a copy of the resource with `extra` appended to the end of its DATA block. */
export function appendToData(buf: Buffer, extra: Buffer): Buffer {
  const blocks = readBlocks(buf)
  const tableAt = 8 + buf.readUInt32LE(8)
  const order = [...blocks].sort((a, b) => a.offset - b.offset)
  const dataIdx = order.findIndex((b) => b.type === 'DATA')
  if (dataIdx < 0) throw new Error('Resource has no DATA block')

  // rebuild the body block by block, keeping each block's original alignment gap
  const first = order[0].offset
  const parts: Buffer[] = [buf.subarray(0, first)]
  const newOffsets = new Map<string, { offset: number; size: number }>()
  let cursor = first
  for (let i = 0; i < order.length; i++) {
    const b = order[i]
    if (i > 0) {
      const prevEnd = order[i - 1].offset + order[i - 1].size
      const align = b.offset % 16 === 0 ? 16 : b.offset % 4 === 0 ? 4 : 1
      const pad = (align - (cursor % align)) % align
      parts.push(Buffer.alloc(pad)); cursor += pad
      void prevEnd
    }
    const body = b.type === 'DATA' ? Buffer.concat([buf.subarray(b.offset, b.offset + b.size), extra]) : buf.subarray(b.offset, b.offset + b.size)
    newOffsets.set(b.type, { offset: cursor, size: body.length })
    parts.push(body); cursor += body.length
  }
  // keep whatever trailing bytes followed the last block
  const last = order[order.length - 1]
  const tail = buf.subarray(last.offset + last.size)
  parts.push(tail); cursor += tail.length

  const out = Buffer.concat(parts)
  out.writeUInt32LE(out.length, 0)
  for (let i = 0; i < blocks.length; i++) {
    const e = tableAt + i * 12
    const n = newOffsets.get(blocks[i].type)!
    out.writeUInt32LE(n.offset - (e + 4), e + 4)
    out.writeUInt32LE(n.size, e + 8)
  }
  return out
}

/** The stylesheet text inside a compiled Panorama stylesheet (everything after the image list). */
export function stylesheetText(buf: Buffer): string {
  const data = readBlocks(buf).find((b) => b.type === 'DATA')!
  const d = buf.subarray(data.offset, data.offset + data.size)
  // the text has no zero bytes and comes last, so it starts after the final zero of the image list
  return d.toString('utf8', d.lastIndexOf(0) + 1)
}
