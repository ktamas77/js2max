export interface AppVersion {
  major: number;
  minor: number;
  revision: number;
  architecture: string;
  modernui: number;
}

export interface PatchLine {
  patchline: {
    source: [string, number];
    destination: [string, number];
    order?: number;
  };
}

export interface BoxRect {
  0: number; // x
  1: number; // y
  2: number; // width
  3: number; // height
}

export interface SavedObjectAttributes {
  embed?: number;
  jsarguments?: unknown[];
  [key: string]: unknown;
}

export interface Box {
  box: {
    id: string;
    maxclass: string;
    text?: string;
    numinlets: number;
    numoutlets: number;
    outlettype?: string[];
    patching_rect: BoxRect;
    varname?: string;
    embed?: number;
    saved_object_attributes?: SavedObjectAttributes;
    text_editor_contents?: string;
    fontname?: string;
    fontsize?: number;
    comment?: string;
    patcher?: Patcher;
    [key: string]: unknown;
  };
}

export interface Patcher {
  fileversion: number;
  appversion: AppVersion;
  classnamespace: string;
  rect: [number, number, number, number];
  bglocked: number;
  openinpresentation: number;
  default_fontsize: number;
  default_fontface: number;
  default_fontname: string;
  gridonopen: number;
  gridsize: [number, number];
  gridsnaponopen: number;
  objectsnaponopen: number;
  statusbarvisible: number;
  toolbarvisible: number;
  lefttoolbarpinned: number;
  toptoolbarpinned: number;
  righttoolbarpinned: number;
  bottomtoolbarpinned: number;
  toolbars_unpinned_last_save: number;
  tallnewobj: number;
  boxanimatetime: number;
  enablehscroll: number;
  enablevscroll: number;
  devicewidth: number;
  description: string;
  digest: string;
  tags: string;
  style: string;
  subpatcher_template: string;
  assistshowspatchername: number;
  boxes: Box[];
  lines: PatchLine[];
  dependency_cache?: unknown[];
  autosave?: number;
}

export interface MaxPat {
  patcher: Patcher;
}

export type DeviceType = "midi-effect" | "audio-effect" | "instrument";
