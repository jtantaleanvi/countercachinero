const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 450;

let gameRunning = false;
let cameraX = 0;
const keys = {};

const state = { hp: 100, score: 0, weapon: 'RIFLE' };
const arsenal = {
    'RIFLE': { rate: 200, speed: 12, color: 'white', damage: 10, multi: false },
    'SPREAD': { rate: 450, speed: 10, color: 'yellow', damage: 15, multi: true },
    'M-GUN': { rate: 90, speed: 15, color: 'cyan', damage: 8, multi: false }
};

const p = { 
    x: 100, y: 300, w: 35, h: 50, 
    vx: 0, vy: 0, 
    dir: 1, grounded: false, 
    bullets: [], lastShot: 0 
};

let enemies = [];
let enemyBullets = [];
let platforms = [];

function iniciarJuego() {
    gameRunning = true;
    document.getElementById('overlay').style.display = 'none';
    // Generar plataformas iniciales elevadas
    for(let i=0; i<100; i++) {
        if(i % 5 === 0) platforms.push({ x: i*200, y: 220, w: 150, h: 15 });
    }
    window.focus();
}

window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (['1','2','3'].includes(e.key)) {
        state.weapon = e.key === '1' ? 'RIFLE' : e.key === '2' ? 'SPREAD' : 'M-GUN';
        document.getElementById('wp-val').innerText = state.weapon;
    }
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function update() {
    if (!gameRunning) return;

    // Movimiento
    if (keys['arrowright'] || keys['d']) { p.vx = 6; p.dir = 1; }
    else if (keys['arrowleft'] || keys['a']) { p.vx = -6; p.dir = -1; }
    else { p.vx *= 0.8; }

    if ((keys['z'] || keys[' ']) && p.grounded) { p.vy = -15; p.grounded = false; }

    p.vy += 0.8; 
    p.x += p.vx; p.y += p.vy;

    // --- FIX DEFINITIVO DEL PISO ---
    // El suelo siempre estará en Y=350, sin importar la X
    if (p.y > 350) { 
        p.y = 350; 
        p.vy = 0; 
        p.grounded = true; 
    }

    // --- FIX DE LA CÁMARA (No te deja ir al vacío) ---
    if (p.x > cameraX + 400) cameraX = p.x - 400;
    if (p.x < cameraX) p.x = cameraX; 

    // Colisión plataformas elevadas
    platforms.forEach(plat => {
        if (p.vy > 0 && p.x + p.w > plat.x && p.x < plat.x + plat.w &&
            p.y + p.h > plat.y && p.y + p.h < plat.y + 5 + p.vy) {
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

    // Enemigos (Aparecen solo en el suelo o plataformas, no en el aire loco)
    if (Math.random() < 0.02 && enemies.length < 5) {
        enemies.push({ x: cameraX + 850, y: 350, hp: 20, lastShot: 0 });
    }

    enemies.forEach((en, i) => {
        en.x -= 2.5; // Los enemigos vienen hacia ti
        if (Date.now() - en.lastShot > 1800) {
            enemyBullets.push({ x: en.x, y: en.y + 20, vx: -5, vy: 0, c: 'red' });
            en.lastShot = Date.now();
        }

        // Balas del jugador matan enemigos
        p.bullets.forEach((b, bi) => {
            if (b.x > en.x && b.x < en.x + 35 && b.y > en.y && b.y < en.y + 50) {
                en.hp -= arsenal[state.weapon].damage;
                p.bullets.splice(bi, 1);
                if (en.hp <= 0) {
                    state.score += 100;
                    document.getElementById('sc-val').innerText = state.score;
                    enemies.splice(i, 1);
                }
            }
        });
    });

    // Daño al jugador
    enemyBullets.forEach((eb, ei) => {
        if (eb.x > p.x && eb.x < p.x + p.w && eb.y > p.y && eb.y < p.y + p.h) {
            state.hp -= 5;
            enemyBullets.splice(ei, 1);
            document.getElementById('hp-val').innerText = Math.max(0, state.hp);
            if (state.hp <= 0) location.reload();
        }
    });

    // Limpieza
    p.bullets = p.bullets.filter(b => Math.abs(b.x - p.x) < 850);
    enemyBullets = enemyBullets.filter(eb => Math.abs(eb.x - p.x) < 850);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-cameraX, 0);

    // --- DIBUJO DE MUNDO INFINITO ---
    // Dibujamos el suelo basándonos en cameraX para que NUNCA se acabe
    let startTile = Math.floor(cameraX / 100);
    for (let i = startTile; i < startTile + 12; i++) {
        let tx = i * 100;
        ctx.fillStyle = "#141"; ctx.fillRect(tx, 400, 98, 50); // Tierra
        ctx.fillStyle = "#2f2"; ctx.fillRect(tx, 400, 98, 5);  // Pasto
    }

    // Plataformas
    ctx.fillStyle = "#555";
    platforms.forEach(plat => {
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = "#888"; ctx.fillRect(plat.x, plat.y, plat.w, 3); ctx.fillStyle = "#555";
    });

    // Enemigos (Soldados Rojos con IA de disparo)
    enemies.forEach(en => {
        ctx.fillStyle = "#f33"; ctx.fillRect(en.x, en.y, 35, 50); // Cuerpo
        ctx.fillStyle = "#000"; ctx.fillRect(en.x+5, en.y+5, 25, 10); // Visor
    });

    // Jugador
    ctx.save();
    ctx.translate(p.x, p.y);
    if(p.dir === -1) { ctx.scale(-1, 1); ctx.translate(-p.w, 0); }
    ctx.fillStyle = "#25f"; ctx.fillRect(0, 25, 30, 25); // Pantalón
    ctx.fillStyle = "#f33"; ctx.fillRect(0, 5, 30, 20);  // Chaleco
    ctx.fillStyle = "#ffccaa"; ctx.fillRect(5, -5, 20, 15); // Cabeza
    ctx.fillStyle = "#888"; ctx.fillRect(20, 15, 25, 8); // Arma
    ctx.restore();

    // Balas de todos
    p.bullets.concat(enemyBullets).forEach(b => {
        b.x += b.vx; b.y += b.vy;
        ctx.fillStyle = b.c; ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, 7); ctx.fill();
    });

    ctx.restore();
    requestAnimationFrame(draw);
}

setInterval(update, 1000/60);
draw();
