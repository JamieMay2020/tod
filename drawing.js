// Canvas and Drawing Variables
let canvas, ctx;
let isDrawing = false;
let currentColor = '#000000';
let currentSize = 5;
let selectedBase = null;
let drawingHistory = [];
let currentPath = [];
let baseImage = null;

// Rate Limiting (for fallback)
let createdTods = [];
const RATE_LIMIT = 3;
const RATE_LIMIT_WINDOW = 60000;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupBaseSelection();
    setupDrawingTools();
    setupCanvas();
    setupColorPalette();
    setupModals();
    updateCoordinates();
});

// Base Selection
function setupBaseSelection() {
    const baseOptions = document.querySelectorAll('.base-option');
    baseOptions.forEach(option => {
        option.addEventListener('click', () => {
            selectedBase = option.dataset.base;
            baseImage = option.querySelector('img').src;

            document.getElementById('baseSelectionModal').classList.remove('active');
            document.getElementById('drawingInterface').classList.remove('hidden');
            initializeCanvas();
        });
    });
}

// Drawing Tools
function setupDrawingTools() {
    const brushSize = document.getElementById('brushSize');
    brushSize.addEventListener('change', (e) => currentSize = parseInt(e.target.value));

    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('clearBtn').addEventListener('click', clearCanvas);
    document.getElementById('completeBtn').addEventListener('click', completeTod);

    const pencil = document.getElementById('pencilTool');
    const brush = document.getElementById('brushTool');

    pencil.addEventListener('click', () => {
        pencil.classList.add('active');
        brush.classList.remove('active');
    });

    brush.addEventListener('click', () => {
        brush.classList.add('active');
        pencil.classList.remove('active');
    });

    pencil.classList.add('active');
}

// Color Palette
function setupColorPalette() {
    const boxes = document.querySelectorAll('.color-box');
    const display = document.getElementById('currentColor');

    boxes.forEach(box => {
        box.addEventListener('click', () => {
            boxes.forEach(cb => cb.classList.remove('selected'));
            box.classList.add('selected');
            currentColor = box.dataset.color;
            display.style.backgroundColor = currentColor;
        });
    });

    display.style.backgroundColor = currentColor;
    boxes[0].classList.add('selected');
}

// Canvas Setup
function setupCanvas() {
    canvas = document.getElementById('drawingCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = 500;
    canvas.height = 500;

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('mousemove', updateCoordinates);
}

// Update coordinates display
function updateCoordinates(e) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e ? Math.floor(e.clientX - rect.left) : 0;
    const y = e ? Math.floor(e.clientY - rect.top) : 0;
    document.getElementById('coordinates').textContent = `${x}, ${y}`;
}

// Initialize Canvas
function initializeCanvas() {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (baseImage) {
        const img = new Image();
        img.onload = () => {
            const x = (canvas.width - img.width) / 2;
            const y = (canvas.height - img.height) / 2;
            ctx.drawImage(img, x, y);
            saveCanvasState();
        };
        img.src = baseImage;
    }
}

// Drawing
function startDrawing(e) {
    isDrawing = true;
    currentPath = [];
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    currentPath.push({x, y, color: currentColor, size: currentSize});
}

function draw(e) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = currentSize;
    ctx.strokeStyle = currentColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();

    currentPath.push({x, y, color: currentColor, size: currentSize});
}

function stopDrawing() {
    if (isDrawing && currentPath.length > 0) {
        drawingHistory.push([...currentPath]);
        currentPath = [];
    }
    isDrawing = false;
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const type = e.type === 'touchstart' ? 'mousedown' : e.type === 'touchmove' ? 'mousemove' : 'mouseup';
    canvas.dispatchEvent(new MouseEvent(type, {
        clientX: touch.clientX,
        clientY: touch.clientY
    }));
}

// Undo / Clear
function undo() {
    if (drawingHistory.length > 0) {
        drawingHistory.pop();
        redrawCanvas();
    }
}

function clearCanvas() {
    if (confirm('Are you sure you want to clear everything?')) {
        drawingHistory = [];
        initializeCanvas();
    }
}

function redrawCanvas() {
    initializeCanvas();
    setTimeout(() => {
        drawingHistory.forEach(path => {
            if (path.length === 0) return;
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) {
                ctx.lineWidth = path[i].size;
                ctx.strokeStyle = path[i].color;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.lineTo(path[i].x, path[i].y);
                ctx.stroke();
            }
        });
    }, 100);
}

// Modal Setup
function setupModals() {
    const cancel = document.getElementById('cancelBtn');
    const submit = document.getElementById('submitBtn');
    const input = document.getElementById('todName');

    cancel.addEventListener('click', () => {
        document.getElementById('completionModal').classList.remove('active');
        input.value = '';
    });

    submit.addEventListener('click', submitTod);
    input.addEventListener('keypress', e => {
        if (e.key === 'Enter') submitTod();
    });
}

// Trigger modal
function completeTod() {
    document.getElementById('completionModal').classList.add('active');
    document.getElementById('todName').focus();
}

// Submit Tod with async rate check
async function submitTod() {
    const todName = document.getElementById('todName').value.trim();
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;

    if (!todName) {
        alert('Please give your Tod a name!');
        submitBtn.disabled = false;
        return;
    }

    const allowed = await checkFirebaseRateLimit();
    if (!allowed) {
        showRateLimitWarning();
        submitBtn.disabled = false;
        return;
    }

    canvas.toBlob(async (blob) => {
        try {
            const result = await createTod(blob, todName, selectedBase);
            if (result.success) {
                createdTods.push(Date.now());
                document.getElementById('completionModal').classList.remove('active');
                document.getElementById('todName').value = '';
                alert('Your Tod has been created successfully!');
                window.location.href = 'new-tods.html';
            } else {
                alert('Failed to create Tod. Please try again.');
                submitBtn.disabled = false;
            }
        } catch (err) {
            console.error(err);
            alert('Error creating Tod. Please check your connection.');
            submitBtn.disabled = false;
        }
    });
}

// Show warning
function showRateLimitWarning() {
    const warning = document.getElementById('rateLimitWarning');
    const timeEl = document.getElementById('cooldownTime');
    const oldest = Math.min(...createdTods);
    const timeRemaining = Math.ceil((RATE_LIMIT_WINDOW - (Date.now() - oldest)) / 1000);

    timeEl.textContent = timeRemaining;
    warning.classList.remove('hidden');

    const interval = setInterval(() => {
        const remaining = Math.ceil((RATE_LIMIT_WINDOW - (Date.now() - oldest)) / 1000);
        if (remaining <= 0) {
            warning.classList.add('hidden');
            clearInterval(interval);
        } else {
            timeEl.textContent = remaining;
        }
    }, 1000);
}
