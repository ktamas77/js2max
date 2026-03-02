# Changelog

## [1.1.0] - 2026-03-02

### Added

- **`@ui` decorator** — Generate interactive UI elements (buttons, dials, sliders, toggles) in the device strip directly from comment decorators in your JS code.
  - `// @ui live.text "Label" [trigger] inlet=N` — Button or toggle
  - `// @ui live.dial "Label" inlet=N min=X max=Y` — Rotary dial
  - `// @ui live.slider "Label" inlet=N min=X max=Y` — Vertical slider
  - `// @ui live.toggle "Label" outlet=N` — LED-style toggle indicator
- **Auto-layout** — UI elements are arranged in a row below the title, wrapping to the next row when exceeding device width.
- **Bidirectional wiring** — `inlet=N` wires UI output to v8 inlet (user controls); `outlet=N` wires v8 outlet to UI input (status display).

### Changed

- **clip-launcher.js** — Now has Track/Slot dials and Fire/Stop buttons (5 inlets) with `msg_int` inlet routing.
- **midi-echo.js** — Now has Delay/Feedback dials and Activity toggle (3 inlets, 2 outlets) with visual MIDI activity feedback.
- **hello-world.js** — Now has a "Say Hello" button wired to bang.

## [1.0.0] - 2026-03-02

### Added

- **`.amxd` output** — Compile directly to Max for Live device files that open in Ableton Live. No more manual `.maxpat` → `.amxd` conversion.
- **Presentation mode UI** — Generated devices show a title bar with device name, type label, and js2max branding in Ableton's device strip.
- **All three device types** — MIDI effect, audio effect, and instrument templates.
- **Embedded JavaScript** — JS source is stored inside the `.amxd` file by default (single-file distribution). Use `--no-embed` for external `.js` file reference.
- **Decorator comments** — `@device`, `@inlet`, `@outlet` comments in your JS file configure compilation.
- **CLI** — `js2max compile <input.js>` with `--output`, `--type`, `--no-embed`, and `--device-width` options.
- **Examples** — `hello-world.js`, `midi-echo.js`, `clip-launcher.js`.
- **Code quality** — Husky pre-commit hooks with TypeScript typecheck, ESLint, and Prettier.

### Technical

- `.amxd` binary format: chunk-based container (`ampf` + `meta` + `ptch` with `mx@c` header and `dlst` directory).
- v8 embedded code uses the `textfile.text` field (not `text_editor_contents`).
- Parser uses acorn for AST analysis with regex fallback.
