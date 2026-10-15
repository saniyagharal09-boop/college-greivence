# College Grievance Redressal System

This package keeps the supplied HTML/CSS page design intact. The JavaScript file `js/main.js` is connected to the Express API so login, student registration, grievance submission, ticket tracking, and staff status updates use MongoDB rather than demo-only data.

## Stack
- Existing frontend: HTML, CSS and browser JavaScript (visual layout preserved)
- Backend: Node.js, Express, Mongoose, JWT and bcrypt
- Database: MongoDB
- Uploads: JPG, PNG and PDF, maximum 5 MB

## Folder structure
```text
College-Grievance-System/
├── index.html
├── login.html
├── register.html
├── css/style.css
├── js/main.js
├── student/
│   ├── dashboard.html
│   ├── submit-grievance.html
│   └── my-grievances.html
├── faculty/dashboard.html
├── admin/dashboard.html
└── Backend/
    ├── server.js
    ├── config/db.js
    ├── middleware/auth.js
    ├── models/User.js
    ├── models/Grievance.js
    ├── routes/auth.js
    ├── routes/grievances.js
    ├── scripts/create-user.js
    └── .env.example
```

## Setup on Windows PowerShell
1. Install Node.js LTS and ensure MongoDB is available. You can use a local MongoDB server or a MongoDB Atlas database.
2. Open PowerShell in the `Backend` folder:
   ```powershell
   Copy-Item .env.example .env
   ```
3. Open `.env` and set `MONGO_URI` to your own database URI, and replace `JWT_SECRET` with a long random secret. Do not share or upload `.env`.
4. Install backend packages:
   ```powershell
   npm install
   ```
5. Start the app:
   ```powershell
   npm start
   ```
6. Open `http://localhost:5000` in your browser. Do not open HTML files directly or use Live Server for API-connected operation.

## Create faculty/admin accounts
Student accounts are created from `register.html`. Faculty and admin accounts are deliberately not self-registerable. From the `Backend` folder, run:
```powershell
node scripts/create-user.js faculty "Faculty Name" faculty@example.com "Use-A-Strong-Password" "IT Department"
node scripts/create-user.js admin "System Admin" admin@example.com "Use-A-Different-Password" "Administration"
```
Use your own strong passwords. Login with the exact email, password and role you created.

## Implemented API
- `GET /api/health` — server health
- `POST /api/auth/register` — student registration
- `POST /api/auth/login` — authenticate user and return JWT
- `GET /api/auth/me` — current authenticated user
- `POST /api/grievances` — create grievance; auto ticket ID, category/keyword department routing, optional anonymous mode and attachment
- `GET /api/grievances/mine` — current student's tickets
- `GET /api/grievances` — faculty's department tickets or admin's all tickets
- `PATCH /api/grievances/:id/status` — faculty/admin status updates with action history
- `GET /api/grievances/stats/summary` — summary counts and department metrics

## Project presentation alignment
The implementation follows the presentation's Student / Faculty / Admin views, MongoDB-backed Users and Complaints, ticket IDs, complaint validation, keyword-based department allocation, optional anonymous reporting, status history, dashboard metrics, attachment support and a five-day SLA due date. A scheduled automatic escalation/email service is not configured in this local package; the due date is stored for later escalation/reporting logic.

## Notes
- If MongoDB Atlas is used, confirm the database user/password, cluster hostname, and Network Access allow-list. Never put credentials in source control.
- The supplied ZIP contained a `Backend/.env` with a database credential-like value. It was intentionally excluded from the output. Create a fresh `.env` locally.
- Anonymous mode removes the student reference from the grievance record. It is intended for privacy, but it is not a legal guarantee of complete anonymity; file contents and complaint text can still identify a person.
