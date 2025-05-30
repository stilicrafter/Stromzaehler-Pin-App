/**
 * Main Application Script
 * Handles UI interactions, flashlight control simulation, and Morse code transmission
 */

class StromzaehlerApp {
    constructor() {
        this.morseHandler = new MorseCodeHandler();
        this.isTransmitting = false;
        this.transmissionController = null;
        this.currentTheme = 'light';
        this.flashlightStream = null;
        this.flashlightTrack = null;
        this.flashlightMode = 'screen'; // 'led' or 'screen'
        
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeTheme();
        this.loadSavedPins();
        this.updateMorseDisplay();
        this.checkFlashlightSupport();
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        this.elements = {
            pinInput: document.getElementById('pinInput'),
            clearPin: document.getElementById('clearPin'),
            morseDisplay: document.getElementById('morseDisplay'),
            sendBtn: document.getElementById('sendBtn'),
            stopBtn: document.getElementById('stopBtn'),
            statusCard: document.getElementById('statusCard'),
            statusIndicator: document.getElementById('statusIndicator'),
            statusTitle: document.getElementById('statusTitle'),
            statusMessage: document.getElementById('statusMessage'),
            progressSection: document.getElementById('progressSection'),
            progressFill: document.getElementById('progressFill'),
            progressText: document.getElementById('progressText'),
            themeToggle: document.getElementById('themeToggle'),
            flashOverlay: document.getElementById('flashOverlay'),
            dotDuration: document.getElementById('dotDuration'),
            dotDurationValue: document.getElementById('dotDurationValue'),
            pauseDuration: document.getElementById('pauseDuration'),
            pauseDurationValue: document.getElementById('pauseDurationValue'),
            flashlightMode: document.getElementById('flashlightMode'),
            flashlightStatus: document.getElementById('flashlightStatus'),
            savePin: document.getElementById('savePin'),
            savedPins: document.getElementById('savedPins'),
            pinName: document.getElementById('pinName')
        };
    }

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        // PIN input events
        this.elements.pinInput.addEventListener('input', () => {
            this.handlePinInput();
        });

        this.elements.pinInput.addEventListener('keypress', (e) => {
            // Only allow digits
            if (!/\d/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                e.preventDefault();
            }
        });

        this.elements.clearPin.addEventListener('click', () => {
            this.clearPin();
        });

        // Control buttons
        this.elements.sendBtn.addEventListener('click', () => {
            this.startTransmission();
        });

        this.elements.stopBtn.addEventListener('click', () => {
            this.stopTransmission();
        });

        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Timing controls
        this.elements.dotDuration.addEventListener('input', () => {
            this.updateTimingSettings();
        });

        this.elements.pauseDuration.addEventListener('input', () => {
            this.updateTimingSettings();
        });

        // Flashlight mode selection
        this.elements.flashlightMode.addEventListener('change', () => {
            this.handleFlashlightModeChange();
        });

        // PIN saving functionality
        this.elements.savePin.addEventListener('click', () => {
            this.savePinLocally();
        });

        // Saved PINs selection
        this.elements.savedPins.addEventListener('change', () => {
            this.loadSelectedPin();
        });

