# Placement Drive Attendance System (AttenDrive)

A responsive, high-performance web application designed for college placement cells to manage student records, placement drives, bulk student assignments based on eligibility, rapid attendance marking (with barcode/reg no scanner support), and official A4 print-ready PDF reports.

> **Note:** As per placement cell guidelines, this system **only** tracks attendance and eligibility. It deliberately does **not** track placement outcomes (no placed/unplaced status, no round-wise shortlisted/selected/rejected, no offer letters).

---

## 🚀 Key Features

1. **Dashboard**
   - Real-time counters: Total Students, Total Drives, Upcoming Drives, Today's Attendance %.
   - Ongoing & Upcoming drive quick cards with direct attendance triggers.
   - Global quick action shortcuts (Bulk Add Students, Create Drive, Mark Attendance, Generate Report).

2. **Bulk Student Onboarding (Primary)**
   - **3 Input Modes:**
     - **Upload CSV / Excel:** Drag-and-drop `.csv`, `.xlsx`, `.xls` with downloadable sample template.
     - **Paste from Sheets / Excel:** Live parsing of tab-separated and comma-separated rows.
     - **Register Numbers Only:** Generates placeholder records with default department & batch.
   - **5-Step Interactive Wizard:**
     1. Input Data
     2. Intelligent Column Mapping (auto-detects aliases like `reg`, `roll`, `pointer`, `arrears`)
     3. Row-Level Validation Preview: checks DB duplicates, in-file duplicates, invalid email/phone, CGPA (0–10), and backlogs. Valid rows green, invalid rows red with **inline cell editing** to fix errors on the fly.
     4. Conflict Resolution: **"Skip duplicates"** (safe) vs **"Update existing"** processed in chunks of 500 records.
     5. Summary Report: Added, Updated, Skipped, Failed, downloadable error report CSV, and an immediate **Undo Import** button.
   - Single "Add Student" fallback form, bulk edit (set department/batch), bulk delete, sorting, and CSV export.

3. **Drive Management**
   - Company, Role, Package (LPA), Drive Date & Time, Venue/Mode (Campus Offline / Virtual Online), Coordinator.
   - **Automated Eligibility Engine:** Minimum CGPA, Maximum Standing Backlogs, Allowed Departments (multi-select chips), Target Batch.
   - Status: Upcoming / Ongoing / Completed / Cancelled.
   - Bulk upload of multiple drives via CSV/Excel.

4. **Bulk Assignment of Students to Drives**
   - **"Auto-assign all eligible students":** Evaluates eligibility criteria and previews matching candidate count before one-click assignment.
   - **"Assign by Paste or Scanner Sheet":** Paste a list of Register Numbers; detects unmatched numbers and ineligibility warnings with an explicit **"Allow Ineligible Override"** option.
   - **"Assigned Students Checklist Table":** View assigned students with `Eligible` vs `Overridden` badges, search, filter, and bulk remove.
   - **"Assign One Student to Multiple Drives":** One-click assignment across multiple placement drives.

5. **Bulk Attendance Marking**
   - Interactive checklist table of assigned students with instant toggles (`P`, `A`, `L`).
   - **Rapid Scanner Entry Box:** Type Reg No or scan handheld barcode scanner and hit Enter; provides instant audio chime and visual feedback, with duplicate-scan warnings.
   - **Bulk Status Change:** Mark all Present, Mark all Absent, or apply custom status & remark to selected rows.
   - **Paste Present List:** Pasty registered attendees from scanner sheets (pasted become Present, rest become Absent).
   - **Finalize & Lock:** Locks attendance from further tampering and generates the official report preview.

6. **Official Reports & A4 PDF Generation**
   - 5 Report Types:
     1. Drive Attendance Report (main report)
     2. Absentees List for a drive
     3. Student-wise Attendance History
     4. Department-wise Summary
     5. Consolidated Multi-Drive Report
   - **Print & PDF Styling:** Dedicated `@media print` layout with 15mm margins, repeated table headers, no page-break inside table rows, optional signature column, and 3 signatory lines (Placement Officer, Drive Coordinator, Principal/Dean).
   - Report History audit log with re-download capabilities.

7. **Institution Settings & Access Security**
   - Custom College Name, Address, Logo upload (stored as base64 in database), Signatory Titles.
   - Full Database Backup Export (`GET /api/export/all`).
   - Optional `ACCESS_PIN`: If set on the backend, requires PIN verification once per browser session.

8. **Authentication & User Management**
   - **JWT-Based Authentication:** Secure token-based session management with automatic expiration.
   - **Role-Based Access Control:** Roles include Placement Officer (`admin`), Placement Coordinator (`coordinator`), and Department Staff (`staff`).
   - **Registration & Login Pages:** Modern glassmorphism UI with live validation, password visibility toggles, and dark mode support.
   - **Protected Routes:** All placement operations, student data, and reports are protected behind authenticated sessions.
   - **Default Admin Account:** Auto-initialized on startup: `placement@marephraem.edu.in` / `Placement2026`.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Router v6, Lucide Icons, Recharts, PapaParse, SheetJS (xlsx), jsPDF, jsPDF-autotable.
- **Backend:** Node.js, Express, Mongoose, JSON Web Tokens (JWT), Bcrypt.js, Zod, Helmet, CORS, Express-Rate-Limit, Morgan.
- **Database:** MongoDB Atlas (or local MongoDB).

