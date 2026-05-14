(function initFreemixAudioAPI() {
  const audioApi = window.freemixAudio || {};

  audioApi.loadTrackSource = (...args) => {
    if (typeof window.loadTrackSource === "function") {
      return window.loadTrackSource(...args);
    }
    return Promise.resolve(undefined);
  };

  audioApi.triggerTrack = (...args) => {
    if (typeof window.triggerTrack === "function") {
      return window.triggerTrack(...args);
    }
    return undefined;
  };

  audioApi.setupTrackAudio = (...args) => {
    if (typeof window.setupTrackAudio === "function") {
      return window.setupTrackAudio(...args);
    }
    return false;
  };

  audioApi.playMetronome = (...args) => {
    if (typeof window.playMetronome === "function") {
      return window.playMetronome(...args);
    }
    return undefined;
  };

  audioApi.ensureAudioContext = (...args) => {
    if (typeof window.ensureAudioContext === "function") {
      return window.ensureAudioContext(...args);
    }
    return Promise.resolve();
  };

  window.freemixAudio = audioApi;
})();
