// ============================================================
// TETRIS
// Complete Game + Music + Sound Effects
// ============================================================


// ============================================================
// CANVAS
// ============================================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const nextCanvas = document.getElementById("nextCanvas");
const nextCtx = nextCanvas.getContext("2d");

const holdCanvas = document.getElementById("holdCanvas");
const holdCtx = holdCanvas.getContext("2d");


// ============================================================
// GAME SETTINGS
// ============================================================

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

const BOARD_WIDTH = COLS * BLOCK_SIZE;
const BOARD_HEIGHT = ROWS * BLOCK_SIZE;


// ============================================================
// PIECES
// ============================================================

const PIECES = {

    I: {
        shape: [
            [1, 1, 1, 1]
        ],
        color: "#00ffff"
    },

    O: {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: "#ffff00"
    },

    T: {
        shape: [
            [0, 1, 0],
            [1, 1, 1]
        ],
        color: "#aa00ff"
    },

    S: {
        shape: [
            [0, 1, 1],
            [1, 1, 0]
        ],
        color: "#00ff00"
    },

    Z: {
        shape: [
            [1, 1, 0],
            [0, 1, 1]
        ],
        color: "#ff0033"
    },

    J: {
        shape: [
            [1, 0, 0],
            [1, 1, 1]
        ],
        color: "#0066ff"
    },

    L: {
        shape: [
            [0, 0, 1],
            [1, 1, 1]
        ],
        color: "#ff8800"
    }

};


// ============================================================
// GAME VARIABLES
// ============================================================

let board = [];

let currentPiece = null;
let nextPiece = null;
let holdPieceData = null;

let canHold = true;

let score = 0;
let lines = 0;
let level = 1;

let highScore =
    Number(localStorage.getItem("tetrisHighScore")) || 0;

let gameRunning = false;
let paused = false;
let gameOverState = false;

let dropCounter = 0;
let lastTime = 0;

let dropInterval = 1000;

let animationFrame = null;


// ============================================================
// LINE CLEAR
// ============================================================

let clearingRows = [];
let lineClearStart = 0;
let lineClearDuration = 450;
let lineClearActive = false;


// ============================================================
// COUNTDOWN
// ============================================================

let countdownActive = false;
let countdownStart = 0;
let countdownSoundStep = -1;


// ============================================================
// AUDIO
// ============================================================

let audioContext = null;

let musicEnabled = true;
let sfxEnabled = true;

let musicTimer = null;
let musicStep = 0;


// ============================================================
// AUDIO INITIALIZATION
// ============================================================

function ensureAudio() {

    if (!audioContext) {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContext) {
            console.warn("Web Audio API is not supported.");
            return false;
        }

        audioContext = new AudioContext();
    }


    // Chrome and other browsers can suspend
    // the audio context until user interaction.
    if (audioContext.state === "suspended") {
        audioContext.resume();
    }


    return true;
}


// ============================================================
// HIGH SCORE
// ============================================================

function updateHighScoreDisplay() {

    const menuHighScore =
        document.getElementById("menuHighScore");

    const highScoreDisplay =
        document.getElementById("highScore");

    const gameOverHighScore =
        document.getElementById("gameOverHighScore");


    if (menuHighScore) {
        menuHighScore.textContent = highScore;
    }

    if (highScoreDisplay) {
        highScoreDisplay.textContent = highScore;
    }

    if (gameOverHighScore) {
        gameOverHighScore.textContent = highScore;
    }
}


function saveHighScore() {

    localStorage.setItem(
        "tetrisHighScore",
        highScore
    );

    updateHighScoreDisplay();
}


function checkHighScore() {

    if (score > highScore) {

        highScore = score;

        saveHighScore();
    }
}


// ============================================================
// MUSIC
// ============================================================

function playNote(
    frequency,
    duration = 0.12,
    type = "square",
    volume = 0.035
) {

    if (!musicEnabled) {
        return;
    }

    if (!ensureAudio()) {
        return;
    }

    const oscillator =
        audioContext.createOscillator();

    const gain =
        audioContext.createGain();

    const now =
        audioContext.currentTime;

    oscillator.type = type;

    oscillator.frequency.setValueAtTime(
        frequency,
        now
    );


    gain.gain.setValueAtTime(
        0.001,
        now
    );

    gain.gain.exponentialRampToValueAtTime(
        volume,
        now + 0.01
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + duration
    );


    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(now);

    oscillator.stop(
        now + duration + 0.02
    );
}


function musicTick() {

    if (!musicEnabled) {
        return;
    }

    const melody = [
        261.63,
        329.63,
        392.00,
        329.63,
        293.66,
        349.23,
        440.00,
        349.23
    ];

    playNote(
        melody[musicStep % melody.length],
        0.14,
        "square",
        0.025
    );

    musicStep++;
}


function startMusic() {

    if (!ensureAudio()) {
        return;
    }

    if (!musicEnabled) {
        return;
    }

    stopMusic();

    musicStep = 0;

    musicTimer = setInterval(
        musicTick,
        300
    );
}


