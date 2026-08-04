/* Generative Math & Color Conversions */

class ColorConverter {
    static hexToRgb(hex) {
        const cleaned = hex.replace(/^#/, '');
        const num = parseInt(cleaned, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }

    static rgbToHex(r, g, b) {
        return "#" + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }).join("").toUpperCase();
    }

    static rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }

    static hslToRgb(h, s, l) {
        s /= 100;
        l /= 100;
        h /= 360;
        let r, g, b;

        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    static rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, v = max;
        const d = max - min;
        s = max === 0 ? 0 : d / max;

        if (max === min) {
            h = 0; // achromatic
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            v: Math.round(v * 100)
        };
    }

    static generateRandomHex() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    static getContrastRatio(hex1, hex2) {
        const lum1 = ColorConverter.getLuminance(hex1);
        const lum2 = ColorConverter.getLuminance(hex2);
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
    }

    static getLuminance(hex) {
        const rgb = ColorConverter.hexToRgb(hex);
        const a = [rgb.r, rgb.g, rgb.b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }
}

/* LocalStorage Manager */

class StorageManager {
    static KEYS = {
        FAVORITES: 'colorcraft_favs',
        SETTINGS: 'colorcraft_settings',
        CURRENT: 'colorcraft_curr'
    };

    static save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error(`StorageManager Error: Failed to save key "${key}"`, e);
            return false;
        }
    }

    static load(key, fallback = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : fallback;
        } catch (e) {
            console.error(`StorageManager Error: Failed to load key "${key}"`, e);
            return fallback;
        }
    }
}

/* Toast Notification Manager */

class ToastManager {
    #container;

    constructor() {
        this.#container = document.getElementById('toast-overlay-container');
    }

    show(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast-notification neo-border neo-shadow notification-${type}`;
        
        const icons = { success: '✅', error: '❌', info: 'ℹ' };
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] ?? '🎨'}</span>
            <span class="toast-message">${message}</span>
        `;

        this.#container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

/* Main Application Controller */

class ColorCraftApp {
    #toasts;
    #currentPalette = [];
    #lockedStates = [false, false, false, false, false];
    #savedPalettes = [];

    constructor() {
        this.#toasts = new ToastManager();
        this.#savedPalettes = StorageManager.load(StorageManager.KEYS.FAVORITES, []);

        this.initThemeState();
        this.initPaletteBoard();
        this.initControls();
        this.initConverter();
        this.initGradientGenerator();
        this.initExportDialog();
        this.renderAll();
    }

    initThemeState() {
        const btn = document.getElementById('theme-toggle');
        const theme = StorageManager.load(StorageManager.KEYS.SETTINGS, { mode: 'dark' });

        if (theme.mode === 'light') {
            document.body.classList.add('light-theme');
            btn.textContent = '🌙';
        }

        btn.addEventListener('click', () => {
            const isLight = document.body.classList.toggle('light-theme');
            StorageManager.save(StorageManager.KEYS.SETTINGS, { mode: isLight ? 'light' : 'dark' });
            btn.textContent = isLight ? '🌙' : '☀️';
        });
    }

    initPaletteBoard() {
        this.#currentPalette = StorageManager.load(StorageManager.KEYS.CURRENT, [
            '#4F46E5', '#FFE17C', '#B7C6C2', '#1B1B1B', '#FFFFFF'
        ]);
        this.renderPalette();
    }

