const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 450;

// --- VARIABLES GLOBALES ---
let gameRunning = false;
let cameraX = 0;
let maxGenX = 800; // Hasta dónde hemos generado nivel
const keys = {};

// ESTADO DEL JUEGO
const state = { hp: 100, score: 0, weapon: 'RIFLE', gameOver: false };

// ARSENAL DE ARMAS
const arsenal = {
    'RIFLE': { rate: 200, speed: 14, color: 'white', damage: 15, w: 10, h: 4, multi: false },
    'SPREAD': { rate: 450, speed: 12, color: 'yellow', damage: 20, w: 8, h: 8, multi: true },
    'M-GUN': { rate: 90, speed: 16, color: 'cyan', damage: 8, w: 6, h: 6, multi: false }
};

// JUGADOR
const player = { 
    x: 100, y: 300, w: 30, h: 50, 
    vx: 0, vy: 0, 
    dir: 1, grounded: false, 
    lastShot: 0 
};

// LISTAS DE ENTIDADES
let bullets = [];
let enemyBullets = [];
let enemies = [];
let hazards = []; // Torretas
let platforms = [];

// --- FUNCIÓN DE INICIO ---
function iniciarJuego() {
    // Resetear todo al iniciar o reiniciar
    state.hp = 100; state.score = 0; state.gameOver = false;
    player.x = 100; player.y = 300; player.vx = 0; player.vy = 0;
    bullets = []; enemyBullets = []; enemies = []; hazards = []; platforms = [];
    cameraX = 0; maxGenX = 800;
    
    document.getElementById('sc-val').innerText = state.score;
    document.getElementById('hp-val').innerText = state.hp;
    
    // Generar primer tramo del nivel
    generarMundo(0, maxGenX);

    gameRunning = true;
    document.getElementById('overlay').style.display = 'none';
    window.focus();
}

// --- GENERADOR INFINITO DE MUNDO ---
function generarMundo(startX, endX) {
    for (let x = startX; x < endX; x += 400) {
        // Generar una torreta aleatoria cada cierto espacio
        if (Math.random() > 0.4 && x > 400) {
            hazards.push({ x: x + 200, y: 310, w: 40, h: 40, hp: 60, lastShot: 0 });
        }
        // Generar algunas plataformas
        if (Math.random() > 0.5) {
            platforms.push({ x: x + 100, y: 230 + Math.random() * 40, w: 100, h: 15 });
        }
    }
}