function stopMusic() {

    if (musicTimer) {

        clearInterval(musicTimer);

        musicTimer = null;
    }
}


function toggleMusic() {

    if (!ensureAudio()) {
        return;
    }

    musicEnabled = !musicEnabled;

    const musicButton =
        document.getElementById("musicButton");


    if (musicEnabled) {

        musicButton.textContent =
            "MUSIC: ON";

        startMusic();

    } else {

        musicButton.textContent =
            "MUSIC: OFF";

        stopMusic();
    }
}


// ============================================================
// SOUND EFFECT ENGINE
// ============================================================

function playSfxTone(
    frequency,
    duration = 0.1,
    type = "square",
    volume = 0.10,
    delay = 0,
    endFrequency = null
) {

    if (!sfxEnabled) {
        return;
    }

    if (!ensureAudio()) {
        return;
    }


    const oscillator =
        audioContext.createOscillator();

    const gain =
        audioContext.createGain();


    const startTime =
        audioContext.currentTime + delay;


    oscillator.type = type;


    oscillator.frequency.setValueAtTime(
        frequency,
        startTime
    );


    if (endFrequency !== null) {

        oscillator.frequency.exponentialRampToValueAtTime(
            Math.max(1, endFrequency),
            startTime + duration
        );
    }


    gain.gain.setValueAtTime(
        0.001,
        startTime
    );

    gain.gain.exponentialRampToValueAtTime(
        volume,
        startTime + 0.015
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        startTime + duration
    );


    oscillator.connect(gain);
    gain.connect(audioContext.destination);


    oscillator.start(startTime);

    oscillator.stop(
        startTime + duration + 0.03
    );
}


// ============================================================
// ROTATE SOUND
// ============================================================

function playRotateSfx() {

    playSfxTone(
        500,
        0.07,
        "square",
        0.09,
        0,
        750
    );
}


// ============================================================
// LAND SOUND
// ============================================================

function playLandSfx() {

    playSfxTone(
        130,
        0.14,
        "triangle",
        0.13,
        0,
        65
    );
}


// ============================================================
// HARD DROP SOUND
// ============================================================

function playHardDropSfx() {

    playSfxTone(
        280,
        0.10,
        "sawtooth",
        0.12,
        0,
        90
    );

    playSfxTone(
        100,
        0.16,
        "triangle",
        0.11,
        0.07,
        45
    );
}


// ============================================================
// HOLD SOUND
// ============================================================

function playHoldSfx() {

    playSfxTone(
        330,
        0.09,
        "square",
        0.10,
        0,
        520
    );

    playSfxTone(
        520,
        0.11,
        "square",
        0.09,
        0.09,
        700
    );
}


// ============================================================
// LINE CLEAR SOUND
// ============================================================

function playLineClearSfx(count) {

    if (!sfxEnabled) {
        return;
    }


    // 1 LINE
    if (count === 1) {

        playSfxTone(
            520,
            0.15,
            "square",
            0.11
        );

        return;
    }


    // 2 LINES
    if (count === 2) {

        playSfxTone(
            440,
            0.11,
            "square",
            0.10,
            0,
            520
        );

        playSfxTone(
            660,
            0.15,
            "square",
            0.11,
            0.10,
            800
        );

        return;
    }


    // 3 LINES
    if (count === 3) {

        playSfxTone(
            440,
            0.10,
            "square",
            0.10,
            0
        );

        playSfxTone(
            554,
            0.10,
            "square",
            0.10,
            0.10
        );

        playSfxTone(
            740,
            0.18,
            "square",
            0.12,
            0.20,
            950
        );

        return;
    }


    // 4 LINES — TETRIS
    if (count === 4) {

        playSfxTone(
            330,
            0.10,
            "square",
            0.10,
            0
        );

        playSfxTone(
            440,
            0.10,
            "square",
            0.10,
            0.09
        );

        playSfxTone(
            554,
            0.10,
            "square",
            0.11,
            0.18
        );

        playSfxTone(
            880,
            0.25,
            "square",
            0.14,
            0.27,
            1200
        );
    }
}


// ============================================================
// COUNTDOWN SOUND
// ============================================================

function playCountdownSfx(number) {

    if (number === 1) {

        playSfxTone(
            520,
            0.18,
            "square",
            0.12
        );

    } else {

        playSfxTone(
            440,
            0.15,
            "square",
            0.10
        );
    }
}


// ============================================================
// START SOUND
// ============================================================

function playStartSfx() {

    playSfxTone(
        523,
        0.13,
        "square",
        0.11,
        0
    );

    playSfxTone(
        659,
        0.13,
        "square",
        0.11,
        0.11
    );

    playSfxTone(
        784,
        0.22,
        "square",
        0.14,
        0.22,
        1000
    );
}


// ============================================================
// GAME OVER SOUND
// ============================================================