    generateRandomPalette(lockedOnly = false) {
        for (let i = 0; i < 5; i++) {
            if (lockedOnly) {
                if (!this.#lockedStates[i]) {
                    this.#currentPalette[i] = ColorConverter.generateRandomHex();
                }
            } else {
                if (!this.#lockedStates[i]) {
                    this.#currentPalette[i] = ColorConverter.generateRandomHex();
                }
            }
        }
        StorageManager.save(StorageManager.KEYS.CURRENT, this.#currentPalette);
        this.renderPalette();
        this.updateAnalysisCard();
    }

    renderPalette() {
        const container = document.getElementById('palette-columns-grid');
        if (!container) return;

        container.innerHTML = this.#currentPalette.map((color, idx) => {
            const rgb = ColorConverter.hexToRgb(color);
            const hsl = ColorConverter.rgbToHsl(rgb.r, rgb.g, rgb.b);
            const isLocked = this.#lockedStates[idx];
            
            // Adjust label text color based on luminance contrast checks
            const luminance = ColorConverter.getLuminance(color);
            const textColor = luminance > 0.5 ? '#000000' : '#FFFFFF';

            return `
                <div class="palette-column" style="background-color: ${color}; color: ${textColor};">
                    <div class="col-actions">
                        <button type="button" class="col-btn ${isLocked ? 'locked-active' : ''}" data-idx="${idx}" data-action="lock" aria-label="Lock color">
                            ${isLocked ? '🔒' : '🔓'}
                        </button>
                        <button type="button" class="col-btn btn-col-fav" data-idx="${idx}" data-action="copy" aria-label="Copy color Hex">
                            📋
                        </button>
                    </div>
                    <div class="col-info" style="color: ${textColor} !important;">
                        <span class="col-hex cabinet-grotesk-heading">${color}</span>
                        <span class="col-sub-info">RGB(${rgb.r}, ${rgb.g}, ${rgb.b})</span>
                        <span class="col-sub-info">HSL(${hsl.h}, ${hsl.s}%, ${hsl.l}%)</span>
                    </div>
                </div>
            `;
        }).join('');

