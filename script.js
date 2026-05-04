const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 450;

let gameRunning = false;
let cameraX = 0;
const keys = {};
let particles = [];

// ESTADO DEL JUEGO
const state = { hp: 100, score: 0, weapon: 'RIFLE' };
const arsenal = {
    'RIFLE': { rate: 200, speed: 12, color: 'white', damage: 10, multi: false },
    'SPREAD': { rate: 450, speed: 10, color: 'yellow', damage: 15, multi: true },
    'M-GUN': { rate: 80, speed: 15, color: 'cyan', damage: 8, multi: false }
};

// JUGADOR
const p = { 
    x: 100, y: 300, w: 35, h: 50, 
    vx: 0, vy: 0, 
    dir: 1, grounded: false, 
    bullets: [], lastShot: 0 
};

let enemies = [];
let enemyBullets = [];
let platforms = [];

// Función para iniciar el juego (Adiós muro invisible)
function iniciarJuego() {
    gameRunning = true;
    document.getElementById('overlay').style.display = 'none';
    // Crear algunas plataformas iniciales
    for(let i=0; i<100; i++) {
        if(i % 4 === 0 && i > 0) {
            platforms.push({ x: i*200, y: 250, w: 120, h: 15 });
        }
    }
    window.focus();
}

// CONTROLES
window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === '1') state.weapon = 'RIFLE';
    if (e.key === '2') state.weapon = 'SPREAD';
    if (e.key === '3') state.weapon = 'M-GUN';
    document.getElementById('gun').innerText = state.weapon;
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function update() {
    if (!gameRunning) return;

    // Movimiento
    if (keys['arrowright'] || keys['d']) { p.vx = 6; p.dir = 1; }
    else if (keys['arrowleft'] || keys['a']) { p.vx = -6; p.dir = -1; }
    else { p.vx *= 0.8; }

    if ((keys['z'] || keys[' ']) && p.grounded) { p.vy = -15; p.grounded = false; }

    p.vy += 0.8; // Gravedad
    p.x += p.vx; p.y += p.vy;

    // --- CORRECCIÓN DE CÁMARA Y PISO ---
    // 1. El suelo base (Y=350) ahora es infinito, no importa la X
    if (p.y > 350) { 
        p.y = 350; 
        p.vy = 0; 
        p.grounded = true; 
    }

    // 2. La cámara sigue al jugador pero no deja que p.x retroceda fuera de ella
    if (p.x > cameraX + 400) cameraX = p.x - 400;
    if (p.x < cameraX) p.x = cameraX; // Bloqueo de retroceso (Estilo NES)

    // Colisión con plataformas elevadas
    platforms.forEach(plat => {
        if (p.vy > 0 && p.x + p.w > plat.x && p.x < plat.x + plat.w &&
            p.y + p.h > plat.y && p.y + p.h < plat.y + plat.h + p.vy) {
            p.y = plat.y - p.h; p.vy = 0; p.grounded = true;
        }
    });

    // Disparo Jugador
    if (keys['x'] || keys['k']) {
        const now = Date.now();
        const gun = arsenal[state.weapon];
        if (now - p.lastShot > gun.rate) {
            const bx = p.x + (p.dir === 1 ? 35 : -5);
            if (gun.multi) {
                [-0.2, 0, 0.2].forEach(v => p.bullets.push({x: bx, y: p.y+20, vx: gun.speed*p.dir, vy: v*10, c: gun.color}));
            } else {
                p.bullets.push({x: bx, y: p.y+20, vx: gun.speed*p.dir, vy: 0, c: gun.color});
            }
            p.lastShot = now;
        }
    }

    // Enemigos (Aparecen a la derecha)
    if (Math.random() < 0.02 && enemies.length < 5) {
        enemies.push({ x: cameraX + 850, y: 350, hp: 20, lastShot: 0 });
    }

    enemies.forEach((en, i) => {
        // IA: Caminar y disparar
        en.x -= 3;
        if (Date.now() - en.lastShot > 2000) {
            enemyBullets.push({ x: en.x, y: en.y + 20, vx: -6, vy: 0, c: 'red' });
            en.lastShot = Date.now();
        }

        // ¿Bala del jugador le dio al enemigo?
        p.bullets.forEach((b, bi) => {
            if (b.x > en.x && b.x < en.x + 35 && b.y > en.y && b.y < en.y + 50) {
                en.hp -= arsenal[state.weapon].damage;
                p.bullets.splice(bi, 1);
                if (en.hp <= 0) {
                    state.score += 100;
                    document.getElementById('sc').innerText = state.score;
                    enemies.splice(i, 1);
                }
            }
        });
    });

    // ¿Bala enemiga le dio al jugador?
    enemyBullets.forEach((eb, ei) => {
        if (eb.x > p.x && eb.x < p.x + p.w && eb.y > p.y && eb.y < p.y + p.h) {
            state.hp -= 5;
            enemyBullets.splice(ei, 1);
            document.getElementById('hp').innerText = Math.max(0, state.hp);
            if (state.hp <= 0) location.reload();
        }
    });

    // Limpieza de objetos fuera de rango
    p.bullets = p.bullets.filter(b => Math.abs(b.x - p.x) < 800);
    enemyBullets = enemyBullets.filter(eb => Math.abs(eb.x - p.x) < 800);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-cameraX, 0);

    // DIBUJAR SUELO (Repetido infinitamente según la cámara)
    ctx.fillStyle = "#141";
    let floorStart = Math.floor(cameraX / 100) * 100;
    for (let i = 0; i < 10; i++) {
        let fx = floorStart + (i * 100);
        ctx.fillRect(fx, 400, 98, 50);
        ctx.fillStyle = "#2f2"; ctx.fillRect(fx, 400, 98, 4); ctx.fillStyle = "#141";
    }

    // Plataformas
    ctx.fillStyle = "#666";
    platforms.forEach(plat => ctx.fillRect(plat.x, plat.y, plat.w, plat.h));

    // Enemigos (Cara de Meme)
    enemies.forEach(en => {
        ctx.fillStyle = "red"; ctx.fillRect(en.x, en.y, 35, 50);
        ctx.fillStyle = "white"; // Ojos locos
        ctx.fillRect(en.x+5, en.y+10, 8, 8); ctx.fillRect(en.x+20, en.y+10, 8, 8);
        ctx.fillStyle = "black"; ctx.fillRect(en.x+7, en.y+12, 4, 4); ctx.fillRect(en.x+22, en.y+12, 4, 4);
    });

    // Jugador (Contra Style)
    ctx.save();
    ctx.translate(p.x, p.y);
    if(p.dir === -1) { ctx.scale(-1, 1); ctx.translate(-p.w, 0); }
    ctx.fillStyle = "#25f"; ctx.fillRect(0, 20, 30, 30); // Pantalón
    ctx.fillStyle = "#f33"; ctx.fillRect(0, 5, 30, 20);  // Chaleco
    ctx.fillStyle = "#ffccaa"; ctx.fillRect(5, -5, 20, 15); // Cara
    ctx.fillStyle = "#777"; ctx.fillRect(20, 15, 25, 8); // Arma
    ctx.restore();

    // Balas
    p.bullets.concat(enemyBullets).forEach(b => {
        b.x += b.vx; b.y += b.vy;
        ctx.fillStyle = b.c; ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, 7); ctx.fill();
    });

    ctx.restore();
    requestAnimationFrame(draw);
}

setInterval(update, 1000/60);
draw();
