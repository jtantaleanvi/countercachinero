const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 450;

let gameRunning = false;
let cameraX = 0;
const keys = {};
let gameFrame = 0; // Para el spawn de enemigos

// ESTADO DEL JUEGO (Daño y Score)
const state = { hp: 100, score: 0, weapon: 'RIFLE', gameOver: false };
const arsenal = {
    'RIFLE': { rate: 200, speed: 12, color: 'white', damage: 15, multi: false },
    'SPREAD': { rate: 450, speed: 10, color: 'yellow', damage: 20, multi: true },
    'M-GUN': { rate: 80, speed: 15, color: 'cyan', damage: 10, multi: false }
};

// JUGADOR (Con físicas de gravedad)
const player = { 
    x: 100, y: 300, w: 35, h: 50, 
    vx: 0, vy: 0, 
    dir: 1, grounded: false, 
    bullets: [], lastShot: 0 
};

// ENTIDADES (Enemigos y Torretas)
let enemies = [];
let hazards = []; // Torretas/Fortalezas estáticas
let enemyBullets = [];

// Función para reiniciar o iniciar el juego
function iniciarJuego() {
    state.hp = 100; state.score = 0; state.gameOver = false;
    player.x = 100; player.y = 300;
    enemies = []; hazards = []; enemyBullets = []; cameraX = 0;
    
    // Generar fortalezas iniciales
    for(let i=0; i<10; i++) {
        hazards.push({ x: 800 + i*600, y: 340, w: 40, h: 60, hp: 50, type: 'TURRET', lastShot: 0 });
    }
    
    gameRunning = true;
    document.getElementById('overlay').style.display = 'none';
    window.focus();
}

// CONTROL DE TECLADO REFORZADO
window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (['1','2','3'].includes(e.key)) {
        state.weapon = e.key === '1' ? 'RIFLE' : e.key === '2' ? 'SPREAD' : 'M-GUN';
        document.getElementById('wp-val').innerText = state.weapon;
    }
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// Función de colisión universal AABB
function checkCollision(r1, r2) {
    return (
        r1.x < r2.x + r2.w &&
        r1.x + r1.w > r2.x &&
        r1.y < r2.y + r2.h &&
        r1.y + r1.h > r2.y
    );
}

function update() {
    if (!gameRunning || state.gameOver) return;
    gameFrame++;

    // Movimiento
    if (keys['arrowright'] || keys['d']) { player.vx = 6; player.dir = 1; }
    else if (keys['arrowleft'] || keys['a']) { player.vx = -6; player.dir = -1; }
    else { player.vx *= 0.8; }

    if ((keys['z'] || keys[' ']) && player.grounded) { player.vy = -15; player.grounded = false; }

    player.vy += 0.8; // Gravedad
    player.x += player.vx; player.y += player.vy;

    // --- CÁMARA Y PISO INFINITO ---
    if (player.y > 350) { player.y = 350; player.vy = 0; player.grounded = true; }
    
    // Muro de cámara: no deja ir más atrás de la vista actual
    if (player.x > cameraX + 400) cameraX = player.x - 400;
    if (player.x < cameraX) player.x = cameraX;

    // Disparo Jugador
    if (keys['x'] || keys['k']) {
        const now = Date.now();
        const gun = arsenal[state.weapon];
        if (now - player.lastShot > gun.rate) {
            const bx = player.x + (player.dir === 1 ? 35 : -5);
            if (gun.multi) {
                [-0.2, 0, 0.2].forEach(v => player.bullets.push({x: bx, y: player.y+20, w:8, h:8, vx: gun.speed*player.dir, vy: v*10, c: gun.color}));
            } else {
                player.bullets.push({x: bx, y: player.y+20, w:8, h:8, vx: gun.speed*player.dir, vy: 0, c: gun.color});
            }
            player.lastShot = now;
        }
    }

    // Actualizar Balas del Jugador (Con colisiones)
    player.bullets.forEach((b, bi) => {
        b.x += b.vx; b.y += b.vy;
        
        // Colisión con Enemigos
        enemies.forEach((en, ei) => {
            if (checkCollision(b, en)) {
                en.hp -= arsenal[state.weapon].damage;
                player.bullets.splice(bi, 1); // Borrar bala
                if (en.hp <= 0) {
                    enemies.splice(ei, 1); // Borrar enemigo
                    state.score += 100;
                    document.getElementById('sc-val').innerText = state.score;
                }
            }
        });
        
        // Colisión con Torretas (Hazards)
        hazards.forEach((h, hi) => {
            if (checkCollision(b, h)) {
                h.hp -= arsenal[state.weapon].damage;
                player.bullets.splice(bi, 1);
                if (h.hp <= 0) {
                    hazards.splice(hi, 1); // Torreta explota
                    state.score += 500;
                    document.getElementById('sc-val').innerText = state.score;
                }
            }
        });
    });

    // Spawn Dinámico de Enemigos
    if (gameFrame % 90 === 0 && enemies.length < 5) {
        enemies.push({ x: cameraX + 850, y: 350, w: 35, h: 50, hp: 30, lastShot: 0 });
    }

    // IA ENEMIGOS Y PELIGROS (Disparo y colisión al jugador)
    enemies.forEach((en, i) => {
        en.x -= 3; // Caminan hacia ti
        
        // Colisión de contacto
        if (checkCollision(player, en)) {
            state.hp -= 0.5; // Daño continuo por contacto
            updateHP();
        }
    });

    // IA TORRETAS (Disparan si estás cerca)
    hazards.forEach(h => {
        if (Math.abs(h.x - player.x) < 500 && Date.now() - h.lastShot > 1800) {
            enemyBullets.push({ x: h.x, y: h.y + 10, w: 10, h: 10, vx: (player.x < h.x ? -6 : 6), vy: 0, c: 'red' });
            h.lastShot = Date.now();
        }
    });

    // Actualizar Balas Enemigas (Con daño al jugador)
    enemyBullets.forEach((eb, ei) => {
        eb.x += eb.vx; eb.y += eb.vy;
        
        if (checkCollision(eb, player)) {
            state.hp -= 15; // Daño de proyectil es alto
            enemyBullets.splice(ei, 1);
            updateHP();
        }
    });

    // Limpieza de objetos fuera de pantalla
    player.bullets = player.bullets.filter(b => Math.abs(b.x - player.x) < 900);
    enemyBullets = enemyBullets.filter(eb => Math.abs(eb.x - player.x) < 900);
    enemies = enemies.filter(en => en.x > cameraX - 100); // Si los pasas de largo, se borran
}

