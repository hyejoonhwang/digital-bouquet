/**
 * Main Application Logic for Digital Bouquet
 */

// Determine current page
const currentPage = window.location.pathname.split('/').pop() || 'index.html';

// Initialize based on current page
document.addEventListener('DOMContentLoaded', () => {
    switch (currentPage) {
        case 'index.html':
        case '':
            initIndexPage();
            break;
        case 'letter.html':
            initLetterPage();
            break;
        case 'preview.html':
            initPreviewPage();
            break;
        case 'share.html':
            initSharePage();
            break;
        case 'view.html':
            initViewPage();
            break;
    }
});

// ===== INDEX PAGE (Bouquet Creator) =====
function initIndexPage() {
    const canvas = document.getElementById('canvas');

    // Load any saved state
    BouquetState.loadFromStorage();

    // Initialize canvas
    CanvasManager.init(canvas, false);

    // Setup flower palette drag
    setupFlowerPalette();

    // Setup wrapper palette
    setupWrapperPalette();

    // Setup tabs
    setupTabs();

    // Setup action buttons
    setupActionButtons();

    // Setup keyboard shortcuts
    setupKeyboardShortcuts();

    // Create button navigation
    document.getElementById('createBtn').addEventListener('click', () => {
        if (BouquetState.flowers.length === 0) {
            alert('Please add at least one flower to your bouquet!');
            return;
        }
        BouquetState.saveToStorage();
        window.location.href = 'letter.html';
    });
}

function setupFlowerPalette() {
    const flowers = document.querySelectorAll('.palette-item.flower');

    flowers.forEach(flower => {
        flower.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('flowerType', flower.dataset.type);
            e.dataTransfer.effectAllowed = 'copy';
        });

        // Touch support for mobile
        flower.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            flower.dataset.touchStartX = touch.clientX;
            flower.dataset.touchStartY = touch.clientY;
        });

        flower.addEventListener('touchend', (e) => {
            const touch = e.changedTouches[0];
            const canvas = document.getElementById('canvas');
            const rect = canvas.getBoundingClientRect();

            // Check if touch ended over canvas
            if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
                touch.clientY >= rect.top && touch.clientY <= rect.bottom) {

                if (BouquetState.isAtLimit()) {
                    CanvasManager.showLimitWarning();
                    return;
                }

                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;

                const newFlower = BouquetState.addFlower(parseInt(flower.dataset.type), x, y);
                if (newFlower) {
                    CanvasManager.addFlowerElement(newFlower);
                    CanvasManager.updateFlowerCount();
                    CanvasManager.hidePlaceholder();
                }
            }
        });
    });
}

function setupWrapperPalette() {
    const wrappers = document.querySelectorAll('.palette-item.wrapper');

    // Set initial selection
    const initialWrapper = document.querySelector(`[data-wrapper="${BouquetState.wrapper}"]`);
    if (initialWrapper) {
        initialWrapper.classList.add('selected');
    }

    wrappers.forEach(wrapper => {
        wrapper.addEventListener('click', () => {
            // Remove previous selection
            wrappers.forEach(w => w.classList.remove('selected'));

            // Add selection to clicked
            wrapper.classList.add('selected');

            // Update state and canvas
            const wrapperId = parseInt(wrapper.dataset.wrapper);
            BouquetState.setWrapper(wrapperId);
            CanvasManager.updateWrapper(wrapperId);
        });
    });
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const flowersPalette = document.getElementById('flowersPalette');
    const wrapperPalette = document.getElementById('wrapperPalette');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            if (tab.dataset.tab === 'flowers') {
                flowersPalette.classList.remove('hidden');
                wrapperPalette.classList.add('hidden');
            } else {
                flowersPalette.classList.add('hidden');
                wrapperPalette.classList.remove('hidden');
            }
        });
    });
}

function setupActionButtons() {
    // Shuffle button
    document.getElementById('shuffleBtn').addEventListener('click', () => {
        const dims = CanvasManager.getDimensions();
        BouquetState.shuffle(dims.width, dims.height);
        CanvasManager.render();
    });

    // Undo button
    document.getElementById('undoBtn').addEventListener('click', () => {
        if (BouquetState.undo()) {
            CanvasManager.render();
        }
    });

    // Redo button
    document.getElementById('redoBtn').addEventListener('click', () => {
        if (BouquetState.redo()) {
            CanvasManager.render();
        }
    });
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+Z or Cmd+Z for undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            if (BouquetState.undo()) {
                CanvasManager.render();
            }
        }

        // Ctrl+Y or Cmd+Shift+Z for redo
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            if (BouquetState.redo()) {
                CanvasManager.render();
            }
        }

        // Delete key to remove selected flower
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (CanvasManager.selectedFlower && document.activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                CanvasManager.deleteFlower(CanvasManager.selectedFlower);
            }
        }
    });
}

