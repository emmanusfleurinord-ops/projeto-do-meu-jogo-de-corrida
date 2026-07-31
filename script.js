// ============================================
// CORRIDA F-E-K
// Som de colisão + Som de carro passando
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const speedEl = document.getElementById('speed');
const messageEl = document.getElementById('message');

// Configurações
const LANE_WIDTH = canvas.width / 3;
const PLAYER_W = 30;
const PLAYER_H = 55;
const OBSTACLE_WIDTH = 50;
const OBSTACLE_HEIGHT = 68;

// Estado do jogo
let gameRunning = false;
let gameOver = false;
let isPaused = false;
let score = 0;
let speed = 5;
let frameCount = 0;
let runFrame = 0;
let bodyBounce = 0;

// Efeitos visuais de impacto
let impactTimer = 0;
let shakeX = 0;
let shakeY = 0;
let particles = [];

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

        if (type === 'start') {
            [440, 554, 659].forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'triangle';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.15, audioCtx.currentTime + i * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.08 + 0.2);
                osc.start(audioCtx.currentTime + i * 0.08);
                osc.stop(audioCtx.currentTime + i * 0.08 + 0.2);
            });
        } 
        else if (type === 'score') {
            // som pequeno de ponto
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.12);
        } 
        else if (type === 'pass') {
            // ===== SOM DE CARRO PASSANDO DO LADO =====
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.type = 'sawtooth';
            // Frequência sobe e desce rápido (efeito de carro passando)
            osc.frequency.setValueAtTime(180, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(320, audioCtx.currentTime + 0.15);
            osc.frequency.linearRampToValueAtTime(90, audioCtx.currentTime + 0.45);

            gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.22, audioCtx.currentTime + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
        }
        else if (type === 'crash') {
            // Som de "AIIIE / ÓÓÓÓÓ" bem alto
            const osc1 = audioCtx.createOscillator();
            const gain1 = audioCtx.createGain();
            osc1.connect(gain1);
            gain1.connect(audioCtx.destination);
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(820, audioCtx.currentTime);
            osc1.frequency.exponentialRampToValueAtTime(160, audioCtx.currentTime + 0.7);
            gain1.gain.setValueAtTime(0.55, audioCtx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.7);
            osc1.start();
            osc1.stop(audioCtx.currentTime + 0.7);

            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(560, audioCtx.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(90, audioCtx.currentTime + 0.5);
            gain2.gain.setValueAtTime(0.30, audioCtx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            osc2.start();
            osc2.stop(audioCtx.currentTime + 0.5);

            const osc3 = audioCtx.createOscillator();
            const gain3 = audioCtx.createGain();
            osc3.connect(gain3);
            gain3.connect(audioCtx.destination);
            osc3.type = 'triangle';
            osc3.frequency.setValueAtTime(120, audioCtx.currentTime);
            osc3.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.4);
            gain3.gain.setValueAtTime(0.35, audioCtx.currentTime);
            gain3.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            osc3.start();
            osc3.stop(audioCtx.currentTime + 0.4);
        } 
        else if (type === 'pause') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.value = 350;
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.18);
        }
    } catch (e) {}
}

// Jogador
const player = {
    x: canvas.width / 2 - PLAYER_W / 2,
    y: canvas.height - 140,
    width: PLAYER_W,
    height: PLAYER_H,
    laneSpeed: 7,
    colorBody: '#00bcd4',
    colorSkin: '#f5cba7',
    colorHair: '#4e342e',
    colorPants: '#1565c0'
};

const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

let obstacles = [];
let roadOffset = 0;

const obstacleColors = ['#e74c3c', '#f39c12', '#9b59b6', '#27ae60', '#3498db', '#e67e22', '#1abc9c', '#e91e63'];

// ===== EVENTOS =====
document.addEventListener('keydown', (e) => {
    const key = e.key;

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'p', 'P', 'Escape', 'f', 'F'].includes(key)) {
        e.preventDefault();
    }

    if (key === 'f' || key === 'F') {
        toggleFullScreen();
        return;
    }

    if (!gameRunning && !gameOver) {
        if (key === ' ' || key.startsWith('Arrow')) {
            startGame();
            if (keys.hasOwnProperty(key)) keys[key] = true;
            return;
        }
    }

    if (gameOver && key === ' ') {
        resetGame();
        return;
    }

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

// ===== TELA CHEIA =====
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log('Erro ao entrar em tela cheia:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

// ===== PARTÍCULAS =====
function createImpactParticles(x, y) {
    particles = [];
    for (let i = 0; i < 18; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            life: 30 + Math.random() * 20,
            maxLife: 50,
            size: 3 + Math.random() * 5,
            color: Math.random() > 0.5 ? '#ff5722' : '#ffeb3b'
        });
    }
}

