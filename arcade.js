
"use strict";

document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // ELEMENTS
    // =====================================

    const arcadeScreen = document.getElementById("arcadeScreen");
    const arcadeMenu = document.getElementById("arcadeMenu");
    const gameArea = document.getElementById("arcadeGameArea");
    const canvas = document.getElementById("arcadeCanvas");
    const ctx = canvas.getContext("2d");

    const title = document.getElementById("arcadeGameTitle");
    const instructions = document.getElementById("arcadeInstructions");
    const status = document.getElementById("arcadeStatus");

    const moreGamesButton = document.getElementById("moreGamesButton");
    const homeButton = document.getElementById("arcadeHomeButton");
    const backButton = document.getElementById("arcadeBackButton");
    const restartButton = document.getElementById("arcadeRestartButton");

    const W = canvas.width;
    const H = canvas.height;

    // All arcade state stays separate from Tetris.
    let mode = "";
    let running = false;
    let lastTime = 0;
    let accumulator = 0;
    let animationId = null;
    let score = 0;

    let snake;
    let food;
    let direction;
    let nextDirection;

    let player;
    let aliens;
    let bullets;
    let alienDirection;

    let paddle;
    let ball;
    let bricks;

    let pongBall;
    let leftPaddle;
    let rightPaddle;
    let pongScores;

    // =====================================
    // MENU NAVIGATION
    // =====================================

    moreGamesButton.addEventListener("click", openArcade);

    homeButton.addEventListener("click", closeArcade);
    backButton.addEventListener("click", showGameMenu);
    restartButton.addEventListener("click", startCurrentGame);

    function openArcade() {
        running = false;

        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }

        document.getElementById("menu").classList.add("hidden");
        document.getElementById("gameScreen").classList.add("hidden");

        document.getElementById("pauseScreen")?.classList.add("hidden");
        document.getElementById("gameOverScreen")?.classList.add("hidden");

        arcadeScreen.classList.remove("hidden");
        showGameMenu();
    }

    function closeArcade() {
        stopGame();

        arcadeScreen.classList.add("hidden");
        document.getElementById("gameScreen").classList.add("hidden");
        document.getElementById("menu").classList.remove("hidden");
    }

    function showGameMenu() {
        stopGame();

        gameArea.classList.add("hidden");
        arcadeMenu.classList.remove("hidden");
        status.textContent = "Choose a game to play!";
    }

    document.querySelectorAll(".arcadeGameButton").forEach(button => {
        button.addEventListener("click", () => {
            mode = button.dataset.game;

            arcadeMenu.classList.add("hidden");
            gameArea.classList.remove("hidden");

            startCurrentGame();
        });
    });

    function stopGame() {
        running = false;

        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }

    // =====================================
    // GAME START / RESTART
    // =====================================

    function startCurrentGame() {
        stopGame();

        score = 0;
        accumulator = 0;
        lastTime = 0;

        ctx.clearRect(0, 0, W, H);

        if (mode === "snake") {
            title.textContent = "🐍 Snake";
            instructions.textContent =
                "Arrow keys or WASD to move. Eat food and avoid collisions.";
            initSnake();

        } else if (mode === "invaders") {
            title.textContent = "👾 Space Invaders";
            instructions.textContent =
                "Left/right arrows or A/D to move. Space to shoot.";
            initInvaders();

        } else if (mode === "breakout") {
            title.textContent = "🧱 Brick Breaker";
            instructions.textContent =
                "Move with the mouse or arrow keys. Break all the bricks.";
            initBreakout();

        } else if (mode === "pong") {
            title.textContent = "🏓 Pong";
            instructions.textContent =
                "Use W/S or the up/down arrows. Beat the computer to 5 points.";
            initPong();

        } else {
            return;
        }

        status.textContent = "Score: 0";
        running = true;
        animationId = requestAnimationFrame(tick);
    }

    function endGame(message) {
        running = false;
        status.textContent = message + " Final score: " + score;
    }

    // =====================================
    // SNAKE
    // =====================================

    const CELL = 20;
    const GRID_W = W / CELL;
    const GRID_H = H / CELL;

    function initSnake() {
        snake = [
            { x: 7, y: 10 },
            { x: 6, y: 10 },
            { x: 5, y: 10 }
        ];

        direction = { x: 1, y: 0 };
        nextDirection = { x: 1, y: 0 };

        food = newFood();
        drawSnake();
    }

    function newFood() {
        let spot;

        do {
            spot = {
                x: Math.floor(Math.random() * GRID_W),
                y: Math.floor(Math.random() * GRID_H)
            };
        } while (snake.some(part =>
            part.x === spot.x && part.y === spot.y
        ));

        return spot;
    }

    function updateSnake() {
        direction = nextDirection;

        const head = {
            x: snake[0].x + direction.x,
            y: snake[0].y + direction.y
        };

        const eating = head.x === food.x && head.y === food.y;

        const body = eating ? snake : snake.slice(0, -1);

        if (
            head.x < 0 || head.x >= GRID_W ||
            head.y < 0 || head.y >= GRID_H ||
            body.some(part => part.x === head.x && part.y === head.y)
        ) {
            endGame("Game over!");
            return;
        }

        snake.unshift(head);

        if (eating) {
            score += 10;

            if (snake.length === GRID_W * GRID_H) {
                drawSnake();
                endGame("You filled the board! You win!");
                return;
            }

            food = newFood();
        } else {
            snake.pop();
        }

        drawSnake();
    }

    function drawSnake() {
        clearCanvas();

        ctx.fillStyle = "#ef4444";
        ctx.fillRect(food.x * CELL, food.y * CELL, CELL - 2, CELL - 2);

        snake.forEach((part, index) => {
            ctx.fillStyle = index === 0 ? "#86efac" : "#22c55e";
            ctx.fillRect(
                part.x * CELL,
                part.y * CELL,
                CELL - 2,
                CELL - 2
            );
        });
    }

    // =====================================
    // SPACE INVADERS
    // =====================================

    function initInvaders() {
        player = { x: W / 2 - 20, y: H - 42, w: 40, h: 16 };
        aliens = [];
        bullets = [];
        alienDirection = 1;

        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 9; col++) {
                aliens.push({
                    x: 35 + col * 58,
                    y: 35 + row * 36,
                    w: 28,
                    h: 20
                });
            }
        }

        drawInvaders();
    }

    function updateInvaders(dt) {
        if (keys.ArrowLeft || keys.a) {
            player.x -= 260 * dt;
        }

        if (keys.ArrowRight || keys.d) {
            player.x += 260 * dt;
        }

        player.x = Math.max(0, Math.min(W - player.w, player.x));

        if (keys[" "] && !spaceWasDown) {
            bullets.push({
                x: player.x + player.w / 2 - 2,
                y: player.y,
                w: 4,
                h: 12
            });
        }

        spaceWasDown = Boolean(keys[" "]);

        const speed = 35 + (36 - aliens.length) * 2;
        let hitEdge = false;

        for (const alien of aliens) {
            alien.x += alienDirection * speed * dt;

            if (alien.x < 4 || alien.x + alien.w > W - 4) {
                hitEdge = true;
            }
        }

        if (hitEdge) {
            alienDirection *= -1;

            for (const alien of aliens) {
                alien.y += 14;

                if (alien.y + alien.h >= player.y) {
                    drawInvaders();
                    endGame("The aliens reached your ship!");
                    return;
                }
            }
        }

        for (const bullet of bullets) {
            bullet.y -= 330 * dt;
        }

        bullets = bullets.filter(bullet => {
            if (bullet.y + bullet.h < 0) return false;

            const hit = aliens.findIndex(alien =>
                bullet.x < alien.x + alien.w &&
                bullet.x + bullet.w > alien.x &&
                bullet.y < alien.y + alien.h &&
                bullet.y + bullet.h > alien.y
            );

            if (hit !== -1) {
                aliens.splice(hit, 1);
                score += 10;
                return false;
            }

            return true;
        });

        if (aliens.length === 0) {
            drawInvaders();
            endGame("You defeated all the aliens!");
            return;
        }

        drawInvaders();
    }

    function drawInvaders() {
        clearCanvas();

        ctx.fillStyle = "#a78bfa";
        aliens.forEach(alien => {
            ctx.fillRect(alien.x, alien.y, alien.w, alien.h);
            ctx.fillRect(alien.x + 5, alien.y - 5, 5, 5);
            ctx.fillRect(alien.x + 18, alien.y - 5, 5, 5);
        });

        ctx.fillStyle = "#67e8f9";
        ctx.fillRect(player.x, player.y, player.w, player.h);
        ctx.fillRect(player.x + 15, player.y - 8, 10, 8);

        ctx.fillStyle = "#facc15";
        bullets.forEach(bullet => {
            ctx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h);
        });
    }

    // =====================================
    // BRICK BREAKER
    // =====================================

    function initBreakout() {
        paddle = { x: W / 2 - 48, y: H - 28, w: 96, h: 12 };

        ball = {
            x: W / 2,
            y: H - 50,
            r: 7,
            vx: 180,
            vy: -230
        };

        bricks = [];

        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 10; col++) {
                bricks.push({
                    x: 13 + col * 58,
                    y: 35 + row * 25,
                    w: 52,
                    h: 17,
                    color: ["#f87171", "#fb923c", "#facc15",
                            "#4ade80", "#60a5fa"][row]
                });
            }
        }

        drawBreakout();
    }

    function updateBreakout(dt) {
        if (keys.ArrowLeft || keys.a) paddle.x -= 340 * dt;
        if (keys.ArrowRight || keys.d) paddle.x += 340 * dt;

        paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        if (ball.x - ball.r < 0 || ball.x + ball.r > W) {
            ball.vx *= -1;
            ball.x = Math.max(ball.r, Math.min(W - ball.r, ball.x));
        }

        if (ball.y - ball.r < 0) {
            ball.vy = Math.abs(ball.vy);
        }

        if (
            ball.vy > 0 &&
            ball.y + ball.r >= paddle.y &&
            ball.y - ball.r <= paddle.y + paddle.h &&
            ball.x >= paddle.x &&
            ball.x <= paddle.x + paddle.w
        ) {
            const hitPosition =
                (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);

            ball.vx = hitPosition * 260;
            ball.vy = -Math.max(180, Math.abs(ball.vy));
            ball.y = paddle.y - ball.r;
        }

        for (let i = bricks.length - 1; i >= 0; i--) {
            const brick = bricks[i];

            if (
                ball.x + ball.r > brick.x &&
                ball.x - ball.r < brick.x + brick.w &&
                ball.y + ball.r > brick.y &&
                ball.y - ball.r < brick.y + brick.h
            ) {
                bricks.splice(i, 1);
                ball.vy *= -1;
                score += 10;
                break;
            }
        }

        if (bricks.length === 0) {
            drawBreakout();
            endGame("You cleared every brick!");
            return;
        }

        if (ball.y - ball.r > H) {
            drawBreakout();
            endGame("The ball fell!");
            return;
        }

        drawBreakout();
    }

    function drawBreakout() {
        clearCanvas();

        bricks.forEach(brick => {
            ctx.fillStyle = brick.color;
            ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
        });

        ctx.fillStyle = "#60a5fa";
        ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fillStyle = "#f8fafc";
        ctx.fill();
    }

    // =====================================
    // PONG
    // =====================================

    function initPong() {
        leftPaddle = { x: 18, y: H / 2 - 45, w: 12, h: 90 };
        rightPaddle = { x: W - 30, y: H / 2 - 45, w: 12, h: 90 };

        pongScores = { player: 0, computer: 0 };

        resetPongBall();
        drawPong();
    }

    function resetPongBall() {
        pongBall = {
            x: W / 2,
            y: H / 2,
            vx: Math.random() < 0.5 ? -230 : 230,
            vy: (Math.random() - 0.5) * 200,
            r: 8
        };
    }

    function updatePong(dt) {
        if (keys.ArrowUp || keys.w) leftPaddle.y -= 300 * dt;
        if (keys.ArrowDown || keys.s) leftPaddle.y += 300 * dt;

        leftPaddle.y = Math.max(0, Math.min(H - leftPaddle.h, leftPaddle.y));

        // Computer follows the ball with a little delay.
        const target = pongBall.y - rightPaddle.h / 2;
        rightPaddle.y += Math.max(
            -210 * dt,
            Math.min(210 * dt, target - rightPaddle.y)
        );

        rightPaddle.y = Math.max(0, Math.min(H - rightPaddle.h, rightPaddle.y));

        pongBall.x += pongBall.vx * dt;
        pongBall.y += pongBall.vy * dt;

        if (
            pongBall.y - pongBall.r <= 0 ||
            pongBall.y + pongBall.r >= H
        ) {
            pongBall.vy *= -1;
        }

        if (
            pongBall.vx < 0 &&
            pongBall.x - pongBall.r <= leftPaddle.x + leftPaddle.w &&
            pongBall.x > leftPaddle.x &&
            pongBall.y >= leftPaddle.y &&
            pongBall.y <= leftPaddle.y + leftPaddle.h
        ) {
            pongBall.vx = Math.abs(pongBall.vx) * 1.04;
            pongBall.vy +=
                ((pongBall.y - (leftPaddle.y + leftPaddle.h / 2)) / 45) * 80;
        }

        if (
            pongBall.vx > 0 &&
            pongBall.x + pongBall.r >= rightPaddle.x &&
            pongBall.x < rightPaddle.x + rightPaddle.w &&
            pongBall.y >= rightPaddle.y &&
            pongBall.y <= rightPaddle.y + rightPaddle.h
        ) {
            pongBall.vx = -Math.abs(pongBall.vx) * 1.04;
            pongBall.vy +=
                ((pongBall.y - (rightPaddle.y + rightPaddle.h / 2)) / 45) * 50;
        }

        if (pongBall.x < 0) {
            pongScores.computer++;
            score = pongScores.player;
            resetPongBall();
        } else if (pongBall.x > W) {
            pongScores.player++;
            score = pongScores.player;
            resetPongBall();
        }

        drawPong();

        if (pongScores.player >= 5 || pongScores.computer >= 5) {
            endGame(
                pongScores.player >= 5
                    ? "You won the match!"
                    : "The computer won this match!"
            );
        }
    }

    function drawPong() {
        clearCanvas();

        ctx.fillStyle = "#475569";

        for (let y = 0; y < H; y += 24) {
            ctx.fillRect(W / 2 - 2, y, 4, 12);
        }

        ctx.fillStyle = "#67e8f9";
        ctx.fillRect(
            leftPaddle.x, leftPaddle.y,
            leftPaddle.w, leftPaddle.h
        );

        ctx.fillStyle = "#f472b6";
        ctx.fillRect(
            rightPaddle.x, rightPaddle.y,
            rightPaddle.w, rightPaddle.h
        );

        ctx.beginPath();
        ctx.arc(pongBall.x, pongBall.y, pongBall.r, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.font = "bold 30px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(pongScores.player, W / 2 - 45, 40);
        ctx.fillText(pongScores.computer, W / 2 + 45, 40);
    }

    // =====================================
    // KEYBOARD CONTROLS
    // =====================================

    const keys = Object.create(null);
    let spaceWasDown = false;

    window.addEventListener("keydown", event => {
        if (
            arcadeScreen.classList.contains("hidden") ||
            gameArea.classList.contains("hidden")
        ) {
            return;
        }

        const key = event.key.length === 1
            ? event.key.toLowerCase()
            : event.key;

        if (
            ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "]
                .includes(key)
        ) {
            event.preventDefault();
        }

        keys[key] = true;

        if (mode === "snake") {
            if (
                (key === "ArrowUp" || key === "w") &&
                direction.y !== 1
            ) {
                nextDirection = { x: 0, y: -1 };
            } else if (
                (key === "ArrowDown" || key === "s") &&
                direction.y !== -1
            ) {
                nextDirection = { x: 0, y: 1 };
            } else if (
                (key === "ArrowLeft" || key === "a") &&
                direction.x !== 1
            ) {
                nextDirection = { x: -1, y: 0 };
            } else if (
                (key === "ArrowRight" || key === "d") &&
                direction.x !== -1
            ) {
                nextDirection = { x: 1, y: 0 };
            }
        }
    });

    window.addEventListener("keyup", event => {
        const key = event.key.length === 1
            ? event.key.toLowerCase()
            : event.key;

        keys[key] = false;

        if (key === " ") {
            spaceWasDown = false;
        }
    });

    canvas.addEventListener("mousemove", event => {
        if (mode !== "breakout" || !running) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left) * W / rect.width;

        paddle.x = Math.max(
            0,
            Math.min(W - paddle.w, mouseX - paddle.w / 2)
        );
    });

    // =====================================
    // MAIN GAME LOOP
    // =====================================

    function tick(time) {
        if (!running) {
            animationId = null;
            return;
        }

        if (lastTime === 0) lastTime = time;

        const dt = Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time;

        if (mode === "snake") {
            accumulator += dt;

            while (accumulator >= 0.12 && running) {
                accumulator -= 0.12;
                updateSnake();
            }

        } else if (mode === "invaders") {
            updateInvaders(dt);

        } else if (mode === "breakout") {
            updateBreakout(dt);

        } else if (mode === "pong") {
            updatePong(dt);
        }

        if (running) {
            status.textContent =
                mode === "pong"
                    ? `You ${pongScores.player} — ${pongScores.computer} Computer`
                    : `Score: ${score}`;

            animationId = requestAnimationFrame(tick);
        } else {
            animationId = null;
        }
    }

    function clearCanvas() {
        ctx.clearRect(0, 0, W, H);
    }

    // Draw a blank arcade canvas before the first game starts.
    clearCanvas();

});


