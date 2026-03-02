// @device midi-effect
// @inlet 0 "Control messages"
// @outlet 0 "Status output"
// @ui live.dial "Track" inlet=1 min=0 max=16
// @ui live.dial "Slot" inlet=2 min=0 max=16
// @ui live.text "Fire" trigger inlet=3
// @ui live.text "Stop" trigger inlet=4

inlets = 5;
outlets = 1;

var selectedTrack = 0;
var selectedSlot = 0;

function bang() {
  // List all tracks and their clip slots
  var api = new LiveAPI(null, "live_set");
  var trackCount = api.getcount("tracks");
  post("Found", trackCount, "tracks\n");

  for (var i = 0; i < trackCount; i++) {
    var track = new LiveAPI(null, "live_set tracks " + i);
    post("Track", i, ":", track.get("name"), "\n");
  }

  outlet(0, "scanned", trackCount, "tracks");
}

function msg_int(value) {
  if (inlet === 1) {
    selectedTrack = value;
    post("Track set to:", selectedTrack, "\n");
  } else if (inlet === 2) {
    selectedSlot = value;
    post("Slot set to:", selectedSlot, "\n");
  } else if (inlet === 3) {
    fireClip(selectedTrack, selectedSlot);
  } else if (inlet === 4) {
    stopTrack(selectedTrack);
  }
}

function fireClip(trackIdx, slotIdx) {
  var path = "live_set tracks " + trackIdx + " clip_slots " + slotIdx + " clip";
  var clip = new LiveAPI(null, path);

  if (clip.id !== "0") {
    clip.call("fire");
    post("Fired clip at track", trackIdx, "slot", slotIdx, "\n");
    outlet(0, "fired", trackIdx, slotIdx);
  } else {
    post("No clip at track", trackIdx, "slot", slotIdx, "\n");
    outlet(0, "empty", trackIdx, slotIdx);
  }
}

function stopTrack(trackIdx) {
  var track = new LiveAPI(null, "live_set tracks " + trackIdx);
  track.call("stop_all_clips");
  post("Stopped all clips on track", trackIdx, "\n");
  outlet(0, "stopped", trackIdx);
}

function stopAll() {
  var api = new LiveAPI(null, "live_set");
  api.call("stop_all_clips_without_quantization");
  post("Stopped all clips\n");
  outlet(0, "stopped_all");
}
