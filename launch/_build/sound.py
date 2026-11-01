# python3 _build/sound.py → assets/audio/score.wav (music + effects, one stereo track, 31.5 s)
# Written in code, not retrieved: every cue sits on the frame it belongs to. The cue times mirror
# _build/build.mjs (drop/home timings) and the answers come from ../site/public/data/results.json,
# so a re-run benchmark moves the sounds with the pictures.
import json, os
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
R = json.load(open(os.path.join(ROOT, "../site/public/data/results.json")))
P = R["parsers"]
SR, DUR = 48000, 31.5
N = int(SR * DUR)
rng = np.random.default_rng(7)

music = np.zeros((N, 2))
fx = np.zeros((N, 2))

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def t_(d): return np.arange(int(SR * d)) / SR
def lp(x, f, o=2): return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x)

def put(buf, at, x, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N: return
    x = x[: N - i] * gain
    a = min(len(x), 72); x = x.copy(); x[:a] *= np.linspace(0, 1, a)
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i : i + len(x), 0] += x * l * 1.414
    buf[i : i + len(x), 1] += x * r * 1.414

# ---------------------------------------------------------------- instruments
def pluck(m, d=0.9, bright=1.0):
    """soft marimba-ish pluck: fundamental + a quick 4th partial"""
    t = t_(d); f = hz(m)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 5.5)
    x += 0.35 * bright * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 28)
    x += 0.12 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 9)
    return x * np.minimum(1, t * 400)

def pad(ms, d, att=0.8, rel=1.2):
    t = t_(d)
    x = sum(np.sin(2 * np.pi * hz(m) * (1 + det) * t + ph)
            for m in ms for det, ph in ((-0.003, 0), (0.003, 1.3), (0, 2.1))) / (3 * len(ms))
    x = lp(x + 0.15 * np.sign(x) * x * x, 1800)
    env = np.minimum(1, t / att) * np.minimum(1, (d - t) / rel).clip(0)
    return x * env

def kick(g=1.0):
    t = t_(0.4)
    f = 45 + 80 * np.exp(-t * 28)
    return g * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)

def tick(f=3200, d=0.025):
    t = t_(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 260) + 0.25 * bp(rng.standard_normal(len(t)), 3000, 9000) * np.exp(-t * 400)

def sub(m, d):
    t = t_(d)
    return np.sin(2 * np.pi * hz(m) * t) * np.minimum(1, t * 60) * np.exp(-t * 2.2)

def sweep(d, up=True, lo=300, hi=6000):
    """filtered-noise air move; rises or falls (a state-variable band-pass glides, no block seams)"""
    t = t_(d); x = rng.standard_normal(len(t))
    p = t / d if up else 1 - t / d
    f = 2 * np.sin(np.pi * np.minimum(lo * (hi / lo) ** p, SR / 6) / SR)
    low = band = 0.0; out = np.empty_like(x); q = 0.35
    for n in range(len(x)):
        low += f[n] * band; high = x[n] - low - q * band; band += f[n] * high; out[n] = band
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    return lp(out, min(hi * 1.3, 12000), 4) * env * 0.35

def thud(m=38, d=0.35):
    t = t_(d)
    return np.sin(2 * np.pi * hz(m) * t) * np.exp(-t * 14) + 0.25 * lp(rng.standard_normal(len(t)), 400) * np.exp(-t * 30)

def reverb(x, secs=1.6, mix=0.2):
    n = int(SR * secs); t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)) * np.exp(-t * 4.2)[:, None]
    ir[:, 0] = lp(ir[:, 0], 5000); ir[:, 1] = lp(ir[:, 1], 5000)
    wet = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    wet /= np.max(np.abs(wet)) + 1e-9; wet *= np.max(np.abs(x))
    return x * (1 - mix) + wet * mix

# ---------------------------------------------------------------- the score (120 bpm: a beat is 0.5 s)
B = 0.5
# D major, a chord per two bars (4 s): Dmaj9, Bm9, Gmaj7(#11-ish), A6/9
CH = [[50, 57, 61, 64, 66], [47, 54, 57, 61, 62], [43, 50, 54, 57, 61], [45, 52, 57, 59, 64]]
ARP = [[74, 69, 73, 76, 78, 76, 73, 69], [71, 66, 69, 73, 74, 73, 69, 66],
       [67, 71, 74, 78, 79, 78, 74, 71], [69, 73, 76, 78, 81, 78, 76, 73]]

