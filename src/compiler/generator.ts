import { writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { parseJsFile, parseSource } from "./parser.js";
import { generatePatch, type TemplateOptions } from "./templates.js";
import { buildAmxd } from "../amxd/writer.js";
import type { MaxPat, DeviceType } from "../maxpat/types.js";

export interface CompileOptions {
  output?: string;
  embed?: boolean;
  type?: DeviceType;
  deviceWidth?: number;
}

export async function compile(
  inputPath: string,
  options: CompileOptions = {}
): Promise<MaxPat> {
  const metadata = await parseJsFile(inputPath);

  const deviceType = options.type ?? metadata.deviceType ?? "midi-effect";
  const embed = options.embed !== false; // default true

  const templateOptions: TemplateOptions = {
    embed,
    deviceWidth: options.deviceWidth ?? 400,
  };

  const patch = generatePatch(metadata, deviceType, templateOptions);

  if (options.output) {
    if (options.output.endsWith(".amxd")) {
      const amxdBytes = buildAmxd(patch, deviceType, basename(options.output));
      await writeFile(options.output, amxdBytes);
    } else {
      const json = JSON.stringify(patch, null, "\t");
      await writeFile(options.output, json, "utf-8");
    }
  }

  return patch;
}

export async function compileSource(
  source: string,
  options: CompileOptions = {}
): Promise<MaxPat> {
  const metadata = parseSource(source);

  const deviceType = options.type ?? metadata.deviceType ?? "midi-effect";
  const embed = options.embed !== false;

  const templateOptions: TemplateOptions = {
    embed,
    deviceWidth: options.deviceWidth ?? 400,
  };

  return generatePatch(metadata, deviceType, templateOptions);
}