---

## 📦 Directory Structure

```
AttenDrive/
├── client/                     # Vite + React Frontend
│   ├── public/
│   │   └── _redirects          # Netlify SPA redirect rule
│   ├── src/
│   │   ├── components/         # Layout, Navbar, Sidebar, Modals, Toasts
│   │   ├── context/            # AppContext (theme, PIN, toasts)
│   │   ├── pages/              # Dashboard, Students, Drives, Attendance, Reports, Settings
│   │   ├── services/           # api.js client service
│   │   ├── utils/              # pdfGenerator.js (A4 PDF export)
│   │   ├── App.jsx             # Router
│   │   ├── main.jsx            # Entry point
│   │   └── index.css           # Tailwind & @media print styles
│   └── package.json
├── server/                     # Node.js + Express Backend
│   ├── src/
│   │   ├── config/             # db.js (MongoDB Mongoose connection)
│   │   ├── controllers/        # Students, Drives, Attendance, Reports, Settings
│   │   ├── middlewares/        # authMiddleware (ACCESS_PIN), errorMiddleware
│   │   ├── models/             # Student, Drive, DriveAssignment, Attendance, ImportLog, ReportLog, Setting
│   │   ├── routes/             # Express API routes
│   │   ├── scripts/            # syncIndexes.js, seed.js
│   │   ├── validators/         # Zod schemas (studentValidator, driveValidator)
│   │   ├── app.js              # Express app setup
│   │   └── server.js           # Server bootstrap
│   ├── test/                   # Vitest unit tests (bulk validation & drive eligibility)
│   ├── .env.example
│   └── package.json
├── sample_data/                # CSV Templates (students, drives)
├── package.json                # Monorepo scripts
└── README.md
```

---

## 💻 Local Development Setup

### 1. Prerequisites
- **Node.js** v18+ and **npm** v9+
- **MongoDB** (Local instance running at `mongodb://127.0.0.1:27017` or a free MongoDB Atlas connection URI)

### 2. Environment Variables
Create `.env` inside `server/`:
```bash
# server/.env
MONGODB_URI=mongodb://127.0.0.1:27017/attendrive
PORT=5000
ACCESS_PIN=
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### 3. Install Dependencies
```bash
# In server directory
cd server
npm install

# In client directory
cd ../client
npm install
```

### 4. Synchronize Indexes & Seed Data
```bash
# In server directory
npm run sync-indexes
npm run seed
```
*Seeds 100 realistic engineering students and 5 placement drives (Google, Microsoft, Amazon, Deloitte, TCS).*

### 5. Run the Application
In two separate terminals or from the root:
```bash
# Terminal 1: Backend API (port 5000)
cd server
npm run dev

# Terminal 2: Frontend (port 5173)
cd client
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🧪 Automated Testing

Run the Vitest test suite to verify student validation, bulk processing schemas, drive eligibility rules, and override logic:
```bash
cd server
npm test
```

---

## ☁️ Deployment Guide

### A. MongoDB Atlas Database Setup
1. Create a free M0 cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Database Access**, create a database user with `readWriteAnyDatabase` privileges.
3. Under **Network Access**, add IP `0.0.0.0/0` (Allow Access from Anywhere) to permit cloud hosts (Render/Railway/Netlify) to connect.
4. Copy your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/attendrive?retryWrites=true&w=majority
   ```

### B. Backend Deployment (Render or Railway)
1. Push your repository to GitHub.
2. In **Render** or **Railway**, create a new **Web Service** pointing to the `server/` root.
3. Configure the build & start settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Set Environment Variables:
   - `MONGODB_URI`: Your Atlas connection string
   - `PORT`: `5000` (or host provided port)
   - `FRONTEND_URL`: URL of your deployed frontend (e.g. `https://your-app.netlify.app`)
   - `ACCESS_PIN`: Optional PIN (e.g. `123456`)
   - `NODE_ENV`: `production`

> **Note on Free-Tier Cold Starts:** Free-tier services on Render spin down after 15 minutes of inactivity. When a request arrives, wake-up may take 30–50 seconds. The frontend features friendly loading spinners and toasts to handle this gracefully.

### C. Frontend Deployment (Netlify)
1. In [Netlify](https://www.netlify.com), click **Add new site** > **Import an existing project**.
2. Configure settings:
   - **Base directory:** `client`
   - **Build command:** `npm run build`
   - **Publish directory:** `client/dist`
3. Under **Site configuration** > **Environment variables**, set:
   - `VITE_API_URL`: Your deployed backend URL (e.g. `https://attendrive-api.onrender.com`)
4. The file `client/public/_redirects` is already included to support client-side React Router navigation.

---

## 🔒 Security & Data Integrity

- **No Local Disk Storage:** All data (including institution logos) is stored directly in MongoDB Atlas; uploads are never written to server disks.
- **Cascade Deletions:** Deleting a student or drive cleanly cascades and deletes related assignments and attendance records.
- **Index Enforcement:** Unique indexes prevent duplicate register numbers and duplicate attendance records per student per drive.
- **Rate Limiting & Helmet:** Protected with HTTP security headers and IP rate limiting (1000 requests per 15 minutes).
