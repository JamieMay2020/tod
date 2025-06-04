// Canvas and Drawing Variables
let canvas, ctx;
let isDrawing = false;
let currentColor = '#000000';
let currentSize = 5;
let selectedBase = null;
let drawingHistory = [];
let currentPath = [];
let baseImage = null;

// Rate Limiting
let createdTods = [];
const RATE_LIMIT = 3;
const RATE_LIMIT_WINDOW = 60000; // 1 minute

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
            const imgElement = option.querySelector('img');
            baseImage = imgElement.src;
            
            document.getElementById('baseSelectionModal').classList.remove('active');
            document.getElementById('drawingInterface').classList.remove('hidden');
            initializeCanvas();
        });
    });
}

// Drawing Tools Setup
function setupDrawingTools() {
    const brushSize = document.getElementById('brushSize');
    const undoBtn = document.getElementById('undoBtn');
    const clearBtn = document.getElementById('clearBtn');
    const completeBtn = document.getElementById('completeBtn');
    const pencilTool = document.getElementById('pencilTool');
    const brushTool = document.getElementById('brushTool');

    brushSize.addEventListener('change', (e) => {
        currentSize = parseInt(e.target.value);
    });

    undoBtn.addEventListener('click', undo);
    clearBtn.addEventListener('click', clearCanvas);
    completeBtn.addEventListener('click', completeTod);

    // Tool selection
    pencilTool.addEventListener('click', () => {
        pencilTool.classList.add('active');
        brushTool.classList.remove('active');
    });

    brushTool.addEventListener('click', () => {
        brushTool.classList.add('active');
        pencilTool.classList.remove('active');
    });

    // Set pencil as default
    pencilTool.classList.add('active');
}

// Color Palette Setup
function setupColorPalette() {
    const colorBoxes = document.querySelectorAll('.color-box');
    const currentColorDisplay = document.getElementById('currentColor');

    colorBoxes.forEach(box => {
        box.addEventListener('click', () => {
            // Remove previous selection
            document.querySelectorAll('.color-box').forEach(cb => cb.classList.remove('selected'));
            
            // Select new color
            box.classList.add('selected');
            currentColor = box.dataset.color;
            currentColorDisplay.style.backgroundColor = currentColor;
        });
    });

    // Set initial color
    currentColorDisplay.style.backgroundColor = currentColor;
    colorBoxes[0].classList.add('selected');
}

// Canvas Setup
function setupCanvas() {
    canvas = document.getElementById('drawingCanvas');
    ctx = canvas.getContext('2d');
    
    canvas.width = 500;
    canvas.height = 500;
    
    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);

    // Coordinate tracking
    canvas.addEventListener('mousemove', updateCoordinates);
}

// Update coordinates display
function updateCoordinates(e) {
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    let x = 0, y = 0;
    
    if (e) {
        x = Math.floor(e.clientX - rect.left);
        y = Math.floor(e.clientY - rect.top);
    }
    
    const coordDisplay = document.getElementById('coordinates');
    if (coordDisplay) {
        coordDisplay.textContent = `${x}, ${y}`;
    }
}

// Initialize Canvas with Base
function initializeCanvas() {
    // Clear canvas to white
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Load and draw the base image
    if (baseImage) {
        const img = new Image();
        img.onload = function() {
            // Center the image on canvas
            const x = (canvas.width - img.width) / 2;
            const y = (canvas.height - img.height) / 2;
            ctx.drawImage(img, x, y);
            saveCanvasState();
        };
        img.src = baseImage;
    }
}

// Drawing Functions
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
    if (!isDrawing) return;
    
    isDrawing = false;
    if (currentPath.length > 0) {
        drawingHistory.push([...currentPath]);
        currentPath = [];
    }
}

// Touch handling
function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                     e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

// Canvas State Management
function saveCanvasState() {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return imageData;
}

function undo() {
    if (drawingHistory.length === 0) return;
    
    drawingHistory.pop();
    redrawCanvas();
}

function clearCanvas() {
    if (confirm('Are you sure you want to clear everything?')) {
        drawingHistory = [];
        initializeCanvas();
    }
}

function redrawCanvas() {
    // Reset to base
    initializeCanvas();
    
    // Wait for base image to load, then redraw paths
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

// Complete Tod
    const allowed = await checkRateLimit();
    if (!allowed) {
        showRateLimitWarning();
        return;
    }

    
    document.getElementById('completionModal').classList.add('active');
    document.getElementById('todName').focus();
}

// Modal Setup
function setupModals() {
    const cancelBtn = document.getElementById('cancelBtn');
    const submitBtn = document.getElementById('submitBtn');
    const todNameInput = document.getElementById('todName');
    
    cancelBtn.addEventListener('click', () => {
        document.getElementById('completionModal').classList.remove('active');
        todNameInput.value = '';
    });
    
    submitBtn.addEventListener('click', submitTod);
    
    todNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitTod();
        }
    });
}

// Submit Tod
async function submitTod() {
    const todName = document.getElementById('todName').value.trim();
    const submitBtn = document.getElementById('submitBtn');
    
    if (!todName) {
        alert('Please give your Tod a name!');
        return;
    }

    submitBtn.disabled = true;

    const allowed = await checkRateLimit();
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
        } catch (error) {
            console.error('Error submitting Tod:', error);
            alert('Error creating Tod. Please check your connection.');
            submitBtn.disabled = false;
        }
    });
}

// Rate Limiting
function checkRateLimit() {
    // Use Firebase rate limit check
    return checkFirebaseRateLimit();
}

function showRateLimitWarning() {
    const warning = document.getElementById('rateLimitWarning');
    const cooldownTime = document.getElementById('cooldownTime');
    
    const oldestTod = Math.min(...createdTods);
    const timeRemaining = Math.ceil((RATE_LIMIT_WINDOW - (Date.now() - oldestTod)) / 1000);
    
    cooldownTime.textContent = timeRemaining;
    warning.classList.remove('hidden');
    
    const interval = setInterval(() => {
        const remaining = Math.ceil((RATE_LIMIT_WINDOW - (Date.now() - oldestTod)) / 1000);
        if (remaining <= 0) {
            warning.classList.add('hidden');
            clearInterval(interval);
        } else {
            cooldownTime.textContent = remaining;
        }
    }, 1000);
}
