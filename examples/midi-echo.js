// @device midi-effect
// @inlet 0 "Control messages"
// @inlet 1 "MIDI input (raw bytes)"
// @outlet 0 "MIDI output (raw bytes)"
// @outlet 1 "Activity indicator"
// @ui live.dial "Delay" inlet=0 min=0 max=1000
// @ui live.dial "Feedback" inlet=2 min=0 max=100
// @ui live.toggle "Activity" outlet=1

inlets = 3;
outlets = 2;

var delayTime = 250; // ms
var feedback = 0.5;
var pendingNotes = [];

function msg_int(value) {
  if (inlet === 0) {
    delayTime = value;
    post("Delay time set to:", delayTime, "ms\n");
    return;
  }

  if (inlet === 2) {
    feedback = Math.max(0, Math.min(1, value / 100));
    post("Feedback set to:", feedback, "\n");
    return;
  }

  // Raw MIDI byte from midiin — pass through immediately
  outlet(0, value);
}

function list(status, note, velocity) {
  // MIDI note message: pass through and schedule echo
  outlet(0, status, note, velocity);

  if (velocity > 0 && (status & 0xf0) === 0x90) {
    // Flash activity indicator
    outlet(1, 1);
    var offTask = new Task(function () {
      outlet(1, 0);
    });
    offTask.schedule(100);

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
