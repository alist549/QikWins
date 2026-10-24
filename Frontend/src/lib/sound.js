import { useEffect, useSyncExternalStore } from "react";

// Sound effects and background music, made in the browser with Tone.js.
// Every sound is synthesised from code, so there are no audio files to
// license. Browsers only allow sound after a tap, so nothing plays until
// the player's first tap; the speaker button in the header mutes it all.

const KEY = "qikwins.sound";
let enabled = readPref();
let Tone = null;
let loading = null;
let kit = null;
let track = null; // the track the current screen wants
let playing = null; // the track that is actually looping
const listeners = new Set();

function readPref() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

function emit() {
  listeners.forEach((fn) => fn());
}

async function load() {
  if (Tone) return Tone;
  if (!loading) {
    loading = import("tone").then(async (mod) => {
      await mod.start();
      Tone = mod;
      kit = buildKit(mod);
      return mod;
    });
  }
  return loading;
}

function buildKit(T) {
  const master = new T.Volume(-6).toDestination();
  const sfxBus = new T.Volume(0).connect(master);
  const musicBus = new T.Volume(-16).connect(master);
  const reverb = new T.Reverb({ decay: 2.4, wet: 0.25 }).connect(sfxBus);

  const blip = new T.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.05 } }).connect(sfxBus);
  const bell = new T.PolySynth(T.Synth, { oscillator: { type: "sine" }, envelope: { attack: 0.005, decay: 0.4, sustain: 0.1, release: 0.8 } }).connect(reverb);
  const brass = new T.PolySynth(T.Synth, { oscillator: { type: "sawtooth" }, envelope: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.6 } });
  const brassFilter = new T.Filter(2200, "lowpass").connect(reverb);
  brass.connect(brassFilter);
  brass.volume.value = -10;
  const sad = new T.Synth({ oscillator: { type: "square" }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.4 } }).connect(sfxBus);
  sad.volume.value = -14;
  const noise = new T.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.05, sustain: 0 } }).connect(sfxBus);
  noise.volume.value = -18;
  const whooshFilter = new T.AutoFilter({ frequency: 2, baseFrequency: 300, octaves: 4 }).connect(sfxBus).start();
  const whoosh = new T.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.15, decay: 0.4, sustain: 0 } }).connect(whooshFilter);
  whoosh.volume.value = -14;
  const thud = new T.MembraneSynth({ pitchDecay: 0.03, octaves: 6 }).connect(sfxBus);
  thud.volume.value = -6;

  // Music: two loops on the shared transport.
  const kick = new T.MembraneSynth({ pitchDecay: 0.04, octaves: 7, envelope: { attack: 0.001, decay: 0.3, sustain: 0 } }).connect(musicBus);
  const hat = new T.MetalSynth({ envelope: { attack: 0.001, decay: 0.05, release: 0.01 }, harmonicity: 5.1, resonance: 4000, octaves: 1.5 }).connect(musicBus);
  hat.volume.value = -24;
  const bass = new T.MonoSynth({ oscillator: { type: "square" }, filter: { Q: 2, type: "lowpass" }, filterEnvelope: { attack: 0.01, decay: 0.15, sustain: 0.2, baseFrequency: 120, octaves: 2.5 }, envelope: { attack: 0.005, decay: 0.2, sustain: 0.3, release: 0.1 } }).connect(musicBus);
  bass.volume.value = -8;
  const keys = new T.PolySynth(T.Synth, { oscillator: { type: "fatsine", spread: 20 }, envelope: { attack: 0.02, decay: 0.3, sustain: 0.3, release: 1.2 } });
  const keysVerb = new T.Reverb({ decay: 3, wet: 0.35 }).connect(musicBus);
  keys.connect(keysVerb);
  keys.volume.value = -14;
  const arp = new T.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.005, decay: 0.12, sustain: 0, release: 0.1 } });
  const delay = new T.FeedbackDelay("8n.", 0.3).connect(musicBus);
  arp.connect(delay);
  arp.volume.value = -16;

  // Lobby: warm, laid-back groove in A minor.
  const LOBBY_CHORDS = [
    ["A3", "C4", "E4", "G4"],
    ["F3", "A3", "C4", "E4"],
    ["C4", "E4", "G4", "B4"],
    ["G3", "B3", "D4", "F#4"],
  ];
  const LOBBY_BASS = ["A1", "F1", "C2", "G1"];
  const lobby = [
    new T.Loop((time) => kick.triggerAttackRelease("C1", "8n", time), "4n"),
    new T.Loop((time) => hat.triggerAttackRelease("32n", time + T.Time("8n").toSeconds()), "4n"),
    new T.Loop((time) => {
      const bar = Math.floor(T.getTransport().ticks / T.Time("1m").toTicks()) % 4;
      keys.triggerAttackRelease(LOBBY_CHORDS[bar], "2n", time);
      bass.triggerAttackRelease(LOBBY_BASS[bar], "8n", time);
      bass.triggerAttackRelease(LOBBY_BASS[bar], "16n", time + T.Time("4n.").toSeconds());
    }, "1m"),
  ];

  // In game: faster, brighter and a little tense.
  const ARP = ["E4", "G4", "B4", "D5", "B4", "G4", "A4", "C5"];
  const GAME_BASS = ["E2", "E2", "G2", "A2"];
  let step = 0;
  const game = [
    new T.Loop((time) => kick.triggerAttackRelease("C1", "8n", time), "4n"),
    new T.Loop((time) => hat.triggerAttackRelease("32n", time), "8n"),
    new T.Loop((time) => {
      arp.triggerAttackRelease(ARP[step % ARP.length], "16n", time);
      step += 1;
    }, "8n"),
    new T.Loop((time) => {
      const bar = Math.floor(T.getTransport().ticks / T.Time("1m").toTicks()) % 4;
      for (let i = 0; i < 4; i++) bass.triggerAttackRelease(GAME_BASS[bar], "16n", time + i * T.Time("4n").toSeconds());
    }, "1m"),
  ];

  const tracks = { lobby: { bpm: 96, loops: lobby }, game: { bpm: 124, loops: game } };

  const at = (offset = 0) => T.now() + offset;
  const sfx = {
    click: () => blip.triggerAttackRelease("C6", "32n", at()),
    chip: () => {
      noise.triggerAttackRelease("32n", at());
      blip.triggerAttackRelease("G5", "32n", at(0.01));
    },
    join: () => bell.triggerAttackRelease(["C5", "E5", "G5"], "8n", at()),
    tick: () => blip.triggerAttackRelease("A5", "64n", at()),
    countdown: () => blip.triggerAttackRelease("E6", "32n", at()),
    spinTick: () => noise.triggerAttackRelease("64n", at()),
    roll: () => {
      for (let i = 0; i < 6; i++) noise.triggerAttackRelease("64n", at(i * 0.05 + Math.random() * 0.02));
      thud.triggerAttackRelease("G2", "16n", at(0.32));
    },
    whoosh: () => whoosh.triggerAttackRelease("4n", at()),
    hit: () => thud.triggerAttackRelease("C2", "8n", at()),
    reveal: () => {
      thud.triggerAttackRelease("C2", "8n", at());
      bell.triggerAttackRelease(["G4", "D5"], "8n", at(0.05));
    },
    win: () => {
      ["C5", "E5", "G5", "C6"].forEach((n, i) => bell.triggerAttackRelease(n, "8n", at(i * 0.09)));
      brass.triggerAttackRelease(["C4", "E4", "G4"], "4n", at(0.36));
    },
    bigWin: () => {
      ["C5", "E5", "G5", "C6", "E6", "G6"].forEach((n, i) => bell.triggerAttackRelease(n, "16n", at(i * 0.07)));
      brass.triggerAttackRelease(["C4", "E4", "G4", "C5"], "2n", at(0.45));
      for (let i = 0; i < 8; i++) noise.triggerAttackRelease("64n", at(0.5 + i * 0.06));
    },
    lose: () => {
      sad.triggerAttackRelease("E3", "8n", at());
      sad.triggerAttackRelease("C3", "4n", at(0.22));
    },
  };

  return { T, sfx, tracks, musicBus };
}

