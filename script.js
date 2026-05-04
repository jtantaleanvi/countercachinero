const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startOverlay = document.getElementById('start-overlay');

canvas.width = 800;
canvas.height = 450;

// CONFIGURACIÓN GLOBAL
let gameStarted = false;
const gravity = 0.7;
const keys = {};
let cameraX = 0; // Para el scroll del mapa

// ESTADO DEL JUEGO
const gameState = { score: 0, health: 100, weapon: 'Rifle' };

// ACTUALIZAR HUD (Textos de vida/score)
function updateHUD() {
    document.getElementById('score-val').innerText = gameState.score.toString().padStart(5, '0');
    document.getElementById('hp-val').innerText = Math.max(0, gameState.health);
    document.getElementById('weapon-val').innerText = gameState.weapon;
}

// DEFINICIÓN DE ARMAS Y SUS PROPIEDADES
const arsenal = {
    'Rifle': { fireRate: 250, bulletSpeed: 14, damage: 10, spread: false, color: '#fff' },
    'Spread': { fireRate: 400, bulletSpeed: 11, damage: 15, spread: true, color: '#ff0' }, // Balas amarillas
    'M-Gun': { fireRate: 90, bulletSpeed: 16, damage: 8, spread: false, color: '#0ff' }  // Balas cian
};

// JUGADOR
const player = {
    x: 100, y: 300, w: 35, h: 55,
    vx: 0, vy: 0,
    speed: 6, jump: -15,
    grounded: false, dir: 1,
    bullets: [],
    lastShot: 0
};

// ENEMIGOS (Soldados Rojos con IA)
let enemies = [];
const enemyDef = { w: 30, h: 45, speed: 2.5, health: 20 };

function spawnEnemy() {
    // Aparecen fuera de cámara, a la derecha
    const spawnX = cameraX + canvas.width + 50;
    enemies.push({ 
        x: spawnX, 
        y: 355, // Justo sobre el suelo
        hp: enemyDef.health,
        alive: true
    });
}

// CONTROL DE ENTRADA (Reforzado para WASD y Flechas)
window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === 'x' || e.key === 'X') shoot();
    // Cambiar armas con números 1, 2, 3
    if (e.key === '1') { gameState.weapon = 'Rifle'; updateHUD(); }
    if (e.key === '2') { gameState.weapon = 'Spread'; updateHUD(); }
    if (e.key === '3') { gameState.weapon = 'M-Gun'; updateHUD(); }
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// FUNCION DE DISPARO (Maneja las diferentes armas)
function shoot() {
    if (!gameStarted) return;
    const now = Date.now();
    const wConfig = arsenal[gameState.weapon];

    if (now - player.lastShot > wConfig.fireRate) {
        const bX = player.x + (player.dir === 1 ? player.w : -5);
        const bY = player.y + 22;

        if (wConfig.spread) {
            // Spread Gun: 3 balas en abanico (trigonometría básica)
            player.bullets.push({ x: bX, y: bY, vx: wConfig.bulletSpeed * player.dir, vy: -3, color: wConfig.color });
            player.bullets.push({ x: bX, y: bY, vx: wConfig.bulletSpeed * player.dir, vy: 0, color: wConfig.color });
            player.bullets.push({ x: bX, y: bY, vx: wConfig.bulletSpeed * player.dir, vy: 3, color: wConfig.color });
        } else {
            // Rifle o Machine Gun
            player.bullets.push({ x: bX, y: bY, vx: wConfig.bulletSpeed * player.dir, vy: 0, color: wConfig.color });
        }
        player.lastShot = now;
    }
}

