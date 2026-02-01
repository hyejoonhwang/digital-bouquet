/**
 * Canvas & Drag-Drop Logic for Digital Bouquet
 */

const CanvasManager = {
    canvas: null,
    selectedFlower: null,
    isDragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    isReadOnly: false,

    // Initialize canvas
    init(canvasElement, readOnly = false) {
        this.canvas = canvasElement;
        this.isReadOnly = readOnly;

        if (!this.canvas) return;

        // Set initial wrapper
        this.updateWrapper(BouquetState.wrapper);

        // Render existing flowers
        this.render();

        if (!readOnly) {
            this.setupDropZone();
            this.setupCanvasEvents();
        }
    },

    // Setup canvas as drop zone
    setupDropZone() {
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();

            const flowerType = e.dataTransfer.getData('flowerType');
            if (!flowerType) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Check if we can add more flowers
            if (BouquetState.isAtLimit()) {
                this.showLimitWarning();
                return;
            }

            // Add flower to state
            const flower = BouquetState.addFlower(parseInt(flowerType), x, y);
            if (flower) {
                this.addFlowerElement(flower);
                this.updateFlowerCount();
                this.hidePlaceholder();
            }
        });
    },

    // Setup events for flower manipulation on canvas
    setupCanvasEvents() {
        // Click on canvas to deselect
        this.canvas.addEventListener('click', (e) => {
            if (e.target === this.canvas) {
                this.deselectFlower();
            }
        });
    },

    // Add flower element to canvas
    addFlowerElement(flower) {
        const elem = document.createElement('div');
        elem.className = 'placed-flower';
        elem.dataset.id = flower.id;
        elem.style.background = BouquetState.flowerColors[flower.type];
        elem.style.left = `${flower.x - 25}px`;
        elem.style.top = `${flower.y - 25}px`;

        if (!this.isReadOnly) {
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteFlower(flower.id);
            });
            elem.appendChild(deleteBtn);

            // Click to select
            elem.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectFlower(flower.id, elem);
            });

            // Drag to reposition
            elem.addEventListener('mousedown', (e) => this.startDrag(e, flower.id, elem));
            elem.addEventListener('touchstart', (e) => this.startDrag(e, flower.id, elem), { passive: false });
        }

        this.canvas.appendChild(elem);
    },

    // Start dragging a flower
    startDrag(e, flowerId, elem) {
        if (e.target.classList.contains('delete-btn')) return;

        e.preventDefault();
        this.isDragging = true;
        this.selectFlower(flowerId, elem);

        const rect = elem.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        this.dragOffsetX = clientX - rect.left;
        this.dragOffsetY = clientY - rect.top;

        const moveHandler = (e) => this.onDrag(e, flowerId, elem);
        const endHandler = () => this.endDrag(flowerId, elem, moveHandler, endHandler);

        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', endHandler);
        document.addEventListener('touchmove', moveHandler, { passive: false });
        document.addEventListener('touchend', endHandler);
    },

    // Handle drag movement
    onDrag(e, flowerId, elem) {
        if (!this.isDragging) return;
        e.preventDefault();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const canvasRect = this.canvas.getBoundingClientRect();
        let x = clientX - canvasRect.left - this.dragOffsetX + 25;
        let y = clientY - canvasRect.top - this.dragOffsetY + 25;

        // Constrain to canvas bounds
        x = Math.max(25, Math.min(canvasRect.width - 25, x));
        y = Math.max(25, Math.min(canvasRect.height - 25, y));

        elem.style.left = `${x - 25}px`;
        elem.style.top = `${y - 25}px`;
    },

    // End drag
    endDrag(flowerId, elem, moveHandler, endHandler) {
        if (this.isDragging) {
            const x = parseFloat(elem.style.left) + 25;
            const y = parseFloat(elem.style.top) + 25;
            BouquetState.moveFlower(flowerId, x, y);
        }

        this.isDragging = false;

        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', endHandler);
        document.removeEventListener('touchmove', moveHandler);
        document.removeEventListener('touchend', endHandler);
    },

    // Select a flower
    selectFlower(flowerId, elem) {
        this.deselectFlower();
        this.selectedFlower = flowerId;
        elem.classList.add('selected');
    },

    // Deselect current flower
    deselectFlower() {
        if (this.selectedFlower) {
            const elem = this.canvas.querySelector(`[data-id="${this.selectedFlower}"]`);
            if (elem) {
                elem.classList.remove('selected');
            }
            this.selectedFlower = null;
        }
    },

    // Delete a flower
    deleteFlower(flowerId) {
        BouquetState.removeFlower(flowerId);
        const elem = this.canvas.querySelector(`[data-id="${flowerId}"]`);
        if (elem) {
            elem.remove();
        }
        this.selectedFlower = null;
        this.updateFlowerCount();

        if (BouquetState.flowers.length === 0) {
            this.showPlaceholder();
        }
    },

    // Update wrapper background
    updateWrapper(wrapperId) {
        if (this.canvas) {
            this.canvas.style.background = BouquetState.wrapperGradients[wrapperId];
        }
    },

    // Render all flowers from state
    render() {
        // Clear existing flowers
        const existingFlowers = this.canvas.querySelectorAll('.placed-flower');
        existingFlowers.forEach(f => f.remove());

        // Render from state
        BouquetState.flowers.forEach(flower => {
            this.addFlowerElement(flower);
        });

        // Update placeholder visibility
        if (BouquetState.flowers.length > 0) {
            this.hidePlaceholder();
        } else {
            this.showPlaceholder();
        }

        // Update wrapper
        this.updateWrapper(BouquetState.wrapper);

        // Update count
        this.updateFlowerCount();
    },

    // Update flower count display
    updateFlowerCount() {
        const countElem = document.getElementById('flowerCount');
        if (countElem) {
            const count = BouquetState.getFlowerCount();
            countElem.textContent = `Flowers: ${count}/${BouquetState.MAX_FLOWERS}`;

            countElem.classList.remove('warning', 'limit');
            if (count >= BouquetState.MAX_FLOWERS) {
                countElem.classList.add('limit');
            } else if (count >= BouquetState.MAX_FLOWERS - 5) {
                countElem.classList.add('warning');
            }
        }
    },

    // Show limit warning
    showLimitWarning() {
        const countElem = document.getElementById('flowerCount');
        if (countElem) {
            countElem.textContent = `Maximum ${BouquetState.MAX_FLOWERS} flowers reached!`;
            countElem.classList.add('limit');

            setTimeout(() => {
                this.updateFlowerCount();
            }, 2000);
        }
    },

    // Hide placeholder text
    hidePlaceholder() {
        const placeholder = this.canvas.querySelector('.canvas-placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    },

    // Show placeholder text
    showPlaceholder() {
        const placeholder = this.canvas.querySelector('.canvas-placeholder');
        if (placeholder) {
            placeholder.style.display = 'block';
        }
    },

    // Get canvas dimensions
    getDimensions() {
        if (this.canvas) {
            return {
                width: this.canvas.offsetWidth,
                height: this.canvas.offsetHeight
            };
        }
        return { width: 400, height: 533 };
    }
};

// Make available globally
window.CanvasManager = CanvasManager;
