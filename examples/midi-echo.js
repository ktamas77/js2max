// @device midi-effect
// @inlet 0 "Control messages"
// @inlet 1 "MIDI input (raw bytes)"
// @outlet 0 "MIDI output (raw bytes)"

inlets = 2;
outlets = 1;

var delayTime = 250; // ms
var feedback = 0.5;
var pendingNotes = [];

function msg_int(value) {
  if (inlet === 0) {
    delayTime = value;
    post("Delay time set to:", delayTime, "ms\n");
    return;
  }

  // Raw MIDI byte from midiin — pass through immediately
  outlet(0, value);
}

function list(status, note, velocity) {
  // MIDI note message: pass through and schedule echo
  outlet(0, status, note, velocity);

  if (velocity > 0 && (status & 0xf0) === 0x90) {
    scheduleEcho(status, note, velocity, feedback);
  }
}

function scheduleEcho(status, note, velocity, level) {
  var echoVel = Math.round(velocity * level);
  if (echoVel < 1) return;

  var task = new Task(function () {
    outlet(0, status, note, echoVel);
    scheduleEcho(status, note, echoVel, feedback);
  });
  task.schedule(delayTime);
}

function setFeedback(val) {
  feedback = Math.max(0, Math.min(1, val));
  post("Feedback set to:", feedback, "\n");
}
