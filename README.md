# max4js

Write Max for Live devices in JavaScript. Compile to `.maxpat` and drag into Ableton Live.

**max4js** is a Node.js compiler that takes a JavaScript file written for the Max 9 `v8` engine and produces a ready-to-use `.maxpat` patch. No visual patching required.

## Why?

The Max/MSP visual editor is great for experimentation but painful for serious development:

- No version control (binary/JSON diffs are unreadable)
- No code review, no linting, no refactoring tools
- AI coding assistants can't help you patch
- Copy-paste logic between devices is manual and error-prone

Max 9 introduced the [`v8` object](https://docs.cycling74.com/reference/v8/) — a modern V8 JavaScript engine with full ES6+ support and access to the [Live Object Model](https://docs.cycling74.com/userguide/m4l/live_api_overview/). Your logic is pure JavaScript; you just need a minimal patch to wire it up.

**max4js generates that patch for you.**

## Quick Start

```bash
npx max4js compile my-effect.js -o my-effect.maxpat
```

Then drag `my-effect.maxpat` into a Max for Live device slot in Ableton Live.

## Installation

```bash
npm install -g max4js
```

Or use directly with `npx`:

```bash
npx max4js compile <input.js> [options]
```

## Usage

### Write your JavaScript

```javascript
// @device midi-effect

inlets = 2;
outlets = 1;

function msg_int(value) {
  if (inlet === 0) {
    // Control message
    post("Received:", value, "\n");
    return;
  }
  // MIDI byte — pass through doubled
  outlet(0, value);
}

function bang() {
  outlet(0, "hello", "world");
}
```

### Compile it

```bash
# MIDI effect (default)
max4js compile effect.js -o effect.maxpat

# Audio effect
max4js compile delay.js --type audio-effect -o delay.maxpat

# Instrument
max4js compile synth.js --type instrument -o synth.maxpat
```

### CLI Options

| Option | Default | Description |
|--------|---------|-------------|
| `-o, --output <path>` | `<input>.maxpat` | Output file path |
| `-t, --type <type>` | `midi-effect` | Device type: `midi-effect`, `audio-effect`, `instrument` |
| `--no-embed` | (embeds by default) | Reference external `.js` file instead of embedding code |
| `-w, --device-width <px>` | `400` | Max for Live device strip width |

## Decorator Comments

Use comments at the top of your file to configure compilation:

```javascript
// @device midi-effect          — sets device type (overridden by --type flag)
// @inlet 0 "MIDI input"       — help text for inlet 0
// @inlet 1 "Control"          — help text for inlet 1
// @outlet 0 "Processed MIDI"  — help text for outlet 0
```

## How It Works

1. **Parses** your `.js` file to extract `inlets`, `outlets`, handler functions, and decorator comments
2. **Selects a template** based on device type (MIDI effect, audio effect, or instrument)
3. **Generates** a `.maxpat` JSON file with the `v8` object wired to the appropriate Max for Live infrastructure (`midiin`/`midiout`, `plugin~`/`plugout~`, `live.thisdevice`)
4. **Embeds** your JavaScript source directly in the patch (single-file distribution)

The output is a standard `.maxpat` file — valid JSON that Max 9 opens natively.

## Examples

See the [`examples/`](examples/) directory:

- **[hello-world.js](examples/hello-world.js)** — Simplest possible device
- **[midi-echo.js](examples/midi-echo.js)** — MIDI delay/echo effect with feedback
- **[clip-launcher.js](examples/clip-launcher.js)** — Live Object Model: fire clips, stop tracks

## Max 9 v8 API Quick Reference

The `v8` object gives you access to these globals:

```javascript
// Inlets and outlets (must be in global scope)
inlets = 2;
outlets = 3;
inlet              // read-only: which inlet triggered the current function

// Output
outlet(n, ...args)           // send message out outlet n
outlet_array(n, arr)         // send JS array (v8 only)
outlet_dictionary(n, dict)   // send dictionary (v8 only)

// Message handlers (define as global functions)
function bang() {}
function msg_int(n) {}
function msg_float(f) {}
function list(...args) {}
function anything(msg, ...args) {}  // catch-all

// Live Object Model
var api = new LiveAPI(callback, "live_set tracks 0");
api.get("name")
api.set("mute", 1)
api.call("fire")

// Utilities
post("debug message\n")     // print to Max console
```

Full reference: [Max JavaScript User Guide](https://docs.cycling74.com/userguide/javascript/) | [v8 Reference](https://docs.cycling74.com/reference/v8/) | [Live API](https://docs.cycling74.com/userguide/m4l/live_api_overview/)

## Limitations

- **No audio DSP**: JavaScript runs in Max's low-priority thread. Use `v8` for MIDI processing, generative tools, control logic, and Live Object Model access — not for real-time audio processing.
- **No `.amxd` output** (yet): The compiler produces `.maxpat` files. To create a `.amxd` device, open the `.maxpat` in Max, then save as `.amxd`. The `.amxd` format has a proprietary binary wrapper without a public spec.

## Development

```bash
git clone https://github.com/ktamas77/max4js.git
cd max4js
npm install
npm run build
npm test
```

## License

MIT