// BUCLE PRINCIPAL DE ACTUALIZACIÓN (Lógica)
function update() {
    if (!gameStarted) return;

    // Movimiento del Jugador
    if (keys['arrowright'] || keys['d']) { player.vx = player.speed; player.dir = 1; }
    else if (keys['arrowleft'] || keys['a']) { player.vx = -player.speed; player.dir = -1; }
    else { player.vx *= 0.8; } // Fricción

    // Salto
    if ((keys['z'] || keys[' '] ) && player.grounded) {
        player.vy = player.jump;
        player.grounded = false;
    }

    // Físicas y Gravedad
    player.vy += gravity;
    player.x += player.vx;
    player.y += player.vy;

    // Colisión con el Suelo e Infinito
    if (player.y + player.h > 400) {
        player.y = 400 - player.h;
        player.vy = 0;
        player.grounded = true;
    }
    if (player.x < 0) player.x = 0;

    // CÁMARA CON SCROLL
    cameraX = player.x - 150;
    if (cameraX < 0) cameraX = 0;

    // Generación aleatoria de enemigos (Spawn)
    if (Math.random() < 0.02 && enemies.filter(e => e.alive).length < 5) {
        spawnEnemy();
    }

    // ACTUALIZAR ENEMIGOS (Movimiento e IA)
    enemies.forEach(en => {
        if (!en.alive) return;
        
        // IA: Correr hacia el jugador
        if (en.x > player.x) en.x -= enemyDef.speed;
        else en.x += enemyDef.speed;

        // Colisión Enemigo-Jugador (Daño)
        if (checkCollision(en, {x:player.x, y:player.y, w:player.w, h:player.h})) {
            gameState.health -= 0.5; // Daño continuo por contacto
            if (gameState.health <= 0) gameOver();
            updateHUD();
        }
    });

    // ACTUALIZAR BALAS Y COLISIONES
    player.bullets.forEach((b, i) => {
        b.x += b.vx;
        b.y += (b.vy || 0); // Para el Spread

        // Eliminar balas fuera de cámara
        if (b.x > cameraX + canvas.width + 100 || b.x < cameraX - 100) {
            player.bullets.splice(i, 1);
            return;
        }

        // Colisión Bala-Enemigo
        enemies.forEach((en, ei) => {
            if (en.alive && checkCollision({x:b.x, y:b.y, w:10, h:5}, {x:en.x, y:en.y, w:enemyDef.w, h:enemyDef.h})) {
                en.hp -= arsenal[gameState.weapon].damage;
                player.bullets.splice(i, 1); // Eliminar bala
                if (en.hp <= 0) {
                    en.alive = false;
                    gameState.score += 100;
                    updateHUD();
                }
            }
        });
    });
    
    // Limpiar enemigos muertos de la lista
    enemies = enemies.filter(en => en.alive || en.x > cameraX - 100);
}

// BUCLE PRINCIPAL DE DIBUJO (Gráficos procedimentales 8-bit)
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-cameraX, 0); // Mover el mundo entero

    // DIBUJAR EL SUELO (Textura de selva/metal procedimental)
    // Usamos el modulo (%) para que el suelo se repita infinitamente
    const groundOffset = Math.floor(cameraX / 40) * 40;
    for (let x = groundOffset - 80; x < groundOffset + canvas.width + 80; x += 40) {
        // Bloque base (Verde oscuro)
        ctx.fillStyle = "#1a4d1a"; 
        ctx.fillRect(x, 400, 40, 50);
        // Detalle hierba (Verde brillante)
        ctx.fillStyle = "#33aa33";
        ctx.fillRect(x + 5, 400, 30, 8);
        ctx.fillStyle = "#115511";
        ctx.fillRect(x, 408, 40, 4);
    }

    // DIBUJAR ENEMIGOS (Soldados Rojos)
    enemies.forEach(en => {
        if (!en.alive) return;
        ctx.fillStyle = "#ff3333"; // Cuerpo rojo
        ctx.fillRect(en.x, en.y, enemyDef.w, enemyDef.h);
        // Detalles casco y botas (Negro)
        ctx.fillStyle = "#000";
        ctx.fillRect(en.x, en.y, enemyDef.w, 8); // Casco
        ctx.fillRect(en.x + 5, en.y + enemyDef.h - 10, 20, 10); // Botas
    });

    // DIBUJAR JUGADOR (Estilo Contra NES Procedimental)
    ctx.save();
    ctx.translate(player.x, player.y);
    if (player.dir === -1) { ctx.translate(player.w, 0); ctx.scale(-1, 1); } // Girar sprite

    // Pantalón (Azul)
    ctx.fillStyle = "#2255ff"; ctx.fillRect(5, 30, 25, 25);
    // Chaleco (Rojo)
    ctx.fillStyle = "#ff3333"; ctx.fillRect(5, 10, 25, 20);
    // Piel (Naranja/Carne)
    ctx.fillStyle = "#ffaa88"; ctx.fillRect(8, 5, 18, 15);
    // Pelo/Mochila (Marrón)
    ctx.fillStyle = "#663300"; ctx.fillRect(10, 0, 15, 8); ctx.fillRect(-2, 12, 8, 20);
    // ARMA (Gris)
    ctx.fillStyle = "#888"; ctx.fillRect(20, 18, 25, 7);
    ctx.restore();

    // DIBUJAR BALAS
    player.bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); // Balas redondas retro
        ctx.fill();
    });

    ctx.restore(); // Restaurar cámara
}

// UTILIDADES
function checkCollision(r1, r2) {
    return (r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y);
}

function gameOver() {
    alert("GAME OVER\nScore: " + gameState.score);
    location.reload();
}

// LOOP DEL JUEGO
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// INICIAR
startOverlay.addEventListener('click', () => {
    gameStarted = true;
    startOverlay.style.display = 'none';
    window.focus(); // Forzar foco para teclado
    updateHUD();
});

gameLoop();
