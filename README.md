# 🔗 TinyLink: High-Performance URL Shortener

TinyLink is a modern, full-stack URL shortening service designed to efficiently create, manage, and track short links. It is built as a highly performant backend-first application using Node.js and Express, ensuring fast redirects and atomic click tracking, and is optimized for deployment on Vercel.

## ✨ Core Features

*   **Link Creation**: Shorten long URLs, with optional support for custom short codes (6-8 alphanumeric characters).
*   **Atomic Click Tracking**: Each use of a short link instantly performs an HTTP 302 redirect while atomically updating the `totalClicks` counter in the database.
*   **Dashboard (`/`)**: A single-page application (SPA) dashboard to view all created links, including click statistics and deletion options.
*   **Stats Page (`/code/:code`)**: A dedicated view for detailed statistics of a single short link.
*   **Validation**: Strict validation for target URLs and custom codes, including uniqueness checks (returns `409 Conflict`).
*   **Health Check (`/healthz`)**: A public endpoint for service monitoring.

## 🛠️ Technology Stack

| Category   | Technology             | Files Involved                               | Purpose                                                     |
| :--------- | :--------------------- | :------------------------------------------- | :---------------------------------------------------------- |
| Backend    | Node.js, Express       | `index.js`, `package.json`                   | Server runtime and minimal web framework for API and routing. |
| Database   | PostgreSQL             | `index.js`, `package.json`                   | Primary data persistence for link records and statistics.   |
| ORM        | Prisma                 | `index.js`, `package.json`                   | Type-safe database access layer and migration tool.         |
| Frontend   | Vanilla JS, HTML, CSS  | `index.html`, `stats.html`, `app.js`, `stats.js` | Client-side dashboard, form handling, and API consumption.  |
| Deployment | Vercel                 | `vercel.json`                                | Serverless deployment platform and custom routing configuration. |

## 📁 Project Structure

The project follows a standard Node.js Express setup, with all client-side assets located in the implied `public` directory (static file serving is configured in `index.js`).

```bash
.
├── index.js              # Main Express server, API routes, and redirect logic.
├── package.json          # Project dependencies (Express, Prisma) and scripts.
├── vercel.json           # Vercel deployment and custom routing configuration.
└── public/
    ├── index.html        # Main dashboard page (Link Creation & List).
    ├── stats.html        # Dedicated page for viewing link stats.
    ├── app.js            # Frontend logic for the dashboard (`/`).
    ├── stats.js          # Frontend logic for the stats page (`/code/:code`).
    └── style.css         # (Assumed) CSS for styling the frontend.
```

## 👨‍💻 Development Process

The TinyLink project was developed using a backend-first, modular approach, prioritizing API compliance and performance.

*   **Data Modeling with Prisma**: The schema (assumed to be defined in `schema.prisma`) was designed first to ensure fields like `shortCode`, `targetUrl`, and `totalClicks` were correctly indexed and validated.
*   **API Implementation (`index.js`)**: All core API endpoints (`POST`, `GET`, `DELETE` `/api/links`) were implemented in `index.js`, focusing on robust validation (e.g., returning `409 Conflict` for duplicate short codes) and proper HTTP status codes.
*   **Atomic Redirect Logic**: The critical redirect route (`/:code`) was implemented to perform a single, atomic database operation: locate the link, increment `totalClicks`, update `lastClickedAt`, and then send a `302` redirect. This guarantees data integrity under high traffic.
*   **Frontend Logic (`app.js`, `stats.js`)**: The client-side applications were built using vanilla JavaScript to handle form submission, data rendering, and event listening (delete, view stats), communicating exclusively with the Express API endpoints.
*   **Deployment Configuration (`vercel.json`)**: Custom routes were configured to properly map all dynamic routes:
    *   `/api/(.*)` routes to the Express server for API calls.
    *   `/code/(.*)` routes to the Express server to handle serving the `stats.html` page.
    *   The catch-all non-API route handles the root (`/`) to serve the dashboard or processes the short code redirect logic (`/:code`).

## ⚙️ Project Execution Flow

The application flow is dictated by the Express server (`index.js`) and the Vercel routing configuration (`vercel.json`).

1.  **Request Ingress**: A request hits the Vercel edge network.
2.  **Vercel Routing (`vercel.json`)**:
    *   If the path is `/api/links/...` (e.g., creating a link), it's routed directly to the Express server functions.
    *   If the path is `/code/abc1234` (Stats Page), it's routed to Express, which specifically serves the `stats.html` file.
    *   If the path is `/` (Dashboard) or any other path like `/shortCode` (Redirect), it's routed to Express's main routing handler.
