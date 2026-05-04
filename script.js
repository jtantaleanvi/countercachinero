const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const hpDisplay = document.getElementById('hp');

canvas.width = 800;
canvas.height = 450;

let gameRunning = false;
const gravity = 0.8;
const keys = {};

// CONFIGURACIÓN DEL JUGADOR
const player = {
    x: 50, y: 300, w: 30, h: 50,
    vx: 0, vy: 0,
    speed: 6, jump: -15,
    grounded: false, dir: 1,
    bullets: []
};

// MAPA (Plataformas)
const platforms = [
    {x: 0, y: 400, w: 2000, h: 50}, // Suelo largo
    {x: 300, y: 300, w: 200, h: 20},
    {x: 600, y: 200, w: 200, h: 20},
    {x: 900, y: 300, w: 200, h: 20}
];

// ENEMIGOS
let enemies = [{x: 500, y: 360, w: 30, h: 40, alive: true}];

// CONTROL DE TECLADO REFORZADO
window.addEventListener('keydown', e => { 
    keys[e.key] = true; 
    if(e.key === 'x' || e.key === 'X') shoot(); 
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

function startGame() {
    gameRunning = true;
    overlay.style.display = 'none';
    window.focus(); // Asegura que el navegador escuche las teclas
}

function shoot() {
    if(!gameRunning) return;
    player.bullets.push({
        x: player.x + (player.dir === 1 ? 30 : -5),
        y: player.y + 20,
        vx: 12 * player.dir
    });
}

function update() {
    if (!gameRunning) return;

    // Movimiento
    if (keys['ArrowRight'] || keys['d']) { player.vx = player.speed; player.dir = 1; }
    else if (keys['ArrowLeft'] || keys['a']) { player.vx = -player.speed; player.dir = -1; }
    else { player.vx = 0; }

    // Salto
    if ((keys['z'] || keys['Z'] || keys[' ']) && player.grounded) {
        player.vy = player.jump;
        player.grounded = false;
    }

    player.vy += gravity;
    player.x += player.vx;
    player.y += player.vy;

    // Colisión con suelo y plataformas
    player.grounded = false;
    platforms.forEach(p => {
        if (player.vy > 0 && 
            player.x + player.w > p.x && player.x < p.x + p.w &&
            player.y + player.h > p.y && player.y + player.h < p.y + p.h + player.vy) {
            player.y = p.y - player.h;
            player.vy = 0;
            player.grounded = true;
        }
    });

    // Balas
    player.bullets.forEach((b, i) => {
        b.x += b.vx;
        if (b.x > player.x + 800 || b.x < player.x - 800) player.bullets.splice(i, 1);
        
        // Matar enemigos
        enemies.forEach(en => {
            if(en.alive && b.x > en.x && b.x < en.x + en.w && b.y > en.y && b.y < en.y + en.h) {
                en.alive = false;
                player.bullets.splice(i, 1);
            }
        });
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Cámara simple (sigue al jugador)
    let camX = player.x - 150;

    ctx.save();
    ctx.translate(-camX, 0);

    // Dibujar Plataformas (Textura de metal/bloque)
    ctx.fillStyle = "#555";
    platforms.forEach(p => {
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeStyle = "#888";
        ctx.strokeRect(p.x, p.y, p.w, p.h);
    });

    // Dibujar Enemigos
    enemies.forEach(en => {
        if(!en.alive) return;
        ctx.fillStyle = "red";
        ctx.fillRect(en.x, en.y, en.w, en.h);
    });

    // Dibujar Jugador (Estilo pixel-art básico)
    ctx.fillStyle = "#0af"; // Pantalón
    ctx.fillRect(player.x, player.y + 20, 30, 30);
    ctx.fillStyle = "#f85"; // Piel
    ctx.fillRect(player.x + 5, player.y, 20, 20);
    ctx.fillStyle = "#fff"; // Arma
    if(player.dir === 1) ctx.fillRect(player.x + 20, player.y + 15, 20, 8);
    else ctx.fillRect(player.x - 10, player.y + 15, 20, 8);

    // Dibujar Balas
    ctx.fillStyle = "yellow";
    player.bullets.forEach(b => ctx.fillRect(b.x, b.y, 10, 5));

    ctx.restore();
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
