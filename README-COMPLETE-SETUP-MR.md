# VoiceBox — Complete Workflow Setup (Windows)

This folder contains the College Grievance Redressal System frontend and Express/MongoDB backend. It includes role-based login, grievance submission with attachments, department routing, admin assignment, faculty status updates, student tracking/history, in-app notifications, department reports, and an SLA overdue watch.

## 1. Requirements
- Node.js installed (Windows PowerShell supports `npm.cmd`)
- MongoDB Community Server running locally, or a valid MongoDB URI
- MongoDB Compass is optional and used to inspect records

## 2. Configure `.env`
Open `Backend` and copy `.env.example` to a new file named `.env` (make sure it is not `.env.txt`). Set your own long random `JWT_SECRET`.

Example for local MongoDB:
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/college_grievance
JWT_SECRET=replace_with_your_own_long_random_secret
CLIENT_ORIGIN=http://localhost:5000
SLA_DAYS=5
```
Do not share `.env` or commit it to public repositories.

## 3. Start the backend
Open PowerShell in this `Backend` folder:
```
npm.cmd install
npm.cmd start
```
Keep this terminal open. Expected messages include `MongoDB connected` and `College Grievance System running at http://localhost:5000`.
Health check: `http://localhost:5000/api/health` should return JSON with `status: ok`.

## 4. Create or reset Admin and Faculty logins
Open a **second** PowerShell window in `Backend`. These commands create the account if missing and reset its password if the email already exists. Change demo passwords before real use.

Admin:
```
node scripts/create-user.js admin "College Admin" admin@example.com ChangeThisAdmin123 "Administration"
```
IT Faculty:
```
node scripts/create-user.js faculty "IT Faculty" itfaculty@example.com ChangeThisFaculty123 "IT Department"
```
Academic Faculty:
```
node scripts/create-user.js faculty "Academic Faculty" academicfaculty@example.com ChangeThisFaculty123 "Academic Department"
```
For other departments, repeat the command with the correct department name. The faculty department must match the grievance department.

## 5. Open and test
- Main site: `http://localhost:5000`
- Student registration: use Register on the main site. Students can only register student accounts.
- Admin dashboard: `http://localhost:5000/admin/dashboard.html`
- Faculty dashboard: `http://localhost:5000/faculty/dashboard.html`
- Student tracking: `http://localhost:5000/student/my-grievances.html`

Test in this order:
1. Register/login as Student and submit a test grievance.
2. Log in as Admin. Open **All Grievances**, choose department and faculty, then click **Save assignment**.
3. Log in as the matching Faculty. Click **Update**, set `Under Review`, and enter an action summary. When resolved, update to `Resolved` and enter the resolution summary.
4. Log back in as Student and refresh **My Grievances** to see the new status and timeline.
5. Check MongoDB Compass database `college_grievance`, collection `grievances`. Look at `department`, `assignedTo`, `status`, `actionSummary`, `history`, `dueAt`, and `escalatedAt`.

## Department routing rules
- Wi-Fi, internet, network, computers → IT Department
- Exam, marks, results, timetable, hall ticket → Examination Department
- Fees, scholarship, accounts, receipt → Accounts Department
- Hostel, room, warden → Hostel Administration
- Fan, light, water, building, maintenance, classroom/bench issue → Maintenance
- Teacher, lecture, syllabus, academic issue → Academic Department
- Unmatched issues → Administration

The category/title/description text is used to select a department when the form is set to auto-assign. Admin can correct the department during assignment.

## Notifications and SLA
- In-app notifications are stored in MongoDB for Admin on new submissions, Faculty on assignment, and Students on assignment/status updates.
- The SLA monitor checks overdue open grievances at server startup and every 30 minutes. It records an escalation in grievance history and notifies Admin. It flags overdue items for administration; it does not automatically resolve the complaint.
- Email and browser push notifications are not configured in this project. In-app notifications are used instead.

## Troubleshooting
- PowerShell script-policy issue: use `npm.cmd`, not `npm`.
- `MongoDB connection failed`: confirm MongoDB is running and check `MONGO_URI` in `.env`.
- Login fails: check selected role and password. Use the account commands above to reset Admin/Faculty passwords. Passwords are hashed; do not copy a `passwordHash` from Compass into the login form.
- Admin dashboard says unauthorized: log out, then log in through the login page as Admin so a fresh token is saved.
- Faculty sees no assigned item: ensure the grievance's department matches the faculty account's department, then refresh.
- Use the new extracted folder and do not mix it with older project copies.
