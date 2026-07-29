// ============================================
// CORRIDA F-E-K
// Estilo quase Subway Surfers / Temple Run
// Personagem animado + estrada rolando + SOM
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const speedEl = document.getElementById('speed');
const messageEl = document.getElementById('message');

// Configurações
const LANE_WIDTH = canvas.width / 3;
const PLAYER_W = 28;
const PLAYER_H = 50;
const OBSTACLE_WIDTH = 48;
const OBSTACLE_HEIGHT = 65;

// Estado do jogo
let gameRunning = false;
let gameOver = false;
let isPaused = false;
let score = 0;
let speed = 4;
let frameCount = 0;
let runFrame = 0;

// ===== SONS =====
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playSound(type) {
    try {
        initAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'crash') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(160, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(35, audioCtx.currentTime + 0.4);
            gain.gain.setValueAtTime(0.28, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.4);
        } else if (type === 'score') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(700, audioCtx.currentTime);
            osc.frequency.setValueAtTime(1050, audioCtx.currentTime + 0.06);
            gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.12);
        } else if (type === 'start') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.28);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.28);
        } else if (type === 'pause') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        }
    } catch (e) {
        console.log('Erro no som:', e);
    }
}

// Jogador
const player = {
    x: canvas.width / 2 - PLAYER_W / 2,
    y: canvas.height - 130,
    width: PLAYER_W,
    height: PLAYER_H,
    speed: 6.2,
    colorBody: '#00bcd4',
    colorSkin: '#f5cba7',
    colorHair: '#5d4037',
    colorPants: '#1565c0'
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

const obstacleColors = ['#e74c3c', '#f39c12', '#9b59b6', '#27ae60', '#3498db', '#e67e22'];

// ===== EVENTOS =====
document.addEventListener('keydown', (e) => {
    const key = e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'p', 'P', 'Escape'].includes(key)) {
        e.preventDefault();
    }

    // Começar
    if (!gameRunning && !gameOver) {
        if (key === ' ' || key.startsWith('Arrow')) {
            startGame();
            if (keys.hasOwnProperty(key)) keys[key] = true;
            return;
        }
    }

    // Reiniciar
    if (gameOver && key === ' ') {
        resetGame();
        return;
    }

    // Pausar
    if (gameRunning && !gameOver && (key === 'p' || key === 'P' || key === 'Escape')) {
        togglePause();
        return;
    }

    if (keys.hasOwnProperty(key)) {
        keys[key] = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

canvas.addEventListener('click', () => {
    if (!gameRunning && !gameOver) startGame();
    else if (gameOver) resetGame();
});

// ===== FUNÇÕES =====
function startGame() {
    gameRunning = true;
    gameOver = false;
    isPaused = false;
    playSound('start');
    messageEl.innerHTML = 'Corra! Desvie dos obstáculos  |  <strong>P / ESC</strong> = Pausar';
    gameLoop();
}

function resetGame() {
    score = 0;
    speed = 4;
    frameCount = 0;
    runFrame = 0;
    obstacles = [];
    player.x = canvas.width / 2 - PLAYER_W / 2;
    player.y = canvas.height - 130;
    gameOver = false;
    gameRunning = true;
    isPaused = false;
    scoreEl.textContent = 'Pontos: 0';
    speedEl.textContent = 'Velocidade: 1';
    playSound('start');
    messageEl.innerHTML = 'Corra! Desvie dos obstáculos  |  <strong>P / ESC</strong> = Pausar';
    gameLoop();
}

function togglePause() {
    isPaused = !isPaused;
    playSound('pause');
    if (isPaused) {
        messageEl.innerHTML = '⏸️ <strong>JOGO PAUSADO</strong><br>Pressione <strong>P</strong> ou <strong>ESC</strong> para continuar';
    } else {
        messageEl.innerHTML = 'Corra! Desvie dos obstáculos  |  <strong>P / ESC</strong> = Pausar';
        gameLoop();
    }
}

function updatePlayer() {
    if (keys.ArrowUp) {
        player.y -= player.speed * 0.7;
        speed += 0.01;
    }
    if (keys.ArrowDown) {
        player.y += player.speed * 0.5;
    }
    if (keys.ArrowLeft) {
        player.x -= player.speed;
    }
    if (keys.ArrowRight) {
        player.x += player.speed;
    }

    if (player.x < 12) player.x = 12;
    if (player.x + player.width > canvas.width - 12) {
        player.x = canvas.width - 12 - player.width;
    }
    if (player.y < 60) player.y = 60;
    if (player.y + player.height > canvas.height - 20) {
        player.y = canvas.height - 20 - player.height;
    }
}

function spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    const x = lane * LANE_WIDTH + (LANE_WIDTH - OBSTACLE_WIDTH) / 2;
    const color = obstacleColors[Math.floor(Math.random() * obstacleColors.length)];

    obstacles.push({
        x: x,
        y: -OBSTACLE_HEIGHT - 30,
        width: OBSTACLE_WIDTH,
        height: OBSTACLE_HEIGHT,
        color: color
    });
}

function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].y += speed;

        if (obstacles[i].y > canvas.height + 30) {
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
            player.x < obs.x + obs.width - 10 &&
            player.x + player.width > obs.x + 10 &&
            player.y < obs.y + obs.height - 12 &&
            player.y + player.height > obs.y + 12
        ) {
            return true;
        }
    }
    return false;
}

