const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const healthDisplay = document.getElementById('health-display');
const weaponDisplay = document.getElementById('weapon-display');

canvas.width = 800;
canvas.height = 500;

// Utilidades y Variables Globales
const keys = {};
const gravity = 0.6;
let frameCount = 0;

// Función de colisión AABB (Axis-Aligned Bounding Box)
function checkCollision(r1, r2) {
    return (
        r1.x < r2.x + r2.width &&
        r1.x + r1.width > r2.x &&
        r1.y < r2.y + r2.height &&
        r1.y + r1.height > r2.y
    );
}

// Entidades del juego
const bullets = [];
const enemies = [];
const platforms = [
    { x: 0, y: 450, width: 800, height: 50 },     // Suelo principal
    { x: 150, y: 350, width: 200, height: 20 },   // Plataforma 1
    { x: 450, y: 250, width: 200, height: 20 },   // Plataforma 2
    { x: 100, y: 150, width: 150, height: 20 }    // Plataforma 3
];

class Player {
    constructor() {
        this.x = 50;
        this.y = 300;
        this.width = 30;
        this.height = 50;
        this.velX = 0;
        this.velY = 0;
        this.speed = 5;
        this.jumpForce = 12;
        this.grounded = false;
        this.health = 100;
        this.direction = 1; // 1 derecha, -1 izquierda
        
        // Sistema de armas
        this.weapons = ['Rifle', 'Spread', 'MachineGun'];
        this.currentWeaponIndex = 0;
        this.lastShotTime = 0;
    }

    draw() {
        ctx.fillStyle = "#00ffcc"; // Color del jugador
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Dibujar el cañón del arma según la dirección
        ctx.fillStyle = "#fff";
        if (this.direction === 1) {
            ctx.fillRect(this.x + this.width, this.y + 15, 15, 6);
        } else {
            ctx.fillRect(this.x - 15, this.y + 15, 15, 6);
        }
    }

    update() {
        // Movimiento lateral
        if (keys['ArrowRight']) {
            this.velX = this.speed;
            this.direction = 1;
        } else if (keys['ArrowLeft']) {
            this.velX = -this.speed;
            this.direction = -1;
        } else {
            this.velX = 0;
        }

        // Salto
        if (keys['z'] && this.grounded) {
            this.velY = -this.jumpForce;
            this.grounded = false;
        }

        // Físicas
        this.velY += gravity;
        this.x += this.velX;
        this.y += this.velY;

        // Limitar a la pantalla
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

        // Colisión con plataformas
        this.grounded = false;
        for (let p of platforms) {
            // Solo colisionar si caemos sobre la plataforma (para poder saltar desde abajo)
            if (this.velY > 0 && 
                this.y + this.height - this.velY <= p.y && 
                this.y + this.height >= p.y &&
                this.x + this.width > p.x && 
                this.x < p.x + p.width) {
                    this.y = p.y - this.height;
                    this.velY = 0;
                    this.grounded = true;
            }
        }

        // Cambio de armas
        if (keys['1']) this.currentWeaponIndex = 0;
        if (keys['2']) this.currentWeaponIndex = 1;
        if (keys['3']) this.currentWeaponIndex = 2;
        weaponDisplay.innerText = `Arma: ${this.weapons[this.currentWeaponIndex]}`;

        // Disparo
        if (keys['x']) this.shoot();
    }

    shoot() {
        const currentTime = Date.now();
        const weapon = this.weapons[this.currentWeaponIndex];
        
        let fireRate = 0;
        if (weapon === 'Rifle') fireRate = 250;
        if (weapon === 'Spread') fireRate = 400;
        if (weapon === 'MachineGun') fireRate = 100;

        if (currentTime - this.lastShotTime >= fireRate) {
            let startX = this.direction === 1 ? this.x + this.width : this.x;
            let startY = this.y + 15;

            if (weapon === 'Rifle' || weapon === 'MachineGun') {
                bullets.push(new Bullet(startX, startY, 12 * this.direction, 0, "#fff"));
            } else if (weapon === 'Spread') {
                // Dispara 3 balas en abanico
                bullets.push(new Bullet(startX, startY, 10 * this.direction, 0, "#ff0"));
                bullets.push(new Bullet(startX, startY, 10 * this.direction, -2, "#ff0"));
                bullets.push(new Bullet(startX, startY, 10 * this.direction, 2, "#ff0"));
            }
            this.lastShotTime = currentTime;
        }
    }
}

class Bullet {
    constructor(x, y, velX, velY, color) {
        this.x = x;
        this.y = y;
        this.width = 8;
        this.height = 4;
        this.velX = velX;
        this.velY = velY;
        this.color = color;
        this.markedForDeletion = false;
    }

    update() {
        this.x += this.velX;
        this.y += this.velY;
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.markedForDeletion = true;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 40;
        this.speed = Math.random() * 1.5 + 1; // Velocidad aleatoria
        this.health = 20;
        this.markedForDeletion = false;
    }

    update() {
        // IA muy básica: Moverse hacia el jugador
        if (player.x < this.x) this.x -= this.speed;
        if (player.x > this.x) this.x += this.speed;

        // Gravedad y suelo (simplificado para el enemigo)
        this.y += gravity * 5;
        for (let p of platforms) {
            if (this.y + this.height > p.y && this.y < p.y + p.height &&
                this.x + this.width > p.x && this.x < p.x + p.width) {
                    this.y = p.y - this.height;
            }
        }

        // Colisión con el jugador (hacer daño)
        if (checkCollision(this, player)) {
            player.health -= 1; // Daño continuo al tocar
            healthDisplay.innerText = `Salud: ${Math.floor(player.health)}`;
            if (player.health <= 0) {
                alert("¡Has muerto! Recarga la página para volver a intentar.");
                player.health = 100; // Reset rápido
            }
        }
    }

    draw() {
        ctx.fillStyle = "#ff3333";
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

const player = new Player();

// Gestión de Eventos (Teclado)
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

// Gestor de Enemigos
function handleEnemies() {
    // Generar un enemigo cada 120 frames (aprox 2 segundos)
    if (frameCount % 120 === 0) {
        let spawnX = Math.random() > 0.5 ? 0 : canvas.width - 30; // Izquierda o Derecha
        enemies.push(new Enemy(spawnX, 100));
    }

    enemies.forEach((enemy, eIndex) => {
        enemy.update();
        enemy.draw();

        // Chequear colisión con las balas
        bullets.forEach((bullet) => {
            if (checkCollision(bullet, enemy)) {
                enemy.health -= 10;
                bullet.markedForDeletion = true;
                if (enemy.health <= 0) {
                    enemy.markedForDeletion = true;
                }
            }
        });
    });

    // Limpiar enemigos muertos
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].markedForDeletion) enemies.splice(i, 1);
    }
}

// Bucle principal de juego
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frameCount++;

    // Dibujar plataformas
    ctx.fillStyle = "#4a4e69";
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.width, p.height));

    // Actualizar y dibujar jugador
    player.update();
    player.draw();

    // Actualizar y dibujar balas
    bullets.forEach(bullet => {
        bullet.update();
        bullet.draw();
    });

    // Limpiar balas fuera de pantalla
    for (let i = bullets.length - 1; i >= 0; i--) {
        if (bullets[i].markedForDeletion) bullets.splice(i, 1);
    }

    handleEnemies();

    requestAnimationFrame(gameLoop);
}

// Iniciar juego
gameLoop();
