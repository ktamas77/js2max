#!/usr/bin/env node

import { Command } from "commander";
import { resolve } from "node:path";
import { compile } from "./compiler/generator.js";
import type { DeviceType } from "./maxpat/types.js";

const program = new Command();

program
  .name("max4js")
  .description("Compile JavaScript files into Max for Live (.maxpat) devices")
  .version("0.1.0");

program
  .command("compile")
  .description("Compile a JavaScript file into a .maxpat file")
  .argument("<input>", "Path to the JavaScript file")
  .option("-o, --output <path>", "Output .maxpat file path")
  .option("--no-embed", "Reference external .js file instead of embedding")
  .option(
    "-t, --type <type>",
    "Device type: midi-effect, audio-effect, instrument"
  )
  .option(
    "-w, --device-width <width>",
    "Device strip width in pixels",
    "400"
  )
  .action(async (input: string, opts: Record<string, string | boolean>) => {
    const inputPath = resolve(input);
    const outputPath = opts.output
      ? resolve(opts.output as string)
      : inputPath.replace(/\.js$/, ".maxpat");

    try {
      await compile(inputPath, {
        output: outputPath,
        embed: opts.embed as boolean,
        type: opts.type as DeviceType | undefined,
        deviceWidth: parseInt(opts.deviceWidth as string, 10),
      });
      console.log(`Compiled: ${inputPath} → ${outputPath}`);
    } catch (err) {
      console.error(
        "Compilation failed:",
        err instanceof Error ? err.message : err
      );
      process.exit(1);
    }
  });

program.parse();
