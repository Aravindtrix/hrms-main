# HRMS (Human Resource Management System)

HRMS is a web-based system for managing recruitment, candidates, tickets,
departments, roles, performance, and exits. It includes a React frontend, a
Node/Express backend, and a MySQL database.

## Step-by-step walkthrough

Save the screenshots under `hrms-main/` using the filenames shown below.

### 1) Sign in and select a role
![Sign in](hrms-main/step-01-login.png)

### 2) View the main dashboard (tickets)
![Dashboard tickets](hrms-main/step-02-dashboard-tickets.png)

### 3) Manage departments (Masters)
![Departments](hrms-main/step-03-departments.png)

### 4) Manage roles (Masters)
![Roles](hrms-main/step-04-roles.png)

### 5) Manage employees (Masters)
![Employees](hrms-main/step-05-employees.png)

### 6) Raise a requirement (Heads)
![Raise requirement](hrms-main/step-06-raise-requirement.png)

### 7) Select role for requirement
![Select role](hrms-main/step-07-role-select.png)

### 8) View my tickets (Heads)
![My tickets](hrms-main/step-08-my-tickets.png)

### 9) HR dashboard queue
![HR dashboard](hrms-main/step-09-hr-dashboard.png)

### 10) Candidate entry form (HR)
![Candidate entry](hrms-main/step-10-candidate-entry.png)

### 11) Shortlisted candidates (Heads)
![Shortlisted candidates](hrms-main/step-11-shortlisted.png)

### 12) Enter interview result
![Interview result modal](hrms-main/step-12-interview-result.png)

### 13) Candidate list and offer actions (HR)
![Candidate list](hrms-main/step-13-candidate-list.png)

### 14) Training management (HR)
![Training](hrms-main/step-14-training.png)

### 15) Performance scoring (Heads)
![Heads performance](hrms-main/step-15-heads-performance.png)

### 16) Performance actions (HR)
![HR performance](hrms-main/step-16-hr-performance.png)

### 17) Overall performance history
![Performance history](hrms-main/step-17-performance-history.png)

### 18) Exit Employees
![exit page](hrms-main/exit-page.png)

## Tech Stack

- Frontend: React, TypeScript, Ant Design, Axios
- Backend: Node.js, Express
- Database: MySQL
- PDF generation: Puppeteer, Mammoth

## Local Development

### Prerequisites

- Node.js 18+ and npm
- MySQL 8+

### 1) Database setup

Create a MySQL database and load the schema:

```bash
mysql -u root -p -e "CREATE DATABASE hrms_db;"
```

Then import the SQL files in `hr-backend/db/` or use the dump file
`Dump20251230 (1).zip` if it contains a full schema/data export.

### 2) Backend (API)

```bash
cd hr-backend
npm install

# Optional environment variables
export DB_HOST=127.0.0.1
export DB_USER=root
export DB_PASSWORD=root
export DB_NAME=hrms_db

node server.js
```

The backend runs on `http://localhost:5000`.

### 3) Frontend (Web)

```bash
cd frontend
npm install
npm start
```

Open `http://localhost:3000` in the browser. The frontend calls the API at
`http://localhost:5000/api` (see `frontend/src/services/api.ts`).

## Optional: Electron Build

```bash
cd electron
npm install
npm run start
```

Packaging is configured in `electron/scripts/prepare-build.js` and
`electron/package.json`.
