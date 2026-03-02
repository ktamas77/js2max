import { PatchBuilder } from "../maxpat/builder.js";
import type { MaxPat, DeviceType } from "../maxpat/types.js";
import type { ParsedMetadata, UIElement } from "./parser.js";

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
      text: "v8",
      filename: "none",
      numinlets: metadata.inlets,
      numoutlets: metadata.outlets,
      outlettype: Array(metadata.outlets).fill(""),
      saved_object_attributes: {
        parameter_enable: 0,
      },
      textfile: {
        text: metadata.source,
        filename: "none",
        flags: 0,
        embed: 1,
        autowatch: 1,
      },
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
    textfile: {
      filename,
      flags: 0,
      embed: 0,
      autowatch: 1,
    },
    ...boxOptions,
  });
}

function getDeviceLabel(filePath: string): string {
  const name = filePath.split("/").pop() ?? "js2max device";
  return name.replace(/\.js$/, "");
}

function addPresentationUI(
  builder: PatchBuilder,
  metadata: ParsedMetadata,
  deviceType: DeviceType,
  deviceWidth: number
): void {
  const label = getDeviceLabel(metadata.filePath);
  const typeLabel =
    deviceType === "midi-effect"
      ? "MIDI Effect"
      : deviceType === "audio-effect"
        ? "Audio Effect"
        : "Instrument";

  // Device title
  builder.addBox("comment", {
    text: label,
    numinlets: 1,
    numoutlets: 0,
    patching_rect: [10, 300, deviceWidth - 20, 20],
    presentation: 1,
    presentation_rect: [10, 8, deviceWidth - 20, 20],
    fontsize: 14,
    fontface: 1, // bold
  });

  // Device type subtitle
  builder.addBox("comment", {
    text: typeLabel,
    numinlets: 1,
    numoutlets: 0,
    patching_rect: [10, 325, deviceWidth - 20, 18],
    presentation: 1,
    presentation_rect: [10, 30, deviceWidth - 20, 18],
    fontsize: 10,
    textcolor: [0.5, 0.5, 0.5, 1.0],
  });

  // "js2max" credit
  builder.addBox("comment", {
    text: "js2max",
    numinlets: 1,
    numoutlets: 0,
    patching_rect: [10, 350, 60, 16],
    presentation: 1,
    presentation_rect: [deviceWidth - 55, 30, 50, 16],
    fontsize: 9,
    textcolor: [0.4, 0.4, 0.4, 1.0],
  });
}

interface UISlot {
  width: number;
  height: number;
  labelHeight: number;
}

const UI_SLOTS: Record<UIElement["maxclass"], UISlot> = {
  "live.text": { width: 80, height: 30, labelHeight: 0 },
  "live.dial": { width: 60, height: 50, labelHeight: 15 },
  "live.slider": { width: 30, height: 80, labelHeight: 15 },
  "live.toggle": { width: 30, height: 30, labelHeight: 15 },
};

const UI_START_Y = 55;
const UI_PADDING = 10;