// ===== LETTER PAGE =====
function initLetterPage() {
    // Load state
    if (!BouquetState.loadFromStorage()) {
        // No bouquet data, redirect back
        window.location.href = 'index.html';
        return;
    }

    // Initialize preview canvas (read-only)
    const previewCanvas = document.getElementById('previewCanvas');
    CanvasManager.init(previewCanvas, true);

    // Setup letter textarea
    const letterText = document.getElementById('letterText');
    const charCount = document.getElementById('charCount');

    // Load existing letter if any
    letterText.value = BouquetState.letter;
    charCount.textContent = `${letterText.value.length}/1000`;

    letterText.addEventListener('input', () => {
        BouquetState.setLetter(letterText.value);
        charCount.textContent = `${letterText.value.length}/1000`;
        BouquetState.saveToStorage();
    });

    // Back button
    document.getElementById('backBtn').addEventListener('click', () => {
        BouquetState.saveToStorage();
        window.location.href = 'index.html';
    });

    // Send button
    document.getElementById('sendBtn').addEventListener('click', () => {
        if (!letterText.value.trim()) {
            if (!confirm('Your letter is empty. Send anyway?')) {
                return;
            }
        }
        BouquetState.saveToStorage();
        window.location.href = 'preview.html';
    });
}

// ===== PREVIEW PAGE =====
function initPreviewPage() {
    // Load state
    if (!BouquetState.loadFromStorage()) {
        window.location.href = 'index.html';
        return;
    }

    // Initialize preview canvas
    const previewCanvas = document.getElementById('previewCanvas');
    CanvasManager.init(previewCanvas, true);

    // Display letter
    const letterPreview = document.getElementById('letterPreview');
    letterPreview.textContent = BouquetState.letter || '(No message)';

    // Edit button
    document.getElementById('editBtn').addEventListener('click', () => {
        window.location.href = 'letter.html';
    });

    // Confirm button
    document.getElementById('confirmBtn').addEventListener('click', async () => {
        const btn = document.getElementById('confirmBtn');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            const result = await FirebaseService.saveBouquet(BouquetState.getState());

            if (result.success) {
                // Store the share ID for the share page
                sessionStorage.setItem('shareId', result.id);
                window.location.href = 'share.html';
            } else {
                alert('Failed to save bouquet. Please try again.');
                btn.disabled = false;
                btn.textContent = 'Confirm & Get Link';
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save bouquet. Please try again.');
            btn.disabled = false;
            btn.textContent = 'Confirm & Get Link';
        }
    });
}

// ===== SHARE PAGE =====
function initSharePage() {
    const shareId = sessionStorage.getItem('shareId');

    if (!shareId) {
        window.location.href = 'index.html';
        return;
    }

    // Load state for mini preview
    BouquetState.loadFromStorage();

    // Initialize mini canvas
    const miniCanvas = document.getElementById('miniCanvas');
    if (miniCanvas) {
        CanvasManager.init(miniCanvas, true);
    }

    // Display letter content
    const letterPreview = document.getElementById('letterPreview');
    if (letterPreview) {
        letterPreview.textContent = BouquetState.letter || '';
    }

    // Generate and display share link
    const shareLink = document.getElementById('shareLink');
    const shareUrl = FirebaseService.getShareUrl(shareId);
    shareLink.value = shareUrl;

    // Copy button
    document.getElementById('copyBtn').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            document.getElementById('copyFeedback').classList.remove('hidden');
            setTimeout(() => {
                document.getElementById('copyFeedback').classList.add('hidden');
            }, 3000);
        } catch (err) {
            // Fallback for older browsers
            shareLink.select();
            document.execCommand('copy');
            document.getElementById('copyFeedback').classList.remove('hidden');
        }
    });

    // Create another button
    document.getElementById('newBouquetBtn').addEventListener('click', () => {
        BouquetState.clearStorage();
        sessionStorage.removeItem('shareId');
        window.location.href = 'index.html';
    });
}

// ===== VIEW PAGE (Receiver) =====
async function initViewPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const bouquetId = urlParams.get('id');

    if (!bouquetId) {
        showError();
        return;
    }

    try {
        const result = await FirebaseService.getBouquet(bouquetId);

        if (!result.success) {
            showError(result.error === 'expired');
            return;
        }

        // Store data for reveal
        window.bouquetData = result.data;

        // Setup envelope click
        setupEnvelope();

    } catch (error) {
        console.error('Error loading bouquet:', error);
        showError();
    }
}

function setupEnvelope() {
    const envelope = document.getElementById('envelope');
    const envelopeContainer = document.getElementById('envelopeContainer');

    envelopeContainer.addEventListener('click', () => {
        // Add opened class for animation
        envelope.classList.add('opened');

        // After animation, show revealed content
        setTimeout(() => {
            document.getElementById('envelopeView').classList.add('hidden');
            document.getElementById('revealedView').classList.remove('hidden');

            // Load bouquet data into state
            BouquetState.loadState(window.bouquetData);

            // Initialize revealed canvas
            const revealedCanvas = document.getElementById('revealedCanvas');
            CanvasManager.init(revealedCanvas, true);

            // Display letter
            const revealedLetter = document.getElementById('revealedLetter');
            revealedLetter.textContent = window.bouquetData.letter || '(No message)';

        }, 600);
    });

    // Create own button
    document.getElementById('createOwnBtn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
}

function showError(isExpired = false) {
    document.getElementById('envelopeView').classList.add('hidden');
    document.getElementById('revealedView').classList.add('hidden');
    document.getElementById('errorView').classList.remove('hidden');

    // Create new button
    document.getElementById('createNewBtn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
}