function playGameOverSfx() {

    playSfxTone(
        392,
        0.20,
        "square",
        0.10,
        0,
        330
    );

    playSfxTone(
        330,
        0.20,
        "square",
        0.10,
        0.18,
        262
    );

    playSfxTone(
        262,
        0.32,
        "triangle",
        0.12,
        0.36,
        130
    );
}


// ============================================================
// SFX TOGGLE
// ============================================================

function toggleSfx() {

    if (!ensureAudio()) {
        return;
    }

    sfxEnabled = !sfxEnabled;

    const sfxButton =
        document.getElementById("sfxButton");


    if (sfxButton) {

        sfxButton.textContent =
            sfxEnabled
                ? "SFX: ON"
                : "SFX: OFF";
    }


    // Confirmation sound when SFX
    // are turned back on.
    if (sfxEnabled) {

        playSfxTone(
            600,
            0.09,
            "square",
            0.10,
            0,
            850
        );
    }
}


// ============================================================
// CREATE BOARD
// ============================================================

function createBoard() {

    board = [];

    for (let row = 0; row < ROWS; row++) {

        board.push(
            new Array(COLS).fill(null)
        );
    }
}


// ============================================================
// CREATE PIECE
// ============================================================

function createPiece(type) {

    const data = PIECES[type];

    return {

        type: type,

        shape: data.shape.map(
            row => [...row]
        ),

        color: data.color,

        x: Math.floor(
            COLS / 2 -
            data.shape[0].length / 2
        ),

        y: 0
    };
}


// ============================================================
// RANDOM PIECE
// ============================================================

function randomPiece() {

    const types =
        Object.keys(PIECES);

    const type =
        types[
            Math.floor(
                Math.random() * types.length
            )
        ];

    return createPiece(type);
}


// ============================================================
// COLLISION
// ============================================================

function collision(
    piece,
    offsetX = 0,
    offsetY = 0
) {

    for (
        let y = 0;
        y < piece.shape.length;
        y++
    ) {

        for (
            let x = 0;
            x < piece.shape[y].length;
            x++
        ) {

            if (!piece.shape[y][x]) {
                continue;
            }

            const boardX =
                piece.x + x + offsetX;

            const boardY =
                piece.y + y + offsetY;


            if (
                boardX < 0 ||
                boardX >= COLS
            ) {
                return true;
            }


            if (boardY >= ROWS) {
                return true;
            }


            if (
                boardY >= 0 &&
                board[boardY][boardX]
            ) {
                return true;
            }
        }
    }

    return false;
}


// ============================================================
// MERGE PIECE
// ============================================================

function mergePiece() {

    for (
        let y = 0;
        y < currentPiece.shape.length;
        y++
    ) {

        for (
            let x = 0;
            x < currentPiece.shape[y].length;
            x++
        ) {

            if (!currentPiece.shape[y][x]) {
                continue;
            }

            const boardX =
                currentPiece.x + x;

            const boardY =
                currentPiece.y + y;


            if (
                boardY >= 0 &&
                boardY < ROWS &&
                boardX >= 0 &&
                boardX < COLS
            ) {

                board[boardY][boardX] =
                    currentPiece.color;
            }
        }
    }
}


// ============================================================
// ROTATE
// ============================================================

function rotatePiece() {

    const oldShape =
        currentPiece.shape.map(
            row => [...row]
        );

    const rows =
        currentPiece.shape.length;

    const cols =
        currentPiece.shape[0].length;

    const rotated = [];


    for (let x = 0; x < cols; x++) {

        const newRow = [];

        for (
            let y = rows - 1;
            y >= 0;
            y--
        ) {

            newRow.push(
                currentPiece.shape[y][x]
            );
        }

        rotated.push(newRow);
    }


    currentPiece.shape =
        rotated;


    if (collision(currentPiece)) {

        currentPiece.x--;

        if (collision(currentPiece)) {

            currentPiece.x += 2;

            if (collision(currentPiece)) {

                currentPiece.x--;

                currentPiece.shape =
                    oldShape;

                return;
            }
        }
    }


    playRotateSfx();
}


// ============================================================
// MOVE
// ============================================================

function movePiece(direction) {

    if (
        !gameRunning ||
        paused ||
        countdownActive ||
        lineClearActive
    ) {
        return;
    }


    if (
        !collision(
            currentPiece,
            direction,
            0
        )
    ) {

        currentPiece.x += direction;
    }

    // No movement sound.
}


// ============================================================
// SOFT DROP
// ============================================================


function dropPiece() {

    if (
        !gameRunning ||
        paused ||
        countdownActive ||
        lineClearActive
    ) {
        return;
    }

    if (
        !collision(
            currentPiece,
            0,
            1
        )
    ) {

        currentPiece.y++;

    } else {

        lockPiece(false);
    }

    dropCounter = 0;
}

// ============================================================
// LOCK PIECE
// ============================================================

function lockPiece(isHardDrop = false) {

    mergePiece();


    if (isHardDrop) {

        playHardDropSfx();

    } else {

        playLandSfx();
    }


    const completedRows =
        findCompletedRows();


    if (completedRows.length > 0) {

        startLineClear(
            completedRows
        );

    } else {

        spawnPiece();
    }
}


