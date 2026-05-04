const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');

canvas.width = 800;
canvas.height = 450;

// CONFIGURACIÓN DE NIVEL
const world = { width: 4000, height: 450, gravity: 0.7 };
const camera = { x: 0, y: 0 };
let gameRunning = false;

// CONTROL DE ENTRADA (Arregla el bug de movimiento)
const input = {
    right: false, left: false, up: false, down: false,
    jump: false, shoot: false
};

const handleKey = (e, status) => {
    switch(e.code) {
        case 'ArrowRight': case 'KeyD': input.right = status; break;
        case 'ArrowLeft':  case 'KeyA': input.left = status; break;
        case 'ArrowUp':    case 'KeyW': input.up = status; break;
        case 'ArrowDown':  case 'KeyS': input.down = status; break;
        case 'KeyZ':       case 'Space': input.jump = status; break;
        case 'KeyX':       case 'KeyK': input.shoot = status; break;
    }
};

window.addEventListener('keydown', e => handleKey(e, true));
window.addEventListener('keyup', e => handleKey(e, false));

// OBJETOS DEL JUEGO
class Player {
    constructor() {
        this.x = 100; this.y = 300;
        this.w = 35;  this.h = 55;
        this.vx = 0;  this.vy = 0;
        this.dir = 1; // 1: derecha, -1: izquierda
        this.isJumping = false;
        this.bullets = [];
        this.hp = 100;
        this.lastShot = 0;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y);
        if (this.dir === -1) { ctx.translate(this.w, 0); ctx.scale(-1, 1); }

        // Cuerpo (Estilo 8-bit)
        ctx.fillStyle = "#2255ff"; // Pantalón
        ctx.fillRect(5, 30, 20, 25);
        ctx.fillStyle = "#ffaa88"; // Piel
        ctx.fillRect(8, 10, 15, 20);
        ctx.fillStyle = "#ff0000"; // Chaleco
        ctx.fillRect(5, 15, 20, 15);
        ctx.fillStyle = "#333";    // Botas/Pelo
        ctx.fillRect(8, 0, 15, 10);
        
        // Arma
        ctx.fillStyle = "#777";
        ctx.fillRect(20, 20, 25, 6);
        ctx.restore();

        // Balas
        this.bullets.forEach((b, i) => {
            b.x += b.vx;
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(b.x - camera.x, b.y, 4, 0, Math.PI*2);
            ctx.fill();
            if (b.x > camera.x + canvas.width || b.x < camera.x) this.bullets.splice(i, 1);
        });
    }

    update(platforms) {
        if (input.right) { this.vx = 6; this.dir = 1; }
        else if (input.left) { this.vx = -6; this.dir = -1; }
        else { this.vx *= 0.8; }

        if (input.jump && !this.isJumping) {
            this.vy = -15;
            this.isJumping = true;
        }

        this.vy += world.gravity;
        this.x += this.vx;
        this.y += this.vy;

        // Colisiones
        platforms.forEach(p => {
            if (this.vy > 0 && this.x + this.w > p.x && this.x < p.x + p.w &&
                this.y + this.h > p.y && this.y + this.h < p.y + p.h + this.vy) {
                this.y = p.y - this.h;
                this.vy = 0;
                this.isJumping = false;
            }
        });

        // Limites
        if (this.x < 0) this.x = 0;
        if (this.y > world.height) { this.y = 0; this.hp -= 20; } // Caída al vacío

        // Scroll de cámara
        camera.x = this.x - canvas.width / 3;
        if (camera.x < 0) camera.x = 0;
        if (camera.x > world.width - canvas.width) camera.x = world.width - canvas.width;

        if (input.shoot) this.fire();
    }

    fire() {
        let now = Date.now();
        if (now - this.lastShot > 150) {
            this.bullets.push({ x: this.x + (this.dir === 1 ? 40 : -10), y: this.y + 23, vx: 15 * this.dir });
            this.lastShot = now;
        }
    }
}

// ESCENARIO
const platforms = [
    { x: 0, y: 400, w: 800, h: 50 },
    { x: 900, y: 350, w: 400, h: 30 },
    { x: 1400, y: 300, w: 300, h: 30 },
    { x: 1800, y: 400, w: 1000, h: 50 },
    { x: 2200, y: 250, w: 200, h: 20 },
];

const enemies = [
    { x: 600, y: 350, w: 40, h: 50, alive: true },
    { x: 1100, y: 300, w: 40, h: 50, alive: true },
    { x: 2500, y: 350, w: 40, h: 50, alive: true }
];

const p1 = new Player();

// LOOP PRINCIPAL
function main() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameRunning) {
        // Fondo (Paralaje)
        ctx.fillStyle = "#000022";
        for(let i=0; i<10; i++) {
            ctx.fillRect((i * 500) - camera.x * 0.3, 100, 200, 350);
        }

        // Dibujar Plataformas
        ctx.fillStyle = "#33aa33";
        platforms.forEach(p => {
            ctx.fillRect(p.x - camera.x, p.y, p.w, p.h);
            ctx.fillStyle = "#115511";
            ctx.fillRect(p.x - camera.x, p.y + 10, p.w, 5); // Detalle hierba
            ctx.fillStyle = "#33aa33";
        });

        // Enemigos
        enemies.forEach(en => {
            if (!en.alive) return;
            ctx.fillStyle = "red";
            ctx.fillRect(en.x - camera.x, en.y, en.w, en.h);
            
            // Colisión con balas
            p1.bullets.forEach(b => {
                if (b.x > en.x && b.x < en.x + en.w && b.y > en.y && b.y < en.y + en.h) {
                    en.alive = false;
                }
            });
        });

        p1.update(platforms);
        p1.draw();

        document.getElementById('health').innerText = Math.max(0, p1.hp);
        document.getElementById('score').innerText = (4000 - Math.floor(enemies.filter(e => e.alive).length * 1000)).toString().padStart(5, '0');

    }

    requestAnimationFrame(main);
}

startScreen.addEventListener('click', () => {
    gameRunning = true;
    startScreen.style.display = 'none';
});

main();