def chord_at(t): return int(t // 4) % 4

# pad under everything until the claim, then thin, then the final chord
for s in np.arange(0, 24, 4):
    c = CH[chord_at(s)]
    put(music, s, pad([m + 12 for m in c[:4]], 4.6, att=1.2 if s == 0 else 0.4, rel=0.8), 0.42)
put(music, 24, pad([62, 66, 69, 73], 3.2, att=0.3, rel=1.0), 0.24)          # D add9 thins out for the claim

# clock: from frame 0 a tick on every beat ("14:30 on a Wednesday"), the off-beats join at the drops
for k in range(int(25 / B)):
    t = k * B
    put(music, t, tick(3000 if k % 2 else 3400), 0.16 if t < 3 else 0.2, -0.3)
    if 3 <= t < 25: put(music, t + B / 2, tick(4200, 0.018), 0.08, 0.35)

# groove from the first drop: kick on 1 and 3, sub on the root, plucked arpeggio in eighths
for k in range(int(3 / B), int(25 / B)):
    t = k * B
    c = chord_at(t)
    if k % 2 == 0 and not (9.0 <= t < 11.0):                                 # the kick drops out under the 179-phrase rush
        put(music, t, kick(), 0.36)
    if k % 4 == 0: put(music, t, sub(CH[c][0] - 12, 1.9), 0.35)
    for e in range(2):
        tt = t + e * B / 2
        if 9.0 <= tt < 11.0: continue
        n = ARP[c][(k * 2 + e) % 8]
        put(music, tt, pluck(n, 0.7, 0.7), 0.11 if tt < 11 else 0.13, 0.25 if e else -0.25)

# the rush: sixteenth plucks climbing for two seconds, the clock doubles
for k in range(16):
    t = 9.0 + k * 0.125
    put(music, t, pluck(62 + [0, 4, 7, 9, 12, 16, 19, 21][k % 8] + (12 if k >= 8 else 0), 0.35, 1.0), 0.07 + k * 0.004, (-1) ** k * 0.4)
put(music, 9.0, sweep(2.0, True, 400, 7000), 0.05)

# into the board: a lift on the bar line
put(music, 18.9, sweep(1.1, True, 250, 8000), 0.09)
put(music, 20.0, kick(1.0), 0.5)

# the claim lands in near-silence; the end card resolves on the full chord
put(music, 27.75, pad([50, 57, 62, 66, 69, 76], 3.75, att=0.05, rel=2.6), 0.42)
put(music, 27.75, sub(38, 3.5), 0.55)
put(music, 27.75, kick(1.0), 0.45)
for k, n in enumerate([74, 78, 81, 86]):
    put(music, 27.75 + k * 0.09, pluck(n, 2.2, 1.0), 0.13, (k - 1.5) * 0.3)

# ---------------------------------------------------------------- effects, from the answers
cases = [c["text"] for c in R["cases"]]
START = np.datetime64("2026-10-19")
def day_of(a):
    if not a or len(a) < 10: return None
    d = int((np.datetime64(a[:10]) - START).astype(int))
    return d if 0 <= d < 35 else None
def phrase(t):
    i = cases.index(t)
    return [p["answers"][i] for p in P], [p["verdict"][i] for p in P]

def land(t, right, d):
    """an avatar sets down on a day: blue rings sing in key, red ones knock"""
    pan = ((d % 7) - 3) / 4 if d is not None else 0
    if right: put(fx, t, pluck(81 + [0, 4, 7, 12][int(t * 7) % 4], 0.6, 1.2), 0.22, pan)
    else: put(fx, t, thud(43, 0.25), 0.3, pan); put(fx, t, tick(1200, 0.03), 0.12, pan)

def fall(t, said_something):
    put(fx, t, sweep(0.7, False, 300, 3500), 0.12)
    if said_something: put(fx, t + 0.5, thud(36, 0.3), 0.2)

def drop(t0, text, only_dated):
    ans, ver = phrase(text); n = 0
    for i, a in enumerate(ans):
        if a is None and only_dated: continue
        t = t0 + n * 0.085; n += 1
        d = day_of(a)
        if d is None: fall(t, a is not None)
        else: land(t + 0.5, ver[i] == "ok", d)

def home(t0): put(fx, t0, sweep(0.6, True, 600, 5000), 0.08)

def typing(t0, text):
    d = min(0.9, 0.035 * len(text)); steps = len(text) + 2
    for k in range(len(text)):
        put(fx, t0 + d * k / steps, tick(2400 + (k % 3) * 300, 0.012), 0.07, 0.1)

# 0.8 s: the Friday column; 1.6 s: the two Fridays outline
for k in range(5): put(fx, 0.8 + k * 0.07, tick(2600 + k * 200, 0.02), 0.12)
put(fx, 1.6, pluck(81, 1.0, 1.2), 0.14, -0.2); put(fx, 1.62, pluck(85, 1.0, 1.2), 0.12, 0.2)

drop(3.0, "next Friday", False); home(9.1)
for k in range(14): put(fx, 9.2 + k * 0.12, tick(2000 + k * 140, 0.015), 0.1, (-1) ** k * 0.3)   # the counter to 180
typing(10.9, "4 days from tomorrow")
drop(11.0, "4 days from tomorrow", False); home(13.9)
typing(13.9, "Sun Microsystems was bought by Oracle")
drop(14.4, "Sun Microsystems was bought by Oracle", True)
for k, n in enumerate([74, 78, 81]): put(fx, 15.4 + k * 0.05, pluck(n, 1.2, 1.0), 0.13)           # the six who stayed home turn blue
home(16.9)
typing(16.9, "Room 1104")
ans, ver = phrase("Room 1104"); hx = 0
for i, a in enumerate(ans):
    if a is None: continue
    t = 17.4 + hx * 0.09; hx += 1
    land(t + 0.5, False, day_of(a) if not a.startswith("1104") else 6)
put(fx, 17.9, sweep(0.45, False, 500, 4000), 0.1)                                                 # the year rolls over
t = t_(0.9); put(fx, 18.3, (np.sin(2*np.pi*hz(56)*t) + np.sin(2*np.pi*hz(57)*t)) * np.exp(-t*4) * 0.5, 0.16)  # 1104, a semitone off
for k, n in enumerate([74, 78]): put(fx, 18.2 + k * 0.05, pluck(n, 0.9, 1.0), 0.1)
put(fx, 19.35, sweep(0.7, True, 300, 6000), 0.14)                                                 # everyone to the board

# board (scene starts at 20 s)
for i in range(len(P)): put(fx, 20.25 + i * 0.05, tick(1800 + i * 90, 0.02), 0.07, -0.5 + i * 0.1)
TOP = str(P[0]["right"])
for k, d in enumerate(TOP):                                                                        # each digit clicks past on its strip
    t0, T = 20.35 + k * 0.12, 1.3
    for s in range(1, int(d) + 1):
        # expo.out: progress 1 - 2^(-10 t / T) crosses s/d at:
        x = s / int(d) * (1 - 2 ** -10)
        put(fx, t0 + -np.log2(1 - x) * T / 10, tick(2800 + k * 400, 0.018), 0.13, (k - 1) * 0.4)
put(fx, 23.1, thud(31, 0.6), 0.45); put(fx, 23.1, sweep(0.5, False, 200, 2500), 0.08)            # the 80% line drops
for i in range(len(P)): put(fx, 24.9 + i * 0.04, thud(45 - (i % 3), 0.16), 0.12, -0.5 + i * 0.1) # wrong answers append in red

# end card (27 s)
put(fx, 27.0, sweep(0.9, True, 200, 3000), 0.12)                                                  # the floor rises
for k in range(8): put(fx, 27.75 + k * 0.06, tick(1600 + k * 260, 0.02), 0.09)                    # the name steps through the dither
put(fx, 28.9, pluck(86, 0.5, 1.4), 0.16)                                                          # the button

# ---------------------------------------------------------------- mix
mix = reverb(music, 1.8, 0.22) + reverb(fx, 1.0, 0.12)
t = np.arange(N) / SR
mix *= np.clip((DUR - t) / 1.2, 0, 1)[:, None] ** 1.5      # out by the last frame
mix *= np.clip(t / 0.03, 0, 1)[:, None]
peak = np.max(np.abs(mix)); mix *= 0.89 / peak             # -1 dBFS peak; loudness is set by ffmpeg afterwards
out = os.path.join(ROOT, "assets/audio/score.wav")
os.makedirs(os.path.dirname(out), exist_ok=True)
import soundfile as sf, subprocess, tempfile
raw = os.path.join(tempfile.gettempdir(), "nf-score-raw.wav")
sf.write(raw, mix.astype(np.float32), SR, subtype="PCM_24")
# master: gentle glue, then -15 LUFS integrated, true peak under -1 dB
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-af",
    "acompressor=threshold=-20dB:ratio=2.5:attack=8:release=180:makeup=2,loudnorm=I=-15:TP=-1.2:LRA=9",
    "-ar", str(SR), "-c:a", "pcm_s24le", out], check=True)
print("wrote", out)