// --- CONTROLES ---
window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (['1','2','3'].includes(e.key)) {
        state.weapon = e.key === '1' ? 'RIFLE' : e.key === '2' ? 'SPREAD' : 'M-GUN';
        document.getElementById('wp-val').innerText = state.weapon;
    }
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// --- COLISIONES (AABB - Cuadros delimitadores) ---
function isColliding(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// --- BUCLE PRINCIPAL DE ACTUALIZACIÓN ---
function update() {
    if (!gameRunning || state.gameOver) return;

    // 1. Físicas y Movimiento del Jugador
    if (keys['arrowright'] || keys['d']) { player.vx = 6; player.dir = 1; }
    else if (keys['arrowleft'] || keys['a']) { player.vx = -6; player.dir = -1; }
    else { player.vx *= 0.7; } // Fricción

    if ((keys['z'] || keys[' '] || keys['w'] || keys['arrowup']) && player.grounded) { 
        player.vy = -14; 
        player.grounded = false; 
    }

    player.vy += 0.8; // Gravedad
    player.x += player.vx; 
    player.y += player.vy;

    // 2. Colisión con el Suelo Base (Y=350) - SUELO INFINITO
    player.grounded = false;
    if (player.y > 350) { 
        player.y = 350; 
        player.vy = 0; 
        player.grounded = true; 
    }

    // Colisión con Plataformas Flotantes
    platforms.forEach(plat => {
        if (player.vy > 0 && player.x + player.w > plat.x && player.x < plat.x + plat.w &&
            player.y + player.h > plat.y && player.y + player.h < plat.y + 15 + player.vy) {
            player.y = plat.y - player.h; player.vy = 0; player.grounded = true;
        }
    });

    // 3. Control de la Cámara (El Muro de la Muerte)
    if (player.x > cameraX + 350) cameraX = player.x - 350; // Empuja la cámara
    if (player.x < cameraX) player.x = cameraX; // Bloquea al jugador (No puede retroceder de la pantalla)

    // Generación dinámica si avanzas mucho
    if (cameraX + 1200 > maxGenX) {
        generarMundo(maxGenX, maxGenX + 800);
        maxGenX += 800;
    }

    // 4. Disparo del Jugador
    if (keys['x'] || keys['k']) {
        const now = Date.now();
        const gun = arsenal[state.weapon];
        if (now - player.lastShot > gun.rate) {
            const bx = player.x + (player.dir === 1 ? 30 : -10);
            if (gun.multi) {
                [-0.15, 0, 0.15].forEach(v => bullets.push({x: bx, y: player.y+20, w: gun.w, h: gun.h, vx: gun.speed*player.dir, vy: v*10, c: gun.color}));
            } else {
                bullets.push({x: bx, y: player.y+20, w: gun.w, h: gun.h, vx: gun.speed*player.dir, vy: 0, c: gun.color});
            }
            player.lastShot = now;
        }
    }

    // 5. Generación de Enemigos (Rage Soldiers)
    if (Math.random() < 0.02 && enemies.length < 6) {
        enemies.push({ x: cameraX + 850, y: 350, w: 30, h: 50, hp: 25, lastShot: 0 });
    }

    // 6. IA Enemigos (Soldados que caminan)
    enemies.forEach((en, i) => {
        en.x -= 3; // Corren hacia ti
        
        // Disparan a veces
        if (Date.now() - en.lastShot > 1500 + Math.random()*1000) {
            enemyBullets.push({ x: en.x, y: en.y + 15, w: 8, h: 8, vx: -6, vy: 0, c: '#ff3333' });
            en.lastShot = Date.now();
        }

        // Daño por tocar al enemigo
        if (isColliding(player, en)) {
            aplicarDaño(1); // Te quita vida rápido si lo tocas
        }
    });

    // 7. IA Torretas (Hazards)
    hazards.forEach(h => {
        if (h.x > cameraX - 100 && h.x < cameraX + 800) { // Solo disparan si están en pantalla
            if (Date.now() - h.lastShot > 2000) {
                // Apuntan hacia el jugador
                const dirX = player.x < h.x ? -5 : 5;
                enemyBullets.push({ x: h.x + 20, y: h.y + 10, w: 10, h: 10, vx: dirX, vy: 0, c: '#ff00ff' });
                h.lastShot = Date.now();
            }
        }
    });

    // 8. Físicas y Colisiones de Balas del JUGADOR
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.vx; b.y += b.vy;
        let hit = false;

        // Contra Enemigos
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (isColliding(b, enemies[j])) {
                enemies[j].hp -= arsenal[state.weapon].damage;
                hit = true;
                if (enemies[j].hp <= 0) {
                    state.score += 100;
                    enemies.splice(j, 1);
                }
                break;
            }
        }

        // Contra Torretas
        if (!hit) {
            for (let j = hazards.length - 1; j >= 0; j--) {
                if (isColliding(b, hazards[j])) {
                    hazards[j].hp -= arsenal[state.weapon].damage;
                    hit = true;
                    if (hazards[j].hp <= 0) {
                        state.score += 500;
                        hazards.splice(j, 1);
                    }
                    break;
                }
            }
        }

        if (hit || b.x < cameraX - 100 || b.x > cameraX + 900) {
            bullets.splice(i, 1);
            document.getElementById('sc-val').innerText = state.score;
        }
    }

    // 9. Físicas de Balas ENEMIGAS (Daño al Jugador)
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let eb = enemyBullets[i];
        eb.x += eb.vx; eb.y += eb.vy;

        if (isColliding(eb, player)) {
            aplicarDaño(15); // Disparo duele mucho
            enemyBullets.splice(i, 1);
        } else if (eb.x < cameraX - 100 || eb.x > cameraX + 900) {
            enemyBullets.splice(i, 1);
        }
    }

    // Limpiar entidades muy atrás
    enemies = enemies.filter(en => en.x > cameraX - 200);
    hazards = hazards.filter(h => h.x > cameraX - 300);
    platforms = platforms.filter(p => p.x > cameraX - 300);
}

