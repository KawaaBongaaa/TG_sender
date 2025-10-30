/**
 * Strength Slider Module
 * Manages the strength slider visibility and integration for image-to-image modes
 * Only shows for: dreamshaper, flux_pro, print_on_demand modes when image is uploaded
 */

// Constants
const STRENGTH_SLIDER_CONFIG = {
    DEFAULT_VALUE: 0.8,
    MIN_VALUE: 0.01,
    MAX_VALUE: 1.0,
    STEP: 0.01,
    SUPPORTED_MODES: ['dreamshaper_xl', 'pixplace_pro', 'print_maker']
};

// Strength Slider Controller
class StrengthSliderController {
    constructor() {
        this.sliderGroup = null;
        this.slider = null;
        this.valueDisplay = null;
        this.currentValue = STRENGTH_SLIDER_CONFIG.DEFAULT_VALUE;
        this.isInitialized = false;

        // Bind methods
        this.updateVisibility = this.updateVisibility.bind(this);
        this.handleSliderChange = this.handleSliderChange.bind(this);
        this.formatDisplayValue = this.formatDisplayValue.bind(this);
    }

    /**
     * Initialize the strength slider
     */
    init() {
        if (this.isInitialized) return;

        console.log('🎛️ Initializing Strength Slider...');

        // Get DOM elements
        this.sliderGroup = document.getElementById('strengthSliderGroup');
        this.slider = document.getElementById('strengthSlider');
        this.valueDisplay = document.getElementById('strengthValue');

        if (!this.sliderGroup || !this.slider || !this.valueDisplay) {
            console.warn('❌ Strength slider elements not found');
            return;
        }

        // Set initial values
        this.slider.min = STRENGTH_SLIDER_CONFIG.MIN_VALUE;
        this.slider.max = STRENGTH_SLIDER_CONFIG.MAX_VALUE;
        this.slider.step = STRENGTH_SLIDER_CONFIG.STEP;
        this.slider.value = STRENGTH_SLIDER_CONFIG.DEFAULT_VALUE;
        this.currentValue = STRENGTH_SLIDER_CONFIG.DEFAULT_VALUE;

        // Update display
        this.updateDisplayValue();

        // Add event listeners
        this.slider.addEventListener('input', this.handleSliderChange);
        this.slider.addEventListener('change', this.handleSliderChange);

        // Set initial visibility
        this.updateVisibility();

        // Listen for mode changes and image updates
        document.addEventListener('mode:changed', this.updateVisibility);
        document.addEventListener('images:updated', this.updateVisibility);

        this.isInitialized = true;
        console.log('✅ Strength Slider initialized');
    }

    /**
     * Handle slider value changes
     */
    handleSliderChange(event) {
        const newValue = parseFloat(event.target.value);
        this.currentValue = newValue;
        this.updateDisplayValue();
        this.updateSliderFill();

        // Dispatch custom event for other modules to listen
        document.dispatchEvent(new CustomEvent('strength:changed', {
            detail: { value: newValue }
        }));

        console.log(`🔄 Strength changed to: ${newValue}`);
    }

    /**
     * Update the display value with proper formatting
     */
    updateDisplayValue() {
        if (!this.valueDisplay) return;

        const displayValue = this.formatDisplayValue(this.currentValue);
        this.valueDisplay.textContent = displayValue;
    }

    /**
     * Format display value - show 0 and 1 for extreme values
     */
    formatDisplayValue(value) {
        if (value <= STRENGTH_SLIDER_CONFIG.MIN_VALUE) {
            return '0';
        } else if (value >= STRENGTH_SLIDER_CONFIG.MAX_VALUE) {
            return '1';
        } else {
            return value.toFixed(2);
        }
    }

    /**
     * Update the slider fill visual effect
     */
    updateSliderFill() {
        if (!this.slider) return;

        const percentage = ((this.currentValue - STRENGTH_SLIDER_CONFIG.MIN_VALUE) /
                          (STRENGTH_SLIDER_CONFIG.MAX_VALUE - STRENGTH_SLIDER_CONFIG.MIN_VALUE)) * 100;

        this.slider.style.setProperty('--fill-width', `${percentage}%`);
    }

    /**
     * Update slider visibility based on current mode and image state
     */
    async updateVisibility() {
        if (!this.sliderGroup) {
            console.warn('❌ Strength slider group not found');
            return false;
        }

        try {
            // Get current mode from multiple sources with fallback priority
            const currentMode = this.getCurrentModeFromSources();
            const isSupportedMode = STRENGTH_SLIDER_CONFIG.SUPPORTED_MODES.includes(currentMode);
            const hasImages = window.userImageState?.images?.length > 0;
            const shouldShow = isSupportedMode && hasImages;

            if (shouldShow) {
                this.sliderGroup.classList.add('visible');
                this.sliderGroup.style.display = 'block';
                console.log(`🎛️ Strength slider VISIBLE for mode: ${currentMode} (hasImages: ${hasImages})`);
                return true;
            } else {
                this.sliderGroup.classList.remove('visible');
                this.sliderGroup.style.display = 'none';
                console.log(`🎛️ Strength slider HIDDEN for mode: ${currentMode} (hasImages: ${hasImages}, supported: ${isSupportedMode})`);
                return false;
            }

        } catch (error) {
            console.error('❌ Error updating strength slider visibility:', error);
            this.sliderGroup.classList.remove('visible');
            this.sliderGroup.style.display = 'none';
            return false;
        }
    }

