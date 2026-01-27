// Tetris Game
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('holdCanvas');
const holdCtx = holdCanvas.getContext('2d');

// Game constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const NEXT_BLOCK_SIZE = 20;
const HOLD_BLOCK_SIZE = 20;

// Colors for each piece type with gradient info
const COLORS = {
    I: { main: '#00f5ff', light: '#7dffff', dark: '#00a5af' },
    O: { main: '#ffeb3b', light: '#ffff72', dark: '#c8b900' },
    T: { main: '#e040fb', light: '#ff79ff', dark: '#a000c8' },
    S: { main: '#69f0ae', light: '#9fffe0', dark: '#2bbd7e' },
    Z: { main: '#ff5252', light: '#ff867f', dark: '#c50e29' },
    J: { main: '#448aff', light: '#83b9ff', dark: '#005ecb' },
    L: { main: '#ff9100', light: '#ffc246', dark: '#c56200' }
};

// Tetromino shapes
const SHAPES = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]]
};

// Game state
let board = [];
let currentPiece = null;
let nextPieces = [];
let holdPiece = null;
let canHold = true;
let score = 0;
let level = 1;
let lines = 0;
let gameOver = false;
let isPaused = false;
let dropInterval = 1000;
let lastDrop = 0;
let animationId = null;

// Wall kick data for SRS (Super Rotation System)
const WALL_KICKS = {
    normal: [
        [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
        [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
        [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
        [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]]
    ],
    I: [
        [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
        [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
        [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
        [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]]
    ]
};

// Initialize the game board
function initBoard() {
    board = [];
    for (let row = 0; row < ROWS; row++) {
        board.push(new Array(COLS).fill(null));
    }
}

// Piece class
class Piece {
    constructor(type) {
        this.type = type;
        this.shape = SHAPES[type].map(row => [...row]);
        this.color = COLORS[type];
        this.x = Math.floor(COLS / 2) - Math.ceil(this.shape[0].length / 2);
        this.y = 0;
        this.rotation = 0;
    }

    rotate(dir = 1) {
        const oldShape = this.shape.map(row => [...row]);
        const oldRotation = this.rotation;
        const n = this.shape.length;
        const newShape = [];

        for (let i = 0; i < n; i++) {
            newShape.push([]);
            for (let j = 0; j < n; j++) {
                if (dir === 1) {
                    newShape[i][j] = this.shape[n - 1 - j][i];
                } else {
                    newShape[i][j] = this.shape[j][n - 1 - i];
                }
            }
        }

        this.shape = newShape;
        this.rotation = (this.rotation + dir + 4) % 4;

        // Try wall kicks
        const kicks = this.type === 'I' ? WALL_KICKS.I : WALL_KICKS.normal;
        const kickIndex = dir === 1 ? oldRotation : this.rotation;

        for (const [dx, dy] of kicks[kickIndex]) {
            if (!collision(this.x + dx, this.y - dy, this.shape)) {
                this.x += dx;
                this.y -= dy;
                return true;
            }
        }

        // Rotation failed, revert
        this.shape = oldShape;
        this.rotation = oldRotation;
        return false;
    }
}

// Check for collision
function collision(x, y, shape) {
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const newX = x + col;
                const newY = y + row;

                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }

                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Generate random piece
function randomPiece() {
    const types = Object.keys(SHAPES);
    return new Piece(types[Math.floor(Math.random() * types.length)]);
}

// Fill next pieces queue
function fillNextPieces() {
    while (nextPieces.length < 3) {
        nextPieces.push(randomPiece());
    }
}

// Spawn new piece
function spawnPiece() {
    if (nextPieces.length === 0) {
        fillNextPieces();
    }

    currentPiece = nextPieces.shift();
    fillNextPieces();
    canHold = true;

    // Check if game over
    if (collision(currentPiece.x, currentPiece.y, currentPiece.shape)) {
        gameOver = true;
        showGameOver();
    }
}

// Lock piece to board
function lockPiece() {
    for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[row].length; col++) {
            if (currentPiece.shape[row][col]) {
                const y = currentPiece.y + row;
                const x = currentPiece.x + col;
                if (y >= 0) {
                    board[y][x] = currentPiece.color;
                }
            }
        }
    }

    clearLines();
    spawnPiece();
}

// Clear completed lines
function clearLines() {
    let linesCleared = 0;

    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row].every(cell => cell !== null)) {
            board.splice(row, 1);
            board.unshift(new Array(COLS).fill(null));
            linesCleared++;
            row++; // Check same row again
        }
    }

    if (linesCleared > 0) {
        // Scoring: 100, 300, 500, 800 for 1, 2, 3, 4 lines
        const points = [0, 100, 300, 500, 800];
        score += points[linesCleared] * level;
        lines += linesCleared;

        // Play line clear sound
        tetrisAudio.playLineClearSound();

        // Level up every 10 lines
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            dropInterval = Math.max(100, 1000 - (level - 1) * 100);
            tetrisAudio.playLevelUpSound();
        }

        updateStats();
    }
}

