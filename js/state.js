/**
 * State Management for Digital Bouquet
 * Handles bouquet state, undo/redo functionality
 */

const BouquetState = {
    // Current state
    flowers: [], // Array of { id, type, x, y, rotation, scale }
    wrapper: 1,
    letter: '',

    // Undo/Redo stacks
    undoStack: [],
    redoStack: [],
    maxUndoSteps: 50,

    // Constants
    MAX_FLOWERS: 20,

    // Flower image paths
    flowerImages: {
        1: 'assets/flowers/flower-01.png',
        2: 'assets/flowers/flower-02.png',
        3: 'assets/flowers/flower-03.png',
        4: 'assets/flowers/flower-04.png',
        5: 'assets/flowers/flower-05.png',
        6: 'assets/flowers/flower-06.png',
        7: 'assets/flowers/flower-07.png',
        8: 'assets/flowers/flower-08.png',
        9: 'assets/flowers/flower-09.png',
        10: 'assets/flowers/flower-10.png',
        11: 'assets/flowers/flower-11.png',
        12: 'assets/flowers/flower-12.png',
        13: 'assets/flowers/flower-13.png',
        14: 'assets/flowers/filler-01.png',
        15: 'assets/flowers/green-01.png'
    },

    // Wrapper image paths
    wrapperImages: {
        1: { thumb: 'assets/wrappers/wrapper01.png', back: 'assets/wrappers/wrapper01-back.png', front: 'assets/wrappers/wrapper01-front.png' },
        2: { thumb: 'assets/wrappers/wrapper02.png', back: 'assets/wrappers/wrapper02-back.png', front: 'assets/wrappers/wrapper02-front.png' },
        3: { thumb: 'assets/wrappers/wrapper03.png', back: 'assets/wrappers/wrapper03-back.png', front: 'assets/wrappers/wrapper03-front.png' },
        4: { thumb: 'assets/wrappers/wrapper04.png', back: 'assets/wrappers/wrapper04-back.png', front: 'assets/wrappers/wrapper04-front.png' },
        5: { thumb: 'assets/wrappers/wrapper05.png', back: 'assets/wrappers/wrapper05-back.png', front: 'assets/wrappers/wrapper05-front.png' },
        6: { thumb: 'assets/wrappers/wrapper06.png', back: 'assets/wrappers/wrapper06-back.png', front: 'assets/wrappers/wrapper06-front.png' },
        7: { thumb: 'assets/wrappers/wrapper07.png', back: 'assets/wrappers/wrapper07-back.png', front: 'assets/wrappers/wrapper07-front.png' },
        8: { thumb: 'assets/wrappers/wrapper08.png', back: 'assets/wrappers/wrapper08-back.png', front: 'assets/wrappers/wrapper08-front.png' }
    },

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Save current state to undo stack
    saveState() {
        const stateCopy = {
            flowers: JSON.parse(JSON.stringify(this.flowers)),
            wrapper: this.wrapper
        };
        this.undoStack.push(stateCopy);

        // Limit undo stack size
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }

        // Clear redo stack on new action
        this.redoStack = [];
    },

    // Undo last action
    undo() {
        if (this.undoStack.length === 0) return false;

        // Save current state to redo stack
        const currentState = {
            flowers: JSON.parse(JSON.stringify(this.flowers)),
            wrapper: this.wrapper
        };
        this.redoStack.push(currentState);

        // Restore previous state
        const previousState = this.undoStack.pop();
        this.flowers = previousState.flowers;
        this.wrapper = previousState.wrapper;

        return true;
    },

    // Redo last undone action
    redo() {
        if (this.redoStack.length === 0) return false;

        // Save current state to undo stack
        const currentState = {
            flowers: JSON.parse(JSON.stringify(this.flowers)),
            wrapper: this.wrapper
        };
        this.undoStack.push(currentState);

        // Restore next state
        const nextState = this.redoStack.pop();
        this.flowers = nextState.flowers;
        this.wrapper = nextState.wrapper;

        return true;
    },

    // Add a flower to the canvas
    addFlower(type, x, y) {
        if (this.flowers.length >= this.MAX_FLOWERS) {
            return null;
        }

        this.saveState();

        const flower = {
            id: this.generateId(),
            type: type,
            x: x,
            y: y,
            rotation: 0,
            scale: 1
        };

        this.flowers.push(flower);
        return flower;
    },

    // Move a flower
    moveFlower(id, x, y) {
        const flower = this.flowers.find(f => f.id === id);
        if (flower) {
            this.saveState();
            flower.x = x;
            flower.y = y;
            return true;
        }
        return false;
    },

    // Transform a flower (rotation and scale)
    transformFlower(id, rotation, scale) {
        const flower = this.flowers.find(f => f.id === id);
        if (flower) {
            this.saveState();
            flower.rotation = rotation;
            flower.scale = Math.max(0.5, Math.min(2.5, scale)); // Clamp scale between 0.5 and 2.5
            return true;
        }
        return false;
    },

    // Remove a flower
    removeFlower(id) {
        const index = this.flowers.findIndex(f => f.id === id);
        if (index !== -1) {
            this.saveState();
            this.flowers.splice(index, 1);
            return true;
        }
        return false;
    },

    // Set wrapper
    setWrapper(wrapperId) {
        if (this.wrapper !== wrapperId) {
            this.saveState();
            this.wrapper = wrapperId;
            return true;
        }
        return false;
    },

    // Set letter
    setLetter(text) {
        this.letter = text;
    },

    // Clear all flowers
    clear() {
        if (this.flowers.length > 0) {
            this.saveState();
            this.flowers = [];
            return true;
        }
        return false;
    },

    // Shuffle - change flower types and swap positions among existing flowers
    shuffle(canvasWidth, canvasHeight) {
        // Do nothing if no flowers
        if (this.flowers.length === 0) {
            return this.flowers;
        }

        this.saveState();

        // Extract current positions
        const positions = this.flowers.map(f => ({ x: f.x, y: f.y }));

        // Shuffle positions array (Fisher-Yates)
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }

        // Assign new random types and shuffled positions to each flower
        this.flowers = this.flowers.map((flower, index) => ({
            id: flower.id,
            type: Math.floor(Math.random() * 15) + 1, // Random new flower type
            x: positions[index].x,
            y: positions[index].y,
            rotation: flower.rotation || 0,
            scale: flower.scale || 1
        }));

        return this.flowers;
    },

    // Get current state for saving
    getState() {
        return {
            flowers: this.flowers,
            wrapper: this.wrapper,
            letter: this.letter
        };
    },

    // Load state
    loadState(state) {
        if (state) {
            this.flowers = state.flowers || [];
            this.wrapper = state.wrapper || 1;
            this.letter = state.letter || '';
            this.undoStack = [];
            this.redoStack = [];
        }
    },

    // Save to localStorage
    saveToStorage() {
        try {
            localStorage.setItem('bouquetState', JSON.stringify(this.getState()));
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
    },

    // Load from localStorage
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('bouquetState');
            if (saved) {
                this.loadState(JSON.parse(saved));
                return true;
            }
        } catch (e) {
            console.error('Failed to load from localStorage:', e);
        }
        return false;
    },

    // Clear localStorage
    clearStorage() {
        try {
            localStorage.removeItem('bouquetState');
        } catch (e) {
            console.error('Failed to clear localStorage:', e);
        }
    },

    // Check if can undo
    canUndo() {
        return this.undoStack.length > 0;
    },

    // Check if can redo
    canRedo() {
        return this.redoStack.length > 0;
    },

    // Get flower count
    getFlowerCount() {
        return this.flowers.length;
    },

    // Check if at flower limit
    isAtLimit() {
        return this.flowers.length >= this.MAX_FLOWERS;
    }
};

// Make available globally
window.BouquetState = BouquetState;
