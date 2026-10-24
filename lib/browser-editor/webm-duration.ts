/**
 * O WebM gravado pelo MediaRecorder sai sem a duração no cabeçalho (players
 * mostram "ao vivo" e não deixam avançar). Aqui inserimos o campo Duration
 * dentro de Segment > Info, sem regravar o vídeo.
 */

function readVint(view: DataView, pos: number, keepMarker: boolean): { value: number; length: number } | null {
  const first = view.getUint8(pos);
  let length = 1;
  while (length <= 8 && !(first & (0x80 >> (length - 1)))) length++;
  if (length > 8 || pos + length > view.byteLength) return null;
  let value = keepMarker ? first : first & (0xff >> length);
  for (let i = 1; i < length; i++) value = value * 256 + view.getUint8(pos + i);
  return { value, length };
}

const ID_SEGMENT = 0x18538067;
const ID_INFO = 0x1549a966;
const ID_DURATION = 0x4489;
const ID_CLUSTER = 0x1f43b675;

export async function fixWebmDuration(blob: Blob, seconds: number): Promise<Blob> {
  try {
    const head = new DataView(await blob.slice(0, 65536).arrayBuffer());
    let pos = 0;
    // cabeçalho EBML
    const ebmlId = readVint(head, pos, true);
    const ebmlSize = ebmlId && readVint(head, pos + ebmlId.length, false);
    if (!ebmlId || !ebmlSize) return blob;
    pos += ebmlId.length + ebmlSize.length + ebmlSize.value;
    const segId = readVint(head, pos, true);
    if (!segId || segId.value !== ID_SEGMENT) return blob;
    const segSize = readVint(head, pos + segId.length, false);
    // só mexe em gravação "ao vivo" (tamanho do Segment desconhecido); senão o tamanho ficaria errado
    if (!segSize || segSize.value !== 2 ** (7 * segSize.length) - 1) return blob;
    pos += segId.length + segSize.length;
    while (pos < head.byteLength - 8) {
      const id = readVint(head, pos, true);
      const size = id && readVint(head, pos + id.length, false);
      if (!id || !size) return blob;
      if (id.value === ID_CLUSTER) return blob;
      const payloadStart = pos + id.length + size.length;
      if (id.value === ID_INFO) {
        const payloadEnd = payloadStart + size.value;
        if (payloadEnd > head.byteLength) return blob;
        // já tem duração?
        let p = payloadStart;
        while (p < payloadEnd) {
          const cid = readVint(head, p, true);
          const cs = cid && readVint(head, p + cid.length, false);
          if (!cid || !cs) break;
          if (cid.value === ID_DURATION) return blob;
          p += cid.length + cs.length + cs.value;
        }
        const payload = new Uint8Array(head.buffer, payloadStart, size.value);
        const dur = new Uint8Array(11);
        dur[0] = 0x44;
        dur[1] = 0x89;
        dur[2] = 0x88;
        new DataView(dur.buffer).setFloat64(3, seconds * 1000);
        const newSize = size.value + dur.length;
        const sizeBytes = new Uint8Array(8);
        sizeBytes[0] = 0x01;
        let v = newSize;
        for (let i = 7; i >= 1; i--) {
          sizeBytes[i] = v & 0xff;
          v = Math.floor(v / 256);
        }
        const idBytes = new Uint8Array(head.buffer, pos, id.length);
        return new Blob([blob.slice(0, pos), idBytes, sizeBytes, payload, dur, blob.slice(payloadEnd)], { type: blob.type });
      }
      pos = payloadStart + size.value;
    }
  } catch {
    // arquivo diferente do esperado: entrega como veio
  }
  return blob;
}