3.  **Express Execution (`index.js`)**:
    *   **Dashboard (`/`)**: Serves `index.html`.
    *   **Stats Page Handler (`/code/:code`)**: Serves `stats.html`.
    *   **API Handlers (`/api/*`)**: Executes database operations (create, list, delete, get stats) via Prisma.
    *   **Redirect Handler (`/:code`)**: This is the final catch-all route. It attempts to find the code, updates the clicks atomically, and issues a `302` redirect or returns a `404 Not Found`.
4.  **Frontend Interaction**: `app.js` and `stats.js` run in the browser, asynchronously fetching and manipulating data via the `/api/links` endpoints.

## 🚀 How to Run Locally

### Prerequisites
*   Node.js (v18+)
*   npm (or yarn/pnpm)
*   A PostgreSQL database (e.g., using Neon or a local instance).

### Step 1: Clone and Install
```bash
git clone [your-repo-url]
cd tiny-link-app
npm install
```

### Step 2: Configure Environment
Create a file named `.env` in the project root and provide your database connection string and port:
```.env
# .env
# Replace with your actual PostgreSQL connection string
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
# Port for local development
PORT=3000
```

### Step 3: Database Setup
Generate the Prisma client and apply the necessary database migration:
```bash
# Generate the Prisma client based on your schema
npm run build

# Apply the database migration (assumes a migration file exists)
npx prisma migrate dev --name init
```

### Step 4: Start the Server
The `start` script uses `dotenv-cli` to automatically load environment variables:
```bash
npm start
```

### Step 5: Access the Application
Open your browser to the following URLs:
*   **Dashboard**: `http://localhost:3000/`
*   **Health Check**: `http://localhost:3000/healthz`

## ✅ Test Cases (API & Functionality)

The following test cases confirm compliance with the assignment specification, verifying API status codes, functionality, and required behavior.

| Test Case                      | Method | Path                 | Request Body / Action                                        | Expected Result                                                                                             |
| :----------------------------- | :----- | :------------------- | :----------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------- |
| 1. Health Check                | `GET`  | `/healthz`           | N/A                                                          | Status `200 OK`. Response JSON confirms service status.                                                     |
| 2. Create Link (Auto-Code)     | `POST` | `/api/links`         | `{"targetUrl": "https://www.google.com"}`                    | Status `201 Created`. Response includes a new 6-8 character short code.                                     |
| 3. Create Link (Custom Code)   | `POST` | `/api/links`         | `{"targetUrl": "https://example.com/docs", "customCode": "airocks7"}` | Status `201 Created`. Response includes `shortCode: "airocks7"`.                                            |
| 4. Validation: Duplicate Code  | `POST` | `/api/links`         | Re-submit the request from Test 3.                           | Status `409 Conflict`. Response includes an error message indicating duplication.                           |
| 5. Validation: Invalid Code    | `POST` | `/api/links`         | `{"targetUrl": "https://test.com", "customCode": "invalid!"}` | Status `400 Bad Request`. Code must match `[A-Za-z0-9]{6,8}`.                                                |
| 6. List All Links              | `GET`  | `/api/links`         | N/A                                                          | Status `200 OK`. Response is a JSON array of link objects.                                                  |
| 7. Get Single Link Stats       | `GET`  | `/api/links/airocks7`| N/A                                                          | Status `200 OK`. Response is the link object for "airocks7".                                                |
| 8. Redirect & Atomic Update    | `GET`  | `/airocks7`          | Navigate to the short link.                                  | Status `302 Found`. Redirects to `https://example.com/docs`. DB check: `totalClicks` is incremented by 1. |
| 9. Redirect Not Found          | `GET`  | `/nonexist`          | Navigate to a code not in the database.                      | Status `404 Not Found`.                                                                                     |
| 10. Dashboard UX               | `GET`  | `/`                  | Load the main page.                                          | Status `200 OK`. `index.html` loads, and `app.js` fetches and displays the link table.                      |
| 11. Stats Page UX              | `GET`  | `/code/airocks7`     | Navigate to the stats page.                                  | Status `200 OK`. `stats.html` loads, and `stats.js` fetches and displays link details.                      |
| 12. Delete Link                | `DELETE`| `/api/links/airocks7`| N/A                                                          | Status `204 No Content`.                                                                                    |
| 13. Redirect After Deletion    | `GET`  | `/airocks7`          | Navigate to the link after deletion.                         | Status `404 Not Found` (Verification that deletion stops the redirect).                                     |