// --- GESTIÓN DE VIDA Y MUERTE ---
function aplicarDaño(cantidad) {
    state.hp -= cantidad;
    document.getElementById('hp-val').innerText = Math.max(0, Math.floor(state.hp));
    if (state.hp <= 0 && !state.gameOver) {
        state.gameOver = true;
        setTimeout(() => {
            alert(`¡GAME OVER!\nSobreviviste como un campeón.\nPuntaje Final: ${state.score}`);
            document.getElementById('overlay').style.display = 'flex';
        }, 100);
    }
}

// --- BUCLE DE DIBUJO ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-cameraX, 0); // Mueve el "mundo" según la cámara

    // 1. DIBUJAR SUELO (Infinito visualmente basado en cámara)
    const startTile = Math.floor(cameraX / 100);
    for (let i = startTile - 1; i < startTile + 10; i++) {
        let tx = i * 100;
        ctx.fillStyle = "#1a4a2a"; ctx.fillRect(tx, 400, 99, 50); // Tierra
        ctx.fillStyle = "#33ff33"; ctx.fillRect(tx, 400, 99, 6);  // Hierba radiactiva
    }

    // 2. DIBUJAR PLATAFORMAS
    platforms.forEach(plat => {
        ctx.fillStyle = "#555"; ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = "#888"; ctx.fillRect(plat.x, plat.y, plat.w, 4);
    });

    // 3. DIBUJAR TORRETAS
    hazards.forEach(h => {
        ctx.fillStyle = "#444"; ctx.fillRect(h.x, h.y, h.w, h.h); // Base
        ctx.fillStyle = "#222"; ctx.fillRect(h.x + 5, h.y + 5, 30, 15); // Cabeza
        ctx.fillStyle = "red"; ctx.beginPath(); ctx.arc(h.x + 20, h.y + 12, 5, 0, 7); ctx.fill(); // Ojo láser
    });

    // 4. DIBUJAR ENEMIGOS (Con cara de Meme)
    enemies.forEach(en => {
        ctx.fillStyle = "#ff2222"; ctx.fillRect(en.x, en.y, en.w, en.h); // Traje
        
        // Cara Rage (Ojos blancos, pupilas negras, boca)
        ctx.fillStyle = "white"; 
        ctx.fillRect(en.x + 4, en.y + 10, 8, 8); 
        ctx.fillRect(en.x + 18, en.y + 10, 8, 8);
        
        ctx.fillStyle = "black"; 
        ctx.fillRect(en.x + 6, en.y + 12, 4, 4); // Mirando a la izquierda
        ctx.fillRect(en.x + 20, en.y + 12, 4, 4);
        
        ctx.fillRect(en.x + 6, en.y + 30, 18, 4); // Boca gritando
    });

    // 5. DIBUJAR JUGADOR
    ctx.save();
    ctx.translate(player.x, player.y);
    if(player.dir === -1) { ctx.scale(-1, 1); ctx.translate(-player.w, 0); } // Voltear si mira a la izquierda
    
    ctx.fillStyle = "#2255ff"; ctx.fillRect(0, 25, 30, 25); // Pantalón
    ctx.fillStyle = "#ff3333"; ctx.fillRect(0, 5, 30, 20);  // Chaleco
    ctx.fillStyle = "#ffccaa"; ctx.fillRect(5, -10, 20, 15); // Cabeza
    ctx.fillStyle = "red"; ctx.fillRect(5, -8, 20, 4); // Cinta de Rambo
    ctx.fillStyle = "#aaaaaa"; ctx.fillRect(20, 15, 25, 8); // Arma
    ctx.restore();

    // 6. DIBUJAR BALAS
    bullets.forEach(b => {
        ctx.fillStyle = b.c; ctx.fillRect(b.x, b.y, b.w, b.h);
    });
    enemyBullets.forEach(eb => {
        ctx.fillStyle = eb.c; ctx.beginPath(); ctx.arc(eb.x + eb.w/2, eb.y + eb.h/2, eb.w/2, 0, 7); ctx.fill();
    });

    ctx.restore();
    requestAnimationFrame(draw);
}

// Arrancar bucle
setInterval(update, 1000/60);
draw();
