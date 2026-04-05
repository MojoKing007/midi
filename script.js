// ─── State ──────────────────────────────────────────────────────────────────
const chips = document.querySelectorAll('.chip');
const pads = document.querySelectorAll('.pad');
const bg = document.getElementById('bg');
const audioCache = {};

// ─── Load sounds for active chip into pads ──────────────────────────────────
function loadChipSounds(chip) {
    const sounds = chip.getAttribute('data-sounds').split(',');
    pads.forEach((pad, i) => {
        pad.setAttribute('data-sound', sounds[i] || '');
    });
    // Preload all
    sounds.forEach(src => {
        if (src && !audioCache[src]) {
            audioCache[src] = new Audio(src);
            audioCache[src].load();
        }
    });
}

// Init with first chip
loadChipSounds(document.querySelector('.chip.active'));

// ─── Chip switching ──────────────────────────────────────────────────────────
chips.forEach(chip => {
    chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        bg.style.backgroundImage = `url(${chip.getAttribute('data-img')})`;
        loadChipSounds(chip);
    });
});

// ─── Audio ───────────────────────────────────────────────────────────────────
function getAudio(src) {
    if (!audioCache[src]) {
        audioCache[src] = new Audio(src);
    }
    return audioCache[src];
}

// ─── Fire pad ────────────────────────────────────────────────────────────────
function firepad(pad) {
    if (typeof window._recordBeat === 'function') window._recordBeat(pad);

    const sound = pad.getAttribute('data-sound');
    if (sound) {
        const audio = getAudio(sound);
        audio.currentTime = 0;
        audio.play().catch(() => { });
    }

    pad.classList.add('active', 'fired');
    setTimeout(() => pad.classList.remove('active', 'fired'), 180);
}

// ─── Touch / click ───────────────────────────────────────────────────────────
pads.forEach(pad => {
    pad.addEventListener('pointerdown', e => {
        e.preventDefault();
        firepad(pad);
    });
});

// ─── Keyboard ────────────────────────────────────────────────────────────────
const keyMap = {};
pads.forEach(pad => {
    const k = pad.getAttribute('data-key');
    if (k) keyMap[k.toUpperCase()] = pad;
});

document.addEventListener('keydown', e => {
    if (e.repeat) return;
    const pad = keyMap[e.key.toUpperCase()];
    if (pad) firepad(pad);
});

// ─── Recording ───────────────────────────────────────────────────────────────
const recBtn = document.getElementById('recBtn');
const playBtn = document.getElementById('playBtn');
const clearBtn = document.getElementById('clearBtn');
const recTimer = document.getElementById('recTimer');
const recTray = document.getElementById('recTray');

let isRecording = false;
let isPlaying = false;
let recordStart = 0;
let recordedBeats = [];
let timerInterval = null;
let playTimeouts = [];

function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

recBtn.addEventListener('click', () => {
    if (isPlaying) stopPlayback();
    if (!isRecording) {
        isRecording = true;
        recordStart = performance.now();
        recordedBeats = [];
        recBtn.classList.add('recording');
        recTimer.classList.add('recording');
        recTimer.textContent = '0:00';
        recTray.classList.add('visible');
        playBtn.disabled = true;
        clearBtn.disabled = true;
        timerInterval = setInterval(() => {
            recTimer.textContent = formatTime(performance.now() - recordStart);
        }, 250);
    } else {
        stopRecording();
    }
});

function stopRecording() {
    isRecording = false;
    clearInterval(timerInterval);
    recBtn.classList.remove('recording');
    recTimer.classList.remove('recording');
    const lastTime = recordedBeats.length ? recordedBeats[recordedBeats.length - 1].time + 100 : 0;
    recTimer.textContent = formatTime(lastTime);
    playBtn.disabled = recordedBeats.length === 0;
    clearBtn.disabled = recordedBeats.length === 0;
}

playBtn.addEventListener('click', () => {
    if (isRecording) return;
    isPlaying ? stopPlayback() : startPlayback();
});

function startPlayback() {
    if (!recordedBeats.length) return;
    isPlaying = true;
    playBtn.classList.add('playing');
    playBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>`;
    recBtn.disabled = true;

    const duration = recordedBeats[recordedBeats.length - 1].time + 300;

    recordedBeats.forEach(beat => {
        const t = setTimeout(() => {
            const audio = getAudio(beat.sound);
            audio.currentTime = 0;
            audio.play().catch(() => { });
            beat.padEl.classList.add('active');
            setTimeout(() => beat.padEl.classList.remove('active'), 180);
        }, beat.time);
        playTimeouts.push(t);
    });

    playTimeouts.push(setTimeout(() => stopPlayback(), duration));
}

function stopPlayback() {
    isPlaying = false;
    playTimeouts.forEach(clearTimeout);
    playTimeouts = [];
    clearInterval(timerInterval);
    playBtn.classList.remove('playing');
    playBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><polygon points="6,4 20,12 6,20"/></svg>`;
    recBtn.disabled = false;
    const lastTime = recordedBeats.length ? recordedBeats[recordedBeats.length - 1].time + 300 : 0;
    recTimer.textContent = formatTime(lastTime);
}

clearBtn.addEventListener('click', () => {
    if (isPlaying) stopPlayback();
    recordedBeats = [];
    recTimer.textContent = '0:00';
    playBtn.disabled = true;
    clearBtn.disabled = true;
    recTray.classList.remove('visible');
});

window._recordBeat = function (pad) {
    if (!isRecording) return;
    recordedBeats.push({
        sound: pad.getAttribute('data-sound'),
        padEl: pad,
        time: performance.now() - recordStart
    });
};