function drawRoad() {
    ctx.fillStyle = '#2c2c2c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.setLineDash([22, 28]);
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
    ctx.moveTo(4, 0);
    ctx.lineTo(4, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(canvas.width - 4, 0);
    ctx.lineTo(canvas.width - 4, canvas.height);
    ctx.stroke();
}

function drawPlayer() {
    const px = player.x + player.width / 2;
    const py = player.y;

    const legSwing = Math.sin(runFrame * 0.35) * 12;
    const armSwing = Math.sin(runFrame * 0.35) * 10;

    // Sombra
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(px, py + player.height + 4, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pernas
    ctx.strokeStyle = player.colorPants;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(px - 4, py + 28);
    ctx.lineTo(px - 8 - legSwing * 0.3, py + 48 + Math.abs(legSwing) * 0.15);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(px + 4, py + 28);
    ctx.lineTo(px + 8 + legSwing * 0.3, py + 48 + Math.abs(legSwing) * 0.15);
    ctx.stroke();

    // Corpo
    ctx.fillStyle = player.colorBody;
    ctx.fillRect(px - 11, py + 8, 22, 24);

    // Braços
    ctx.strokeStyle = player.colorSkin;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(px - 11, py + 14);
    ctx.lineTo(px - 18 - armSwing * 0.4, py + 26 + armSwing * 0.3);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(px + 11, py + 14);
    ctx.lineTo(px + 18 + armSwing * 0.4, py + 26 - armSwing * 0.3);
    ctx.stroke();

    // Cabeça
    ctx.fillStyle = player.colorSkin;
    ctx.beginPath();
    ctx.arc(px, py, 13, 0, Math.PI * 2);
    ctx.fill();

    // Cabelo
    ctx.fillStyle = player.colorHair;
    ctx.beginPath();
    ctx.arc(px, py - 4, 12, Math.PI * 1.1, Math.PI * 1.9);
    ctx.fill();

    // Olhos
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(px - 4.5, py - 1, 2.2, 0, Math.PI * 2);
    ctx.arc(px + 4.5, py - 1, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Sorriso
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(px, py + 3, 5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
}

function drawObstacles() {
    for (let obs of obstacles) {
        ctx.fillStyle = obs.color;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        ctx.fillStyle = '#d4e6f1';
        ctx.fillRect(obs.x + 7, obs.y + 8, obs.width - 14, 18);

        ctx.fillStyle = '#f9e79f';
        ctx.fillRect(obs.x + 5, obs.y + obs.height - 12, 10, 6);
        ctx.fillRect(obs.x + obs.width - 15, obs.y + obs.height - 12, 10, 6);

        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(obs.x + 3, obs.y + obs.height - 10, 12, 8);
        ctx.fillRect(obs.x + obs.width - 15, obs.y + obs.height - 10, 12, 8);
    }
}

function gameLoop() {
    if (!gameRunning || isPaused) return;

    roadOffset += speed * 1.3;
    if (roadOffset > 50) roadOffset = 0;

    runFrame++;

    drawRoad();
    updatePlayer();
    updateObstacles();
    drawObstacles();
    drawPlayer();

    frameCount++;

    if (frameCount % 120 === 0) {
        speed += 0.35;
        speedEl.textContent = 'Velocidade: ' + Math.floor(speed);
    }

    if (frameCount % Math.max(22, 65 - Math.floor(speed * 3)) === 0) {
        spawnObstacle();
    }

    if (checkCollision()) {
        gameOver = true;
        gameRunning = false;
        playSound('crash');
        messageEl.innerHTML = '💥 <strong>COLIDIU!</strong><br>Pontuação: <strong>' + score + '</strong><br>Pressione <strong>ESPAÇO</strong> ou clique para jogar de novo';
        return;
    }

    if (frameCount % 5 === 0) {
        score += 1;
        scoreEl.textContent = 'Pontos: ' + score;
    }

    requestAnimationFrame(gameLoop);
}

function drawStartScreen() {
    drawRoad();
    drawPlayer();
    messageEl.innerHTML = 'Pressione <strong>ESPAÇO</strong> ou qualquer <strong>SETA</strong> para começar!<br>Ou clique na estrada';
}

drawStartScreen();