/* =========================================
   MINI ARCADE - RETRO MUSIC SYSTEM
========================================= */

(() => {
    const musicButton = document.getElementById("arcadeMusicButton");

    if (!musicButton) {
        console.warn("Arcade music button was not found.");
        return;
    }

    let audioContext = null;
    let masterVolume = null;
    let musicTimer = null;
    let musicEnabled = false;
    let step = 0;

    const melody = [
        659, 0, 784, 0, 988, 784, 659, 0,
        523, 0, 659, 0, 784, 659, 523, 0,
        587, 0, 698, 0, 880, 698, 587, 0,
        494, 0, 587, 0, 740, 587, 494, 0
    ];

    const bass = [131, 131, 165, 165, 110, 110, 147, 147];

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

        const note = melody[step % melody.length];

        if (note) {
            playNote(note, 0.14, 0.055, "square");
        }

        if (step % 4 === 0) {
            const bassNote = bass[
                Math.floor(step / 4) % bass.length
            ];

            playNote(bassNote, 0.28, 0.07, "triangle");
        }

        if (step % 8 === 4) {
            playNote(330, 0.09, 0.025, "square");
        }

        step++;
    }

    
async function startArcadeMusic() {
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
            masterVolume.connect(audioContext.destination);
        }

        await audioContext.resume();

        // Clear old volume automation and restore sound directly.
        masterVolume.gain.cancelScheduledValues(
            audioContext.currentTime
        );
        masterVolume.gain.setValueAtTime(
            0.55,
            audioContext.currentTime
        );

        // Prevent duplicate music timers.
        if (musicTimer !== null) {
            clearInterval(musicTimer);
            musicTimer = null;
        }

        musicEnabled = true;
        step = 0;

        playMusicStep();
        musicTimer = setInterval(playMusicStep, 170);

        musicButton.textContent = "🎵 ARCADE MUSIC: ON";
    } catch (error) {
        console.error("Could not start arcade music:", error);
        musicEnabled = false;
        musicButton.textContent = "🎵 MUSIC ERROR — TRY AGAIN";
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
            masterVolume.gain.cancelScheduledValues(
                audioContext.currentTime
            );
            masterVolume.gain.setTargetAtTime(
                0.0001,
                audioContext.currentTime,
                0.04
            );
        }

        musicButton.textContent = "🎵 ARCADE MUSIC: OFF";
    }

    musicButton.addEventListener("click", () => {
        if (musicEnabled) {
            stopMusic();
        } else {
            startMusic();
        }
    });
})();





function stopMusic() {
    musicEnabled = false;

    if (musicTimer !== null) {
        clearInterval(musicTimer);
        musicTimer = null;
    }

    // Don't access audio variables outside their scope.
    musicButton.textContent = "🎵 ARCADE MUSIC: OFF";
}