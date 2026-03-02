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

    const v8Box = patch.patcher.boxes.find((b) => b.box.text === "v8");
    expect(v8Box).toBeDefined();
    const tf = v8Box!.box.textfile as Record<string, unknown>;
    expect(tf).toBeDefined();
    expect(tf.embed).toBe(1);
    expect(tf.text).toBe(source);
  });

  it("references external file when embed is false", async () => {
    const source = `inlets = 1;\noutlets = 1;\nfunction bang() {}`;
    const patch = await compileSource(source, { embed: false });

    const v8Box = patch.patcher.boxes.find((b) => b.box.text?.startsWith("v8"));
    expect(v8Box).toBeDefined();
    const tf = v8Box!.box.textfile as Record<string, unknown>;
    expect(tf.embed).toBe(0);
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

  it("generates UI elements from @ui decorators", async () => {
    const source = `// @device midi-effect
// @ui live.dial "Track" inlet=1 min=0 max=16
// @ui live.text "Fire" trigger inlet=0
inlets = 2;
outlets = 1;
function bang() {}`;
    const patch = await compileSource(source);

    const dialBox = patch.patcher.boxes.find(
      (b) => b.box.maxclass === "live.dial"
    );
    expect(dialBox).toBeDefined();
    expect(dialBox!.box.presentation).toBe(1);
    const dialAttrs = dialBox!.box.saved_object_attributes as Record<
      string,
      unknown
    >;
    expect(dialAttrs.parameter_shortname).toBe("Track");
    expect(dialAttrs.parameter_mmin).toBe(0);
    expect(dialAttrs.parameter_mmax).toBe(16);

    const textBox = patch.patcher.boxes.find(
      (b) => b.box.maxclass === "live.text"
    );
    expect(textBox).toBeDefined();
    expect(textBox!.box.mode).toBe(0); // trigger/button mode
  });

  it("wires UI elements to v8 inlets and outlets", async () => {
    const source = `// @device midi-effect
// @ui live.dial "Vol" inlet=1 min=0 max=127
// @ui live.toggle "LED" outlet=1
inlets = 2;
outlets = 2;
function bang() {}`;
    const patch = await compileSource(source);

    const v8Box = patch.patcher.boxes.find((b) => b.box.text === "v8");
    const dialBox = patch.patcher.boxes.find(
      (b) => b.box.maxclass === "live.dial"
    );
    const toggleBox = patch.patcher.boxes.find(
      (b) => b.box.maxclass === "live.toggle"
    );

    // dial → v8 inlet 1
    const dialToV8 = patch.patcher.lines.find(
      (l) =>
        l.patchline.source[0] === dialBox!.box.id &&
        l.patchline.destination[0] === v8Box!.box.id &&
        l.patchline.destination[1] === 1
    );
    expect(dialToV8).toBeDefined();

    // v8 outlet 1 → toggle
    const v8ToToggle = patch.patcher.lines.find(
      (l) =>
        l.patchline.source[0] === v8Box!.box.id &&
        l.patchline.source[1] === 1 &&
        l.patchline.destination[0] === toggleBox!.box.id
    );
    expect(v8ToToggle).toBeDefined();
  });

  it("handles multiple inlets/outlets", async () => {
    const source = `inlets = 3;\noutlets = 4;\nfunction bang() {}`;
    const patch = await compileSource(source);

    const v8Box = patch.patcher.boxes.find((b) => b.box.text === "v8");
    expect(v8Box!.box.numinlets).toBe(3);
    expect(v8Box!.box.numoutlets).toBe(4);
  });
});
