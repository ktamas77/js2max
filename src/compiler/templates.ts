import { PatchBuilder } from "../maxpat/builder.js";
import type { MaxPat, DeviceType } from "../maxpat/types.js";
import type { ParsedMetadata } from "./parser.js";

export interface TemplateOptions {
  embed: boolean;
  deviceWidth: number;
}

const DEFAULT_DEVICE_WIDTH = 400;

export function generatePatch(
  metadata: ParsedMetadata,
  deviceType: DeviceType,
  options: TemplateOptions
): MaxPat {
  switch (deviceType) {
    case "midi-effect":
      return buildMidiEffect(metadata, options);
    case "audio-effect":
      return buildAudioEffect(metadata, options);
    case "instrument":
      return buildInstrument(metadata, options);
  }
}

function addV8Box(
  builder: PatchBuilder,
  metadata: ParsedMetadata,
  options: TemplateOptions,
  boxOptions: { x?: number; y?: number } = {}
): string {
  if (options.embed) {
    return builder.addBox("newobj", {
      text: `v8 ${metadata.outlets} ${metadata.inlets}`,
      numinlets: metadata.inlets,
      numoutlets: metadata.outlets,
      outlettype: Array(metadata.outlets).fill(""),
      embed: 1,
      saved_object_attributes: {
        embed: 1,
        jsarguments: [],
      },
      text_editor_contents: metadata.source,
      ...boxOptions,
    });
  }

  // External file mode
  const filename = metadata.filePath.split("/").pop() ?? "script.js";
  return builder.addBox("newobj", {
    text: `v8 ${filename}`,
    numinlets: metadata.inlets,
    numoutlets: metadata.outlets,
    outlettype: Array(metadata.outlets).fill(""),
    ...boxOptions,
  });
}

function buildMidiEffect(
  metadata: ParsedMetadata,
  options: TemplateOptions
): MaxPat {
  const builder = new PatchBuilder();
  builder.setDeviceWidth(options.deviceWidth || DEFAULT_DEVICE_WIDTH);

  // live.thisdevice — triggers loadbang
  const thisDevice = builder.addObject("live.thisdevice", {
    numoutlets: 1,
    outlettype: [""],
    x: 50,
    y: 30,
  });

  // midiin — raw MIDI input
  const midiin = builder.addObject("midiin", {
    numoutlets: 1,
    outlettype: ["int"],
    x: 200,
    y: 30,
  });

  // The v8 object
  const v8 = addV8Box(builder, metadata, options, { x: 150, y: 120 });

  // midiout — raw MIDI output
  const midiout = builder.addObject("midiout", {
    numinlets: 1,
    numoutlets: 0,
    x: 150,
    y: 220,
  });

  // Wiring
  builder.connect(thisDevice, 0, v8, 0); // thisdevice -> v8 inlet 0
  builder.connect(midiin, 0, v8, metadata.inlets > 1 ? 1 : 0); // midiin -> v8
  builder.connect(v8, 0, midiout, 0); // v8 outlet 0 -> midiout

  return builder.build();
}

function buildAudioEffect(
  metadata: ParsedMetadata,
  options: TemplateOptions
): MaxPat {
  const builder = new PatchBuilder();
  builder.setDeviceWidth(options.deviceWidth || DEFAULT_DEVICE_WIDTH);

  // live.thisdevice
  const thisDevice = builder.addObject("live.thisdevice", {
    numoutlets: 1,
    outlettype: [""],
    x: 50,
    y: 30,
  });

  // plugin~ — stereo audio input
  const pluginIn = builder.addObject("plugin~", {
    numoutlets: 2,
    outlettype: ["signal", "signal"],
    x: 200,
    y: 30,
  });

  // The v8 object (for control logic — not audio processing)
  const v8 = addV8Box(builder, metadata, options, { x: 50, y: 120 });

  // plugout~ — stereo audio output
  const pluginOut = builder.addObject("plugout~", {
    numinlets: 2,
    numoutlets: 0,
    x: 200,
    y: 220,
  });

  // Audio passthrough (v8 can't process audio, so pass through directly)
  builder.connect(thisDevice, 0, v8, 0);
  builder.connect(pluginIn, 0, pluginOut, 0); // L channel passthrough
  builder.connect(pluginIn, 1, pluginOut, 1); // R channel passthrough

  return builder.build();
}

function buildInstrument(
  metadata: ParsedMetadata,
  options: TemplateOptions
): MaxPat {
  const builder = new PatchBuilder();
  builder.setDeviceWidth(options.deviceWidth || DEFAULT_DEVICE_WIDTH);

  // live.thisdevice
  const thisDevice = builder.addObject("live.thisdevice", {
    numoutlets: 1,
    outlettype: [""],
    x: 50,
    y: 30,
  });

  // midiin — MIDI input for the instrument
  const midiin = builder.addObject("midiin", {
    numoutlets: 1,
    outlettype: ["int"],
    x: 200,
    y: 30,
  });

  // The v8 object
  const v8 = addV8Box(builder, metadata, options, { x: 150, y: 120 });

  // plugout~ — stereo audio output (instruments produce audio)
  const pluginOut = builder.addObject("plugout~", {
    numinlets: 2,
    numoutlets: 0,
    x: 150,
    y: 220,
  });

  // Wiring
  builder.connect(thisDevice, 0, v8, 0);
  builder.connect(midiin, 0, v8, metadata.inlets > 1 ? 1 : 0);
  // Note: v8 can't directly produce audio signals.
  // Instrument templates will need additional objects (e.g., poly~)
  // for actual sound generation. The v8 object handles MIDI/control logic.

  return builder.build();
}
