import { describe, it, expect } from "vitest";
import { buildAmxd } from "../src/amxd/writer.js";
import { compileSource } from "../src/compiler/generator.js";

describe("buildAmxd", () => {
  it("produces correct binary header for midi-effect", async () => {
    const patch = await compileSource("inlets = 1;\noutlets = 1;");
    const buf = buildAmxd(patch, "midi-effect", "test.amxd");

    // ampf chunk
    expect(buf.subarray(0, 4).toString("ascii")).toBe("ampf");
    expect(buf.readUInt32LE(4)).toBe(4);
    expect(buf.subarray(8, 12).toString("ascii")).toBe("mmmm");

    // meta chunk
    expect(buf.subarray(12, 16).toString("ascii")).toBe("meta");
    expect(buf.readUInt32LE(16)).toBe(4);
    expect(buf.readUInt32LE(20)).toBe(7);

    // ptch chunk
    expect(buf.subarray(24, 28).toString("ascii")).toBe("ptch");

    // mx@c magic inside ptch (byte 32 = after ampf(12) + meta(12) + ptch tag(4) + ptch size(4))
    expect(buf.subarray(32, 36).toString("ascii")).toBe("mx@c");
  });

  it("produces correct device type for audio-effect", async () => {
    const patch = await compileSource("inlets = 1;\noutlets = 1;", {
      type: "audio-effect",
    });
    const buf = buildAmxd(patch, "audio-effect", "test.amxd");
    expect(buf.subarray(8, 12).toString("ascii")).toBe("aaaa");
  });

  it("produces correct device type for instrument", async () => {
    const patch = await compileSource("inlets = 1;\noutlets = 1;", {
      type: "instrument",
    });
    const buf = buildAmxd(patch, "instrument", "test.amxd");
    expect(buf.subarray(8, 12).toString("ascii")).toBe("iiii");
  });

  it("contains JSON patcher content", async () => {
    const patch = await compileSource("inlets = 1;\noutlets = 1;");
    const buf = buildAmxd(patch, "midi-effect", "test.amxd");
    const content = buf.toString("utf-8");
    expect(content).toContain('"patcher"');
    expect(content).toContain('"fileversion"');
  });

  it("contains dlst trailer", async () => {
    const patch = await compileSource("inlets = 1;\noutlets = 1;");
    const buf = buildAmxd(patch, "midi-effect", "test.amxd");
    const content = buf.toString("ascii", 0, buf.length);
    expect(content).toContain("dlst");
    expect(content).toContain("dire");
    expect(content).toContain("fnam");
  });
});