        // Attach listeners
        container.querySelectorAll('.col-btn').forEach(btn => {
            const idx = Number(btn.dataset.idx);
            const action = btn.dataset.action;

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (action === 'lock') {
                    this.#lockedStates[idx] = !this.#lockedStates[idx];
                    this.renderPalette();
                } else if (action === 'copy') {
                    const hex = this.#currentPalette[idx];
                    navigator.clipboard.writeText(hex);
                    this.#toasts.show(`Copied: ${hex}`, 'success');
                }
            });
        });
    }

    initControls() {
        document.getElementById('btn-random-all').addEventListener('click', () => {
            this.generateRandomPalette(false);
        });

        document.getElementById('btn-random-unlocked').addEventListener('click', () => {
            this.generateRandomPalette(true);
        });

        document.getElementById('btn-reset-palette').addEventListener('click', () => {
            this.#lockedStates = [false, false, false, false, false];
            this.#currentPalette = ['#4F46E5', '#FFE17C', '#B7C6C2', '#1B1B1B', '#FFFFFF'];
            StorageManager.save(StorageManager.KEYS.CURRENT, this.#currentPalette);
            this.renderPalette();
            this.updateAnalysisCard();
            this.#toasts.show('Palette reset to defaults', 'info');
        });

        document.getElementById('btn-copy-palette').addEventListener('click', () => {
            const text = this.#currentPalette.join(', ');
            navigator.clipboard.writeText(text);
            this.#toasts.show('Palette copied to clipboard!', 'success');
        });

        document.getElementById('btn-save-palette').addEventListener('click', () => {
            const title = prompt('Enter a name for this color palette combination:', 'Palette #' + (this.#savedPalettes.length + 1));
            if (title) {
                this.#savedPalettes.push({
                    id: Date.now().toString(),
                    name: title,
                    colors: [...this.#currentPalette]
                });
                StorageManager.save(StorageManager.KEYS.FAVORITES, this.#savedPalettes);
                this.renderAll();
                this.#toasts.show(`Saved palette "${title}"!`, 'success');
            }
        });
    }

    initConverter() {
        const hexIn = document.getElementById('conv-hex');
        const rgbIn = document.getElementById('conv-rgb');
        const hslIn = document.getElementById('conv-hsl');
        const hsvIn = document.getElementById('conv-hsv');

        const updateAll = (hexVal) => {
            const rgb = ColorConverter.hexToRgb(hexVal);
            const hsl = ColorConverter.rgbToHsl(rgb.r, rgb.g, rgb.b);
            const hsv = ColorConverter.rgbToHsv(rgb.r, rgb.g, rgb.b);

            rgbIn.value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
            hslIn.value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
            hsvIn.value = `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`;

            this.updateContrastChecker(hexVal);
        };

        hexIn.addEventListener('input', () => {
            const val = hexIn.value.trim();
            if (/^#[0-9A-F]{6}$/i.test(val)) {
                updateAll(val);
            }
        });

        rgbIn.addEventListener('input', () => {
            const val = rgbIn.value.trim();
            const match = val.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
            if (match) {
                const hex = ColorConverter.rgbToHex(Number(match[1]), Number(match[2]), Number(match[3]));
                hexIn.value = hex;
                updateAll(hex);
            }
        });
    }

    updateContrastChecker(bgHex) {
        const ratio = ColorConverter.getContrastRatio(bgHex, '#FFFFFF');
        const ratioText = ratio.toFixed(1) + ':1';
        
        const previewBox = document.getElementById('contrast-preview-box');
        const ratioVal = document.getElementById('contrast-ratio-val');
        const badgeAA = document.getElementById('badge-aa');
        const badgeAAA = document.getElementById('badge-aaa');
        const suggestion = document.getElementById('contrast-suggestion');

        previewBox.style.backgroundColor = bgHex;
        ratioVal.textContent = ratioText;

        const isAA = ratio >= 4.5;
        const isAAA = ratio >= 7.0;

        badgeAA.className = `badge ${isAA ? 'badge-pass' : 'badge-fail'}`;
        badgeAA.textContent = isAA ? 'AA PASS' : 'AA FAIL';

        badgeAAA.className = `badge ${isAAA ? 'badge-pass' : 'badge-fail'}`;
        badgeAAA.textContent = isAAA ? 'AAA PASS' : 'AAA FAIL';

        if (!isAA) {
            suggestion.textContent = 'Consider using a darker background or white text enhancement.';
            previewBox.querySelector('p').style.color = '#000000';
        } else {
            suggestion.textContent = 'Looks great. Legibility standards met.';
            previewBox.querySelector('p').style.color = '#FFFFFF';
        }
    }

    updateAnalysisCard() {
        const hexVal = this.#currentPalette[0];
        document.getElementById('conv-hex').value = hexVal;
        
        const rgb = ColorConverter.hexToRgb(hexVal);
        const hsl = ColorConverter.rgbToHsl(rgb.r, rgb.g, rgb.b);
        const hsv = ColorConverter.rgbToHsv(rgb.r, rgb.g, rgb.b);

        document.getElementById('conv-rgb').value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        document.getElementById('conv-hsl').value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
        document.getElementById('conv-hsv').value = `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`;

        this.updateContrastChecker(hexVal);
    }

    initGradientGenerator() {
        const typeSelect = document.getElementById('grad-type');
        const angleInput = document.getElementById('grad-angle');
        const stop1 = document.getElementById('grad-color-stop1');
        const stop2 = document.getElementById('grad-color-stop2');
        const preview = document.getElementById('grad-live-preview-box');

        const updateGradient = () => {
            const type = typeSelect.value;
            const angle = angleInput.value;
            const c1 = stop1.value;
            const c2 = stop2.value;

            let style = '';
            if (type === 'linear') {
                style = `linear-gradient(${angle}deg, ${c1}, ${c2})`;
            } else if (type === 'radial') {
                style = `radial-gradient(circle, ${c1}, ${c2})`;
            } else if (type === 'conic') {
                style = `conic-gradient(from ${angle}deg, ${c1}, ${c2})`;
            }
            preview.style.background = style;
        };

        typeSelect.addEventListener('change', updateGradient);
        angleInput.addEventListener('input', updateGradient);
        stop1.addEventListener('input', updateGradient);
        stop2.addEventListener('input', updateGradient);

        document.getElementById('btn-copy-gradient').addEventListener('click', () => {
            const type = typeSelect.value;
            const angle = angleInput.value;
            const c1 = stop1.value;
            const c2 = stop2.value;

            let style = '';
            if (type === 'linear') {
                style = `background: linear-gradient(${angle}deg, ${c1}, ${c2});`;
            } else if (type === 'radial') {
                style = `background: radial-gradient(circle, ${c1}, ${c2});`;
            } else if (type === 'conic') {
                style = `background: conic-gradient(from ${angle}deg, ${c1}, ${c2});`;
            }

            navigator.clipboard.writeText(style);
            this.#toasts.show('CSS gradient code copied!', 'success');
        });

        updateGradient();
    }

    initExportDialog() {
        const dialog = document.getElementById('dialog-export');
        document.getElementById('btn-export-palette').addEventListener('click', () => {
            dialog.showModal();
        });

        document.getElementById('btn-export-quick-trigger').addEventListener('click', () => {
            dialog.showModal();
        });

        dialog.querySelector('.btn-modal-close').addEventListener('click', () => dialog.close());
        dialog.querySelector('.modal-btn-cancel').addEventListener('click', () => dialog.close());

        dialog.addEventListener('click', (e) => {
            const exportType = e.target.dataset.exportType;
            if (!exportType) return;

            let text = '';
            let fileExt = 'txt';
            const palette = this.#currentPalette;

            switch (exportType) {
                case 'css':
                    text = palette.map((c, i) => `--color-${i + 1}: ${c};`).join('\n');
                    fileExt = 'css';
                    break;
                case 'scss':
                    text = palette.map((c, i) => `$color-${i + 1}: ${c};`).join('\n');
                    fileExt = 'scss';
                    break;
                case 'json':
                    text = JSON.stringify(palette, null, 2);
                    fileExt = 'json';
                    break;
                case 'txt':
                    text = palette.join('\n');
                    fileExt = 'txt';
                    break;
                case 'png':
                    this.exportPNG();
                    dialog.close();
                    return;
            }

            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `colorcraft_palette.${fileExt}`;
            a.click();
            URL.revokeObjectURL(url);

            this.#toasts.show(`Exported as ${exportType.toUpperCase()}`, 'success');
            dialog.close();
        });
    }

    exportPNG() {
        const canvas = document.createElement('canvas');
        canvas.width = 1000;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');

        this.#currentPalette.forEach((color, i) => {
            ctx.fillStyle = color;
            ctx.fillRect(i * 200, 0, 200, 200);
            
            // Draw hex labels
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText(color, i * 200 + 40, 100);
        });

        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = 'colorcraft_palette.png';
        a.click();
        this.#toasts.show('Exported as PNG Palette Image', 'success');
    }

    renderFavorites() {
        const grid = document.getElementById('favorites-cards-grid');
        const empty = document.getElementById('favorites-empty-state');

        if (this.#savedPalettes.length === 0) {
            grid.classList.add('hidden-initially');
            empty.classList.remove('hidden-initially');
            return;
        }

        grid.classList.remove('hidden-initially');
        empty.classList.add('hidden-initially');

        grid.innerHTML = this.#savedPalettes.map(p => `
            <div class="saved-palette-card neo-border" data-id="${p.id}">
                <div class="saved-palette-colors-row">
                    ${p.colors.map(c => `
                        <div class="saved-color-block" style="background-color: ${c};"></div>
                    `).join('')}
                </div>
                <div class="saved-palette-meta">
                    <span class="saved-palette-title">${p.name}</span>
                    <div class="saved-palette-actions">
                        <button type="button" class="neo-btn saved-action-btn btn-load">Load</button>
                        <button type="button" class="neo-btn saved-action-btn btn-danger btn-delete">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');

        // Bind events
        grid.querySelectorAll('.saved-palette-card').forEach(card => {
            const id = card.dataset.id;
            const item = this.#savedPalettes.find(p => p.id === id);

            card.querySelector('.btn-load').addEventListener('click', () => {
                this.#currentPalette = [...item.colors];
                StorageManager.save(StorageManager.KEYS.CURRENT, this.#currentPalette);
                this.renderPalette();
                this.updateAnalysisCard();
                window.scrollTo({ top: document.getElementById('generator-section').offsetTop - 100, behavior: 'smooth' });
                this.#toasts.show(`Loaded "${item.name}"`, 'success');
            });

            card.querySelector('.btn-delete').addEventListener('click', () => {
                this.#savedPalettes = this.#savedPalettes.filter(p => p.id !== id);
                StorageManager.save(StorageManager.KEYS.FAVORITES, this.#savedPalettes);
                this.renderAll();
                this.#toasts.show('Palette deleted from Favorites', 'info');
            });
        });
    }

    renderAll() {
        this.renderFavorites();
        this.updateAnalysisCard();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new ColorCraftApp();
});
