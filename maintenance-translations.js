class MaintenanceTranslator {
    constructor() {
        this.dictionaries = {};
        this.currentLanguage = this.detectLanguage();
        this.availableLangs = ['en', 'ru', 'fr', 'de', 'es', 'it', 'pt', 'ar', 'hi', 'ja', 'ko', 'zh', 'th', 'tr', 'vi', 'pl'];

        // Initialize translations when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    async loadDictionary(lang) {
        if (this.dictionaries[lang]) {
            return this.dictionaries[lang];
        }

        try {
            console.log(`🌐 Loading dictionary for ${lang}`);
            const response = await fetch(`./dictionaries/maintenance/${lang}.js`, { cache: 'default' });
            if (!response.ok) throw new Error(`Failed to load ${lang} dictionary`);

            const text = await response.text();
            // Extract data from "export default { ... };" format using Function constructor
            const match = text.match(/export\s+default\s+({[\s\S]*});?/);
            if (match) {
                const dictStr = match[1];
                // Use Function constructor to safely evaluate the JavaScript object
                try {
                    this.dictionaries[lang] = new Function('return ' + dictStr)();
                    console.log(`✅ Loaded dictionary for ${lang}`);
                    return this.dictionaries[lang];
                } catch (parseError) {
                    console.error(`❌ Error parsing dictionary ${lang}:`, parseError);
                    return {};
                }
            } else {
                throw new Error(`Invalid dictionary format for ${lang}`);
            }
        } catch (error) {
            console.error(`❌ Error loading dictionary ${lang}:`, error);
            return {};
        }
    }

    detectLanguage() {
        // Default to English as main language
        let defaultLang = 'en';

        // Try to get language from Telegram Web App first
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
            const userLanguage = window.Telegram.WebApp.initDataUnsafe.user.language_code;
            if (this.dictionaries[userLanguage]) {
                return userLanguage;
            }
        }

        // Try to get language from parent window (main pixPLace app)
        if (window.parent !== window) {
            try {
                const parentLang = window.parent.localStorage?.getItem('pixplace-language');
                if (parentLang && this.dictionaries[parentLang]) {
                    console.log(`🌐 Language synced from parent app: ${parentLang}`);
                    return parentLang;
                }
            } catch (e) {
                console.log('🌐 Could not access parent language setting');
            }
        }

        // Try navigator languages, preferring English for English-speakers
        const browserLang = (navigator.language || navigator.userLanguage || 'ru').split('-')[0];
        if (browserLang === 'en' || browserLang.startsWith('en-')) {
            return 'en'; // Use English for all English variants
        }
        return this.dictionaries[browserLang] ? browserLang : defaultLang;
    }

    async initialize() {
        console.log(`🌐 Maintenance Translator: Initializing in ${this.currentLanguage}`);

        // Load current language dictionary
        this.translations = await this.loadDictionary(this.currentLanguage);

        // Update HTML lang attribute
        document.documentElement.lang = this.currentLanguage;

        // Set language selector value
        this.updateLanguageSelector();

        // Wait a bit for DOM elements to be ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Translate all elements with data-i18n
        this.translatePage();

        console.log('🌐 Maintenance Translator: Translation complete - debugging elements');

        // Debug: check if elements are being translated
        const i18nElements = document.querySelectorAll('[data-i18n]');
        console.log(`Found ${i18nElements.length} elements with data-i18n`);
        i18nElements.forEach((el, i) => {
            const key = el.getAttribute('data-i18n');
            const translation = el.textContent;
            console.log(`${i}: ${key} -> "${translation}"`);
        });
    }

    updateLanguageSelector() {
        const selector = document.getElementById('language-selector');
        if (selector) {
            selector.value = this.currentLanguage;
            console.log(`🌐 Language selector updated to: ${this.currentLanguage}`);
        }
    }

    translatePage() {
        // Translate regular elements
        const i18nElements = document.querySelectorAll('[data-i18n]');
        i18nElements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.translate(key);

            if (translation) {
                element.textContent = translation;
            }
        });

        // Translate template elements
        const templateElements = document.querySelectorAll('[data-i18n-template]');
        templateElements.forEach(element => {
            const key = element.getAttribute('data-i18n-template');
            const templateText = element.getAttribute('data-template-text');

            if (templateText) {
                const translatedTemplate = this.translate(key) || templateText;
                const processedText = this.processTemplate(translatedTemplate, templateText);
                element.textContent = processedText;
            }
        });
    }

    translate(key) {
        return this.translations[key] || key; // Fallback to key if not found
    }

    processTemplate(translatedTemplate, originalTemplate) {
        // Find placeholders like {0}, {1}, etc. in the translated template
        const placeholderMatches = translatedTemplate.match(/\{(\d+)\}/g);

        if (!placeholderMatches) {
            return translatedTemplate;
        }

        // Extract values from original template dynamically
        // For maintenance page, we need to replace placeholders with actual values
        return translatedTemplate.replace(/\{(\d+)\}/g, (match, index) => {
            // Since originalTemplate may contain mixed text and placeholders,
            // extract the actual values by matching against a pattern
            const originalValues = originalTemplate.split(/\{|\}/).filter((val, idx) => idx % 2 === 1);
            return originalValues[index] !== undefined ? originalValues[index] : match;
        });
    }

    async changeLanguage(lang) {
        console.log(`🌐 Attempting to change language to: ${lang}`);

        try {
            // Load dictionary if not loaded yet
            if (!this.dictionaries[lang]) {
                console.log(`🌐 Loading dictionary for ${lang}...`);
                this.translations = await this.loadDictionary(lang);
                console.log(`🌐 Dictionary loaded:`, Object.keys(this.translations).length, 'keys');
            } else {
                this.translations = this.dictionaries[lang];
                console.log(`🌐 Using cached dictionary for ${lang}`);
            }

            this.currentLanguage = lang;
            document.documentElement.lang = lang;

            // Force re-translation
            console.log(`🌐 Forcing page re-translation...`);
            this.translatePage();

            this.updateLanguageSelector();

            console.log(`🌐 Maintenance Translator: Language changed to ${lang}. Current translations:`, Object.keys(this.translations).slice(0, 3), '...');
        } catch (error) {
            console.error(`❌ Error changing language to ${lang}:`, error);
        }
    }
}

// Initialize translator
const maintenanceTranslator = new MaintenanceTranslator();

// Make available globally for the language selector
window._realMaintenanceTranslator = maintenanceTranslator;
window.maintenanceTranslator = maintenanceTranslator;

// Export for potential external use
export default maintenanceTranslator;
