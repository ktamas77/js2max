import * as acorn from "acorn";
import { readFile } from "node:fs/promises";
import type { DeviceType } from "../maxpat/types.js";

export interface ParsedMetadata {
  inlets: number;
  outlets: number;
  handlers: string[];
  deviceType: DeviceType | null;
  inletAssist: Map<number, string>;
  outletAssist: Map<number, string>;
  source: string;
  filePath: string;
}

const KNOWN_HANDLERS = [
  "bang",
  "msg_int",
  "msg_float",
  "list",
  "msg_array",
  "msg_dictionary",
  "msg_string",
  "anything",
  "loadbang",
];

export async function parseJsFile(filePath: string): Promise<ParsedMetadata> {
  const source = await readFile(filePath, "utf-8");
  return parseSource(source, filePath);
}

export function parseSource(source: string, filePath = "<inline>"): ParsedMetadata {
  const metadata: ParsedMetadata = {
    inlets: 1,
    outlets: 1,
    handlers: [],
    deviceType: null,
    inletAssist: new Map(),
    outletAssist: new Map(),
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
    const inletMatch = trimmed.match(
      /^\/\/\s*@inlet\s+(\d+)\s+"([^"]+)"/
    );
    if (inletMatch) {
      metadata.inletAssist.set(parseInt(inletMatch[1]), inletMatch[2]);
    }

    // @outlet 0 "Description"
    const outletMatch = trimmed.match(
      /^\/\/\s*@outlet\s+(\d+)\s+"([^"]+)"/
    );
    if (outletMatch) {
      metadata.outletAssist.set(parseInt(outletMatch[1]), outletMatch[2]);
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