// Update stats display
function updateStats() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
}

// Calculate ghost piece position
function getGhostY() {
    let ghostY = currentPiece.y;
    while (!collision(currentPiece.x, ghostY + 1, currentPiece.shape)) {
        ghostY++;
    }
    return ghostY;
}

// Draw a single block with 3D effect
function drawBlock(ctx, x, y, color, size, isGhost = false) {
    const padding = 1;
    const innerSize = size - padding * 2;

    if (isGhost) {
        ctx.strokeStyle = color.main;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + padding, y + padding, innerSize, innerSize);
        ctx.fillStyle = `${color.main}22`;
        ctx.fillRect(x + padding, y + padding, innerSize, innerSize);
        return;
    }

    // Main block
    ctx.fillStyle = color.main;
    ctx.fillRect(x + padding, y + padding, innerSize, innerSize);

    // Highlight (top-left)
    ctx.fillStyle = color.light;
    ctx.beginPath();
    ctx.moveTo(x + padding, y + padding);
    ctx.lineTo(x + padding + innerSize, y + padding);
    ctx.lineTo(x + padding + innerSize - 4, y + padding + 4);
    ctx.lineTo(x + padding + 4, y + padding + 4);
    ctx.lineTo(x + padding + 4, y + padding + innerSize - 4);
    ctx.lineTo(x + padding, y + padding + innerSize);
    ctx.closePath();
    ctx.fill();

    // Shadow (bottom-right)
    ctx.fillStyle = color.dark;
    ctx.beginPath();
    ctx.moveTo(x + padding + innerSize, y + padding + innerSize);
    ctx.lineTo(x + padding, y + padding + innerSize);
    ctx.lineTo(x + padding + 4, y + padding + innerSize - 4);
    ctx.lineTo(x + padding + innerSize - 4, y + padding + innerSize - 4);
    ctx.lineTo(x + padding + innerSize - 4, y + padding + 4);
    ctx.lineTo(x + padding + innerSize, y + padding);
    ctx.closePath();
    ctx.fill();

    // Inner shine
    ctx.fillStyle = `${color.light}44`;
    ctx.fillRect(x + padding + 4, y + padding + 4, innerSize - 8, innerSize - 8);
}

// Draw game board
function drawBoard() {
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * BLOCK_SIZE, 0);
        ctx.lineTo(i * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * BLOCK_SIZE);
        ctx.lineTo(canvas.width, i * BLOCK_SIZE);
        ctx.stroke();
    }

    // Draw locked pieces
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col]) {
                drawBlock(ctx, col * BLOCK_SIZE, row * BLOCK_SIZE, board[row][col], BLOCK_SIZE);
            }
        }
    }

    // Draw ghost piece
    if (currentPiece && !gameOver) {
        const ghostY = getGhostY();
        for (let row = 0; row < currentPiece.shape.length; row++) {
            for (let col = 0; col < currentPiece.shape[row].length; col++) {
                if (currentPiece.shape[row][col]) {
                    drawBlock(
                        ctx,
                        (currentPiece.x + col) * BLOCK_SIZE,
                        (ghostY + row) * BLOCK_SIZE,
                        currentPiece.color,
                        BLOCK_SIZE,
                        true
                    );
                }
            }
        }
    }

    // Draw current piece
    if (currentPiece && !gameOver) {
        for (let row = 0; row < currentPiece.shape.length; row++) {
            for (let col = 0; col < currentPiece.shape[row].length; col++) {
                if (currentPiece.shape[row][col]) {
                    drawBlock(
                        ctx,
                        (currentPiece.x + col) * BLOCK_SIZE,
                        (currentPiece.y + row) * BLOCK_SIZE,
                        currentPiece.color,
                        BLOCK_SIZE
                    );
                }
            }
        }
    }
}

