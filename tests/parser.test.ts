import { describe, it, expect } from "vitest";
import { parseSource } from "../src/compiler/parser.js";

describe("parseSource", () => {
  it("extracts inlets and outlets", () => {
    const source = `inlets = 3;\noutlets = 2;\nfunction bang() {}`;
    const result = parseSource(source);
    expect(result.inlets).toBe(3);
    expect(result.outlets).toBe(2);
  });

  it("defaults to 1 inlet and 1 outlet", () => {
    const result = parseSource("function bang() {}");
    expect(result.inlets).toBe(1);
    expect(result.outlets).toBe(1);
  });

  it("extracts function handlers", () => {
    const source = `
inlets = 1;
outlets = 1;
function bang() {}
function msg_int(n) {}
function myCustomHandler(a, b) {}
`;
    const result = parseSource(source);
    expect(result.handlers).toEqual(["bang", "msg_int", "myCustomHandler"]);
  });

  it("extracts @device decorator", () => {
    const source = `// @device audio-effect\ninlets = 1;\noutlets = 1;`;
    const result = parseSource(source);
    expect(result.deviceType).toBe("audio-effect");
  });

  it("extracts @inlet and @outlet decorators", () => {
    const source = `
// @inlet 0 "MIDI input"
// @inlet 1 "Control"
// @outlet 0 "Processed MIDI"
inlets = 2;
outlets = 1;
`;
    const result = parseSource(source);
    expect(result.inletAssist.get(0)).toBe("MIDI input");
    expect(result.inletAssist.get(1)).toBe("Control");
    expect(result.outletAssist.get(0)).toBe("Processed MIDI");
  });

  it("preserves the original source", () => {
    const source = `inlets = 1;\nfunction bang() { outlet(0, "hi"); }`;
    const result = parseSource(source);
    expect(result.source).toBe(source);
  });
});
