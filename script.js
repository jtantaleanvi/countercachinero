const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const healthDisplay = document.getElementById('health-display');
const weaponDisplay = document.getElementById('weapon-display');

canvas.width = 800;
canvas.height = 500;

let gameStarted = false;
const gravity = 0.6;
const keys = {};
let cameraX = 0; // El secreto del mapa largo

// Definición de un mapa más extenso
const worldWidth = 3000;
const platforms = [
    { x: 0, y: 450, w: 3000, h: 50, type: 'ground' }, // Suelo infinito
    { x: 200, y: 320, w: 150, h: 20 },
    { x: 450, y: 220, w: 200, h: 20 },
    { x: 800, y: 350, w: 300, h: 20 },
    { x: 1200, y: 250, w: 200, h: 20 },
    { x: 1600, y: 320, w: 400, h: 20 },
    { x: 2200, y: 200, w: 150, h: 20 }
];

class Player {
    constructor() {
        this.x = 100;
        this.y = 300;
        this.w = 30;
        this.h = 45;
        this.vx = 0;
        this.vy = 0;
        this.speed = 5;
        this.jump = 13;
        this.grounded = false;
        this.health = 100;
        this.dir = 1;
        this.bullets = [];
        this.weapon = 'Rifle';
        this.lastShot = 0;
    }

    draw() {
        // "Sprite" de 8 bits hecho con rectángulos
        ctx.fillStyle = "#00ffcc";
        ctx.fillRect(this.x - cameraX, this.y, this.w, this.h);
        // Detalles: Ojos y Mochila
        ctx.fillStyle = "black";
        let eyePos = this.dir === 1 ? 18 : 5;
        ctx.fillRect(this.x - cameraX + eyePos, this.y + 10, 6, 6);
        ctx.fillStyle = "#0088aa";
        ctx.fillRect(this.x - cameraX + (this.dir === 1 ? -5 : 25), this.y + 15, 10, 20);
    }

    update() {
        if (keys['arrowright']) { this.vx = this.speed; this.dir = 1; }
        else if (keys['arrowleft']) { this.vx = -this.speed; this.dir = -1; }
        else { this.vx = 0; }

        if (keys['z'] && this.grounded) { this.vy = -this.jump; this.grounded = false; }

        this.vy += gravity;
        this.x += this.vx;
        this.y += this.vy;

        // Limites del mundo
        if (this.x < 0) this.x = 0;
        if (this.x > worldWidth - this.w) this.x = worldWidth - this.w;

        // Colisión con plataformas
        this.grounded = false;
        platforms.forEach(p => {
            if (this.vy > 0 && this.y + this.h <= p.y + this.vy && this.y + this.h + this.vy >= p.y &&
                this.x + this.w > p.x && this.x < p.x + p.w) {
                this.y = p.y - this.h;
                this.vy = 0;
                this.grounded = true;
            }
        });

        // Cámara sigue al jugador
        cameraX = this.x - canvas.width / 3;
        if (cameraX < 0) cameraX = 0;
        if (cameraX > worldWidth - canvas.width) cameraX = worldWidth - canvas.width;

        if (keys['x']) this.shoot();
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot > 200) {
            this.bullets.push({x: this.x + (this.dir === 1 ? 30 : -10), y: this.y + 20, vx: 12 * this.dir});
            this.lastShot = now;
        }
    }
}

const p1 = new Player();
const enemies = [{x: 600, y: 400, health: 30}, {x: 1500, y: 400, health: 30}, {x: 2500, y: 400, health: 30}];

window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!gameStarted) {
        ctx.fillStyle = "white";
        ctx.font = "30px Courier New";
        ctx.fillText("CLIC PARA JUGAR", 280, 250);
        return;
    }

    // Dibujar plataformas con textura de "ladrillo"
    platforms.forEach(p => {
        ctx.fillStyle = "#444";
        ctx.fillRect(p.x - cameraX, p.y, p.w, p.h);
        ctx.strokeStyle = "#666";
        ctx.strokeRect(p.x - cameraX, p.y, p.w, p.h);
    });

    p1.update();
    p1.draw();

    // Balas
    ctx.fillStyle = "yellow";
    p1.bullets.forEach((b, i) => {
        b.x += b.vx;
        ctx.fillRect(b.x - cameraX, b.y, 10, 5);
        if (b.x < cameraX || b.x > cameraX + canvas.width) p1.bullets.splice(i, 1);
    });

    // Enemigos con "ojos"
    enemies.forEach((en, i) => {
        ctx.fillStyle = "red";
        ctx.fillRect(en.x - cameraX, en.y, 30, 40);
        ctx.fillStyle = "white";
        ctx.fillRect(en.x - cameraX + 5, en.y + 10, 5, 5); // Ojos
        ctx.fillRect(en.x - cameraX + 20, en.y + 10, 5, 5);

        // Colisión bala-enemigo
        p1.bullets.forEach((b, bi) => {
            if (b.x > en.x && b.x < en.x + 30 && b.y > en.y && b.y < en.y + 40) {
                en.health -= 10;
                p1.bullets.splice(bi, 1);
                if (en.health <= 0) enemies.splice(i, 1);
            }
        });
    });

    requestAnimationFrame(loop);
}

canvas.addEventListener('mousedown', () => gameStarted = true);
loop();