// ============================================================
// HARD DROP
// ============================================================

function hardDrop() {

    if (
        !gameRunning ||
        paused ||
        countdownActive ||
        lineClearActive
    ) {
        return;
    }


    let distance = 0;


    while (
        !collision(
            currentPiece,
            0,
            1
        )
    ) {

        currentPiece.y++;

        distance++;
    }


    score += distance * 2;

    checkHighScore();

    dropCounter = 0;

    lockPiece(true);
}


// ============================================================
// HOLD
// ============================================================

function holdPiece() {

    if (
        !gameRunning ||
        paused ||
        countdownActive ||
        lineClearActive ||
        !canHold
    ) {
        return;
    }


    playHoldSfx();


    if (!holdPieceData) {

        holdPieceData =
            createPiece(
                currentPiece.type
            );

        currentPiece =
            nextPiece;

        nextPiece =
            randomPiece();

    } else {

        const heldType =
            holdPieceData.type;

        holdPieceData =
            createPiece(
                currentPiece.type
            );

        currentPiece =
            createPiece(
                heldType
            );
    }


    currentPiece.x =
        Math.floor(
            COLS / 2 -
            currentPiece.shape[0].length / 2
        );

    currentPiece.y = 0;

    canHold = false;


    drawNextPiece();

    drawHoldPiece();
}


// ============================================================
// SPAWN PIECE
// ============================================================

function spawnPiece() {

    currentPiece =
        nextPiece;

    nextPiece =
        randomPiece();


    currentPiece.x =
        Math.floor(
            COLS / 2 -
            currentPiece.shape[0].length / 2
        );

    currentPiece.y = 0;

    canHold = true;


    drawNextPiece();

    drawHoldPiece();


    if (collision(currentPiece)) {

        gameOver();
    }
}


// ============================================================
// FIND COMPLETED ROWS
// ============================================================

function findCompletedRows() {

    const rows = [];


    for (let y = 0; y < ROWS; y++) {

        let complete = true;


        for (let x = 0; x < COLS; x++) {

            if (!board[y][x]) {

                complete = false;

                break;
            }
        }


        if (complete) {
            rows.push(y);
        }
    }


    return rows;
}


// ============================================================
// START LINE CLEAR
// ============================================================

function startLineClear(rows) {

    clearingRows = rows;

    lineClearStart =
        performance.now();

    lineClearActive = true;


    playLineClearSfx(
        rows.length
    );


    requestAnimationFrame(
        gameLoop
    );
}


// ============================================================
// FINISH LINE CLEAR
// ============================================================

function finishLineClear() {

    const count =
        clearingRows.length;


    const remainingRows =
        board.filter(
            (_, index) =>
                !clearingRows.includes(index)
        );


    while (
        remainingRows.length < ROWS
    ) {

        remainingRows.unshift(
            new Array(COLS).fill(null)
        );
    }


    board = remainingRows;


    if (count === 1) {
        score += 100 * level;
    }

    if (count === 2) {
        score += 300 * level;
    }

    if (count === 3) {
        score += 500 * level;
    }

    if (count === 4) {
        score += 800 * level;
    }


    lines += count;


    level =
        Math.floor(lines / 10) + 1;


    dropInterval =
        Math.max(
            100,
            1000 -
            (level - 1) * 80
        );


    checkHighScore();


    clearingRows = [];

    lineClearActive = false;


    spawnPiece();
}