        // Prevent form submission on Enter
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.id === 'pinInput') {
                e.preventDefault();
                if (this.elements.sendBtn.disabled === false) {
                    this.startTransmission();
                }
            }
        });
    }

    /**
     * Load saved PINs from localStorage
     */
    loadSavedPins() {
        const savedPins = this.getSavedPins();
        this.updateSavedPinsDropdown(savedPins);
    }

    /**
     * Get saved PINs from localStorage
     */
    getSavedPins() {
        try {
            const pins = localStorage.getItem('stromzaehler-pins');
            return pins ? JSON.parse(pins) : {};
        } catch (error) {
            console.error('Error loading saved PINs:', error);
            return {};
        }
    }

    /**
     * Save PIN to localStorage
     */
    savePinLocally() {
        const pin = this.elements.pinInput.value;
        const pinName = this.elements.pinName.value.trim();
        
        if (!pin) {
            this.updateStatus('error', 'Fehler', 'Bitte geben Sie eine PIN ein');
            return;
        }
        
        const validation = this.morseHandler.validatePin(pin);
        if (!validation.isValid) {
            this.updateStatus('error', 'Fehler', validation.error);
            return;
        }
        
        const name = pinName || `PIN ${new Date().toLocaleDateString('de-DE')}`;
        
        try {
            const savedPins = this.getSavedPins();
            savedPins[name] = pin;
            localStorage.setItem('stromzaehler-pins', JSON.stringify(savedPins));
            
            this.updateSavedPinsDropdown(savedPins);
            this.elements.pinName.value = '';
            this.updateStatus('success', 'Gespeichert', `PIN als "${name}" gespeichert`);
        } catch (error) {
            console.error('Error saving PIN:', error);
            this.updateStatus('error', 'Fehler', 'PIN konnte nicht gespeichert werden');
        }
    }

    /**
     * Load selected PIN from dropdown
     */
    loadSelectedPin() {
        const selectedName = this.elements.savedPins.value;
        if (!selectedName) return;
        
        const savedPins = this.getSavedPins();
        const pin = savedPins[selectedName];
        
        if (pin) {
            this.elements.pinInput.value = pin;
            this.handlePinInput();
            this.updateStatus('ready', 'PIN geladen', `"${selectedName}" wurde geladen`);
        }
    }

    /**
     * Update saved PINs dropdown
     */
    updateSavedPinsDropdown(savedPins) {
        const dropdown = this.elements.savedPins;
        
        // Clear existing options except the first one
        while (dropdown.children.length > 1) {
            dropdown.removeChild(dropdown.lastChild);
        }
        
        // Add saved PINs
        Object.keys(savedPins).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = `${name} (${savedPins[name]})`;
            dropdown.appendChild(option);
        });
        
        // Add delete option if there are saved PINs
        if (Object.keys(savedPins).length > 0) {
            const deleteOption = document.createElement('option');
            deleteOption.value = 'DELETE';
            deleteOption.textContent = '--- PIN löschen ---';
            deleteOption.style.color = '#FF0000';
            dropdown.appendChild(deleteOption);
            
            dropdown.addEventListener('change', (e) => {
                if (e.target.value === 'DELETE') {
                    this.showDeletePinDialog();
                    e.target.value = '';
                }
            });
        }
    }

    /**
     * Show delete PIN dialog
     */
    showDeletePinDialog() {
        const savedPins = this.getSavedPins();
        const pinNames = Object.keys(savedPins);
        
        if (pinNames.length === 0) {
            this.updateStatus('error', 'Fehler', 'Keine gespeicherten PINs vorhanden');
            return;
        }
        
        const pinToDelete = prompt(
            `Welche PIN möchten Sie löschen?\n\n${pinNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}\n\nGeben Sie den Namen ein:`
        );
        
        if (pinToDelete && savedPins[pinToDelete]) {
            delete savedPins[pinToDelete];
            localStorage.setItem('stromzaehler-pins', JSON.stringify(savedPins));
            this.updateSavedPinsDropdown(savedPins);
            this.updateStatus('success', 'Gelöscht', `"${pinToDelete}" wurde gelöscht`);
        } else if (pinToDelete) {
            this.updateStatus('error', 'Fehler', 'PIN nicht gefunden');
        }
    }

    /**
     * Initialize theme based on system preference or saved setting
     */
    initializeTheme() {
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        this.currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
        this.applyTheme();

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.currentTheme = e.matches ? 'dark' : 'light';
                this.applyTheme();
            }
        });
    }

    /**
     * Apply the current theme
     */
    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        const icon = this.elements.themeToggle.querySelector('i');
        icon.className = this.currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        
        localStorage.setItem('theme', this.currentTheme);
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
    }

    /**
     * Handle PIN input changes
     */
    handlePinInput() {
        const pin = this.elements.pinInput.value;
        const validation = this.morseHandler.validatePin(pin);
        
        // Update morse display
        this.updateMorseDisplay();
        
        // Update send button state
        this.elements.sendBtn.disabled = !validation.isValid || this.isTransmitting;
        
        // Update status
        if (pin && !validation.isValid) {
            this.updateStatus('error', 'Fehler', validation.error);
        } else if (validation.isValid) {
            const duration = this.morseHandler.getTotalDuration(pin);
            this.updateStatus('ready', 'Bereit', 
                `PIN bereit zur Übertragung (${this.morseHandler.formatDuration(duration)})`);
        } else {
            this.updateStatus('ready', 'Bereit', 'Geben Sie eine PIN ein und drücken Sie "PIN senden"');
        }
    }

    /**
     * Update flash code display
     */
    updateMorseDisplay() {
        const pin = this.elements.pinInput.value;
        if (!pin) {
            this.elements.morseDisplay.textContent = 'Geben Sie eine PIN ein, um den Blinkcode zu sehen';
            return;
        }

        const flashCode = this.morseHandler.convertToFlashCode(pin);
        if (flashCode) {
            this.elements.morseDisplay.textContent = flashCode;
        } else {
            this.elements.morseDisplay.textContent = 'Ungültige PIN - nur Ziffern erlaubt';
        }
    }

    /**
     * Clear PIN input
     */
    clearPin() {
        this.elements.pinInput.value = '';
        this.elements.pinInput.focus();
        this.handlePinInput();
    }

    /**
     * Update timing settings
     */
    updateTimingSettings() {
        const flashDuration = parseInt(this.elements.dotDuration.value);
        const digitPause = parseInt(this.elements.pauseDuration.value);
        
        this.elements.dotDurationValue.textContent = `${flashDuration}ms`;
        this.elements.pauseDurationValue.textContent = `${digitPause}ms`;
        
        this.morseHandler.updateTiming({
            flashDuration: flashDuration,
            digitPause: digitPause
        });

        // Update display to show new timing
        this.updateMorseDisplay();
    }

    /**
     * Update status display
     */
    updateStatus(type, title, message) {
        this.elements.statusIndicator.className = `fas fa-circle status-indicator ${type}`;
        this.elements.statusTitle.textContent = title;
        this.elements.statusMessage.textContent = message;
    }

    /**
     * Update progress display
     */
    updateProgress(current, total) {
        const percentage = Math.round((current / total) * 100);
        this.elements.progressFill.style.width = `${percentage}%`;
        this.elements.progressText.textContent = `${percentage}%`;
    }

    /**
     * Check if device supports LED flashlight
     */
    async checkFlashlightSupport() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            
            const track = stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();
            
            if (capabilities.torch) {
                this.elements.flashlightStatus.textContent = 'LED-Taschenlampe verfügbar';
                this.elements.flashlightStatus.className = 'flashlight-status available';
                this.elements.flashlightMode.disabled = false;
            } else {
                this.elements.flashlightStatus.textContent = 'LED nicht verfügbar - nur Bildschirm-Modus';
                this.elements.flashlightStatus.className = 'flashlight-status unavailable';
                this.elements.flashlightMode.value = 'screen';
                this.elements.flashlightMode.disabled = true;
                this.flashlightMode = 'screen';
            }
            
            // Store the stream for later use
            this.flashlightStream = stream;
            this.flashlightTrack = track;
            
        } catch (error) {
            console.log('Camera access denied or not available:', error);
            this.elements.flashlightStatus.textContent = 'Kamera-Zugriff verweigert - nur Bildschirm-Modus';
            this.elements.flashlightStatus.className = 'flashlight-status unavailable';
            this.elements.flashlightMode.value = 'screen';
            this.elements.flashlightMode.disabled = true;
            this.flashlightMode = 'screen';
        }
    }

    /**
     * Handle flashlight mode change
     */
    handleFlashlightModeChange() {
        this.flashlightMode = this.elements.flashlightMode.value;
        
        if (this.flashlightMode === 'led' && !this.flashlightTrack) {
            this.checkFlashlightSupport();
        }
    }

    /**
     * Control LED flashlight
     */
    async controlLEDFlashlight(enabled) {
        if (!this.flashlightTrack) {
            throw new Error('LED flashlight not available');
        }
        
        try {
            await this.flashlightTrack.applyConstraints({
                advanced: [{ torch: enabled }]
            });
        } catch (error) {
            console.error('Error controlling LED:', error);
            throw error;
        }
    }

    /**
     * Flash light (LED or screen) for specified duration
     */
    async flashLight(duration) {
        if (this.flashlightMode === 'led' && this.flashlightTrack) {
            return new Promise(async (resolve, reject) => {
                try {
                    // Turn LED on
                    await this.controlLEDFlashlight(true);
                    
                    setTimeout(async () => {
                        try {
                            // Turn LED off
                            await this.controlLEDFlashlight(false);
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    }, duration);
                } catch (error) {
                    reject(error);
                }
            });
        } else {
            // Fallback to screen flash
            return new Promise((resolve) => {
                this.elements.flashOverlay.classList.add('active');
                
                setTimeout(() => {
                    this.elements.flashOverlay.classList.remove('active');
                    resolve();
                }, duration);
            });
        }
    }

    /**
     * Start PIN transmission
     */
    async startTransmission() {
        const pin = this.elements.pinInput.value;
        const validation = this.morseHandler.validatePin(pin);
        
        if (!validation.isValid) {
            this.updateStatus('error', 'Fehler', validation.error);
            return;
        }

        this.isTransmitting = true;
        this.elements.sendBtn.disabled = true;
        this.elements.stopBtn.disabled = false;
        this.elements.progressSection.style.display = 'block';
        
        // Create abort controller for cancellation
        this.transmissionController = new AbortController();
        
        try {
            await this.transmitPin(pin);
            
            if (!this.transmissionController.signal.aborted) {
                this.updateStatus('success', 'Erfolgreich', 'PIN erfolgreich übertragen');
                this.updateProgress(1, 1);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Transmission error:', error);
                this.updateStatus('error', 'Fehler', 'Übertragung fehlgeschlagen');
            }
        } finally {
            this.isTransmitting = false;
            this.elements.sendBtn.disabled = false;
            this.elements.stopBtn.disabled = true;
            
            // Hide progress after a delay
            setTimeout(() => {
                if (!this.isTransmitting) {
                    this.elements.progressSection.style.display = 'none';
                }
            }, 3000);
        }
    }

    /**
     * Transmit PIN using flash code light signals
     */
    async transmitPin(pin) {
        const sequence = this.morseHandler.getTimingSequence(pin);
        const totalSteps = sequence.length;
        
        this.updateStatus('transmitting', 'Übertragung läuft', 
            `Übertrage PIN: ${pin} (${this.morseHandler.formatDuration(this.morseHandler.getTotalDuration(pin))})`);
        
        for (let i = 0; i < sequence.length; i++) {
            // Check for cancellation
            if (this.transmissionController.signal.aborted) {
                throw new Error('Transmission aborted');
            }
            
            const step = sequence[i];
            this.updateProgress(i, totalSteps);
            
            if (step.type === 'flash') {
                // Flash the light for the specified duration
                await this.flashLight(step.duration);
                
                // Update status with current digit being transmitted
                this.updateStatus('transmitting', 'Übertragung läuft', 
                    `Sende Ziffer ${step.digit}: Blitz ${step.flashNumber}/${step.totalFlashes}`);
            } else {
                // Pause (no light)
                await this.delay(step.duration);
                
                // Update status during pauses
                if (step.pauseType === 'digit-pause') {
                    this.updateStatus('transmitting', 'Übertragung läuft', 
                        'Pause zwischen Ziffern...');
                }
            }
        }
        
        this.updateProgress(totalSteps, totalSteps);
    }

    /**
     * Stop ongoing transmission
     */
    stopTransmission() {
        if (this.transmissionController) {
            this.transmissionController.abort();
        }
        
        // Make sure LED is turned off
        if (this.flashlightMode === 'led' && this.flashlightTrack) {
            this.controlLEDFlashlight(false).catch(console.error);
        }
        
        this.updateStatus('ready', 'Gestoppt', 'Übertragung wurde gestoppt');
        this.elements.flashOverlay.classList.remove('active');
    }

    /**
     * Utility function to create delays
     */
    delay(ms) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(resolve, ms);
            
            // Allow cancellation
            this.transmissionController.signal.addEventListener('abort', () => {
                clearTimeout(timeout);
                reject(new Error('Transmission aborted'));
            });
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new StromzaehlerApp();
});

// Service Worker registration for PWA capabilities
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('PWA Service Worker registered successfully');
                
                // Check for app install prompt
                let deferredPrompt;
                window.addEventListener('beforeinstallprompt', (e) => {
                    e.preventDefault();
                    deferredPrompt = e;
                    
                    // Show install button if not already installed
                    if (!window.matchMedia('(display-mode: standalone)').matches) {
                        showInstallButton(deferredPrompt);
                    }
                });
            })
            .catch((registrationError) => {
                console.log('Service Worker registration failed:', registrationError);
            });
    });
}

// Show install button for PWA
function showInstallButton(deferredPrompt) {
    const installButton = document.createElement('button');
    installButton.textContent = 'Als App installieren';
    installButton.className = 'install-btn';
    installButton.onclick = () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((result) => {
            if (result.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            }
            deferredPrompt = null;
            installButton.style.display = 'none';
        });
    };
    
    // Add to header
    document.querySelector('.app-header').appendChild(installButton);
}
