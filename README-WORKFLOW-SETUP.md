# VoiceBox - workflow setup (Windows)

## Features connected to MongoDB
- Student registration/login and role-based sessions.
- Student grievance submission, optional anonymity, and JPG/PNG/PDF attachment upload (max 5 MB).
- Automatic department routing based on keywords when the form uses auto-assignment.
- Admin live grievance list, department assignment, optional faculty assignment, live counts, department resolution-rate table, and recent activity.
- Faculty department queue, status updates (Pending / Under Review / Resolved / Rejected), action summary, and status history.
- Student My Grievances table, status filter, selected ticket details, action summary, and status-change timeline.
- MongoDB stores grievance records and history.

Email notifications, live push notifications, automatic timed SLA escalation, and full user/department administration screens are not included in this build. The SLA due date is stored, but automatic escalation needs a separate scheduler and policy.

## Windows run instructions
1. Extract the ZIP to a normal folder (not inside another ZIP).
2. Open `College-Grievance-System/Backend`.
3. Copy `.env.example` to `.env` and set:
   - `MONGO_URI=mongodb://127.0.0.1:27017/college_grievance`
   - `PORT=5000`
   - `JWT_SECRET=` a long private random value
4. Ensure MongoDB is running.
5. In PowerShell opened inside `Backend`, run:
   ```powershell
   npm.cmd install
   npm.cmd start
   ```
6. Open `http://localhost:5000`.
7. Register a student from the Register page.
8. In a second PowerShell terminal opened inside `Backend`, create an admin and faculty account. Replace sample emails/passwords with your own:
   ```powershell
   node scripts/create-user.js admin "College Admin" admin@example.com "ChangeThisAdmin123!" "Administration"
   node scripts/create-user.js faculty "IT Faculty" itfaculty@example.com "ChangeThisFaculty123!" "IT Department"
   ```
9. Login from `login.html` and choose the matching role. The faculty department must match the grievance's assigned department.

## Demo workflow
1. Student logs in and submits a grievance.
2. Admin logs in, opens All Grievances, selects the responsible department and optionally a faculty member, then clicks Save assignment.
3. Faculty logs in and clicks Update. Choose `Under Review` while investigating. To choose `Resolved`, enter a useful action summary.
4. Student logs back in and opens My Grievances. Refresh the page and select the ticket to see status, action summary and history.
5. Confirm the same record under MongoDB Compass > `college_grievance` > `grievances`.

If the server is already running, do not start a second copy on port 5000. Stop the running server with Ctrl+C before restarting it.
