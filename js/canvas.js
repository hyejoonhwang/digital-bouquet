/**
 * Canvas & Drag-Drop Logic for Digital Bouquet
 */

const CanvasManager = {
    canvas: null,
    selectedFlower: null,
    isDragging: false,
    isTransforming: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    isReadOnly: false,
    transformStartAngle: 0,
    transformStartScale: 0,
    transformStartDistance: 0,

    // Initialize canvas
    init(canvasElement, readOnly = false) {
        this.canvas = canvasElement;
        this.isReadOnly = readOnly;

        if (!this.canvas) return;

        if (readOnly) {
            // For preview/view pages - render layered bouquet
            this.renderLayeredBouquet();
        } else {
            // For landing page - editable canvas
            this.updateWrapper(BouquetState.wrapper);
            this.render();
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
        elem.style.left = `${flower.x - 100}px`;
        elem.style.top = `${flower.y - 100}px`;
        elem.style.zIndex = '1';

        // Add flower image
        const img = document.createElement('img');
        img.src = BouquetState.flowerImages[flower.type];
        img.className = 'flower-img';
        img.draggable = false;
        elem.appendChild(img);

        // Apply rotation and scale
        const rotation = flower.rotation || 0;
        const scale = flower.scale || 1;
        elem.style.transform = `rotate(${rotation}deg) scale(${scale})`;
        elem.dataset.rotation = rotation;
        elem.dataset.scale = scale;

        if (!this.isReadOnly) {
            // Delete button (top-right)
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteFlower(flower.id);
            });
            elem.appendChild(deleteBtn);

            // Transform handle (bottom-left) - for rotation and resize
            const transformBtn = document.createElement('button');
            transformBtn.className = 'transform-btn';
            transformBtn.innerHTML = '⟳';
            transformBtn.addEventListener('mousedown', (e) => this.startTransform(e, flower.id, elem));
            transformBtn.addEventListener('touchstart', (e) => this.startTransform(e, flower.id, elem), { passive: false });
            elem.appendChild(transformBtn);

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
        if (e.target.classList.contains('transform-btn')) return;

        e.preventDefault();
        this.isDragging = true;
        this.selectFlower(flowerId, elem);

        const moveHandler = (e) => this.onDrag(e, flowerId, elem);
        const endHandler = () => this.endDrag(flowerId, elem, moveHandler, endHandler);

        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', endHandler);
        document.addEventListener('touchmove', moveHandler, { passive: false });
        document.addEventListener('touchend', endHandler);
    },

    // Handle drag movement - flower center follows cursor
    onDrag(e, flowerId, elem) {
        if (!this.isDragging) return;
        e.preventDefault();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const canvasRect = this.canvas.getBoundingClientRect();
        // Position flower center at cursor
        let x = clientX - canvasRect.left;
        let y = clientY - canvasRect.top;

        // Constrain to canvas bounds
        x = Math.max(100, Math.min(canvasRect.width - 100, x));
        y = Math.max(100, Math.min(canvasRect.height - 100, y));

        elem.style.left = `${x - 100}px`;
        elem.style.top = `${y - 100}px`;
    },

    // End drag
    endDrag(flowerId, elem, moveHandler, endHandler) {
        if (this.isDragging) {
            const x = parseFloat(elem.style.left) + 100;
            const y = parseFloat(elem.style.top) + 100;
            BouquetState.moveFlower(flowerId, x, y);
        }

        this.isDragging = false;

        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', endHandler);
        document.removeEventListener('touchmove', moveHandler);
        document.removeEventListener('touchend', endHandler);
    },

    // Start transform (rotation and scale)
    startTransform(e, flowerId, elem) {
        e.preventDefault();
        e.stopPropagation();

        this.isTransforming = true;
        this.selectFlower(flowerId, elem);

        // Get flower center position
        const rect = elem.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Calculate initial angle and distance from center
        this.transformStartAngle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
        this.transformStartDistance = Math.hypot(clientX - centerX, clientY - centerY);

        // Get current rotation and scale
        const currentRotation = parseFloat(elem.dataset.rotation) || 0;
        const currentScale = parseFloat(elem.dataset.scale) || 1;
        elem.dataset.initialRotation = currentRotation;
        elem.dataset.initialScale = currentScale;

        const moveHandler = (e) => this.onTransform(e, flowerId, elem, centerX, centerY);
        const endHandler = () => this.endTransform(flowerId, elem, moveHandler, endHandler);

        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', endHandler);
        document.addEventListener('touchmove', moveHandler, { passive: false });
        document.addEventListener('touchend', endHandler);
    },

    // Handle transform movement
    onTransform(e, flowerId, elem, centerX, centerY) {
        if (!this.isTransforming) return;
        e.preventDefault();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Calculate new angle
        const currentAngle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
        const angleDiff = currentAngle - this.transformStartAngle;
        const initialRotation = parseFloat(elem.dataset.initialRotation) || 0;
        const newRotation = initialRotation + angleDiff;

        // Calculate new scale based on distance from center
        const currentDistance = Math.hypot(clientX - centerX, clientY - centerY);
        const scaleFactor = currentDistance / this.transformStartDistance;
        const initialScale = parseFloat(elem.dataset.initialScale) || 1;
        const newScale = Math.max(0.3, Math.min(4, initialScale * scaleFactor));

        // Apply transform
        elem.style.transform = `rotate(${newRotation}deg) scale(${newScale})`;
        elem.dataset.rotation = newRotation;
        elem.dataset.scale = newScale;
    },

    // End transform
    endTransform(flowerId, elem, moveHandler, endHandler) {
        if (this.isTransforming) {
            const rotation = parseFloat(elem.dataset.rotation) || 0;
            const scale = parseFloat(elem.dataset.scale) || 1;
            BouquetState.transformFlower(flowerId, rotation, scale);
        }

        this.isTransforming = false;

        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', endHandler);
        document.removeEventListener('touchmove', moveHandler);
        document.removeEventListener('touchend', endHandler);
    },

    // Select a flower (also brings to top layer)
    selectFlower(flowerId, elem) {
        this.deselectFlower();
        this.selectedFlower = flowerId;
        elem.classList.add('selected');

        // Bring to top layer
        this.maxZIndex = (this.maxZIndex || 1) + 1;
        elem.style.zIndex = this.maxZIndex;
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

    // Update wrapper background (for landing page canvas - uses thumbnail)
    updateWrapper(wrapperId) {
        if (this.canvas && !this.isReadOnly) {
            const wrapper = BouquetState.wrapperImages[wrapperId];
            if (wrapper) {
                this.canvas.style.backgroundImage = `url('${wrapper.thumb}')`;
                this.canvas.style.backgroundSize = 'cover';
                this.canvas.style.backgroundPosition = 'center';
            }
        }
    },

    // Render layered bouquet (for preview/view pages)
    renderLayeredBouquet() {
        if (!this.canvas || !this.isReadOnly) return;

        const wrapper = BouquetState.wrapperImages[BouquetState.wrapper];
        if (!wrapper) return;

        // Clear existing content
        this.canvas.innerHTML = '';
        this.canvas.style.background = 'transparent';
        this.canvas.style.position = 'relative';

        // Layer 1: Back wrapper
        const backLayer = document.createElement('img');
        backLayer.src = wrapper.back;
        backLayer.className = 'bouquet-layer bouquet-back';
        backLayer.alt = 'Wrapper back';
        this.canvas.appendChild(backLayer);

        // Layer 2: Flowers container - centered cluster
        const flowersLayer = document.createElement('div');
        flowersLayer.className = 'bouquet-layer bouquet-flowers';

        // Arrange flowers in a centered cluster pattern
        const flowerCount = BouquetState.flowers.length;
        BouquetState.flowers.forEach((flower, index) => {
            const elem = document.createElement('div');
            elem.className = 'placed-flower bouquet-flower';

            // Add flower image
            const img = document.createElement('img');
            img.src = BouquetState.flowerImages[flower.type];
            img.className = 'flower-img';
            img.draggable = false;
            elem.appendChild(img);

            // Calculate position in a cluster (spread around center)
            const angle = (index / flowerCount) * Math.PI * 2 + Math.random() * 0.5;
            const radius = 20 + (index % 3) * 25 + Math.random() * 15;
            const offsetX = Math.cos(angle) * radius;
            const offsetY = Math.sin(angle) * radius * 0.6; // Flatten vertically

            elem.style.left = `calc(50% + ${offsetX}px)`;
            elem.style.top = `calc(35% + ${offsetY}px)`;

            const rotation = flower.rotation || 0;
            const scale = flower.scale || 1;
            elem.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`;

            flowersLayer.appendChild(elem);
        });
        this.canvas.appendChild(flowersLayer);

        // Layer 3: Front wrapper - positioned at bottom
        const frontLayer = document.createElement('img');
        frontLayer.src = wrapper.front;
        frontLayer.className = 'bouquet-layer bouquet-front';
        frontLayer.alt = 'Wrapper front';
        this.canvas.appendChild(frontLayer);
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