function updateHP() {
    const hpVal = document.getElementById('hp-val');
    hpVal.innerText = Math.max(0, Math.floor(state.hp));
    if (state.hp <= 0 && !state.gameOver) {
        state.gameOver = true;
        alert("¡Has muerto, soldado! Score final: " + state.score);
        location.reload();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-cameraX, 0);

    // SUELO INFINITO
    let startTile = Math.floor(cameraX / 100);
    for (let i = startTile; i < startTile + 10; i++) {
        let tx = i * 100;
        ctx.fillStyle = "#141"; ctx.fillRect(tx, 400, 98, 50);
        ctx.fillStyle = "#2f2"; ctx.fillRect(tx, 400, 98, 5); 
    }

    // Dibujar Torretas (Fortalezas de Contra)
    hazards.forEach(h => {
        ctx.fillStyle = "#555"; ctx.fillRect(h.x, h.y, h.w, h.h); // Torre
        ctx.fillStyle = "red"; ctx.beginPath(); ctx.arc(h.x + 20, h.y + 20, 10, 0, 7); ctx.fill(); // Ojo de la torre
    });

    // Enemigos (Soldados Rojos)
    enemies.forEach(en => {
        ctx.fillStyle = "red"; ctx.fillRect(en.x, en.y, en.w, en.h); // Cuerpo
        ctx.fillStyle = "black"; ctx.fillRect(en.x+5, en.y+5, 25, 10); // Visor
    });

    // Jugador (Contra Style)
    ctx.save();
    ctx.translate(player.x, player.y);
    if(player.dir === -1) { ctx.scale(-1, 1); ctx.translate(-player.w, 0); }
    ctx.fillStyle = "#25f"; ctx.fillRect(0, 25, 30, 25); 
    ctx.fillStyle = "#f33"; ctx.fillRect(0, 5, 30, 20);  
    ctx.fillStyle = "#ffccaa"; ctx.fillRect(5, -5, 20, 15);
    ctx.fillStyle = "white"; ctx.fillRect(20, 15, 25, 8); 
    ctx.restore();

    // Dibujar Balas
    player.bullets.concat(enemyBullets).forEach(b => {
        ctx.fillStyle = b.c;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.w / 2, 0, Math.PI * 2); // Balas redondas retro
        ctx.fill();
    });

    ctx.restore();
    requestAnimationFrame(draw);
}

setInterval(update, 1000/60);
draw();
