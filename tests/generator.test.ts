import { describe, it, expect } from "vitest";
import { compileSource } from "../src/compiler/generator.js";

describe("compileSource", () => {
  it("produces valid maxpat structure", async () => {
    const source = `inlets = 1;\noutlets = 1;\nfunction bang() { outlet(0, "hello"); }`;
    const patch = await compileSource(source);

    expect(patch.patcher).toBeDefined();
    expect(patch.patcher.fileversion).toBe(1);
    expect(patch.patcher.classnamespace).toBe("box");
    expect(patch.patcher.boxes.length).toBeGreaterThan(0);
    expect(patch.patcher.lines.length).toBeGreaterThan(0);
  });

  it("embeds JS source by default", async () => {
    const source = `inlets = 1;\noutlets = 1;\nfunction bang() {}`;
    const patch = await compileSource(source);

    const v8Box = patch.patcher.boxes.find((b) => b.box.text?.startsWith("v8"));
    expect(v8Box).toBeDefined();
    expect(v8Box!.box.embed).toBe(1);
    expect(v8Box!.box.text_editor_contents).toBe(source);
  });

  it("references external file when embed is false", async () => {
    const source = `inlets = 1;\noutlets = 1;\nfunction bang() {}`;
    const patch = await compileSource(source, { embed: false });

    const v8Box = patch.patcher.boxes.find((b) => b.box.text?.startsWith("v8"));
    expect(v8Box).toBeDefined();
    expect(v8Box!.box.embed).toBeUndefined();
    expect(v8Box!.box.text).toBe("v8 <inline>");
  });

  it("sets devicewidth for M4L devices", async () => {
    const source = `inlets = 1;\noutlets = 1;`;
    const patch = await compileSource(source, { deviceWidth: 500 });
    expect(patch.patcher.devicewidth).toBe(500);
  });

  it("respects @device decorator", async () => {
    const source = `// @device instrument\ninlets = 2;\noutlets = 1;`;
    const patch = await compileSource(source);

    // Instrument template should have plugout~ (audio output)
    const plugout = patch.patcher.boxes.find((b) => b.box.text === "plugout~");
    expect(plugout).toBeDefined();
  });

  it("generates midi-effect with midiin/midiout", async () => {
    const source = `// @device midi-effect\ninlets = 1;\noutlets = 1;`;
    const patch = await compileSource(source);

    const midiin = patch.patcher.boxes.find((b) => b.box.text === "midiin");
    const midiout = patch.patcher.boxes.find((b) => b.box.text === "midiout");
    expect(midiin).toBeDefined();
    expect(midiout).toBeDefined();
  });

  it("generates audio-effect with plugin~/plugout~", async () => {
    const source = `// @device audio-effect\ninlets = 1;\noutlets = 1;`;
    const patch = await compileSource(source);

    const pluginIn = patch.patcher.boxes.find((b) => b.box.text === "plugin~");
    const plugout = patch.patcher.boxes.find((b) => b.box.text === "plugout~");
    expect(pluginIn).toBeDefined();
    expect(plugout).toBeDefined();
  });

  it("handles multiple inlets/outlets", async () => {
    const source = `inlets = 3;\noutlets = 4;\nfunction bang() {}`;
    const patch = await compileSource(source);

    const v8Box = patch.patcher.boxes.find((b) => b.box.text?.startsWith("v8"));
    expect(v8Box!.box.numinlets).toBe(3);
    expect(v8Box!.box.numoutlets).toBe(4);
  });
});