function drawBlock(
    context,
    x,
    y,
    color,
    size = BLOCK_SIZE,
    alpha = 1
) {

    context.save();

    context.globalAlpha = alpha;

    // ========================================================
    // RAINBOW COLOR
    // ========================================================

    const hue = (Date.now() / 8 + x + y) % 360;

    const rainbowColor =
        `hsl(${hue}, 100%, 55%)`;

    // ========================================================
    // 3D BLOCK FACE
    // ========================================================

    context.fillStyle = rainbowColor;

    context.fillRect(
        x,
        y,
        size,
        size
    );

    // ========================================================
    // BRIGHT TOP EDGE
    // ========================================================

    context.fillStyle =
        "rgba(255,255,255,0.55)";

    context.beginPath();

    context.moveTo(
        x,
        y
    );

    context.lineTo(
        x + size,
        y
    );

    context.lineTo(
        x + size - 7,
        y + 7
    );

    context.lineTo(
        x + 7,
        y + 7
    );

    context.closePath();

    context.fill();

    // ========================================================
    // BRIGHT LEFT EDGE
    // ========================================================

    context.fillStyle =
        "rgba(255,255,255,0.35)";

    context.beginPath();

    context.moveTo(
        x,
        y
    );

    context.lineTo(
        x + 7,
        y + 7
    );

    context.lineTo(
        x + 7,
        y + size - 7
    );

    context.lineTo(
        x,
        y + size
    );

    context.closePath();

    context.fill();

    // ========================================================
    // DARK BOTTOM EDGE
    // ========================================================

    context.fillStyle =
        "rgba(0,0,0,0.40)";

    context.beginPath();

    context.moveTo(
        x,
        y + size
    );

    context.lineTo(
        x + size,
        y + size
    );

    context.lineTo(
        x + size - 7,
        y + size - 7
    );

    context.lineTo(
        x + 7,
        y + size - 7
    );

    context.closePath();

    context.fill();

    // ========================================================
    // DARK RIGHT EDGE
    // ========================================================

    context.fillStyle =
        "rgba(0,0,0,0.32)";

    context.beginPath();

    context.moveTo(
        x + size,
        y
    );

    context.lineTo(
        x + size,
        y + size
    );

    context.lineTo(
        x + size - 7,
        y + size - 7
    );

    context.lineTo(
        x + size - 7,
        y + 7
    );

    context.closePath();

    context.fill();

    // ========================================================
    // INNER FACE
    // ========================================================

    context.fillStyle = rainbowColor;

    context.fillRect(
        x + 7,
        y + 7,
        size - 14,
        size - 14
    );

    // ========================================================
    // SOFT INNER HIGHLIGHT
    // ========================================================

    context.strokeStyle =
        "rgba(255,255,255,0.30)";

    context.lineWidth = 2;

    context.strokeRect(
        x + 8,
        y + 8,
        size - 16,
        size - 16
    );

    // ========================================================
    // GLOW / OUTLINE
    // ========================================================

    context.shadowColor =
        rainbowColor;

    context.shadowBlur = 8;

    context.strokeStyle =
        "rgba(255,255,255,0.45)";

    context.lineWidth = 1;

    context.strokeRect(
        x + 1,
        y + 1,
        size - 2,
        size - 2
    );

    context.restore();
}

// ============================================================
// DRAW BOARD
// ============================================================

function drawBoard() {

    ctx.clearRect(
        0,
        0,
        BOARD_WIDTH,
        BOARD_HEIGHT
    );


    ctx.strokeStyle =
        "rgba(255,255,255,0.07)";

    ctx.lineWidth = 1;


    for (let x = 0; x <= COLS; x++) {

        ctx.beginPath();

        ctx.moveTo(
            x * BLOCK_SIZE,
            0
        );

        ctx.lineTo(
            x * BLOCK_SIZE,
            BOARD_HEIGHT
        );

        ctx.stroke();
    }


    for (let y = 0; y <= ROWS; y++) {

        ctx.beginPath();

        ctx.moveTo(
            0,
            y * BLOCK_SIZE
        );

        ctx.lineTo(
            BOARD_WIDTH,
            y * BLOCK_SIZE
        );

        ctx.stroke();
    }


    for (let y = 0; y < ROWS; y++) {

        for (let x = 0; x < COLS; x++) {

            if (board[y][x]) {

                drawBlock(
                    ctx,
                    x * BLOCK_SIZE,
                    y * BLOCK_SIZE,
                    board[y][x]
                );
            }
        }
    }


    if (
        currentPiece &&
        !gameOverState
    ) {

        for (
            let y = 0;
            y < currentPiece.shape.length;
            y++
        ) {

            for (
                let x = 0;
                x < currentPiece.shape[y].length;
                x++
            ) {

                if (
                    currentPiece.shape[y][x]
                ) {

                    drawBlock(
                        ctx,
                        (
                            currentPiece.x + x
                        ) * BLOCK_SIZE,
                        (
                            currentPiece.y + y
                        ) * BLOCK_SIZE,
                        currentPiece.color
                    );
                }
            }
        }
    }
}


// ============================================================
// DRAW NEXT PIECE
// ============================================================

function drawNextPiece() {

    nextCtx.clearRect(
        0,
        0,
        nextCanvas.width,
        nextCanvas.height
    );


    if (!nextPiece) {
        return;
    }


    const shape =
        nextPiece.shape;

    const size = 24;


    const width =
        shape[0].length * size;

    const height =
        shape.length * size;


    const offsetX =
        (nextCanvas.width - width) / 2;

    const offsetY =
        (nextCanvas.height - height) / 2;


    for (
        let y = 0;
        y < shape.length;
        y++
    ) {

        for (
            let x = 0;
            x < shape[y].length;
            x++
        ) {

            if (shape[y][x]) {

                drawBlock(
                    nextCtx,
                    offsetX + x * size,
                    offsetY + y * size,
                    nextPiece.color,
                    size
                );
            }
        }
    }
}


// ============================================================
// DRAW HOLD PIECE
// ============================================================

