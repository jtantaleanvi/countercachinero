const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 450;

let running = false;
let cameraX = 0;
const keys = {};

const state = { hp: 100, score: 0, weapon: 'RIFLE' };
const arsenal = {
    'RIFLE': { rate: 200, speed: 12, color: '#fff' },
    'SPREAD': { rate: 450, speed: 10, color: '#ff0', spread: true },
    'M-GUN': { rate: 90, speed: 15, color: '#0ff' }
};

const p = { x: 100, y: 300, w: 30, h: 50, vx: 0, vy: 0, dir: 1, grounded: false, bullets: [], lastShot: 0 };
let enemies = [];
let platforms = [];

// Generar plataformas iniciales
for(let i=0; i<20; i++) {
    platforms.push({ x: i*400, y: 350 + Math.random()*50, w: 300, h: 20 });
}

function start() {
    running = true;
    document.getElementById('overlay').style.display = 'none';
}

window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if(e.key === '1') state.weapon = 'RIFLE';
    if(e.key === '2') state.weapon = 'SPREAD';
    if(e.key === '3') state.weapon = 'M-GUN';
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function shoot(obj, isEnemy = false) {
    const gun = arsenal[state.weapon];
    const bDir = isEnemy ? (obj.x > p.x ? -1 : 1) : p.dir;
    const bColor = isEnemy ? 'red' : gun.color;
    const bSpeed = isEnemy ? 5 : gun.speed;

    const newBullet = (vy = 0) => ({ x: obj.x+15, y: obj.y+20, vx: bSpeed*bDir, vy, c: bColor, fromEnemy: isEnemy });

    if(!isEnemy && gun.spread) {
        obj.bullets.push(newBullet(-2), newBullet(0), newBullet(2));
    } else {
        (isEnemy ? enemyBullets : p.bullets).push(newBullet(0));
    }
}

let enemyBullets = [];

function update() {
    if(!running) return;

    // Movimiento Jugador
    if(keys['arrowright'] || keys['d']) { p.vx = 6; p.dir = 1; }
    else if(keys['arrowleft'] || keys['a']) { p.vx = -6; p.dir = -1; }
    else { p.vx *= 0.8; }

    if((keys['z'] || keys[' ']) && p.grounded) { p.vy = -14; p.grounded = false; }
    p.vy += 0.7; p.x += p.vx; p.y += p.vy;

    // Colisión con plataformas y suelo infinito
    p.grounded = false;
    // Suelo base siempre presente
    if(p.y > 380) { p.y = 380; p.vy = 0; p.grounded = true; }
    
    platforms.forEach(plat => {
        if(p.vx >= 0 && p.x + p.w > plat.x && p.x < plat.x + plat.w && p.y + p.h > plat.y && p.y + p.h < plat.y + plat.h + p.vy) {
            p.y = plat.y - p.h; p.vy = 0; p.grounded = true;
        }
    });

    cameraX = p.x - 150;

    // Disparo Jugador
    if(keys['x']) {
        const now = Date.now();
        if(now - p.lastShot > arsenal[state.weapon].rate) {
            shoot(p); p.lastShot = now;
        }
    }

    // IA Enemigos
    if(Math.random() < 0.015) {
        enemies.push({ x: cameraX + 850, y: 300, w: 30, h: 50, lastShot: 0 });
    }

    enemies.forEach((en, i) => {
        en.x += (en.x > p.x ? -2 : 2); // Te persiguen
        
        // Disparo enemigo cada 2 segundos
        const now = Date.now();
        if(now - en.lastShot > 2000) {
            shoot(en, true);
            en.lastShot = now;
        }

        // Colisión bala jugador -> enemigo
        p.bullets.forEach((b, bi) => {
            if(b.x > en.x && b.x < en.x+en.w && b.y > en.y && b.y < en.y+en.h) {
                enemies.splice(i, 1); p.bullets.splice(bi, 1);
                state.score += 100;
            }
        });
    });

    // Colisión bala enemigo -> jugador
    enemyBullets.forEach((eb, ei) => {
        if(eb.x > p.x && eb.x < p.x+p.w && eb.y > p.y && eb.y < p.y+p.h) {
            state.hp -= 10; enemyBullets.splice(ei, 1);
            if(state.hp <= 0) location.reload();
        }
    });

    // Limpieza de proyectiles
    p.bullets = p.bullets.filter(b => Math.abs(b.x - p.x) < 1000);
    enemyBullets = enemyBullets.filter(b => Math.abs(b.x - p.x) < 1000);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-cameraX, 0);

    // Dibujar suelo decorado
    ctx.fillStyle = "#151";
    ctx.fillRect(cameraX, 430, 800, 20);
    for(let i=0; i<20; i++) {
        ctx.fillStyle = "#262";
        ctx.fillRect(Math.floor(cameraX/40)*40 + (i*40), 430, 38, 5);
    }

    // Dibujar Plataformas (Estilo roca)
    platforms.forEach(plat => {
        ctx.fillStyle = "#444";
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = "#666";
        ctx.fillRect(plat.x, plat.y, plat.w, 4);
    });

    // Enemigos (Soldado Rojo 8-bit)
    enemies.forEach(en => {
        ctx.fillStyle = "#f33"; ctx.fillRect(en.x, en.y+15, 30, 25); // Cuerpo
        ctx.fillStyle = "#000"; ctx.fillRect(en.x+5, en.y, 20, 15); // Casco
        ctx.fillStyle = "#555"; ctx.fillRect(en.x-5, en.y+20, 15, 8); // Arma
    });

    // Jugador (Soldado Azul 8-bit)
    ctx.save();
    ctx.translate(p.x, p.y);
    if(p.dir === -1) { ctx.scale(-1, 1); ctx.translate(-p.w, 0); }
    ctx.fillStyle = "#35f"; ctx.fillRect(0, 20, 30, 30); // Pantalón
    ctx.fillStyle = "#f85"; ctx.fillRect(5, 0, 20, 20);  // Piel
    ctx.fillStyle = "#fff"; ctx.fillRect(20, 15, 20, 8);  // Arma
    ctx.restore();

    // Balas
    p.bullets.concat(enemyBullets).forEach(b => {
        b.x += b.vx; b.y += b.vy;
        ctx.fillStyle = b.c;
        ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill();
    });

    ctx.restore();

    // UI fixed
    ctx.fillStyle = "white";
    ctx.font = "bold 16px Courier New";
    ctx.fillText(`SCORE: ${state.score}  VIDA: ${state.hp}%  ARMA: ${state.weapon}`, 20, 30);

    requestAnimationFrame(draw);
}

setInterval(update, 1000/60);
draw();
