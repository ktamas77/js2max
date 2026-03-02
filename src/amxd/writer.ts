import type { MaxPat, DeviceType } from "../maxpat/types.js";

const DEVICE_TYPE_CODES: Record<DeviceType, string> = {
  "audio-effect": "aaaa",
  "midi-effect": "mmmm",
  instrument: "iiii",
};

function writeLE32(value: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(value);
  return buf;
}

function writeBE32(value: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(value);
  return buf;
}

function tlv(tag: string, data: Buffer): Buffer {
  const size = 8 + data.length;
  return Buffer.concat([Buffer.from(tag, "ascii"), writeBE32(size), data]);
}

function tlvU32(tag: string, val: number): Buffer {
  return tlv(tag, writeBE32(val));
}

function tlvStr(tag: string, s: string): Buffer {
  const encoded = Buffer.from(s, "ascii");
  const padLen = (4 - (encoded.length % 4)) % 4;
  const padded = Buffer.concat([encoded, Buffer.alloc(padLen)]);
  return tlv(tag, padded);
}

function makeDlst(filename: string, jsonByteSize: number): Buffer {
  const sz32Val = jsonByteSize + 2; // json + \n\0

  const direContent = Buffer.concat([
    tlvStr("type", "JSON"),
    tlvStr("fnam", filename),
    tlvU32("sz32", sz32Val),
    tlvU32("of32", 16), // offset: mx@c header size
    tlvU32("vers", 0),
    tlvU32("flag", 0x11), // 17, matches working files
    tlvU32("mdat", 0),
  ]);

  const dire = tlv("dire", direContent);
  return tlv("dlst", dire);
}

export function buildAmxd(
  patch: MaxPat,
  deviceType: DeviceType,
  filename: string
): Buffer {
  // Serialize JSON with tab indentation to match Max's native format
  const jsonStr = JSON.stringify(patch, null, "\t");
  const jsonBytes = Buffer.from(jsonStr, "utf-8");
  const jsonSize = jsonBytes.length;

  // Build dlst trailer
  const dlst = makeDlst(filename, jsonSize);

  // Separator between JSON and dlst
  const separator = Buffer.from([0x0a, 0x00]); // \n\0

  // mx@c header: magic(4) + BE32(16) + BE32(0) + BE32(mxVal)
  const mxVal = jsonSize + separator.length + 16;
  const mxHeader = Buffer.concat([
    Buffer.from("mx@c", "ascii"),
    writeBE32(16),
    writeBE32(0),
    writeBE32(mxVal),
  ]);

  const ptchContent = Buffer.concat([mxHeader, jsonBytes, separator, dlst]);

  // Build the full file
  const deviceCode = DEVICE_TYPE_CODES[deviceType];

  return Buffer.concat([
    // ampf chunk
    Buffer.from("ampf", "ascii"),
    writeLE32(4),
    Buffer.from(deviceCode, "ascii"),

    // meta chunk
    Buffer.from("meta", "ascii"),
    writeLE32(4),
    writeLE32(7),

    // ptch chunk
    Buffer.from("ptch", "ascii"),
    writeLE32(ptchContent.length),
    ptchContent,
  ]);
}