function drawHoldPiece() {

    holdCtx.clearRect(
        0,
        0,
        holdCanvas.width,
        holdCanvas.height
    );


    if (!holdPieceData) {
        return;
    }


    const shape =
        holdPieceData.shape;

    const size = 24;


    const width =
        shape[0].length * size;

    const height =
        shape.length * size;


    const offsetX =
        (holdCanvas.width - width) / 2;

    const offsetY =
        (holdCanvas.height - height) / 2;


    for (
        let y = 0;
        y < shape.length;
        y++
    ) {

        for (
            let x = 0;
            x < shape[y].length;
            x++
        ) {

            if (shape[y][x]) {

                drawBlock(
                    holdCtx,
                    offsetX + x * size,
                    offsetY + y * size,
                    holdPieceData.color,
                    size
                );
            }
        }
    }
}


// ============================================================
// COUNTDOWN DRAW
// ============================================================

function drawCountdown(now) {

    if (!countdownActive) {
        return;
    }


    const elapsed =
        now - countdownStart;


    let text = "";


    if (elapsed < 1000) {

        text = "3";

    } else if (elapsed < 2000) {

        text = "2";

    } else if (elapsed < 3000) {

        text = "1";

    } else if (elapsed < 4000) {

        text = "START!";
    }


    ctx.save();


    ctx.fillStyle =
        "rgba(0,0,0,0.45)";

    ctx.fillRect(
        0,
        0,
        BOARD_WIDTH,
        BOARD_HEIGHT
    );


    ctx.textAlign = "center";

    ctx.textBaseline = "middle";

    ctx.font =
        "bold 70px Arial";


    ctx.fillStyle = "white";

    ctx.shadowColor = "#00ffff";

    ctx.shadowBlur = 25;


    ctx.fillText(
        text,
        BOARD_WIDTH / 2,
        BOARD_HEIGHT / 2
    );


    ctx.restore();
}


// ============================================================
// LINE CLEAR ANIMATION
// ============================================================

function drawClearAnimation(now) {

    if (!lineClearActive) {
        return;
    }


    const elapsed =
        now - lineClearStart;


    const progress =
        Math.min(
            elapsed / lineClearDuration,
            1
        );


    for (
        const row of clearingRows
    ) {

        const alpha =
            Math.max(
                0,
                1 - progress
            );


        const flash =
            progress < 0.5
                ? 1
                : 0.6;


        ctx.save();


        ctx.globalAlpha =
            alpha * flash;


        ctx.fillStyle = "white";

        ctx.shadowColor = "white";

        ctx.shadowBlur = 25;


        ctx.fillRect(
            0,
            row * BLOCK_SIZE,
            BOARD_WIDTH,
            BLOCK_SIZE
        );


        ctx.restore();
    }
}


// ============================================================
// UPDATE STATS
// ============================================================

function updateStats() {

    document.getElementById("score")
        .textContent = score;

    document.getElementById("lines")
        .textContent = lines;

    document.getElementById("level")
        .textContent = level;

    document.getElementById("highScore")
        .textContent = highScore;
}


// ============================================================
// GAME LOOP
// ============================================================

function gameLoop(time = 0) {

    if (!gameRunning) {
        return;
    }


    const deltaTime =
        time - lastTime;

    lastTime = time;


    // ========================================================
    // COUNTDOWN
    // ========================================================

    if (countdownActive) {

        const elapsed =
            time - countdownStart;


        if (
            elapsed >= 0 &&
            elapsed < 1000 &&
            countdownSoundStep !== 3
        ) {

            countdownSoundStep = 3;

            playCountdownSfx(3);
        }


        if (
            elapsed >= 1000 &&
            elapsed < 2000 &&
            countdownSoundStep !== 2
        ) {

            countdownSoundStep = 2;

            playCountdownSfx(2);
        }


        if (
            elapsed >= 2000 &&
            elapsed < 3000 &&
            countdownSoundStep !== 1
        ) {

            countdownSoundStep = 1;

            playCountdownSfx(1);
        }


        if (
            elapsed >= 3000 &&
            elapsed < 4000 &&
            countdownSoundStep !== 0
        ) {

            countdownSoundStep = 0;

            playStartSfx();
        }


        if (elapsed >= 4000) {

            countdownActive = false;

            countdownSoundStep = -1;

            lastTime = time;
        }


        drawBoard();

        drawCountdown(time);


        animationFrame =
            requestAnimationFrame(gameLoop);

        return;
    }


    // ========================================================
    // PAUSE
    // ========================================================

    if (paused) {

        drawBoard();


        animationFrame =
            requestAnimationFrame(gameLoop);

        return;
    }


    // ========================================================
    // LINE CLEAR
    // ========================================================

    if (lineClearActive) {

        if (
            time - lineClearStart >=
            lineClearDuration
        ) {

            finishLineClear();

        } else {

            drawBoard();

            drawClearAnimation(time);
        }


        updateStats();


        animationFrame =
            requestAnimationFrame(gameLoop);

        return;
    }


    // ========================================================
    // NORMAL GAME
    // ========================================================

    dropCounter += deltaTime;


    if (dropCounter > dropInterval) {

        dropPiece();
    }


    drawBoard();

    updateStats();


    animationFrame =
        requestAnimationFrame(gameLoop);
}


// ============================================================
// START GAME
// ============================================================