    /**
     * Force show slider for debugging (temporary method)
     */
    forceShowForDebug() {
        console.log('🔧 FORCE showing strength slider for debugging');
        if (this.sliderGroup) {
            this.sliderGroup.classList.add('visible');
            this.sliderGroup.style.display = 'block';
        }
        return true;
    }

    /**
     * Get current mode from all available sources with fallback logic
     */
    getCurrentModeFromSources() {
        // Priority 1: Try to get from new mode cards export (most reliable)
        if (window.modeCardsExports?.getSelectedMode) {
            const mode = window.modeCardsExports.getSelectedMode();
            if (mode) {
                console.log(`🎯 Mode from modeCardsExports: ${mode}`);
                return mode;
            }
        }

        // Priority 2: Try DOM element (legacy support)
        const domMode = document.getElementById('modeSelect')?.value;
        if (domMode && domMode.trim() !== '') {
            console.log(`🎯 Mode from DOM element: ${domMode}`);
            return domMode;
        }

        // Priority 3: Try active mode card data attribute
        const activeCard = document.querySelector('.mode-card.active, .carousel-2d-item.active');
        if (activeCard) {
            const cardMode = activeCard.dataset?.mode || activeCard.dataset?.style;
            if (cardMode) {
                console.log(`🎯 Mode from active card: ${cardMode}`);
                return cardMode;
            }
        }

        // Priority 4: Try any selected style from carousel
        const selectedStyle = window.getSelectedStyle?.();
        if (selectedStyle) {
            // Map style to mode if possible (dreamshaper maps to dreamshaper_xl)
            const modeMap = {
                'dreamshaper': 'dreamshaper_xl',
                'flux_pro': 'pixplace_pro',
                'print_maker': 'print_maker'
            };
            const mappedMode = modeMap[selectedStyle];
            if (mappedMode) {
                console.log(`🎯 Mode mapped from style: ${selectedStyle} -> ${mappedMode}`);
                return mappedMode;
            }
            console.log(`🎯 Style fallback: ${selectedStyle}`);
            return selectedStyle;
        }

        console.warn('🔍 No mode found from any source, returning empty string');
        return '';
    }

    /**
     * Get current strength value
     */
    getValue() {
        return this.currentValue;
    }

    /**
     * Set strength value programmatically
     */
    setValue(value) {
        const clampedValue = Math.max(STRENGTH_SLIDER_CONFIG.MIN_VALUE,
                            Math.min(STRENGTH_SLIDER_CONFIG.MAX_VALUE, value));

        this.currentValue = clampedValue;
        this.slider.value = clampedValue;
        this.updateDisplayValue();
        this.updateSliderFill();
    }

    /**
     * Reset to default value
     */
    reset() {
        this.setValue(STRENGTH_SLIDER_CONFIG.DEFAULT_VALUE);
    }

    /**
     * Get strength value formatted for API request
     */
    getApiValue() {
        return this.currentValue;
    }

    /**
     * Check if slider is visible
     */
    isVisible() {
        return this.sliderGroup?.classList.contains('visible') || false;
    }

    /**
     * Force show slider for debugging
     */
    forceShow() {
        console.log('🔧 FORCING strength slider to show for debugging');
        return this.updateVisibility(true);
    }

    /**
     * Debug current state
     */
    debug() {
        console.log('🔍 Strength Slider Debug Info:');
        console.log('- Initialized:', this.isInitialized);
        console.log('- DOM elements found:', !!this.sliderGroup, !!this.slider, !!this.valueDisplay);
        console.log('- Current value:', this.currentValue);
        console.log('- Is visible:', this.isVisible());
        console.log('- Supported modes:', STRENGTH_SLIDER_CONFIG.SUPPORTED_MODES);
        console.log('- Current mode sources:');

        // Test each mode source
        try {
            console.log('  - modeCardsExports:', window.modeCardsExports?.getSelectedMode?.());
        } catch (e) { console.log('  - modeCardsExports error:', e.message); }

        try {
            console.log('  - DOM element:', document.getElementById('modeSelect')?.value);
        } catch (e) { console.log('  - DOM error:', e.message); }

        try {
            const activeCard = document.querySelector('.mode-card.active, .carousel-2d-item.active');
            console.log('  - active card:', activeCard?.dataset?.mode || activeCard?.dataset?.style);
        } catch (e) { console.log('  - active card error:', e.message); }

        try {
            console.log('  - selected style:', window.getSelectedStyle?.());
        } catch (e) { console.log('  - selected style error:', e.message); }

        console.log('- Images state:', window.userImageState?.images?.length || 0);

        return this.getCurrentModeFromSources();
    }
}

// Global instance
const strengthSlider = new StrengthSliderController();

// Export for global access
window.strengthSlider = strengthSlider;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure all elements are created
    setTimeout(() => {
        strengthSlider.init();
    }, 100);
});

console.log('🎛️ Strength Slider module loaded');
