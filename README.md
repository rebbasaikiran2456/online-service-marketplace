# ServiceNest — Online Service Marketplace

A beginner-friendly full-stack project for discovering, comparing, booking and reviewing services.

## Features
- Responsive landing page and service catalogue
- Search by keyword and filter by category
- Customer/provider registration and login
- Password hashing using bcrypt
- Provider service listing
- Booking with date, time, address and notes
- Customer/provider booking lists and cancellation
- Review flow and service rating updates
- JSON file persistence (`data/db.json`)
- Demo payment label only — no real payments are processed

## Requirements
- Node.js 18 or newer (includes npm)
- VS Code (recommended)

## Run on Windows (VS Code)
1. Extract `online-service-marketplace.zip`.
2. Open VS Code → **File → Open Folder** → choose `online-service-marketplace`.
3. Open **Terminal → New Terminal**.
4. Check Node.js:
   ```powershell
   node -v
   npm -v
   ```
   If these commands fail, install the LTS version from https://nodejs.org and restart VS Code.
5. Install dependencies:
   ```powershell
   npm install
   ```
6. Start the website:
   ```powershell
   npm start
   ```
7. Open this URL in Chrome: **http://localhost:3000**

Keep the terminal running while using the website. Press `Ctrl + C` to stop the server.

## Test the full flow
1. Click **Get started**, create a customer account.
2. Search for a service and click the `+` button.
3. Select a future date, time and address, then confirm.
4. Open **My bookings** to view or cancel the booking.
5. To test provider features, log out and create a second account with **Offer my services** selected.
6. Publish a service from **Join as a provider**; it will appear in the service catalogue.
7. A customer account can leave a review after booking a service.

## Project structure
```text
online-service-marketplace/
├── server.js             # Express API + session authentication
├── package.json          # Dependencies and scripts
├── data/
│   └── db.json           # Local JSON database (created on first run)
└── public/
    ├── index.html         # Page structure
    ├── styles.css         # Responsive styling
    └── app.js             # Frontend behavior and API calls
```

## Important limitations before public deployment
This is a learning/demo project, not a production-ready marketplace.
- Data is stored in a local JSON file; use PostgreSQL/MySQL for multi-user production deployment.
- The default session secret is for local demos. Set a long random `SESSION_SECRET` in deployment.
- The default Express session store is in-memory; configure a persistent session store for production.
- Add rate limiting, CSRF protections, input validation, logging, email verification, password reset and privacy/terms pages before launch.
- Configure HTTPS and secure cookies behind your production proxy.
- Payments are **not integrated**. Do not enter real payment information.
- Providers are matched by provider display name in the demo booking view. A production app should store and authorize provider IDs throughout the booking lifecycle.
- The starter services are sample data, not real verified businesses.

## API overview
- `GET /api/health` — health check
- `GET /api/me` — current logged-in user
- `POST /api/register` — create account
- `POST /api/login` / `POST /api/logout` — authentication
- `GET /api/services?q=&category=` — search services
- `POST /api/services` — provider publishes a service
- `POST /api/bookings` / `GET /api/bookings` — create/list bookings
- `PATCH /api/bookings/:id/cancel` — cancel booking
- `POST /api/reviews` / `GET /api/reviews/:serviceId` — reviews

This project is intentionally built with a small stack so a CSE student can trace the frontend → REST API → data storage flow.
