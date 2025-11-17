// ==UserScript==
// @name         TradeScriptFilterScam
// @namespace    https://github.com/Letale-vc/TradeScriptFilterScam
// @version      2.0 
// @description  Automatically filters trade items by ID and supports live search with delayed results
// @author       Letale-vc
// @match        https://www.pathofexile.com/trade/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/Letale-vc/TradeScriptFilterScam/main/TradeScriptFilterScam.js
// @updateURL    https://raw.githubusercontent.com/Letale-vc/TradeScriptFilterScam/main/TradeScriptFilterScam.js
// ==/UserScript==

(function () {
    'use strict';

    const TYPE_FILTER_KEY = "poe_trade_filtered_types"; // Key for saving filtered types in localStorage
    // Mode: 'blacklist' hides rows whose type matches an entry in the type filter set.
    // If you prefer inverse behavior (only show listed types), set to 'whitelist'.
    const TYPE_FILTER_MODE = 'blacklist'; // 'blacklist' | 'whitelist'
    // If true will match types by substring (case-insensitive). If false, exact match (trimmed) is used.
    const TYPE_FILTER_USE_PARTIAL = false;

    // Retrieve saved types from localStorage or initialize an empty set
    let filteredTypes = new Set(JSON.parse(localStorage.getItem(TYPE_FILTER_KEY) || "[]"));

    function saveFilteredTypes() {
        localStorage.setItem(TYPE_FILTER_KEY, JSON.stringify([...filteredTypes]));
    }

    // Function to hide rows based on filtered IDs
    function typeMatchesFilter(typeText) {
        if (!typeText) return false;
        const normalized = typeText.trim();
        if (filteredTypes.size === 0) return false;
        if (TYPE_FILTER_USE_PARTIAL) {
            const lower = normalized.toLowerCase();
            for (const t of filteredTypes) {
                if (lower.includes(t.toLowerCase())) return true;
            }
            return false;
        }
        return filteredTypes.has(normalized);
    }

    function shouldHideByType(typeText) {
        if (TYPE_FILTER_MODE === 'blacklist') {
            return typeMatchesFilter(typeText);
        }
        // whitelist mode: hide when it does NOT match
        return filteredTypes.size > 0 && !typeMatchesFilter(typeText);
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
                    filteredTypes.add(typeText);
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
                filteredTypes.clear();
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

            updateHeaderTypeBadge();
            renderTypeFilterList();
        }
    }

    function updateHeaderTypeBadge() {
        const badge = document.querySelector('#typeFilterBadge');
        if (!badge) return;
        const count = filteredTypes.size;
        if (count === 0) {
            badge.textContent = '';
        } else {
            badge.textContent = ` Type filters: ${count}`;
        }
    }

    function renderTypeFilterList() {
        const container = document.querySelector('#typeFilterList');
        if (!container) return;
        // Clear existing
        container.innerHTML = '';
        if (filteredTypes.size === 0) return;
        // For each type, create a pill with remove button
        filteredTypes.forEach(t => {
            const pill = document.createElement('span');
            pill.style.border = '1px solid #ccc';
            pill.style.padding = '2px 6px';
            pill.style.marginRight = '6px';
            pill.style.borderRadius = '12px';
            pill.style.background = '#f7f7f7';
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
                filteredTypes.delete(t);
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