function addUIElements(
  builder: PatchBuilder,
  metadata: ParsedMetadata,
  v8Id: string,
  deviceWidth: number
): void {
  if (metadata.uiElements.length === 0) return;

  let curX = UI_PADDING;
  let curY = UI_START_Y;
  let rowHeight = 0;

  for (const el of metadata.uiElements) {
    const slot = UI_SLOTS[el.maxclass];

    // Wrap to next row if exceeding device width
    if (curX + slot.width + UI_PADDING > deviceWidth) {
      curX = UI_PADDING;
      curY += rowHeight + slot.labelHeight + UI_PADDING;
      rowHeight = 0;
    }

    const totalHeight = slot.height + slot.labelHeight;
    if (totalHeight > rowHeight) rowHeight = totalHeight;

    const presRect: [number, number, number, number] = [
      curX,
      curY,
      slot.width,
      slot.height,
    ];

    // Patching rect (hidden behind presentation, placed below visible area)
    const patchY = 400 + curY;

    const boxOptions: Record<string, unknown> = {
      numinlets: 1,
      numoutlets: 1,
      outlettype: [""],
      patching_rect: [curX, patchY, slot.width, slot.height],
      presentation: 1,
      presentation_rect: presRect,
    };

    if (el.maxclass === "live.text") {
      boxOptions.text = el.label;
      boxOptions.saved_object_attributes = {
        parameter_enable: 1,
        parameter_longname: el.label,
        parameter_shortname: el.label,
        parameter_type: el.trigger ? 0 : 2, // 0=float(bang), 2=int(toggle)
      };
      if (el.trigger) {
        boxOptions.mode = 0; // button mode (bang on click)
        boxOptions.texton = el.label;
        boxOptions.textoff = el.label;
      }
    } else if (el.maxclass === "live.dial") {
      boxOptions.saved_object_attributes = {
        parameter_enable: 1,
        parameter_longname: el.label,
        parameter_shortname: el.label,
        parameter_type: 0,
        parameter_unitstyle: 0,
      };
      if (el.min !== undefined)
        (boxOptions.saved_object_attributes as Record<string, unknown>)[
          "parameter_mmin"
        ] = el.min;
      if (el.max !== undefined)
        (boxOptions.saved_object_attributes as Record<string, unknown>)[
          "parameter_mmax"
        ] = el.max;
    } else if (el.maxclass === "live.slider") {
      boxOptions.saved_object_attributes = {
        parameter_enable: 1,
        parameter_longname: el.label,
        parameter_shortname: el.label,
        parameter_type: 0,
        parameter_unitstyle: 0,
      };
      if (el.min !== undefined)
        (boxOptions.saved_object_attributes as Record<string, unknown>)[
          "parameter_mmin"
        ] = el.min;
      if (el.max !== undefined)
        (boxOptions.saved_object_attributes as Record<string, unknown>)[
          "parameter_mmax"
        ] = el.max;
    } else if (el.maxclass === "live.toggle") {
      boxOptions.saved_object_attributes = {
        parameter_enable: 1,
        parameter_longname: el.label,
        parameter_shortname: el.label,
        parameter_type: 2,
      };
    }

    const uiId = builder.addBox(el.maxclass, boxOptions);

    // Wire: UI output → v8 inlet (user controls)
    if (el.inlet !== undefined) {
      builder.connect(uiId, 0, v8Id, el.inlet);
    }

    // Wire: v8 outlet → UI input (status display)
    if (el.outlet !== undefined) {
      builder.connect(v8Id, el.outlet, uiId, 0);
    }

    // Add label below for dials, sliders, toggles
    if (el.maxclass !== "live.text" && slot.labelHeight > 0) {
      builder.addBox("comment", {
        text: el.label,
        numinlets: 1,
        numoutlets: 0,
        patching_rect: [
          curX,
          patchY + slot.height + 2,
          slot.width,
          slot.labelHeight,
        ],
        presentation: 1,
        presentation_rect: [
          curX,
          curY + slot.height + 2,
          slot.width,
          slot.labelHeight,
        ],
        fontsize: 9,
        textjustification: 1,
        textcolor: [0.5, 0.5, 0.5, 1.0],
      });
    }

    curX += slot.width + UI_PADDING;
  }
}

function buildMidiEffect(
  metadata: ParsedMetadata,
  options: TemplateOptions
): MaxPat {
  const builder = new PatchBuilder();
  const width = options.deviceWidth || DEFAULT_DEVICE_WIDTH;
  builder.setDeviceWidth(width);
  builder.setOpenInPresentation(true);

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

  // Presentation UI
  addPresentationUI(builder, metadata, "midi-effect", width);
  addUIElements(builder, metadata, v8, width);

  // Wiring
  builder.connect(thisDevice, 0, v8, 0);
  builder.connect(midiin, 0, v8, metadata.inlets > 1 ? 1 : 0);
  builder.connect(v8, 0, midiout, 0);

  return builder.build();
}

function buildAudioEffect(
  metadata: ParsedMetadata,
  options: TemplateOptions
): MaxPat {
  const builder = new PatchBuilder();
  const width = options.deviceWidth || DEFAULT_DEVICE_WIDTH;
  builder.setDeviceWidth(width);
  builder.setOpenInPresentation(true);

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

  // Presentation UI
  addPresentationUI(builder, metadata, "audio-effect", width);
  addUIElements(builder, metadata, v8, width);

  // Audio passthrough (v8 can't process audio, so pass through directly)
  builder.connect(thisDevice, 0, v8, 0);
  builder.connect(pluginIn, 0, pluginOut, 0);
  builder.connect(pluginIn, 1, pluginOut, 1);

  return builder.build();
}

function buildInstrument(
  metadata: ParsedMetadata,
  options: TemplateOptions
): MaxPat {
  const builder = new PatchBuilder();
  const width = options.deviceWidth || DEFAULT_DEVICE_WIDTH;
  builder.setDeviceWidth(width);
  builder.setOpenInPresentation(true);

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
  builder.addObject("plugout~", {
    numinlets: 2,
    numoutlets: 0,
    x: 150,
    y: 220,
  });

  // Presentation UI
  addPresentationUI(builder, metadata, "instrument", width);
  addUIElements(builder, metadata, v8, width);

  // Wiring
  builder.connect(thisDevice, 0, v8, 0);
  builder.connect(midiin, 0, v8, metadata.inlets > 1 ? 1 : 0);

  return builder.build();
}
