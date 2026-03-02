import type { MaxPat, Patcher, Box, PatchLine, DeviceType } from "./types.js";
import { nextId, resetIdCounter } from "../utils/ids.js";

const DEFAULT_APP_VERSION = {
  major: 9,
  minor: 0,
  revision: 0,
  architecture: "x64",
  modernui: 1,
};

const DEFAULT_BOX_WIDTH = 120;
const DEFAULT_BOX_HEIGHT = 22;
const GRID_X = 150;
const GRID_Y = 50;
const START_X = 50;
const START_Y = 50;

export class PatchBuilder {
  private boxes: Box[] = [];
  private lines: PatchLine[] = [];
  private deviceWidth = 0;
  private description = "";
  private nextRow = 0;
  private nextCol = 0;

  constructor() {
    resetIdCounter();
  }

  setDeviceWidth(width: number): this {
    this.deviceWidth = width;
    return this;
  }

  setDescription(desc: string): this {
    this.description = desc;
    return this;
  }

  addBox(
    maxclass: string,
    options: {
      text?: string;
      numinlets?: number;
      numoutlets?: number;
      outlettype?: string[];
      varname?: string;
      embed?: number;
      saved_object_attributes?: Record<string, unknown>;
      text_editor_contents?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      comment?: string;
      patcher?: Patcher;
      [key: string]: unknown;
    } = {}
  ): string {
    const id = nextId();
    const {
      text,
      numinlets = 1,
      numoutlets = 1,
      outlettype,
      varname,
      embed,
      saved_object_attributes,
      text_editor_contents,
      x,
      y,
      width = DEFAULT_BOX_WIDTH,
      height = DEFAULT_BOX_HEIGHT,
      comment,
      patcher,
      ...extra
    } = options;

    const posX = x ?? START_X + this.nextCol * GRID_X;
    const posY = y ?? START_Y + this.nextRow * GRID_Y;
    this.nextRow++;

    const box: Box["box"] = {
      id,
      maxclass,
      numinlets,
      numoutlets,
      patching_rect: [posX, posY, width, height] as [
        number,
        number,
        number,
        number,
      ],
    };

    if (text !== undefined) box.text = text;
    if (outlettype) box.outlettype = outlettype;
    if (varname) box.varname = varname;
    if (embed !== undefined) box.embed = embed;
    if (saved_object_attributes)
      box.saved_object_attributes = saved_object_attributes;
    if (text_editor_contents)
      box.text_editor_contents = text_editor_contents;
    if (comment) box.comment = comment;
    if (patcher) box.patcher = patcher;

    Object.assign(box, extra);

    this.boxes.push({ box });
    return id;
  }

  addObject(text: string, options: Parameters<PatchBuilder["addBox"]>[1] = {}): string {
    return this.addBox("newobj", { text, ...options });
  }

  addComment(text: string, options: Parameters<PatchBuilder["addBox"]>[1] = {}): string {
    return this.addBox("comment", {
      text,
      numinlets: 1,
      numoutlets: 0,
      ...options,
    });
  }

  connect(
    sourceId: string,
    sourceOutlet: number,
    destId: string,
    destInlet: number,
    order?: number
  ): this {
    const line: PatchLine = {
      patchline: {
        source: [sourceId, sourceOutlet],
        destination: [destId, destInlet],
      },
    };
    if (order !== undefined) line.patchline.order = order;
    this.lines.push(line);
    return this;
  }

  build(): MaxPat {
    const patcher: Patcher = {
      fileversion: 1,
      appversion: DEFAULT_APP_VERSION,
      classnamespace: "box",
      rect: [100, 100, 800, 600],
      bglocked: 0,
      openinpresentation: 0,
      default_fontsize: 12.0,
      default_fontface: 0,
      default_fontname: "Arial",
      gridonopen: 1,
      gridsize: [15.0, 15.0],
      gridsnaponopen: 1,
      objectsnaponopen: 1,
      statusbarvisible: 2,
      toolbarvisible: 1,
      lefttoolbarpinned: 0,
      toptoolbarpinned: 0,
      righttoolbarpinned: 0,
      bottomtoolbarpinned: 0,
      toolbars_unpinned_last_save: 0,
      tallnewobj: 0,
      boxanimatetime: 200,
      enablehscroll: 1,
      enablevscroll: 1,
      devicewidth: this.deviceWidth,
      description: this.description,
      digest: "",
      tags: "",
      style: "",
      subpatcher_template: "",
      assistshowspatchername: 0,
      boxes: this.boxes,
      lines: this.lines,
      dependency_cache: [],
      autosave: 0,
    };

    return { patcher };
  }
}
