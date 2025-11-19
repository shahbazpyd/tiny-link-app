// public/app.js

const API_BASE = '/api/links';
const BASE_URL = window.location.origin;

// DOM Elements
const form = document.getElementById('create-link-form');
const messageDisplay = document.getElementById('message');
const linksContainer = document.getElementById('links-table-container');

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Load: Fetch and render existing links
    fetchAndRenderLinks(); 

    // 2. Form Submission Handler: Create Link (POST /api/links)
    form.addEventListener('submit', handleFormSubmit);
});


// --- UX/HELPER FUNCTIONS ---

const showMessage = (text, type, displayTime = 5000) => {
    messageDisplay.textContent = text;
    messageDisplay.className = `message ${type}`;
    messageDisplay.style.display = 'block';

    // Auto-hide success messages after a duration
    if (type === 'success') {
        setTimeout(() => {
            messageDisplay.style.display = 'none';
        }, displayTime);
    }
};

const validateCustomCode = (code) => {
    // Matches the backend regex: [A-Za-z0-9]{6,8}
    const CODE_REGEX = /^[A-Za-z0-9]{6,8}$/;
    if (code && !CODE_REGEX.test(code)) {
        return 'Custom code must be 6 to 8 alphanumeric characters.';
    }
    return null;
};


// --- CORE APPLICATION LOGIC ---

/**
 * Handles the form submission to create a new short link.
 */
const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    messageDisplay.style.display = 'none';
    
    const targetUrl = document.getElementById('targetUrl').value;
    const customCode = document.getElementById('customCode').value;

    // Frontend validation (inline validation requirement)
    const codeError = validateCustomCode(customCode);
    if (codeError) {
        return showMessage(`❌ Invalid Input: ${codeError}`, 'error');
    }

    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUrl, customCode }),
        });

        const data = await response.json();

        if (response.ok) {
            // Success: Display the short link and clear the form
            const shortUrl = `${BASE_URL}/${data.link.shortCode}`;
            showMessage(`✅ Success! Your TinyLink is: ${shortUrl}`, 'success');
            form.reset(); // Clear form fields
            
            // Reload the links list to show the new link
            fetchAndRenderLinks(); 

        } else {
            // Error: Display API error message (e.g., 400, 409 Conflict)
            showMessage(`❌ Error: ${data.error || 'Failed to create link.'}`, 'error', 10000);
        }
    } catch (error) {
        console.error('Network or system error:', error);
        showMessage('❌ Critical error: Could not connect to server.', 'error', 10000);
    }
};


/**
 * Fetches all links and renders them into a table (GET /api/links).
 */
const fetchAndRenderLinks = async () => {
    linksContainer.innerHTML = '<p>Loading links...</p>'; // Show loading state
    
    try {
        const response = await fetch(API_BASE);
        const links = await response.json();

        if (response.ok && links.length > 0) {
            linksContainer.innerHTML = createLinksTable(links);
            attachDeleteAndCopyListeners();
        } else if (response.ok && links.length === 0) {
            linksContainer.innerHTML = '<p>No links have been created yet. Use the form above to get started!</p>';
        } else {
            linksContainer.innerHTML = '<p class="message error">Failed to load links from the API.</p>';
        }
    } catch (error) {
        console.error('Error fetching links:', error);
        linksContainer.innerHTML = '<p class="message error">Could not connect to the backend API.</p>';
    }
};


/**
 * Generates the HTML table structure.
 */
const createLinksTable = (links) => {
    let html = `
        <table class="links-table">
            <thead>
                <tr>
                    <th>Short Code</th>
                    <th>Target URL</th>
                    <th>Clicks</th>
                    <th>Created At</th>
                    <th>Last Clicked</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    links.forEach(link => {
        const shortUrl = `${BASE_URL}/${link.shortCode}`;
        const createdDate = new Date(link.createdAt).toLocaleString();
        const lastClicked = link.lastClickedAt ? new Date(link.lastClickedAt).toLocaleString() : 'N/A';

        html += `
            <tr>
                <td data-label="Short Code">
                    <a href="${shortUrl}" target="_blank" title="Test Redirect">${link.shortCode}</a>
                    <button class="copy-btn" data-url="${shortUrl}">📋</button>
                </td>
                <td data-label="Target URL" class="target-url" title="${link.targetUrl}">${link.targetUrl}</td>
                <td data-label="Clicks">${link.totalClicks}</td>
                <td data-label="Created At">${createdDate}</td>
                <td data-label="Last Clicked">${lastClicked}</td>
                <td data-label="Actions">
                    <a href="/pages/stats/${link.shortCode}" class="btn btn-secondary btn-stats">Stats</a>
                    <button class="btn btn-delete" data-code="${link.shortCode}">Delete</button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;
    return html;
};


/**
 * Handles the deletion of a link (DELETE /api/links/:code).
 */
const handleLinkDelete = async (code) => {
    if (!confirm(`Are you sure you want to delete the link with code: ${code}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/${code}`, {
            method: 'DELETE',
        });

        if (response.status === 204) {
            showMessage(`✅ Link ${code} deleted successfully.`, 'success');
            fetchAndRenderLinks(); // Reload the list
        } else {
            const data = await response.json();
            showMessage(`❌ Failed to delete link: ${data.error || 'Server error.'}`, 'error');
        }
    } catch (error) {
        console.error('Error deleting link:', error);
        showMessage('❌ Critical error: Could not connect to server for deletion.', 'error');
    }
};

/**
 * Attaches event listeners for dynamically rendered buttons.
 */
const attachDeleteAndCopyListeners = () => {
    // Delete Button Listeners
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', (e) => {
            const code = e.target.dataset.code;
            handleLinkDelete(code);
        });
    });
    
    // Copy Button Listeners (UX Requirement)
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const url = e.target.dataset.url;
            navigator.clipboard.writeText(url).then(() => {
                alert(`URL copied to clipboard: ${url}`);
            }).catch(err => {
                console.error('Could not copy text: ', err);
                alert('Failed to copy URL. Ensure site is served over HTTPS or localhost.');
            });
        });
    });
};