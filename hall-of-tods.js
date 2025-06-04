// Hall of Tods - Top 20 Tods Page
let topTods = [];
let userUpvotes = [];
let unsubscribe = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Get user's upvotes from Firebase
    userUpvotes = await getUserUpvotes();
    
    // Set up real-time listener
    unsubscribe = listenToTopTods((tods) => {
        topTods = tods;
        displayTopTods();
    });
});

// Clean up listener when leaving page
window.addEventListener('beforeunload', () => {
    if (unsubscribe) {
        unsubscribe();
    }
});

// Load top tods from server
async function loadTopTods() {
    const topTodsGrid = document.getElementById('topTodsGrid');
    
    try {
        // Fetch top 20 tods from your backend
        const response = await fetch('/api/tods/top?limit=20');
        
        if (response.ok) {
            const data = await response.json();
            topTods = data.tods;
            displayTopTods();
        }
    } catch (error) {
        console.error('Error loading top tods:', error);
        
        // Demo data for testing
        topTods = generateDemoTopTods();
        displayTopTods();
    }
}

// Display top tods with rankings
function displayTopTods() {
    const topTodsGrid = document.getElementById('topTodsGrid');
    topTodsGrid.innerHTML = '';
    
    topTods.forEach((tod, index) => {
        const todCard = createRankedTodCard(tod, index + 1);
        topTodsGrid.appendChild(todCard);
    });
}

// Create ranked tod card
function createRankedTodCard(tod, rank) {
    const card = document.createElement('div');
    card.className = 'tod-card';
    card.style.position = 'relative';
    
    const isUpvoted = userUpvotes.includes(tod.id);
    
    // Determine badge class
    let badgeClass = 'rank-badge';
    if (rank === 1) badgeClass += ' gold';
    else if (rank === 2) badgeClass += ' silver';
    else if (rank === 3) badgeClass += ' bronze';
    
    card.innerHTML = `
        <div class="${badgeClass}">${rank}</div>
        <img src="${tod.imageUrl}" alt="${tod.name}" class="tod-image">
        <div class="tod-info">
            <div class="tod-name">${escapeHtml(tod.name)}</div>
            <div class="tod-meta">
                <span class="tod-creator">by ${escapeHtml(tod.creator || 'Anonymous')}</span>
                <button class="upvote-btn ${isUpvoted ? 'upvoted' : ''}" 
                        onclick="toggleUpvote('${tod.id}')">
                    ❤️ ${tod.upvotes}
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// Toggle upvote (shared with new-tods page)
async function toggleUpvote(todId) {
    const isUpvoted = userUpvotes.includes(todId);
    
    const result = await toggleUpvoteFirebase(todId, isUpvoted);
    
    if (result.success) {
        if (isUpvoted) {
            userUpvotes = userUpvotes.filter(id => id !== todId);
        } else {
            userUpvotes.push(todId);
        }
        
        // Update will happen automatically through the real-time listener
    } else {
        alert('Error updating upvote. Please try again.');
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Generate demo top tods for testing
function generateDemoTopTods() {
    const names = [
        'Masterpiece Tod', 'Legendary Tod', 'Epic Tod', 'Amazing Tod',
        'Incredible Tod', 'Fantastic Tod', 'Brilliant Tod', 'Stunning Tod',
        'Magnificent Tod', 'Spectacular Tod', 'Marvelous Tod', 'Wonderful Tod',
        'Glorious Tod', 'Superb Tod', 'Excellent Tod', 'Outstanding Tod',
        'Remarkable Tod', 'Extraordinary Tod', 'Phenomenal Tod', 'Sensational Tod'
    ];
    
    const creators = [
        'TodMaster', 'ArtistPro', 'CreativeGenius', 'TodWizard',
        'DrawingKing', 'PaintQueen', 'PixelPerfect', 'ColorMaster'
    ];
    
    const tods = [];
    for (let i = 0; i < 20; i++) {
        tods.push({
            id: `top-${i}`,
            name: names[i],
            creator: creators[Math.floor(Math.random() * creators.length)],
            imageUrl: '',
            upvotes: 1000 - (i * 45) + Math.floor(Math.random() * 20),
            createdAt: new Date(Date.now() - Math.random() * 3600000 * 24 * 30).toISOString()
        });
    }
    
    return tods;
}
