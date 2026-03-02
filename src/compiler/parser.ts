import * as acorn from "acorn";
import { readFile } from "node:fs/promises";
import type { DeviceType } from "../maxpat/types.js";

export interface UIElement {
  maxclass: "live.text" | "live.dial" | "live.slider" | "live.toggle";
  label: string;
  trigger: boolean;
  inlet?: number;
  outlet?: number;
  min?: number;
  max?: number;
}

export interface ParsedMetadata {
  inlets: number;
  outlets: number;
  handlers: string[];
  deviceType: DeviceType | null;
  inletAssist: Map<number, string>;
  outletAssist: Map<number, string>;
  uiElements: UIElement[];
  source: string;
  filePath: string;
}

export async function parseJsFile(filePath: string): Promise<ParsedMetadata> {
  const source = await readFile(filePath, "utf-8");
  return parseSource(source, filePath);
}

export function parseSource(
  source: string,
  filePath = "<inline>"
): ParsedMetadata {
  const metadata: ParsedMetadata = {
    inlets: 1,
    outlets: 1,
    handlers: [],
    deviceType: null,
    inletAssist: new Map(),
    outletAssist: new Map(),
    uiElements: [],
    source,
    filePath,
  };

  parseDecorators(source, metadata);
  parseAst(source, metadata);

  return metadata;
}

function parseDecorators(source: string, metadata: ParsedMetadata): void {
  const lines = source.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();

    // @device midi-effect | audio-effect | instrument
    const deviceMatch = trimmed.match(
      /^\/\/\s*@device\s+(midi-effect|audio-effect|instrument)/
    );
    if (deviceMatch) {
      metadata.deviceType = deviceMatch[1] as DeviceType;
    }

    // @inlet 0 "Description"
    const inletMatch = trimmed.match(/^\/\/\s*@inlet\s+(\d+)\s+"([^"]+)"/);
    if (inletMatch) {
      metadata.inletAssist.set(parseInt(inletMatch[1]), inletMatch[2]);
    }

    // @outlet 0 "Description"
    const outletMatch = trimmed.match(/^\/\/\s*@outlet\s+(\d+)\s+"([^"]+)"/);
    if (outletMatch) {
      metadata.outletAssist.set(parseInt(outletMatch[1]), outletMatch[2]);
    }

    // @ui live.text "Label" [trigger] inlet=N|outlet=N [min=X] [max=Y]
    const uiMatch = trimmed.match(
      /^\/\/\s*@ui\s+(live\.text|live\.dial|live\.slider|live\.toggle)\s+"([^"]+)"\s*(.*)/
    );
    if (uiMatch) {
      const maxclass = uiMatch[1] as UIElement["maxclass"];
      const label = uiMatch[2];
      const rest = uiMatch[3];

      const trigger = /\btrigger\b/.test(rest);
      const inletMatch2 = rest.match(/\binlet=(\d+)/);
      const outletMatch2 = rest.match(/\boutlet=(\d+)/);
      const minMatch = rest.match(/\bmin=(-?\d+)/);
      const maxMatch = rest.match(/\bmax=(-?\d+)/);

      const el: UIElement = { maxclass, label, trigger };
      if (inletMatch2) el.inlet = parseInt(inletMatch2[1]);
      if (outletMatch2) el.outlet = parseInt(outletMatch2[1]);
      if (minMatch) el.min = parseInt(minMatch[1]);
      if (maxMatch) el.max = parseInt(maxMatch[1]);

      metadata.uiElements.push(el);
    }
  }
}

function parseAst(source: string, metadata: ParsedMetadata): void {
  let ast: acorn.Program;
  try {
    ast = acorn.parse(source, {
      ecmaVersion: "latest",
      sourceType: "script",
    });
  } catch {
    // If parsing fails, fall back to regex extraction
    extractWithRegex(source, metadata);
    return;
  }

  for (const node of ast.body) {
    // Extract: inlets = N; outlets = M;
    if (
      node.type === "ExpressionStatement" &&
      node.expression.type === "AssignmentExpression" &&
      node.expression.left.type === "Identifier" &&
      node.expression.right.type === "Literal"
    ) {
      const name = node.expression.left.name;
      const value = node.expression.right.value;
      if (name === "inlets" && typeof value === "number") {
        metadata.inlets = value;
      }
      if (name === "outlets" && typeof value === "number") {
        metadata.outlets = value;
      }
    }

    // Extract function declarations
    if (node.type === "FunctionDeclaration" && node.id) {
      metadata.handlers.push(node.id.name);
    }
  }
}

function extractWithRegex(source: string, metadata: ParsedMetadata): void {
  const inletMatch = source.match(/^\s*inlets\s*=\s*(\d+)/m);
  if (inletMatch) metadata.inlets = parseInt(inletMatch[1]);

  const outletMatch = source.match(/^\s*outlets\s*=\s*(\d+)/m);
  if (outletMatch) metadata.outlets = parseInt(outletMatch[1]);

  const funcRegex = /^function\s+(\w+)\s*\(/gm;
  let match;
  while ((match = funcRegex.exec(source)) !== null) {
    metadata.handlers.push(match[1]);
  }
}