// ===== FUNÇÕES DO JOGO =====
function startGame() {
    gameRunning = true;
    gameOver = false;
    isPaused = false;
    impactTimer = 0;
    particles = [];
    playSound('start');
    messageEl.innerHTML = 'Você está correndo!  |  <strong>P / ESC</strong> = Pausar  |  <strong>F</strong> = Tela Cheia';
    gameLoop();
}

function resetGame() {
    score = 0;
    speed = 5;
    frameCount = 0;
    runFrame = 0;
    obstacles = [];
    particles = [];
    impactTimer = 0;
    player.x = canvas.width / 2 - PLAYER_W / 2;
    player.y = canvas.height - 140;
    gameOver = false;
    gameRunning = true;
    isPaused = false;
    scoreEl.textContent = 'Pontos: 0';
    speedEl.textContent = 'Velocidade: 1';
    playSound('start');
    messageEl.innerHTML = 'Você está correndo!  |  <strong>P / ESC</strong> = Pausar  |  <strong>F</strong> = Tela Cheia';
    gameLoop();
}

function togglePause() {
    isPaused = !isPaused;
    playSound('pause');
    if (isPaused) {
        messageEl.innerHTML = '⏸️ <strong>JOGO PAUSADO</strong><br>Pressione <strong>P</strong> ou <strong>ESC</strong> para continuar';
    } else {
        messageEl.innerHTML = 'Você está correndo!  |  <strong>P / ESC</strong> = Pausar  |  <strong>F</strong> = Tela Cheia';
        gameLoop();
    }
}

function updatePlayer() {
    if (keys.ArrowLeft) player.x -= player.laneSpeed;
    if (keys.ArrowRight) player.x += player.laneSpeed;

    if (keys.ArrowUp) {
        speed += 0.045;
        if (speed > 18) speed = 18;
    }
    if (keys.ArrowDown) {
        speed -= 0.07;
        if (speed < 3.5) speed = 3.5;
    }

    if (player.x < 14) player.x = 14;
    if (player.x + player.width > canvas.width - 14) {
        player.x = canvas.width - 14 - player.width;
    }

    player.y = canvas.height - 140 + Math.sin(runFrame * 0.25) * 3;
}

function spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    const x = lane * LANE_WIDTH + (LANE_WIDTH - OBSTACLE_WIDTH) / 2;
    const color = obstacleColors[Math.floor(Math.random() * obstacleColors.length)];

    obstacles.push({
        x: x,
        y: -OBSTACLE_HEIGHT - 40,
        width: OBSTACLE_WIDTH,
        height: OBSTACLE_HEIGHT,
        color: color,
        passed: false   // para tocar o som só uma vez
    });
}

function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.y += speed;

        // Quando o carro passa do personagem (sem bater)
        if (!obs.passed && obs.y > player.y + player.height) {
            obs.passed = true;
            playSound('pass');          // <-- SOM DE CARRO PASSANDO
            score += 15;
            scoreEl.textContent = 'Pontos: ' + score;
        }

        // Saiu da tela
        if (obs.y > canvas.height + 50) {
            obstacles.splice(i, 1);
        }
    }
}

function checkCollision() {
    for (let obs of obstacles) {
        if (
            player.x < obs.x + obs.width - 12 &&
            player.x + player.width > obs.x + 12 &&
            player.y < obs.y + obs.height - 15 &&
            player.y + player.height > obs.y + 15
        ) {
            return true;
        }
    }
    return false;
}

