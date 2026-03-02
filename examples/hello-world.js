// @device midi-effect
// @inlet 0 "Bang to trigger"
// @outlet 0 "Hello message"

inlets = 1;
outlets = 1;

function bang() {
  post("Hello from js2max!\n");
  outlet(0, "hello", "world");
}

function msg_int(n) {
  post("Received integer:", n, "\n");
  outlet(0, n * 2);
}
