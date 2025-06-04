// Tods Gallery - New Tods Page
let allTods = [];
let userUpvotes = [];
let unsubscribe = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Get user's upvotes from Firebase
    userUpvotes = await getUserUpvotes();
    
    // Set up real-time listener
    unsubscribe = listenToNewTods((tods) => {
        allTods = tods;
        displayTods();
    });
});

// Clean up listener when leaving page
window.addEventListener('beforeunload', () => {
    if (unsubscribe) {
        unsubscribe();
    }
});



// Display tods in grid
function displayTods() {
    const todsGrid = document.getElementById('todsGrid');
    todsGrid.innerHTML = '';
    
    allTods.forEach(tod => {
        const todCard = createTodCard(tod);
        todsGrid.appendChild(todCard);
    });
}

// Create tod card element
function createTodCard(tod) {
    const card = document.createElement('div');
    card.className = 'tod-card';
    
    const isUpvoted = userUpvotes.includes(tod.id);
    
    card.innerHTML = `
        <img src="${tod.imageUrl}" alt="${tod.name}" class="tod-image">
        <div class="tod-info">
            <div class="tod-name">${escapeHtml(tod.name)}</div>
            <div class="tod-meta">
                <span class="tod-time">${formatTime(tod.createdAt)}</span>
                <button class="upvote-btn ${isUpvoted ? 'upvoted' : ''}" 
                        onclick="toggleUpvote('${tod.id}')">
                    ❤️ ${tod.upvotes}
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// Toggle upvote
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

// Format time
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) {
        return 'Just now';
    } else if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m ago`;
    } else if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
    } else {
        const days = Math.floor(diff / 86400000);
        return `${days}d ago`;
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Generate demo tods for testing
function generateDemoTods() {
    const names = [
        'Happy Tod', 'Surprised Tod', 'Cool Tod', 'Artistic Tod',
        'Rainbow Tod', 'Ninja Tod', 'Wizard Tod', 'Pirate Tod',
        'Robot Tod', 'Alien Tod', 'Super Tod', 'Sleepy Tod'
    ];
    
    const tods = [];
    for (let i = 0; i < 12; i++) {
        tods.push({
            id: `demo-${i}`,
            name: names[i],
            imageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSJ3aGl0ZSIvPgo8Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjgwIiBmaWxsPSIjMzQ5OGRiIi8+CjxjaXJjbGUgY3g9IjcwIiBjeT0iODAiIHI9IjE1IiBmaWxsPSJ3aGl0ZSIvPgo8Y2lyY2xlIGN4PSIxMzAiIGN5PSI4MCIgcj0iMTUiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik03MCAxMzAgUTEwMCAxNTAgMTMwIDEzMCIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIi8+Cjwvc3ZnPg==',
            upvotes: Math.floor(Math.random() * 50),
            createdAt: new Date(Date.now() - Math.random() * 3600000 * 24).toISOString()
        });
    }
    
    return tods.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}