function updateImpactEffects() {
    if (impactTimer > 0) {
        impactTimer--;
        shakeX = (Math.random() - 0.5) * 14;
        shakeY = (Math.random() - 0.5) * 14;
    } else {
        shakeX = 0;
        shakeY = 0;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25;
        p.life--;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawRoad() {
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.setLineDash([20, 30]);
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
    const py = player.y + bodyBounce;

    const legSwing = Math.sin(runFrame * 0.45) * 16;
    const armSwing = Math.sin(runFrame * 0.45) * 14;
    bodyBounce = Math.abs(Math.sin(runFrame * 0.45)) * 4;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(px, player.y + player.height + 6, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = player.colorPants;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px - 5, py + 30);
    ctx.lineTo(px - 10 - legSwing * 0.5, py + 52 + Math.abs(legSwing) * 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px + 5, py + 30);
    ctx.lineTo(px + 10 + legSwing * 0.5, py + 52 + Math.abs(legSwing) * 0.2);
    ctx.stroke();

    ctx.fillStyle = player.colorBody;
    ctx.fillRect(px - 12, py + 10, 24, 26);

    ctx.strokeStyle = player.colorSkin;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px - 12, py + 16);
    ctx.lineTo(px - 22 - armSwing * 0.5, py + 30 + armSwing * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px + 12, py + 16);
    ctx.lineTo(px + 22 + armSwing * 0.5, py + 30 - armSwing * 0.4);
    ctx.stroke();

    ctx.fillStyle = player.colorSkin;
    ctx.beginPath();
    ctx.arc(px, py + 2, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = player.colorHair;
    ctx.beginPath();
    ctx.arc(px, py - 3, 13, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();

    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(px - 5, py + 1, 2.4, 0, Math.PI * 2);
    ctx.arc(px + 5, py + 1, 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py + 5, 5.5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
}

function drawObstacles() {
    for (let obs of obstacles) {
        const x = obs.x;
        const y = obs.y;
        const w = obs.width;
        const h = obs.height;

        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x + 3, y + h - 4, w - 6, 8);

        ctx.fillStyle = obs.color;
        ctx.fillRect(x + 2, y + 12, w - 4, h - 22);
        ctx.fillRect(x + 4, y + 8, w - 8, 10);

        ctx.fillStyle = shadeColor(obs.color, -30);
        ctx.fillRect(x + 8, y + 2, w - 16, 18);

        ctx.fillStyle = '#a8d8ea';
        ctx.fillRect(x + 10, y + 5, w - 20, 12);
        ctx.fillStyle = shadeColor(obs.color, -40);
        ctx.fillRect(x + w/2 - 1, y + 5, 2, 12);

        ctx.fillStyle = '#fff9c4';
        ctx.fillRect(x + 5, y + h - 20, 10, 6);
        ctx.fillRect(x + w - 15, y + h - 20, 10, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 6, y + h - 19, 4, 3);
        ctx.fillRect(x + w - 14, y + h - 19, 4, 3);

        ctx.fillStyle = '#ff1744';
        ctx.fillRect(x + 5, y + 14, 8, 5);
        ctx.fillRect(x + w - 13, y + 14, 8, 5);

        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.arc(x + 12, y + h - 6, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + w - 12, y + h - 6, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(x + 12, y + h - 6, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + w - 12, y + h - 6, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#333';
        ctx.fillRect(x + 3, y + h - 14, w - 6, 4);

        ctx.fillStyle = shadeColor(obs.color, -20);
        ctx.fillRect(x - 1, y + 16, 5, 4);
        ctx.fillRect(x + w - 4, y + 16, 5, 4);
    }
}

function drawParticles() {
    for (let p of particles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function shadeColor(color, percent) {
    const f = parseInt(color.slice(1), 16);
    const t = percent < 0 ? 0 : 255;
    const p = Math.abs(percent) / 100;
    const R = f >> 16;
    const G = (f >> 8) & 0x00FF;
    const B = f & 0x0000FF;
    return '#' + (0x1000000 +
        (Math.round((t - R) * p) + R) * 0x10000 +
        (Math.round((t - G) * p) + G) * 0x100 +
        (Math.round((t - B) * p) + B)
    ).toString(16).slice(1);
}

function gameLoop() {
    if (!gameRunning || isPaused) return;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    roadOffset += speed * 1.6;
    if (roadOffset > 50) roadOffset = 0;

    runFrame++;

    drawRoad();
    updatePlayer();
    updateObstacles();
    drawObstacles();
    drawPlayer();
    drawParticles();

    if (impactTimer > 20) {
        ctx.fillStyle = `rgba(255, 50, 50, ${0.35 * (impactTimer / 40)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.restore();

    updateImpactEffects();

    frameCount++;

    if (frameCount % 150 === 0) {
        speed += 0.3;
        speedEl.textContent = 'Velocidade: ' + Math.floor(speed);
    }

    if (frameCount % Math.max(16, 50 - Math.floor(speed * 2)) === 0) {
        spawnObstacle();
    }

    if (checkCollision()) {
        gameOver = true;
        gameRunning = false;

        impactTimer = 40;
        createImpactParticles(player.x + player.width / 2, player.y + player.height / 2);

        playSound('crash');
        messageEl.innerHTML = '💥 <strong>COLIDIU!</strong><br>Pontuação: <strong>' + score + '</strong><br>Pressione <strong>ESPAÇO</strong> ou clique para jogar de novo';
        return;
    }

    if (frameCount % 4 === 0) {
        score += 1;
        scoreEl.textContent = 'Pontos: ' + score;
    }

    requestAnimationFrame(gameLoop);
}

function drawStartScreen() {
    drawRoad();
    drawPlayer();
    messageEl.innerHTML = 'Pressione <strong>ESPAÇO</strong> ou qualquer <strong>SETA</strong> para começar!<br><strong>F</strong> = Tela Cheia';
}

drawStartScreen();
