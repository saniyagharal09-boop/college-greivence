# VoiceBox - Updated live workflow

## Requirements
- Node.js and npm installed
- MongoDB running locally or a valid MongoDB Atlas connection

## 1. Configure Backend/.env
Create `Backend/.env` from `.env.example` if it does not exist. Example for local MongoDB:

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/college_grievance
JWT_SECRET=replace_this_with_a_long_random_secret
SLA_DAYS=5
```

Use your existing working `.env` values if already configured. Never share JWT_SECRET or passwords.

## 2. Start backend
Open PowerShell in the `Backend` folder:

```
npm.cmd install
npm.cmd start
```

Keep this terminal open. Test `http://localhost:5000/api/health`; it should return JSON with status `ok`.

## 3. Create Admin and Faculty accounts
Open a SECOND PowerShell terminal in the same `Backend` folder while the server is running. Replace the sample names/emails/passwords with your own. Password must have at least 8 characters.

```
node scripts/create-user.js admin "College Admin" admin@example.com AdminPass123 "Administration"
node scripts/create-user.js faculty "IT Faculty" itfaculty@example.com FacultyPass123 "IT Department"
node scripts/create-user.js faculty "Academic Faculty" academic@example.com FacultyPass123 "Academic Department"
```

Create faculty for departments that you will use. Department names must match exactly between faculty account and grievance assignment. This command creates/updates these accounts in the database.

## 4. Open the website
Go to `http://localhost:5000`. Register a student or login using an existing student account.

## 5. Test the end-to-end workflow
1. Login as Student and submit a grievance.
2. Open Student > My Grievances; confirm its ticket ID and status.
3. Logout, then login as Admin using the account created above.
4. In Admin Dashboard > All Grievances, select a department, optionally select a faculty member, and click Save assignment.
5. Logout, then login as the assigned Faculty account. Faculty Dashboard shows grievances assigned to that faculty plus unassigned grievances in the same department.
6. Click Update for a grievance, enter exactly `Under Review` or `Resolved` (or `Pending` / `Rejected`) and add an action summary. Click OK on each prompt.
7. Logout and login again as the original Student. Open My Grievances and refresh the page; the latest status should show from MongoDB.

## Notes
- Use the same website origin (`http://localhost:5000`) for every role, not `file:///...` or VS Code Live Server, so the API and login token work together.
- The Admin/Faculty dashboard requires valid accounts. Student registration only creates student accounts.
- Anonymous submissions keep the student's ownership reference for private tracking, while the displayed student name is `Anonymous`.
- Attachments accepted: JPG, PNG, PDF, up to 5 MB.