function startGame() {

    // IMPORTANT:
    // This happens directly from the PLAY button click,
    // which allows Chrome to unlock audio.
    ensureAudio();


    stopMusic();


    createBoard();


    score = 0;
    lines = 0;
    level = 1;


    dropCounter = 0;

    dropInterval = 1000;


    currentPiece = null;

    nextPiece = null;

    holdPieceData = null;


    canHold = true;


    gameRunning = true;

    paused = false;

    gameOverState = false;


    lineClearActive = false;

    clearingRows = [];


    countdownActive = true;

    countdownStart =
        performance.now();

    countdownSoundStep = -1;


    document.getElementById("menu")
        .classList.add("hidden");


    document.getElementById("pauseScreen")
        .classList.add("hidden");


    document.getElementById("gameOverScreen")
        .classList.add("hidden");


    document.getElementById("gameScreen")
        .classList.remove("hidden");


    nextPiece =
        randomPiece();


    spawnPiece();


    updateStats();


    drawNextPiece();

    drawHoldPiece();


    lastTime =
        performance.now();


    if (musicEnabled) {
        startMusic();
    }


    if (animationFrame) {

        cancelAnimationFrame(
            animationFrame
        );
    }


    animationFrame =
        requestAnimationFrame(gameLoop);
}


// ============================================================
// PAUSE
// ============================================================

function togglePause() {

    if (
        !gameRunning ||
        gameOverState ||
        countdownActive ||
        lineClearActive
    ) {
        return;
    }


    paused = !paused;


    const pauseScreen =
        document.getElementById(
            "pauseScreen"
        );


    if (paused) {

        pauseScreen.classList.remove(
            "hidden"
        );

    } else {

        pauseScreen.classList.add(
            "hidden"
        );

        lastTime =
            performance.now();
    }


    // No pause/resume sound.
}


// ============================================================
// GAME OVER
// ============================================================

function gameOver() {

    if (gameOverState) {
        return;
    }


    gameOverState = true;

    gameRunning = false;


    stopMusic();


    playGameOverSfx();


    checkHighScore();


    document.getElementById(
        "finalScore"
    ).textContent = score;


    document.getElementById(
        "gameOverHighScore"
    ).textContent = highScore;


    document.getElementById(
        "gameOverScreen"
    ).classList.remove(
        "hidden"
    );
}


// ============================================================
// RETURN TO MENU
// ============================================================

function returnToMenu() {

    gameRunning = false;

    paused = false;

    gameOverState = false;

    countdownActive = false;

    lineClearActive = false;


    stopMusic();


    if (animationFrame) {

        cancelAnimationFrame(
            animationFrame
        );

        animationFrame = null;
    }


    document.getElementById(
        "gameScreen"
    ).classList.add("hidden");


    document.getElementById(
        "pauseScreen"
    ).classList.add("hidden");


    document.getElementById(
        "gameOverScreen"
    ).classList.add("hidden");


    document.getElementById(
        "menu"
    ).classList.remove("hidden");


    updateHighScoreDisplay();
}


// ============================================================
// RESET HIGH SCORE
// ============================================================

function resetHighScore() {

    highScore = 0;

    localStorage.removeItem(
        "tetrisHighScore"
    );

    updateHighScoreDisplay();
}


// ============================================================
// BUTTON EVENTS
// ============================================================

document.getElementById(
    "playButton"
).addEventListener(
    "click",
    startGame
);


document.getElementById(
    "pauseButton"
).addEventListener(
    "click",
    togglePause
);


document.getElementById(
    "resumeButton"
).addEventListener(
    "click",
    togglePause
);


document.getElementById(
    "pauseRestartButton"
).addEventListener(
    "click",
    startGame
);


document.getElementById(
    "pauseMenuButton"
).addEventListener(
    "click",
    returnToMenu
);


document.getElementById(
    "musicButton"
).addEventListener(
    "click",
    toggleMusic
);


document.getElementById(
    "sfxButton"
).addEventListener(
    "click",
    toggleSfx
);


document.getElementById(
    "menuButton"
).addEventListener(
    "click",
    returnToMenu
);


document.getElementById(
    "restartButton"
).addEventListener(
    "click",
    startGame
);


document.getElementById(
    "gameOverMenuButton"
).addEventListener(
    "click",
    returnToMenu
);


document.getElementById(
    "controlsButton"
).addEventListener(
    "click",
    () => {

        document.getElementById(
            "controls"
        ).classList.remove(
            "hidden"
        );
    }
);


document.getElementById(
    "backButton"
).addEventListener(
    "click",
    () => {

        document.getElementById(
            "controls"
        ).classList.add(
            "hidden"
        );
    }
);


// ============================================================
// KEYBOARD CONTROLS
// ============================================================

