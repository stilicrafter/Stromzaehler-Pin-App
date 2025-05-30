/**
 * Morse Code Utility Module
 * Handles conversion of digits to Morse code patterns for German electricity meter communication
 */

class MorseCodeHandler {
    constructor() {
        // Digital electricity meter flash code mapping for digits (0-9)
        // Each digit corresponds to the number of flashes (0 = 10 flashes)
        this.flashMap = {
            '0': 10,  // 0 wird als 10 Blitze dargestellt
            '1': 1,   // 1 Blitz
            '2': 2,   // 2 Blitze
            '3': 3,   // 3 Blitze
            '4': 4,   // 4 Blitze
            '5': 5,   // 5 Blitze
            '6': 6,   // 6 Blitze
            '7': 7,   // 7 Blitze
            '8': 8,   // 8 Blitze
            '9': 9    // 9 Blitze
        };

        // Default timing settings optimized for photodiode reception
        this.timing = {
            flashDuration: 200,    // Duration for each flash (ms)
            flashPause: 200,       // Pause between flashes within a digit
            digitPause: 800,       // Pause between digits
            sequencePause: 2000    // Pause between PIN sequences
        };
    }

    /**
     * Convert a PIN string to flash code representation
     * @param {string} pin - The PIN to convert (digits only)
     * @returns {string} Flash code representation
     */
    convertToFlashCode(pin) {
        if (!pin || !/^\d+$/.test(pin)) {
            return '';
        }

        return pin.split('').map(digit => {
            const flashes = this.flashMap[digit];
            return `${digit}: ${flashes} Blitz${flashes !== 1 ? 'e' : ''}`;
        }).join(' | ');
    }

    /**
     * Get timing sequence for transmitting a PIN
     * @param {string} pin - The PIN to transmit
     * @returns {Array} Array of timing objects with duration and type
     */
    getTimingSequence(pin) {
        if (!pin || !/^\d+$/.test(pin)) {
            return [];
        }

        const sequence = [];

        for (let i = 0; i < pin.length; i++) {
            const digit = pin[i];
            const flashCount = this.flashMap[digit];

            if (flashCount === undefined) continue;

            // Add flashes for this digit
            for (let j = 0; j < flashCount; j++) {
                // Add the flash
                sequence.push({
                    type: 'flash',
                    duration: this.timing.flashDuration,
                    digit: digit,
                    flashNumber: j + 1,
                    totalFlashes: flashCount
                });

                // Add pause between flashes (except after last flash of digit)
                if (j < flashCount - 1) {
                    sequence.push({
                        type: 'pause',
                        duration: this.timing.flashPause,
                        pauseType: 'flash-pause'
                    });
                }
            }

            // Add pause between digits (except after last digit)
            if (i < pin.length - 1) {
                sequence.push({
                    type: 'pause',
                    duration: this.timing.digitPause,
                    pauseType: 'digit-pause'
                });
            }
        }

        return sequence;
    }

    /**
     * Update timing settings
     * @param {Object} newTiming - New timing configuration
     */
    updateTiming(newTiming) {
        this.timing = { ...this.timing, ...newTiming };
        
        // Update flash duration if provided
        if (newTiming.flashDuration) {
            this.timing.flashDuration = newTiming.flashDuration;
        }
        
        // Update digit pause if provided
        if (newTiming.digitPause) {
            this.timing.digitPause = newTiming.digitPause;
        }
    }

    /**
     * Validate PIN format for German electricity meters
     * @param {string} pin - PIN to validate
     * @returns {Object} Validation result with isValid and error message
     */
    validatePin(pin) {
        if (!pin) {
            return { isValid: false, error: 'PIN ist erforderlich' };
        }

        if (!/^\d+$/.test(pin)) {
            return { isValid: false, error: 'PIN darf nur Ziffern enthalten' };
        }

        if (pin.length < 4) {
            return { isValid: false, error: 'PIN muss mindestens 4 Ziffern haben' };
        }

        if (pin.length > 20) {
            return { isValid: false, error: 'PIN darf maximal 20 Ziffern haben' };
        }

        return { isValid: true, error: null };
    }

    /**
     * Get total transmission duration for a PIN
     * @param {string} pin - PIN to calculate duration for
     * @returns {number} Total duration in milliseconds
     */
    getTotalDuration(pin) {
        const sequence = this.getTimingSequence(pin);
        return sequence.reduce((total, item) => total + item.duration, 0);
    }

    /**
     * Format duration for display
     * @param {number} duration - Duration in milliseconds
     * @returns {string} Formatted duration string
     */
    formatDuration(duration) {
        const seconds = Math.ceil(duration / 1000);
        if (seconds < 60) {
            return `${seconds} Sekunden`;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} Minuten`;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MorseCodeHandler;
} else {
    window.MorseCodeHandler = MorseCodeHandler;
}
