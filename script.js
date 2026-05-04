const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 450;

let running = false;
let cameraX = 0;
const keys = {};
let particles = []; // Para las explosiones

// ESTADO
const state = { hp: 100, score: 0, weapon: 'RIFLE', bossSpawned: false };
const arsenal = {
    'RIFLE': { rate: 200, speed: 12, color: '#fff', damage: 10 },
    'SPREAD': { rate: 450, speed: 10, color: '#ff0', damage: 15, multi: true },
    'M-GUN': { rate: 80, speed: 15, color: '#0ff', damage: 8 }
};

const p = { x: 100, y: 300, w: 35, h: 50, vx: 0, vy: 0, dir: 1, grounded: false, bullets: [], lastShot: 0 };
let enemies = [];
let enemyBullets = [];
let platforms = [];
let hazards = []; // Torretas y fortalezas

// GENERADOR DE NIVEL
function createLevel() {
    platforms = []; hazards = [];
    for(let i=0; i<50; i++) {
        // Suelo irregular
        platforms.push({ x: i*300, y: 380 + Math.random()*40, w: 310, h: 100 });
        // Plataformas aéreas
        if(i > 1) platforms.push({ x: i*350, y: 200 + Math.random()*100, w: 150, h: 15 });
        // Fortalezas (Torretas) cada cierto espacio
        if(i % 3 === 0 && i > 0) hazards.push({ x: i*400 + 100, y: 340, hp: 50, type: 'TURRET', lastShot: 0 });
    }
}

function startReady() {
    running = true;
    document.getElementById('overlay').style.display = 'none';
    createLevel();
    window.focus();
}

// EXPLOSIONES
function createExplosion(x, y, color = 'orange') {
    for(let i=0; i<15; i++) {
        particles.push({ x, y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 1, c: color });
    }
}

window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if(['1','2','3'].includes(e.key)) {
        state.weapon = e.key === '1' ? 'RIFLE' : e.key === '2' ? 'SPREAD' : 'M-GUN';
        document.getElementById('gun').innerText = state.weapon;
    }
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function update() {
    if(!running) return;

    // Movimiento Jugador
    if(keys['arrowright'] || keys['d']) { p.vx = 6; p.dir = 1; }
    else if(keys['arrowleft'] || keys['a']) { p.vx = -6; p.dir = -1; }
    else { p.vx *= 0.8; }

    if((keys['z'] || keys[' '] || keys['w'] || keys['arrowup']) && p.grounded) { p.vy = -15; p.grounded = false; }
    p.vy += 0.8; p.x += p.vx; p.y += p.vy;

    // Colisiones Plataformas
    p.grounded = false;
    platforms.forEach(plat => {
        if(p.vx >= 0 && p.x+p.w > plat.x && p.x < plat.x+plat.w && p.y+p.h > plat.y && p.y+p.h < plat.y+plat.h+p.vy) {
            p.y = plat.y - p.h; p.vy = 0; p.grounded = true;
        }
    });

    if(p.y > 600) { state.hp = 0; die(); } // Caída al vacío

    cameraX = Math.max(cameraX, p.x - 200);

    // Disparo
    if(keys['x'] || keys['k']) {
        const now = Date.now();
        const g = arsenal[state.weapon];
        if(now - p.lastShot > g.rate) {
            const bx = p.x + (p.dir === 1 ? 35 : -5);
            if(g.multi) {
                [-0.2, 0, 0.2].forEach(v => p.bullets.push({x: bx, y: p.y+20, vx: g.speed*p.dir, vy: v*10, c: g.color}));
            } else {
                p.bullets.push({x: bx, y: p.y+20, vx: g.speed*p.dir, vy: 0, c: g.color});
            }
            p.lastShot = now;
        }
    }

    // IA ENEMIGOS Y PELIGROS
    if(Math.random() < 0.02 && enemies.length < 6) {
        enemies.push({ x: cameraX + 850, y: 0, w: 30, h: 50, hp: 20, type: 'SOLDIER' });
    }

    hazards.forEach((h, i) => {
        if(h.hp <= 0) return;
        // Torretas disparan si estás cerca
        if(Math.abs(h.x - p.x) < 500 && Date.now() - h.lastShot > 1500) {
            enemyBullets.push({x: h.x, y: h.y, vx: (p.x < h.x ? -5 : 5), vy: 0, c: 'red'});
            h.lastShot = Date.now();
        }
    });

    // Colisiones Balas -> Enemigos/Hazards
    p.bullets.forEach((b, bi) => {
        enemies.concat(hazards).forEach((en, ei) => {
            if(en.hp > 0 && b.x > en.x && b.x < en.x+40 && b.y > en.y && b.y < en.y+60) {
                en.hp -= arsenal[state.weapon].damage;
                p.bullets.splice(bi, 1);
                if(en.hp <= 0) {
                    createExplosion(en.x, en.y);
                    state.score += 200;
                    document.getElementById('sc').innerText = state.score;
                }
            }
        });
    });

    // Daño al Jugador
    enemyBullets.forEach((eb, ei) => {
        if(eb.x > p.x && eb.x < p.x+p.w && eb.y > p.y && eb.y < p.y+p.h) {
            state.hp -= 5; enemyBullets.splice(ei, 1);
            document.getElementById('hp').innerText = Math.max(0, state.hp);
            if(state.hp <= 0) die();
        }
    });

    // Limpieza
    particles.forEach((pt, i) => { pt.x += pt.vx; pt.y += pt.vy; pt.life -= 0.02; if(pt.life <= 0) particles.splice(i, 1); });
    p.bullets = p.bullets.filter(b => Math.abs(b.x - p.x) < 800);
}