document.addEventListener(
    "keydown",
    event => {

        if (!gameRunning) {
            return;
        }


        // P = Pause
        if (
            event.key.toLowerCase() === "p"
        ) {

            togglePause();

            return;
        }


        // C = Hold
        if (
            event.key.toLowerCase() === "c"
        ) {

            holdPiece();

            return;
        }


        if (
            paused ||
            countdownActive ||
            lineClearActive
        ) {
            return;
        }


        // LEFT
        if (event.key === "ArrowLeft") {

            event.preventDefault();

            movePiece(-1);
        }


        // RIGHT
        else if (
            event.key === "ArrowRight"
        ) {

            event.preventDefault();

            movePiece(1);
        }


        // DOWN
        else if (
            event.key === "ArrowDown"
        ) {

            event.preventDefault();

            dropPiece();
        }


        // ROTATE
        else if (
            event.key === "ArrowUp"
        ) {

            event.preventDefault();

            rotatePiece();
        }


        // HARD DROP
        else if (
            event.code === "Space"
        ) {

            event.preventDefault();

            hardDrop();
        }
    }
);


// ============================================================
// INITIALIZE
// ============================================================

createBoard();

updateHighScoreDisplay();

updateStats();

drawBoard();

drawNextPiece();

drawHoldPiece();


const sfxButton =
    document.getElementById("sfxButton");

if (sfxButton) {

    sfxButton.textContent =
        "SFX: ON";
}


const musicButton =
    document.getElementById("musicButton");

if (musicButton) {

    musicButton.textContent =
        "MUSIC: ON";
}


/* =========================================
   MINI ARCADE - RETRO MUSIC SYSTEM
========================================= */

(() => {
    const musicButton = document.getElementById("arcadeMusicButton");

    if (!musicButton) return;

    let audioContext = null;
    let masterVolume = null;
    let musicTimer = null;
    let musicEnabled = false;
    let step = 0;

    // Retro melody notes. Zero means a rest.
    const melody = [
        659, 0, 784, 0, 988, 784, 659, 0,
        523, 0, 659, 0, 784, 659, 523, 0,
        587, 0, 698, 0, 880, 698, 587, 0,
        494, 0, 587, 0, 740, 587, 494, 0
    ];

    const bass = [
        131, 131, 165, 165,
        110, 110, 147, 147
    ];

    function playNote(frequency, duration, volume, type = "square") {
        if (!audioContext || !masterVolume || !frequency) return;

        const oscillator = audioContext.createOscillator();
        const noteVolume = audioContext.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(
            frequency,
            audioContext.currentTime
        );

        noteVolume.gain.setValueAtTime(
            0.0001,
            audioContext.currentTime
        );

        noteVolume.gain.exponentialRampToValueAtTime(
            volume,
            audioContext.currentTime + 0.015
        );

        noteVolume.gain.exponentialRampToValueAtTime(
            0.0001,
            audioContext.currentTime + duration
        );

        oscillator.connect(noteVolume);
        noteVolume.connect(masterVolume);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration + 0.02);

        oscillator.addEventListener("ended", () => {
            oscillator.disconnect();
            noteVolume.disconnect();
        }, { once: true });
    }

    function playMusicStep() {
        if (!musicEnabled || !audioContext) return;

        const melodyNote = melody[step % melody.length];

        if (melodyNote) {
            playNote(melodyNote, 0.14, 0.055, "square");
        }

        // Play a lower bass note every four steps.
        if (step % 4 === 0) {
            const bassNote = bass[
                Math.floor(step / 4) % bass.length
            ];

            playNote(bassNote, 0.28, 0.07, "triangle");
        }

        // Add a light retro accompaniment.
        if (step % 8 === 4) {
            playNote(330, 0.09, 0.025, "square");
        }

        step++;
    }

    async function startMusic() {
        if (musicEnabled) return;

        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) {
            musicButton.textContent = "🎵 MUSIC NOT SUPPORTED";
            return;
        }

        try {
            if (!audioContext || audioContext.state === "closed") {
                audioContext = new AudioContextClass();

                masterVolume = audioContext.createGain();
                masterVolume.gain.value = 0.55;
                masterVolume.connect(audioContext.destination);
            }

            await audioContext.resume();

            musicEnabled = true;
            step = 0;

            playMusicStep();
            musicTimer = setInterval(playMusicStep, 170);

            musicButton.textContent = "🎵 ARCADE MUSIC: ON";
        } catch (error) {
            console.error("Could not start arcade music:", error);
            musicEnabled = false;
            musicButton.textContent = "🎵 TAP TO TRY MUSIC";
        }
    }

    function stopMusic() {
        musicEnabled = false;

        if (musicTimer !== null) {
            clearInterval(musicTimer);
            musicTimer = null;
        }

        if (masterVolume && audioContext &&
            audioContext.state !== "closed") {
            masterVolume.gain.setTargetAtTime(
                0,
                audioContext.currentTime,
                0.04
            );
        }

        musicButton.textContent = "🎵 ARCADE MUSIC: OFF";
    }

    musicButton.addEventListener("click", async () => {
        if (musicEnabled) {
            stopMusic();
        } else {
            await startMusic();
        }
    });
})();