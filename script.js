// ============================================
// CORRIDA F-E-K
// Estilo quase Subway / Temple Run
// Controles: Setas + P / ESC para pausar
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const speedEl = document.getElementById('speed');
const messageEl = document.getElementById('message');

// Configurações
const LANE_WIDTH = canvas.width / 3;
const PLAYER_SIZE = 34;
const OBSTACLE_WIDTH = 52;
const OBSTACLE_HEIGHT = 70;

// Estado do jogo
let gameRunning = false;
let gameOver = false;
let isPaused = false;
let score = 0;
let speed = 3.2;
let frameCount = 0;

// ===== SONS (Web Audio API) =====
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'crash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    } 
    else if (type === 'score') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.setValueAtTime(900, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
    }
    else if (type === 'start') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    }
    else if (type === 'pause') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    }
}

// Jogador (cor verde-água)
const player = {
    x: canvas.width / 2 - PLAYER_SIZE / 2,
    y: canvas.height - 120,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    speed: 6.5,
    color: '#00d2d3'
};

// Teclas
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

let obstacles = [];
let roadOffset = 0;

// Vários tipos de obstáculos
const obstacleTypes = [
    { color: '#e74c3c' },
    { color: '#f39c12' },
    { color: '#9b59b6' },
    { color: '#2ecc71' },
    { color: '#3498db' }
];

// ===== EVENTOS DE TECLADO =====
document.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'p', 'P', 'Escape'].includes(e.key)) {
        e.preventDefault();
    }

    if (e.key === ' ' && !gameRunning && !gameOver) {
        startGame();
        return;
    }

    if (e.key === ' ' && gameOver) {
        resetGame();
        return;
    }

    if ((e.key === 'p' || e.key === 'P' || e.key === 'Escape') && gameRunning && !gameOver) {
        togglePause();
        return;
    }

    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

// ===== FUNÇÕES PRINCIPAIS =====
function startGame() {
    gameRunning = true;
    gameOver = false;
    isPaused = false;
    playSound('start');
    messageEl.innerHTML = 'Corra! Desvie dos obstáculos  |  P ou ESC = Pausar';
    gameLoop();
}

function resetGame() {
    score = 0;
    speed = 3.2;
    frameCount = 0;
    obstacles = [];
    player.x = canvas.width / 2 - PLAYER_SIZE / 2;
    player.y = canvas.height - 120;
    gameOver = false;
    gameRunning = true;
    isPaused = false;
    scoreEl.textContent = 'Pontos: 0';
    speedEl.textContent = 'Velocidade: 1';
    playSound('start');
    messageEl.innerHTML = 'Corra! Desvie dos obstáculos  |  P ou ESC = Pausar';
    gameLoop();
}

function togglePause() {
    isPaused = !isPaused;
    playSound('pause');
    if (isPaused) {
        messageEl.innerHTML = '⏸️ JOGO PAUSADO<br>Pressione <strong>P</strong> ou <strong>ESC</strong> para continuar';
    } else {
        messageEl.innerHTML = 'Corra! Desvie dos obstáculos  |  P ou ESC = Pausar';
        gameLoop();
    }
}

function updatePlayer() {
    if (keys.ArrowUp) {
        player.y -= player.speed;
        roadOffset += 2.5;
    }
    if (keys.ArrowDown) {
        player.y += player.speed * 0.7;
    }
    if (keys.ArrowLeft) {
        player.x -= player.speed;
    }
    if (keys.ArrowRight) {
        player.x += player.speed;
    }

    if (player.x < 8) player.x = 8;
    if (player.x + player.width > canvas.width - 8) {
        player.x = canvas.width - 8 - player.width;
    }
    if (player.y < 40) player.y = 40;
    if (player.y + player.height > canvas.height - 10) {
        player.y = canvas.height - 10 - player.height;
    }
}

function spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    const x = lane * LANE_WIDTH + (LANE_WIDTH - OBSTACLE_WIDTH) / 2;
    const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];

    obstacles.push({
        x: x,
        y: -OBSTACLE_HEIGHT - 10,
        width: OBSTACLE_WIDTH,
        height: OBSTACLE_HEIGHT,
        color: type.color
    });
}

function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].y += speed;

        if (obstacles[i].y > canvas.height) {
            obstacles.splice(i, 1);
            score += 15;
            scoreEl.textContent = 'Pontos: ' + score;
            playSound('score');
        }
    }
}

function checkCollision() {
    for (let obs of obstacles) {
        if (
            player.x < obs.x + obs.width - 6 &&
            player.x + player.width > obs.x + 6 &&
            player.y < obs.y + obs.height - 8 &&
            player.y + player.height > obs.y + 8
        ) {
            return true;
        }
    }
    return false;
}

function drawRoad() {
    ctx.fillStyle = '#3d3d3d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.setLineDash([25, 25]);
    ctx.lineDashOffset = -roadOffset;

    ctx.beginPath();
    ctx.moveTo(LANE_WIDTH, 0);
    ctx.lineTo(LANE_WIDTH, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(LANE_WIDTH * 2, 0);
    ctx.lineTo(LANE_WIDTH * 2, canvas.height);
    ctx.stroke();

    ctx.setLineDash([]);

    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(canvas.width, 0);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.stroke();
}

function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.fillStyle = '#f5cba7';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y - 11, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2 - 5, player.y - 13, 2.5, 0, Math.PI * 2);
    ctx.arc(player.x + player.width / 2 + 5, player.y - 13, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y - 8, 6, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
}

function drawObstacles() {
    for (let obs of obstacles) {
        ctx.fillStyle = obs.color;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        ctx.fillStyle = '#d6eaf8';
        ctx.fillRect(obs.x + 8, obs.y + 10, obs.width - 16, 22);

        ctx.fillStyle = '#f9e79f';
        ctx.fillRect(obs.x + 6, obs.y + obs.height - 14, 12, 8);
        ctx.fillRect(obs.x + obs.width - 18, obs.y + obs.height - 14, 12, 8);

        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(obs.x + 4, obs.y + obs.height - 12, 14, 10);
        ctx.fillRect(obs.x + obs.width - 18, obs.y + obs.height - 12, 14, 10);
    }
}

function gameLoop() {
    if (!gameRunning || isPaused) return;

    drawRoad();
    updatePlayer();
    updateObstacles();
    drawObstacles();
    drawPlayer();

    roadOffset += speed * 0.9;
    if (roadOffset > 50) roadOffset = 0;

    frameCount++;
    if (frameCount % 140 === 0) {
        speed += 0.4;
        speedEl.textContent = 'Velocidade: ' + Math.floor(speed);
    }

    if (frameCount % Math.max(28, 75 - Math.floor(speed * 4)) === 0) {
        spawnObstacle();
    }

    if (checkCollision()) {
        gameOver = true;
        gameRunning = false;
        playSound('crash');
        messageEl.innerHTML = '💥 COLIDIU!<br>Pontuação final: <strong>' + score + '</strong><br>Pressione <strong>ESPAÇO</strong> para jogar de novo';
        return;
    }

    if (frameCount % 7 === 0) {
        score += 1;
        scoreEl.textContent = 'Pontos: ' + score;
    }

    requestAnimationFrame(gameLoop);
}

function drawStartScreen() {
    drawRoad();
    drawPlayer();
}

drawStartScreen();
