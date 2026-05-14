(function initFreemixState() {
  const state = window.freemixState || {};

  state.selectedSource ??= null;
  state.transport ??= null;
  state.audioContext ??= null;
  state.webAudioDisabled ??= false;
  state.masterMuted ??= false;
  state.simpleMode ??= true;
  state.arrangementStepCount ??= 8;
  state.arrangementCopyMode ??= false;
  state.arrangementCopySourceStep ??= null;
  state.tracks ??= null;
  state.arrangement ??= null;
  state.videoLayout ??= "stack";
  state.trackSearchRequestCounter ??= 0;

  window.freemixState = state;
})();
