document.addEventListener('DOMContentLoaded', () => {

    // --- 1. 获取 HTML 元素 和 设置 ---
    const canvas = document.getElementById('galton-canvas');
    const ctx = canvas.getContext('2d');
    const rowsInput = document.getElementById('rows-input');
    const ballsInput = document.getElementById('balls-input');
    const speedSlider = document.getElementById('speed-slider'); 
    const speedValueSpan = document.getElementById('speed-value'); 
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');

    let balls = [];
    let animationFrameId;
    let ballCreationInterval;
    let binCounts = [];
    let simulationSpeed = 1;
    let oneBallHeight = 0;

    // --- 2. 小球类 (Ball Class) ---
    class Ball {
        constructor(x, y, radius, color) {
            this.x = x; this.y = y; this.radius = radius; this.color = color;
            this.vy = 0; this.vx = 0; this.gravity = 0.1; this.currentRow = 0;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.closePath();
        }

        // --- 核心修改在这里 ---
        update(boardParams) {
            this.vy += this.gravity;
            this.x += this.vx;
            this.y += this.vy;

            // 新增：墙壁碰撞检测
            if (this.x + this.radius > boardParams.canvasWidth || this.x - this.radius < 0) {
                this.vx *= -1; // 如果碰到左右墙壁，水平速度反向
            }

            const nextRowY = boardParams.topPadding + this.currentRow * boardParams.verticalSpacing;
            if (this.y + this.radius > nextRowY) {
                if (this.currentRow < boardParams.rows) {
                    this.vx = (Math.random() < 0.5 ? -1 : 1) * 1.5;
                    this.vy *= -0.3;
                    this.currentRow++;
                } else {
                    this.vx *= 0.98;
                }
            }
        }
    }

    // --- 3. 初始化与绘图函数 ---
    let boardParams = {};

    function resizeCanvas() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        updateBoardParameters();
        drawBoard();
        drawResults();
    }

    function updateBoardParameters() {
        const rows = parseInt(rowsInput.value);
        boardParams.rows = rows;
        boardParams.pinRadius = 4;
        boardParams.topPadding = 40;
        boardParams.horizontalPadding = 40;
        boardParams.horizontalSpacing = (canvas.width - 2 * boardParams.horizontalPadding) / rows;
        boardParams.verticalSpacing = (canvas.height * 0.8) / rows; 
        boardParams.numBins = rows + 1;
        boardParams.canvasWidth = canvas.width; // 将画布宽度存入参数，方便小球调用
        
        boardParams.binBoundaries = [];
        const binWidth = boardParams.horizontalSpacing;
        const startX = (canvas.width - (boardParams.numBins - 1) * binWidth) / 2;
        for (let i = 0; i < boardParams.numBins; i++) {
             const x = startX + (i - 0.5) * binWidth;
             boardParams.binBoundaries.push(x);
        }
    }

    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        const { rows, pinRadius, topPadding, horizontalSpacing, verticalSpacing, numBins } = boardParams;
        if (!rows) return;

        ctx.fillStyle = '#333';
        for (let row = 0; row < rows; row++) {
            const numPinsInRow = row + 1;
            const rowWidth = (numPinsInRow - 1) * horizontalSpacing;
            const startX = (canvas.width - rowWidth) / 2;
            for (let col = 0; col < numPinsInRow; col++) {
                const x = startX + col * horizontalSpacing;
                const y = topPadding + row * verticalSpacing;
                ctx.beginPath();
                ctx.arc(x, y, pinRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        const lastRowY = topPadding + (rows - 1) * verticalSpacing;
        const binHeight = canvas.height - lastRowY - 20;
        const binTopY = lastRowY + 20;
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        for (let i = 0; i < numBins + 1; i++) {
            const binWidth = horizontalSpacing;
            const startX = (canvas.width - (numBins) * binWidth) / 2;
            const x = startX + i * binWidth;
            ctx.beginPath();
            ctx.moveTo(x, binTopY);
            ctx.lineTo(x, binTopY + binHeight);
            ctx.stroke();
        }
    }

    function drawResults() {
        if (binCounts.length === 0 || oneBallHeight === 0) return;
        const binWidth = boardParams.horizontalSpacing;
        for (let i = 0; i < binCounts.length; i++) {
            const barHeight = binCounts[i] * oneBallHeight;
            if (barHeight === 0) continue;
            const x = boardParams.binBoundaries[i];
            const y = canvas.height - barHeight;
            const gradient = ctx.createLinearGradient(x, y, x, canvas.height);
            gradient.addColorStop(0, 'royalblue');
            gradient.addColorStop(1, 'deepskyblue');
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, binWidth, barHeight);
        }
    }

    function animate() {
        drawBoard();
        for (let i = 0; i < simulationSpeed; i++) {
            balls.forEach(ball => ball.update(boardParams));
            const fallenBalls = balls.filter(ball => ball.y > canvas.height);
            fallenBalls.forEach(ball => {
                let binIndex = boardParams.binBoundaries.findIndex(boundary => ball.x < boundary + boardParams.horizontalSpacing);
                if (binIndex === -1) { binIndex = boardParams.numBins -1; }
                binCounts[binIndex]++;
            });
            balls = balls.filter(ball => ball.y < canvas.height);
        }
        balls.forEach(ball => ball.draw());
        drawResults();
        animationFrameId = requestAnimationFrame(animate);
    }

    function startSimulation() {
        resetSimulation();
        updateBoardParameters();
        binCounts = Array(boardParams.numBins).fill(0);
        let ballsToDrop = parseInt(ballsInput.value);
        let droppedCount = 0;
        const lastRowY = boardParams.topPadding + (boardParams.rows - 1) * boardParams.verticalSpacing;
        const barAreaHeight = (canvas.height - (lastRowY + 20)) * 0.9;
        const maxExpectedCountInOneBin = Math.max(1, ballsToDrop * 0.35); 
        oneBallHeight = barAreaHeight / maxExpectedCountInOneBin;
        const interval = Math.max(1, 50 / simulationSpeed);
        ballCreationInterval = setInterval(() => {
            if (droppedCount >= ballsToDrop) { clearInterval(ballCreationInterval); return; }
            const startX = canvas.width / 2 + (Math.random() - 0.5) * 5;
            balls.push(new Ball(startX, 20, 5, 'crimson'));
            droppedCount++;
        }, interval);
        animate();
    }

    function stopSimulation() {
        cancelAnimationFrame(animationFrameId);
        clearInterval(ballCreationInterval);
    }
    
    function resetSimulation() {
        stopSimulation();
        balls = [];
        binCounts = [];
        updateBoardParameters();
        drawBoard();
    }

    startBtn.addEventListener('click', startSimulation);
    resetBtn.addEventListener('click', resetSimulation);
    rowsInput.addEventListener('change', resetSimulation);
    window.addEventListener('resize', resizeCanvas);
    speedSlider.addEventListener('input', (e) => {
        simulationSpeed = parseInt(e.target.value);
        speedValueSpan.textContent = `${simulationSpeed}x`;
    });

    resizeCanvas();
});