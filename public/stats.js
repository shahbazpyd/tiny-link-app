// public/stats.js

const API_BASE = '/api/links';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Get the code from the URL (e.g., /code/abc1234)
    const pathSegments = window.location.pathname.split('/');
    // The code is the last segment in the path: ['','code','abc1234']
    const shortCode = pathSegments[pathSegments.length - 1];

    if (shortCode) {
        document.getElementById('short-code-display').textContent = shortCode;
        fetchLinkStats(shortCode);
    } else {
        renderError('Invalid link code in URL.');
    }
});

const renderError = (message) => {
    const detailsContainer = document.getElementById('stats-details');
    detailsContainer.innerHTML = `<p class="message error">${message}</p>`;
};

const renderStats = (link) => {
    const detailsContainer = document.getElementById('stats-details');
    
    // Format dates
    const createdDate = new Date(link.createdAt).toLocaleString();
    const lastClicked = link.lastClickedAt ? new Date(link.lastClickedAt).toLocaleString() : 'N/A';

    detailsContainer.innerHTML = `
        <table class="links-table">
            <tr>
                <th>Target URL</th>
                <td class="target-url" title="${link.targetUrl}">${link.targetUrl}</td>
            </tr>
            <tr>
                <th>Total Clicks</th>
                <td>${link.totalClicks}</td>
            </tr>
            <tr>
                <th>Created At</th>
                <td>${createdDate}</td>
            </tr>
            <tr>
                <th>Last Clicked At</th>
                <td>${lastClicked}</td>
            </tr>
            <tr>
                <th>Database ID</th>
                <td>${link.id}</td>
            </tr>
        </table>
        <p style="margin-top: 20px;">
            <a href="${window.location.origin}/${link.shortCode}" target="_blank" class="btn btn-primary">Test Redirect</a>
        </p>
    `;
};

const fetchLinkStats = async (code) => {
    const url = `${API_BASE}/${code}`;
    const detailsContainer = document.getElementById('stats-details');
    
    detailsContainer.innerHTML = '<p>Loading statistics...</p>'; 

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            renderStats(data);
        } else {
            // Handle 404 Not Found from the API
            document.getElementById('short-code-display').textContent = 'Not Found';
            renderError(`❌ Link Not Found: ${data.error || 'The short code does not exist.'}`);
        }
    } catch (error) {
        console.error('Fetch error:', error);
        document.getElementById('short-code-display').textContent = 'Error';
        renderError('❌ Critical error: Could not connect to the API.');
    }
};