// Draw next pieces preview
function drawNextPieces() {
    nextCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    let yOffset = 10;
    for (let i = 0; i < Math.min(3, nextPieces.length); i++) {
        const piece = nextPieces[i];
        const offsetX = (nextCanvas.width - piece.shape[0].length * NEXT_BLOCK_SIZE) / 2;

        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                if (piece.shape[row][col]) {
                    drawBlock(
                        nextCtx,
                        offsetX + col * NEXT_BLOCK_SIZE,
                        yOffset + row * NEXT_BLOCK_SIZE,
                        piece.color,
                        NEXT_BLOCK_SIZE
                    );
                }
            }
        }

        yOffset += piece.shape.length * NEXT_BLOCK_SIZE + 15;
    }
}

// Draw hold piece
function drawHoldPiece() {
    holdCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);

    if (holdPiece) {
        const offsetX = (holdCanvas.width - holdPiece.shape[0].length * HOLD_BLOCK_SIZE) / 2;
        const offsetY = (holdCanvas.height - holdPiece.shape.length * HOLD_BLOCK_SIZE) / 2;

        for (let row = 0; row < holdPiece.shape.length; row++) {
            for (let col = 0; col < holdPiece.shape[row].length; col++) {
                if (holdPiece.shape[row][col]) {
                    const color = canHold ? holdPiece.color : {
                        main: '#666',
                        light: '#888',
                        dark: '#444'
                    };
                    drawBlock(
                        holdCtx,
                        offsetX + col * HOLD_BLOCK_SIZE,
                        offsetY + row * HOLD_BLOCK_SIZE,
                        color,
                        HOLD_BLOCK_SIZE
                    );
                }
            }
        }
    }
}

// Hold current piece
function hold() {
    if (!canHold) return;

    canHold = false;

    if (holdPiece) {
        const temp = holdPiece;
        holdPiece = new Piece(currentPiece.type);
        currentPiece = new Piece(temp.type);
    } else {
        holdPiece = new Piece(currentPiece.type);
        spawnPiece();
    }
}

// Move piece
function movePiece(dx, dy) {
    if (!collision(currentPiece.x + dx, currentPiece.y + dy, currentPiece.shape)) {
        currentPiece.x += dx;
        currentPiece.y += dy;
        return true;
    }
    return false;
}

// Hard drop
function hardDrop() {
    while (movePiece(0, 1)) {
        score += 2;
    }
    lockPiece();
    updateStats();
}

// Soft drop
function softDrop() {
    if (movePiece(0, 1)) {
        score += 1;
        updateStats();
    }
}

// Game loop
function gameLoop(timestamp) {
    if (gameOver) return;

    if (!isPaused) {
        if (timestamp - lastDrop > dropInterval) {
            if (!movePiece(0, 1)) {
                lockPiece();
            }
            lastDrop = timestamp;
        }

        drawBoard();
        drawNextPieces();
        drawHoldPiece();
    }

    animationId = requestAnimationFrame(gameLoop);
}

// Show game over screen
function showGameOver() {
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOverOverlay').classList.add('show');
    tetrisAudio.stopMusic();
    tetrisAudio.playGameOverSound();
}

// Hide game over screen
function hideGameOver() {
    document.getElementById('gameOverOverlay').classList.remove('show');
}

