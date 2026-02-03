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

    // Flower colors mapping
    flowerColors: {
        1: '#FF6B6B',
        2: '#FF8E53',
        3: '#FFCD38',
        4: '#6BCB77',
        5: '#4D96FF',
        6: '#9B59B6',
        7: '#E91E63',
        8: '#00BCD4',
        9: '#FF5722',
        10: '#8BC34A'
    },

    // Wrapper gradients
    wrapperGradients: {
        1: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        2: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        3: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
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
            type: Math.floor(Math.random() * 10) + 1, // Random new flower type
            x: positions[index].x,
            y: positions[index].y
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
