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
    let oneBallHeight = 0; // 新增：单个小球代表的固定高度

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
        update(boardParams) {
            this.vy += this.gravity;
            this.x += this.vx;
            this.y += this.vy;
            
            // 检查是否到达新的行
            const nextRowY = boardParams.topPadding + this.currentRow * boardParams.verticalSpacing;
            if (this.y + this.radius > nextRowY && this.currentRow < boardParams.rows) {
                // 计算当前行的钉子位置
                const numPinsInRow = this.currentRow + 1;
                const rowWidth = (numPinsInRow - 1) * boardParams.horizontalSpacing;
                const startX = (canvas.width - rowWidth) / 2;
                
                // 检查与钉子的碰撞
                let hit = false;
                for (let col = 0; col < numPinsInRow; col++) {
                    const pinX = startX + col * boardParams.horizontalSpacing;
                    const pinY = nextRowY;
                    
                    // 计算小球与钉子的距离
                    const dx = this.x - pinX;
                    const dy = this.y - pinY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // 如果碰撞发生
                    if (distance < this.radius + boardParams.pinRadius) {
                        hit = true;
                        // 改进的碰撞反应：基于钉子位置的随机反弹
                        // 保留部分原有速度，并添加随机分量
                        const speedRetention = 0.1;   // 保留10%的速度
                        const randomFactor = 0.9;   // 90%的随机分量
                        
                        // 基于碰撞点的反弹，完全随机分布
                        this.vx = this.vx * speedRetention + 
                                 (Math.random() - 0.5) * randomFactor * 2;
                        this.vy = this.vy * speedRetention + 
                                 (Math.random() - 0.5) * randomFactor * 2;
                        
                        // 确保小球不会卡在钉子里
                        const overlap = this.radius + boardParams.pinRadius - distance;
                        if (distance > 0) { // 避免除零错误
                            this.x += (dx / distance) * overlap * 1.1;
                            this.y += (dy / distance) * overlap * 1.1;
                        } else {
                            // 如果距离为0，给一个小的随机偏移
                            this.x += (Math.random() - 0.5) * 2;
                            this.y += (Math.random() - 0.5) * 2;
                        }
                        break;
                    }
                }
                
                // 如果没有碰到钉子，继续下落
                if (!hit && this.currentRow < boardParams.rows) {
                    this.currentRow++;
                }
            }
            
            // 当小球通过所有钉子行后，减少水平速度
            if (this.currentRow >= boardParams.rows) {
                this.vx *= 0.98;
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
        
        // 根据屏幕宽度调整参数
        if (canvas.width < 500) { // 手机屏幕
            boardParams.pinRadius = 3;
            boardParams.topPadding = 20;
            boardParams.horizontalPadding = 20;
        } else { // 桌面屏幕
            boardParams.pinRadius = 4;
            boardParams.topPadding = 40;
            boardParams.horizontalPadding = 40;
        }
        
        boardParams.horizontalSpacing = (canvas.width - 2 * boardParams.horizontalPadding) / rows;
        boardParams.verticalSpacing = (canvas.height * 0.8) / rows; 
        boardParams.numBins = rows + 1;
        
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

    // --- 修改：drawResults 函数 ---
    function drawResults() {
        if (binCounts.length === 0 || oneBallHeight === 0) return;

        const binWidth = boardParams.horizontalSpacing;

        for (let i = 0; i < binCounts.length; i++) {
            // 核心修改：高度 = 数量 * 每个小球的固定高度
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
                if (binIndex === -1) {
                    binIndex = boardParams.numBins -1;
                }
                binCounts[binIndex]++;
            });
            balls = balls.filter(ball => ball.y < canvas.height);
        }

        balls.forEach(ball => ball.draw());
        drawResults();
        
        animationFrameId = requestAnimationFrame(animate);
    }

    // --- 修改：startSimulation 函数 ---
    function startSimulation() {
        resetSimulation();
        updateBoardParameters();
        binCounts = Array(boardParams.numBins).fill(0);

        let ballsToDrop = parseInt(ballsInput.value);
        let droppedCount = 0;

        // --- 核心修改：在这里计算单个小球的高度 ---
        const lastRowY = boardParams.topPadding + (boardParams.rows - 1) * boardParams.verticalSpacing;
        const barAreaHeight = (canvas.height - (lastRowY + 20)) * 0.9; // 结果区域的总高度
        // 预估中心槽最多能占总球数的35%，以此为基准防止高度溢出
        const maxExpectedCountInOneBin = Math.max(1, ballsToDrop * 0.35); 
        oneBallHeight = barAreaHeight / maxExpectedCountInOneBin;

        const interval = Math.max(1, 50 / simulationSpeed);

        ballCreationInterval = setInterval(() => {
            if (droppedCount >= ballsToDrop) {
                clearInterval(ballCreationInterval);
                return;
            }
            // 扩大小球初始发射位置范围，使其覆盖顶部钉子区域
            const startX = canvas.width / 2 + (Math.random() - 0.5) * boardParams.horizontalSpacing;
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