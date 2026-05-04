const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 450;

let gameRunning = false;
let cameraX = 0;
const keys = {};

// ESTADO
const state = { hp: 100, score: 0, weapon: 'RIFLE' };
const arsenal = {
    'RIFLE': { rate: 200, speed: 12, color: 'white', multi: false },
    'SPREAD': { rate: 400, speed: 10, color: 'yellow', multi: true },
    'M-GUN': { rate: 80, speed: 15, color: 'cyan', multi: false }
};

// JUGADOR
const p = { x: 100, y: 300, w: 30, h: 50, vx: 0, vy: 0, dir: 1, grounded: false, bullets: [], lastShot: 0 };

// ENEMIGOS
let enemies = [];
function spawnEnemy() {
    if (enemies.length < 5) {
        enemies.push({ x: cameraX + 850, y: 355, w: 30, h: 45, hp: 20, alive: true });
    }
}

// INICIO
function iniciarJuego() {
    gameRunning = true;
    document.getElementById('start-overlay').style.display = 'none';
}

window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === '1') state.weapon = 'RIFLE';
    if (e.key === '2') state.weapon = 'SPREAD';
    if (e.key === '3') state.weapon = 'M-GUN';
    document.getElementById('wp-val').innerText = state.weapon;
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function update() {
    if (!gameRunning) return;

    // Movimiento
    if (keys['arrowright'] || keys['d']) { p.vx = 6; p.dir = 1; }
    else if (keys['arrowleft'] || keys['a']) { p.vx = -6; p.dir = -1; }
    else { p.vx *= 0.8; }

    if ((keys['z'] || keys[' ']) && p.grounded) { p.vy = -14; p.grounded = false; }

    p.vy += 0.7; // Gravedad
    p.x += p.vx; p.y += p.vy;

    // Suelo infinito
    if (p.y > 350) { p.y = 350; p.vy = 0; p.grounded = true; }
    if (p.x < cameraX) p.x = cameraX;

    cameraX = p.x - 150;

    // Disparar
    if (keys['x'] || keys['k']) {
        const now = Date.now();
        const gun = arsenal[state.weapon];
        if (now - p.lastShot > gun.rate) {
            if (gun.multi) {
                p.bullets.push({x: p.x+20, y: p.y+20, vx: gun.speed*p.dir, vy: -2, c: gun.color});
                p.bullets.push({x: p.x+20, y: p.y+20, vx: gun.speed*p.dir, vy: 0, c: gun.color});
                p.bullets.push({x: p.x+20, y: p.y+20, vx: gun.speed*p.dir, vy: 2, c: gun.color});
            } else {
                p.bullets.push({x: p.x+20, y: p.y+20, vx: gun.speed*p.dir, vy: 0, c: gun.color});
            }
            p.lastShot = now;
        }
    }

    // Enemigos IA
    if (Math.random() < 0.02) spawnEnemy();
    enemies.forEach((en, i) => {
        if (en.x > p.x) en.x -= 2; else en.x += 2; // Te persiguen
        
        if (Math.abs(p.x - en.x) < 30 && Math.abs(p.y - en.y) < 40) {
            state.hp -= 0.2;
            document.getElementById('hp-val').innerText = Math.floor(state.hp);
            if (state.hp <= 0) location.reload();
        }

        p.bullets.forEach((b, bi) => {
            if (b.x > en.x && b.x < en.x + 30 && b.y > en.y && b.y < en.y + 45) {
                en.alive = false;
                p.bullets.splice(bi, 1);
                state.score += 100;
                document.getElementById('sc-val').innerText = state.score;
            }
        });
    });
    enemies = enemies.filter(en => en.alive && en.x > cameraX - 100);
    p.bullets = p.bullets.filter(b => b.x > cameraX && b.x < cameraX + 900);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-cameraX, 0);

    // Dibujar suelo repetido
    ctx.fillStyle = "#141";
    for(let i = 0; i < 100; i++) ctx.fillRect(i*100, 400, 98, 50);

    // Enemigos
    ctx.fillStyle = "red";
    enemies.forEach(en => {
        ctx.fillRect(en.x, en.y, en.w, en.h);
        ctx.fillStyle = "black"; ctx.fillRect(en.x+5, en.y+5, 20, 5); // Casco
        ctx.fillStyle = "red";
    });

    // Jugador (Contra Style)
    ctx.fillStyle = "#25f"; ctx.fillRect(p.x, p.y+25, 30, 25); // Pantalón
    ctx.fillStyle = "#f33"; ctx.fillRect(p.x, p.y+5, 30, 20); // Chaleco
    ctx.fillStyle = "#ffccaa"; ctx.fillRect(p.x+5, p.y, 20, 15); // Cabeza
    ctx.fillStyle = "grey"; ctx.fillRect(p.x + (p.dir==1?20:-10), p.y+15, 20, 8); // Arma

    // Balas
    p.bullets.forEach(b => {
        b.x += b.vx; b.y += b.vy;
        ctx.fillStyle = b.c; ctx.fillRect(b.x, b.y, 8, 8);
    });

    ctx.restore();
    requestAnimationFrame(draw);
}

setInterval(update, 1000/60);
draw();