// Reset game
function resetGame() {
    initBoard();
    nextPieces = [];
    holdPiece = null;
    canHold = true;
    score = 0;
    level = 1;
    lines = 0;
    gameOver = false;
    isPaused = false;
    dropInterval = 1000;
    lastDrop = 0;

    updateStats();
    hideGameOver();
    fillNextPieces();
    spawnPiece();

    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    animationId = requestAnimationFrame(gameLoop);

    // Start music
    tetrisAudio.startMusic();
}

// Toggle pause
function togglePause() {
    if (gameOver) return;
    isPaused = !isPaused;
}

// Toggle sound
function toggleSound() {
    const soundBtn = document.getElementById('soundBtn');
    const isMuted = tetrisAudio.toggleMute();
    if (soundBtn) {
        soundBtn.textContent = isMuted ? '🔇' : '🔊';
        soundBtn.classList.toggle('muted', isMuted);
    }
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (gameOver) {
        if (e.key === 'Enter' || e.key === ' ') {
            resetGame();
        }
        return;
    }

    if (e.key === 'p' || e.key === 'P') {
        togglePause();
        return;
    }

    if (isPaused) return;

    switch (e.key) {
        case 'ArrowLeft':
            if (movePiece(-1, 0)) tetrisAudio.playMoveSound();
            break;
        case 'ArrowRight':
            if (movePiece(1, 0)) tetrisAudio.playMoveSound();
            break;
        case 'ArrowDown':
            softDrop();
            tetrisAudio.playMoveSound();
            break;
        case 'ArrowUp':
            if (currentPiece.rotate(1)) tetrisAudio.playRotateSound();
            break;
        case 'z':
        case 'Z':
            if (currentPiece.rotate(-1)) tetrisAudio.playRotateSound();
            break;
        case ' ':
            e.preventDefault();
            hardDrop();
            tetrisAudio.playDropSound();
            break;
        case 'c':
        case 'C':
            hold();
            break;
        case 'm':
        case 'M':
            toggleSound();
            break;
    }
});

// Restart button
document.getElementById('restartBtn').addEventListener('click', resetGame);

// Mobile Controls
const mobileControls = document.getElementById('mobileControls');
if (mobileControls) {
    // Button actions
    const actions = {
        left: () => !gameOver && !isPaused && movePiece(-1, 0),
        right: () => !gameOver && !isPaused && movePiece(1, 0),
        down: () => !gameOver && !isPaused && softDrop(),
        rotate: () => !gameOver && !isPaused && currentPiece && currentPiece.rotate(1),
        drop: () => !gameOver && !isPaused && hardDrop(),
        hold: () => !gameOver && !isPaused && hold(),
        pause: () => togglePause()
    };

    // Add touch event listeners with haptic feedback
    Object.keys(actions).forEach(action => {
        const btn = document.getElementById(`${action}Btn`);
        if (btn) {
            // Prevent default touch behavior
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                actions[action]();
                // Visual feedback
                btn.style.transform = 'scale(0.95)';
                // Vibrate if supported (10ms)
                if (navigator.vibrate) {
                    navigator.vibrate(10);
                }
            }, { passive: false });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                btn.style.transform = '';
            }, { passive: false });

            // Also support click for testing
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                actions[action]();
            });
        }
    });

    // Swipe gestures on canvas for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    canvas.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
        if (gameOver || isPaused) return;

        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const minSwipeDistance = 30;

        // Horizontal swipe
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (Math.abs(deltaX) > minSwipeDistance) {
                if (deltaX > 0) {
                    movePiece(1, 0); // Swipe right
                } else {
                    movePiece(-1, 0); // Swipe left
                }
            }
        }
        // Vertical swipe
        else {
            if (Math.abs(deltaY) > minSwipeDistance) {
                if (deltaY > 0) {
                    softDrop(); // Swipe down
                } else {
                    currentPiece.rotate(1); // Swipe up to rotate
                }
            }
        }
    }
}

// Sound button
const soundBtn = document.getElementById('soundBtn');
if (soundBtn) {
    soundBtn.addEventListener('click', toggleSound);
}

// Start the game
resetGame();
