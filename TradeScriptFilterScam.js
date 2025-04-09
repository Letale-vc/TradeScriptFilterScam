// ==UserScript==
// @name         TradeScriptFilterScam
// @namespace    https://github.com/Letale-vc/TradeScriptFilterScam
// @version      1.6
// @description  Automatically filters trade items by ID and supports live search with delayed results
// @author       Letale-vc
// @match        https://www.pathofexile.com/trade2/search/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/Letale-vc/TradeScriptFilterScam/main/TradeScriptFilterScam.js
// @updateURL    https://raw.githubusercontent.com/Letale-vc/TradeScriptFilterScam/main/TradeScriptFilterScam.js
// ==/UserScript==

(function () {
    'use strict';

    const FILTER_KEY = "poe_trade_filtered_ids"; // Key for saving IDs in localStorage

    // Retrieve saved IDs from localStorage or initialize an empty set
    let filteredIDs = new Set(JSON.parse(localStorage.getItem(FILTER_KEY) || "[]"));

    // Save filtered IDs to localStorage
    function saveFilteredIDs() {
        localStorage.setItem(FILTER_KEY, JSON.stringify([...filteredIDs]));
    }

    // Function to hide rows based on filtered IDs
    function filterItems() {
        const rows = document.querySelectorAll(".resultset .row");
        rows.forEach(row => {
            const id = row.getAttribute("data-id");
            if (filteredIDs.has(id)) {
                row.style.display = "none"; // Hide the element
            } else {
                row.style.display = ""; // Show the element
            }
        });
    }

    // Add a "Filter this" button to each row
    function addFilterButton() {
        const rows = document.querySelectorAll(".resultset .row");
        rows.forEach(row => {
            if (!row.querySelector(".filter-btn")) {
                const filterBtn = document.createElement("button");
                filterBtn.textContent = "Filter this";
                filterBtn.className = "filter-btn";
                filterBtn.style.marginLeft = "10px";
                filterBtn.style.cursor = "pointer";
                filterBtn.addEventListener("click", function () {
                    const id = row.getAttribute("data-id");
                    if (id) {
                        filteredIDs.add(id); // Add ID to the set
                        saveFilteredIDs(); // Save to localStorage
                        filterItems(); // Update display
                    }
                });
                row.querySelector(".left")?.appendChild(filterBtn); // Add the button to the left section
            }
        });
    }

    // Add a "Clear Filter" button to reset all filtered IDs
    function addClearButton() {
        const header = document.querySelector(".row.row-total");
        if (header && !document.querySelector("#clearFilterBtn")) {
            const clearBtn = document.createElement("button");
            clearBtn.textContent = "Clear Filter";
            clearBtn.id = "clearFilterBtn";
            clearBtn.style.marginLeft = "10px";
            clearBtn.style.cursor = "pointer";
            clearBtn.addEventListener("click", function () {
                filteredIDs.clear(); // Clear the set of IDs
                saveFilteredIDs(); // Clear localStorage
                filterItems(); // Reset the display
            });
            header.appendChild(clearBtn); // Add the button to the header
        }
    }

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
