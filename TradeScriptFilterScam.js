// ==UserScript==
// @name         PoE Trade Scam items iD
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Automatically filters trade items by ID and applies the filter immediately on search and new elements load
// @author       You
// @match        https://www.pathofexile.com/trade*
// @grant        none
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
                        alert(`Item ${id} added to the filter.`);
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
                alert("All filters cleared.");
                filterItems(); // Reset the display
            });
            header.appendChild(clearBtn); // Add the button to the header
        }
    }

    // Function to observe changes in the result set
    function observeResults() {
        const resultContainer = document.querySelector(".resultset");
        if (resultContainer) {
            const observer = new MutationObserver(() => {
                filterItems(); // Apply filter to new elements
                addFilterButton(); // Add buttons to new elements
            });

            // Observe changes in child nodes (when new items are added)
            observer.observe(resultContainer, { childList: true, subtree: true });
        }
    }

    // Initialize the script
    function init() {
        const observerInterval = setInterval(() => {
            const resultContainer = document.querySelector(".resultset");
            if (resultContainer) {
                filterItems(); // Apply filters when the page loads
                addClearButton(); // Add clear button
                observeResults(); // Start observing for new search results
                clearInterval(observerInterval); // Stop checking once initialized
            }
        }, 500); // Check every 500ms until the result set is loaded
    }

    init(); // Start the script
})();