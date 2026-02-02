/**
 * State Management for Digital Bouquet
 * Handles bouquet state, undo/redo functionality
 */

const BouquetState = {
    // Current state
    flowers: [], // Array of { id, type, x, y }
    wrapper: 1,
    letter: '',

    // Undo/Redo stacks
    undoStack: [],
    redoStack: [],
    maxUndoSteps: 50,

    // Constants
    MAX_FLOWERS: 20,

    // Flower colors mapping (minimal gray for wireframe)
    flowerColors: {
        1: '#888888',
        2: '#888888',
        3: '#888888',
        4: '#888888',
        5: '#888888',
        6: '#888888',
        7: '#888888',
        8: '#888888',
        9: '#888888',
        10: '#888888'
    },

    // Wrapper backgrounds (minimal gray)
    wrapperGradients: {
        1: '#d9d9d9',
        2: '#c0c0c0',
        3: '#a8a8a8'
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
            y: y
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

    // Shuffle - randomly place 5-10 flowers
    shuffle(canvasWidth, canvasHeight) {
        this.saveState();
        this.flowers = [];

        const count = Math.floor(Math.random() * 6) + 5; // 5-10 flowers
        const padding = 50;

        for (let i = 0; i < count; i++) {
            const type = Math.floor(Math.random() * 10) + 1;
            const x = padding + Math.random() * (canvasWidth - padding * 2);
            const y = padding + Math.random() * (canvasHeight - padding * 2);

            this.flowers.push({
                id: this.generateId(),
                type: type,
                x: x,
                y: y
            });
        }

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