function die() { alert("MISSION FAILED! SCORE: " + state.score); location.reload(); }

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-cameraX, 0);

    // Dibujar Plataformas
    platforms.forEach(plat => {
        ctx.fillStyle = "#333"; ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = "#0f0"; ctx.fillRect(plat.x, plat.y, plat.w, 4); // Hierba Alien
    });

    // Dibujar Fortalezas/Torretas
    hazards.forEach(h => {
        if(h.hp <= 0) return;
        ctx.fillStyle = "#666"; ctx.fillRect(h.x, h.y, 40, 40);
        ctx.fillStyle = "red"; ctx.beginPath(); ctx.arc(h.x+20, h.y+20, 10, 0, 7); ctx.fill(); // Ojo de la torre
    });

    // Dibujar Enemigos (Sprites 8-bit mejorados)
    enemies.forEach(en => {
        if(en.hp <= 0) return;
        en.x -= 2; // Caminan a la izquierda
        ctx.fillStyle = "red"; ctx.fillRect(en.x, en.y+15, 30, 35); // Traje
        ctx.fillStyle = "black"; ctx.fillRect(en.x+5, en.y, 20, 15); // Casco
    });

    // Dibujar Jugador
    ctx.save();
    ctx.translate(p.x, p.y);
    if(p.dir === -1) { ctx.scale(-1,1); ctx.translate(-p.w, 0); }
    ctx.fillStyle = "#25f"; ctx.fillRect(0, 20, 30, 30); // Pantalón
    ctx.fillStyle = "#f33"; ctx.fillRect(0, 5, 30, 20);  // Chaleco
    ctx.fillStyle = "#ffccaa"; ctx.fillRect(5, -5, 20, 15); // Cara
    ctx.fillStyle = "#777"; ctx.fillRect(20, 15, 25, 8); // Arma
    ctx.restore();

    // Balas y Partículas
    p.bullets.concat(enemyBullets).forEach(b => {
        b.x += b.vx; b.y += b.vy;
        ctx.fillStyle = b.c; ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, 7); ctx.fill();
    });

    particles.forEach(pt => {
        ctx.globalAlpha = pt.life;
        ctx.fillStyle = pt.c; ctx.fillRect(pt.x, pt.y, 6, 6);
    });
    ctx.globalAlpha = 1;

    ctx.restore();
    requestAnimationFrame(draw);
}

setInterval(update, 1000/60);
draw();
