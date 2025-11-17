// ==UserScript==
// @name         TradeScriptFilterScam
// @namespace    https://github.com/Letale-vc/TradeScriptFilterScam
// @version      2.2
// @description  Automatically filters trade items by ID and supports live search with delayed results
// @author       Letale-vc
// @match        https://www.pathofexile.com/trade/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/Letale-vc/TradeScriptFilterScam/main/TradeScriptFilterScam.js
// @updateURL    https://raw.githubusercontent.com/Letale-vc/TradeScriptFilterScam/main/TradeScriptFilterScam.js
// ==/UserScript==

(function () {
    'use strict';

    const TYPE_FILTER_KEY = "poe_trade_filtered_types"; // legacy key (migrated into exclude list)
    const EXCLUDE_KEY = "poe_trade_exclude_types"; // new persistent exclude list
    const INCLUDE_KEY = "poe_trade_include_types"; // new persistent include list
    const MODE_KEY = "poe_trade_filter_mode"; // Key for persisting mode (blacklist/whitelist)
    const MIGRATED_KEY = "poe_trade_types_migrated"; // flag to indicate migration performed
    // Mode: 'blacklist' hides rows whose type matches an entry in the type filter set.
    // 'whitelist' will hide everything except types that match the set.
    // Default is 'blacklist' but the value is persisted in localStorage and can be toggled in the UI.
    let typeFilterMode = localStorage.getItem(MODE_KEY) || 'blacklist'; // 'blacklist' | 'whitelist'
    // If true will match types by substring (case-insensitive). If false, exact match (trimmed) is used.
    const TYPE_FILTER_USE_PARTIAL = false;

    // Retrieve saved include/exclude sets from localStorage
    let excludeTypes = new Set(JSON.parse(localStorage.getItem(EXCLUDE_KEY) || "[]"));
    let includeTypes = new Set(JSON.parse(localStorage.getItem(INCLUDE_KEY) || "[]"));

    // Migration: if legacy TYPE_FILTER_KEY exists and migration not done, migrate it to excludeTypes
    try {
        const migrated = localStorage.getItem(MIGRATED_KEY);
        const legacy = JSON.parse(localStorage.getItem(TYPE_FILTER_KEY) || "[]");
        if (!migrated && Array.isArray(legacy) && legacy.length > 0 && excludeTypes.size === 0 && includeTypes.size === 0) {
            legacy.forEach(t => excludeTypes.add(t));
            localStorage.setItem(EXCLUDE_KEY, JSON.stringify([...excludeTypes]));
            localStorage.setItem(MIGRATED_KEY, '1');
        }
    } catch (e) {
        // ignore parse errors
    }

    // Save both lists (keeps both up-to-date). We also persist legacy key for backward compatibility.
    function saveFilteredTypes() {
        localStorage.setItem(EXCLUDE_KEY, JSON.stringify([...excludeTypes]));
        localStorage.setItem(INCLUDE_KEY, JSON.stringify([...includeTypes]));
        try {
            localStorage.setItem(TYPE_FILTER_KEY, JSON.stringify([...excludeTypes]));
        } catch (e) {}
    }

    function saveMode() {
        localStorage.setItem(MODE_KEY, typeFilterMode);
    }

    function getActiveSet() {
        return (typeFilterMode === 'blacklist') ? excludeTypes : includeTypes;
    }

    // Function to check whether a type matches the active filter set
    function typeMatchesFilter(typeText) {
        if (!typeText) return false;
        const normalized = typeText.trim();
        const active = getActiveSet();
        if (active.size === 0) return false;
        if (TYPE_FILTER_USE_PARTIAL) {
            const lower = normalized.toLowerCase();
            for (const t of active) {
                if (lower.includes(t.toLowerCase())) return true;
            }
            return false;
        }
        return active.has(normalized);
    }

    function shouldHideByType(typeText) {
        if (typeFilterMode === 'blacklist') {
            return typeMatchesFilter(typeText);
        }
        // whitelist mode: hide when it does NOT match
        return getActiveSet().size > 0 && !typeMatchesFilter(typeText);
    }

    function filterItems() {
        const rows = document.querySelectorAll(".resultset .row");
        rows.forEach(row => {
            // find the typeLine text
            const typeNode = row.querySelector('.itemName.typeLine .lc');
            const typeText = typeNode ? typeNode.textContent.trim() : '';

            const hide = typeText ? shouldHideByType(typeText) : false;
            row.style.display = hide ? 'none' : '';
        });
    }

    // Add a "Filter this" button to each row
    function addFilterButton() {
        const rows = document.querySelectorAll(".resultset .row");
        rows.forEach(row => {
            // Only add the "Filter type" button (type-based filtering)
            if (!row.querySelector('.filter-type-btn')) {
                const typeBtn = document.createElement('button');
                typeBtn.textContent = 'Filter type';
                typeBtn.className = 'filter-type-btn';
                typeBtn.style.marginLeft = '6px';
                typeBtn.style.cursor = 'pointer';
                typeBtn.addEventListener('click', function () {
                    const typeNode = row.querySelector('.itemName.typeLine .lc');
                    const typeText = typeNode ? typeNode.textContent.trim() : null;
                    if (!typeText) return;
                    getActiveSet().add(typeText);
                    saveFilteredTypes();
                    filterItems();
                    updateHeaderTypeBadge();
                    renderTypeFilterList();
                });
                row.querySelector('.left')?.appendChild(typeBtn);
            }
        });
    }

    // Add a "Clear Filter" button to reset all filtered IDs
    function addClearButton() {
        const header = document.querySelector(".row.row-total");
        if (header && !document.querySelector("#clearTypeFilterBtn")) {
            // Add a clear types button and badge/list for type filters
            const clearTypesBtn = document.createElement('button');
            clearTypesBtn.textContent = 'Clear Type Filters';
            clearTypesBtn.id = 'clearTypeFilterBtn';
            clearTypesBtn.style.marginLeft = '10px';
            clearTypesBtn.style.cursor = 'pointer';
            clearTypesBtn.addEventListener('click', function () {
                // clear only the active list to avoid losing the other list
                getActiveSet().clear();
                saveFilteredTypes();
                filterItems();
                updateHeaderTypeBadge();
                renderTypeFilterList();
            });
            header.appendChild(clearTypesBtn);

            const typeBadge = document.createElement('span');
            typeBadge.id = 'typeFilterBadge';
            typeBadge.style.marginLeft = '8px';
            typeBadge.style.fontWeight = '600';
            header.appendChild(typeBadge);

            // Container for the per-type remove list
            const typeList = document.createElement('div');
            typeList.id = 'typeFilterList';
            typeList.style.marginLeft = '8px';
            typeList.style.display = 'inline-block';
            header.appendChild(typeList);

            // Input + button to add a type manually
            const input = document.createElement('input');
            input.id = 'typeFilterInput';
            input.placeholder = 'Add type (exact or substring)';
            input.style.marginLeft = '8px';
            input.style.padding = '2px 6px';
            input.style.height = '24px';
            header.appendChild(input);

            const addBtn = document.createElement('button');
            addBtn.textContent = 'Add Type';
            addBtn.style.marginLeft = '6px';
            addBtn.addEventListener('click', () => {
                const v = (document.querySelector('#typeFilterInput')?.value || '').trim();
                if (!v) return;
                getActiveSet().add(v);
                saveFilteredTypes();
                filterItems();
                updateHeaderTypeBadge();
                renderTypeFilterList();
                document.querySelector('#typeFilterInput').value = '';
            });
            header.appendChild(addBtn);

            // Mode toggle button (blacklist <-> whitelist)
            const modeBtn = document.createElement('button');
            modeBtn.id = 'modeToggleBtn';
            modeBtn.style.marginLeft = '8px';
            modeBtn.addEventListener('click', () => {
                typeFilterMode = (typeFilterMode === 'blacklist') ? 'whitelist' : 'blacklist';
                saveMode();
                updateModeUI();
                filterItems();
            });
            header.appendChild(modeBtn);

            updateModeUI();

            updateHeaderTypeBadge();
            renderTypeFilterList();
        }
    }

    function updateHeaderTypeBadge() {
        const badge = document.querySelector('#typeFilterBadge');
        if (!badge) return;
    const count = getActiveSet().size;
        if (count === 0) {
            badge.textContent = '';
        } else {
            // Show different label depending on current mode
            if (typeFilterMode === 'blacklist') {
                badge.textContent = ` Exclude list: ${count}`;
            } else {
                badge.textContent = ` Include list: ${count}`;
            }
        }
    }

    function updateModeUI() {
        const btn = document.querySelector('#modeToggleBtn');
        if (!btn) return;
        btn.textContent = `Mode: ${typeFilterMode}`;
        btn.title = (typeFilterMode === 'blacklist') ? 'Blacklist mode: hide listed types' : 'Whitelist mode: show only listed types';
        // update related UI text/placeholders to match mode
        const input = document.querySelector('#typeFilterInput');
        if (input) {
            input.placeholder = (typeFilterMode === 'blacklist') ? 'Add type to exclude' : 'Add type to include';
        }
        const clearBtn = document.querySelector('#clearTypeFilterBtn');
        if (clearBtn) {
            clearBtn.textContent = (typeFilterMode === 'blacklist') ? 'Clear Exclude Filters' : 'Clear Include Filters';
        }
        // Re-render pills to reflect mode (color/label)
        renderTypeFilterList();
    }

    function renderTypeFilterList() {
        const container = document.querySelector('#typeFilterList');
        if (!container) return;
        // Clear existing
        container.innerHTML = '';
    const active = getActiveSet();
    if (active.size === 0) return;
    // For each type, create a pill with remove button
    active.forEach(t => {
            const pill = document.createElement('span');
            pill.style.border = '1px solid #ccc';
            pill.style.padding = '2px 6px';
            pill.style.marginRight = '6px';
            pill.style.borderRadius = '12px';
            // color pill based on mode: red for exclude, green for include
            pill.style.background = (typeFilterMode === 'blacklist') ? '#ffecec' : '#eaffea';
            pill.style.display = 'inline-block';
            pill.style.fontSize = '12px';

            const text = document.createElement('span');
            text.textContent = t;
            pill.appendChild(text);

            const rem = document.createElement('button');
            rem.textContent = '×';
            rem.title = 'Remove this type filter';
            rem.style.marginLeft = '6px';
            rem.style.cursor = 'pointer';
            rem.addEventListener('click', () => {
                getActiveSet().delete(t);
                saveFilteredTypes();
                filterItems();
                updateHeaderTypeBadge();
                renderTypeFilterList();
            });
            pill.appendChild(rem);
            container.appendChild(pill);
        });
    }

    // removed ID-based button updater since ID filtering is no longer supported

    // Function to observe changes in the DOM and look for new elements
    function observePageForResults() {
        const observer = new MutationObserver(() => {
            const resultContainer = document.querySelector(".resultset");
            if (resultContainer) {
                filterItems(); // Apply filters
                addFilterButton(); // Add buttons to each result
                addClearButton(); // Add clear filter button
            }
        });

        // Observe changes to the entire body for dynamic elements
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Initialize the script
    function init() {
        console.log("Initializing TradeScriptFilterScam...");
        observePageForResults(); // Observe changes on the page to detect live search updates
    }

    init(); // Start the script
})();
