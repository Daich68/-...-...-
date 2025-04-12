class GoBoard {
    constructor(containerId, width = 19, height = 19) {
        this.container = document.getElementById(containerId);
        this.width = width;
        this.height = height;
        this.canvas = null;
        this.ctx = null;
        this.cellSize = 0;
        this.boardColor = '#111111'; // Black board color
        this.lineColor = '#888888'; // Gray lines for contrast
        this.stones = []; // Array to store stone positions
        this.initialized = false;
        
        // Visual parameters
        this.starPoints = [
            {x: 3, y: 3}, {x: 9, y: 3}, {x: 15, y: 3},
            {x: 3, y: 9}, {x: 9, y: 9}, {x: 15, y: 9},
            {x: 3, y: 15}, {x: 9, y: 15}, {x: 15, y: 15}
        ];
        
        this.init();
    }
    
    init() {
        if (!this.container) {
            console.error('Container not found');
            return;
        }
        
        // Create canvas if it doesn't exist
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.container.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
        }
        
        // Set canvas size to fill container
        this.resizeCanvas();
        
        // Handle window resize
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.initialized = true;
        this.draw();
    }
    
    resizeCanvas() {
        const containerRect = this.container.getBoundingClientRect();
        this.canvas.width = containerRect.width;
        this.canvas.height = containerRect.height;
        
        // Calculate cell size based on the smaller dimension
        const minDimension = Math.min(this.canvas.width, this.canvas.height);
        this.cellSize = (minDimension * 0.9) / (this.width - 1);
        
        // Redraw if already initialized
        if (this.initialized) {
            this.draw();
        }
    }
    
    draw() {
        if (!this.ctx) return;
        
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Calculate board position (centered)
        const boardWidth = (this.width - 1) * this.cellSize;
        const boardHeight = (this.height - 1) * this.cellSize;
        const offsetX = (width - boardWidth) / 2;
        const offsetY = (height - boardHeight) / 2;
        
        // Draw board background in black and white
        ctx.save();
        // Use a subtle gradient from dark gray to black
        const gradient = ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, Math.max(width, height) / 2
        );
        gradient.addColorStop(0, '#222222');
        gradient.addColorStop(1, '#111111');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Draw grid lines with a subtle glow
        ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
        ctx.shadowBlur = 2;
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = this.lineColor;
        
        // Draw horizontal lines
        for (let i = 0; i < this.height; i++) {
            ctx.beginPath();
            ctx.moveTo(offsetX, offsetY + i * this.cellSize);
            ctx.lineTo(offsetX + boardWidth, offsetY + i * this.cellSize);
            ctx.stroke();
        }
        
        // Draw vertical lines
        for (let i = 0; i < this.width; i++) {
            ctx.beginPath();
            ctx.moveTo(offsetX + i * this.cellSize, offsetY);
            ctx.lineTo(offsetX + i * this.cellSize, offsetY + boardHeight);
            ctx.stroke();
        }
        
        // Draw star points with a subtle glow
        ctx.shadowBlur = 3;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.fillStyle = '#AAAAAA';
        for (const point of this.starPoints) {
            ctx.beginPath();
            ctx.arc(
                offsetX + point.x * this.cellSize,
                offsetY + point.y * this.cellSize,
                this.cellSize / 12,
                0, Math.PI * 2
            );
            ctx.fill();
        }
        
        // Draw stones
        for (const stone of this.stones) {
            this.drawStone(stone.x, stone.y, stone.color, offsetX, offsetY);
        }
        
        ctx.restore();
    }
    
    drawStone(x, y, color, offsetX, offsetY) {
        const ctx = this.ctx;
        const radius = this.cellSize * 0.45;
        
        ctx.save();
        
        // Stone shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        // Create gradient for 3D effect
        const gradient = ctx.createRadialGradient(
            offsetX + x * this.cellSize - radius * 0.3,
            offsetY + y * this.cellSize - radius * 0.3,
            0,
            offsetX + x * this.cellSize,
            offsetY + y * this.cellSize,
            radius * 1.2
        );
        
        if (color === 'black') {
            gradient.addColorStop(0, '#333');
            gradient.addColorStop(1, '#000');
        } else {
            gradient.addColorStop(0, '#eee');
            gradient.addColorStop(1, '#ccc');
        }
        
        ctx.fillStyle = gradient;
        
        // Draw the stone
        ctx.beginPath();
        ctx.arc(
            offsetX + x * this.cellSize,
            offsetY + y * this.cellSize,
            radius,
            0, Math.PI * 2
        );
        ctx.fill();
        
        // Add highlight to white stones
        if (color === 'white') {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
            ctx.beginPath();
            ctx.arc(
                offsetX + x * this.cellSize - radius * 0.2,
                offsetY + y * this.cellSize - radius * 0.2,
                radius * 0.35,
                0, Math.PI * 2
            );
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    // Add a random stone pattern
    generateRandomPattern(density = 0.1) {
        this.stones = [];
        
        // Generate random stones
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (Math.random() < density) {
                    const color = Math.random() > 0.5 ? 'black' : 'white';
                    this.stones.push({x, y, color});
                }
            }
        }
        
        this.draw();
    }
    
    // Clear all stones
    clearStones() {
        this.stones = [];
        this.draw();
    }
    
    // Add a specific stone
    addStone(x, y, color) {
        // Check if position is valid
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            // Check if position is already occupied
            const existingStone = this.stones.find(stone => stone.x === x && stone.y === y);
            if (existingStone) {
                return false;
            }
            
            this.stones.push({x, y, color});
            this.draw();
            return true;
        }
        return false;
    }
    
    // Add a specific pattern
    addPattern(pattern) {
        this.stones = pattern;
        this.draw();
    }
    
    // Create a pattern based on reading position
    createPositionBasedPattern(position) {
        // Clear existing stones
        this.stones = [];
        
        // Calculate how many stones to place based on position (0-100%)
        const maxStones = Math.floor(this.width * this.height * 0.15); // Max 15% coverage
        const stonesToPlace = Math.floor(maxStones * position);
        
        // Place black stones in a pattern that grows from top-left to bottom-right
        for (let i = 0; i < stonesToPlace; i++) {
            // Create a distribution that favors the progression direction
            const progress = i / stonesToPlace;
            
            // Bias coordinates toward the progression direction
            const x = Math.floor(progress * this.width + (Math.random() * 5 - 2.5));
            const y = Math.floor(progress * this.height + (Math.random() * 5 - 2.5));
            
            // Ensure coordinates are within bounds
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                // Check if position is already occupied
                const isOccupied = this.stones.some(stone => stone.x === x && stone.y === y);
                if (!isOccupied) {
                    // Determine stone color (more black stones as progress increases)
                    const color = Math.random() < 0.7 ? 'black' : 'white';
                    this.stones.push({x, y, color});
                }
            }
        }
        
        this.draw();
    }
    
    // Generate a joseki pattern (common corner sequence)
    generateJoseki() {
        const josekiPatterns = [
            // Simple 3-4 point joseki
            [
                {x: 3, y: 3, color: 'black'},
                {x: 3, y: 15, color: 'black'},
                {x: 15, y: 15, color: 'black'},
                {x: 15, y: 3, color: 'black'},
                {x: 2, y: 3, color: 'white'},
                {x: 3, y: 2, color: 'white'},
                {x: 15, y: 16, color: 'white'},
                {x: 16, y: 15, color: 'white'}
            ],
            // Chinese opening
            [
                {x: 3, y: 3, color: 'black'},
                {x: 15, y: 15, color: 'black'},
                {x: 15, y: 3, color: 'black'},
                {x: 3, y: 15, color: 'black'},
                {x: 9, y: 3, color: 'white'},
                {x: 9, y: 15, color: 'white'},
                {x: 3, y: 9, color: 'white'},
                {x: 15, y: 9, color: 'white'}
            ],
            // Star points with approach
            [
                {x: 3, y: 3, color: 'black'},
                {x: 15, y: 15, color: 'black'},
                {x: 9, y: 9, color: 'black'},
                {x: 4, y: 3, color: 'white'},
                {x: 15, y: 14, color: 'white'},
                {x: 9, y: 10, color: 'white'}
            ]
        ];
        
        // Select a random joseki pattern
        const pattern = josekiPatterns[Math.floor(Math.random() * josekiPatterns.length)];
        this.addPattern(pattern);
    }
    
    // Fade in the board
    fadeIn(duration = 1000) {
        this.canvas.style.opacity = 0;
        this.canvas.style.transition = `opacity ${duration}ms ease-in-out`;
        
        // Force reflow
        this.canvas.offsetHeight;
        
        // Fade in
        this.canvas.style.opacity = 0.15; // More subtle opacity for black and white theme
    }
    
    // Fade out the board
    fadeOut(duration = 1000) {
        this.canvas.style.opacity = 0.15;
        this.canvas.style.transition = `opacity ${duration}ms ease-in-out`;
        
        // Force reflow
        this.canvas.offsetHeight;
        
        // Fade out
        this.canvas.style.opacity = 0;
    }
}

// Export the class
window.GoBoard = GoBoard;