function syncMusic() {
  if (!kit) return;
  const T = kit.T;
  const want = enabled ? track : null;
  if (want === playing) return;
  const transport = T.getTransport();
  if (playing) kit.tracks[playing].loops.forEach((l) => l.stop());
  playing = want;
  if (!want) {
    transport.pause();
    return;
  }
  transport.bpm.value = kit.tracks[want].bpm;
  kit.tracks[want].loops.forEach((l) => l.start(0));
  if (transport.state !== "started") transport.start("+0.05");
}

// Plays a sound effect (no-op while muted or before the first tap).
export function sfx(name) {
  if (!enabled || !kit) return;
  try {
    kit.sfx[name]?.();
  } catch {
    /* overlapping triggers can throw on some browsers; skip that one */
  }
}

export function setTrack(name) {
  track = name;
  syncMusic();
}

export function setSoundEnabled(value) {
  enabled = value;
  try {
    localStorage.setItem(KEY, value ? "on" : "off");
  } catch {
    /* private mode */
  }
  if (value) load().then(syncMusic).catch(() => {});
  else syncMusic();
  emit();
}

export function soundEnabled() {
  return enabled;
}

// The first tap anywhere unlocks audio (browsers require a gesture).
function unlock() {
  window.removeEventListener("pointerdown", unlock);
  window.removeEventListener("keydown", unlock);
  if (enabled) load().then(syncMusic).catch(() => {});
}
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

export function useSoundEnabled() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => enabled
  );
}

// A screen's background track, for as long as the screen is open.
export function useTrack(name) {
  useEffect(() => {
    setTrack(name);
  }, [name]);
}

// Plays `name` whenever `key` changes to a truthy value.
export function useSfxOn(key, name) {
  useEffect(() => {
    if (key) sfx(name);
  }, [key, name]);
}

// Ticks through the last few seconds of a countdown.
export function useCountdownTicks(seconds, from = 3) {
  useEffect(() => {
    if (seconds > 0 && seconds <= from) sfx("countdown");
  }, [seconds, from]);
}
