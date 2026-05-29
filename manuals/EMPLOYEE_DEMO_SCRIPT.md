# 💼 Employee Side Presentation Script: DSU International Affairs ERP

This presentation script is designed to walk stakeholders, management, or trainees through a step-by-step demonstration of the **Employee & Intern Experience** on the DSU International Affairs ERP. 

It highlights the secure, collaborative data entry workflow, demonstrating how non-admin actions are staged and verified before going live.

---

## 🎯 Demo Goal
Show how an Employee (or Intern) can securely input, modify, and delete ERP data while preserving the integrity of the live dashboard through the **Staging & Approval Workflow**.

---

## 🎭 The Narrative Persona
* **Presenter Role:** Test Employee / Intern (Non-Admin contributor)
* **Theme:** "Enforcing Data Standards through Collaborative Operations"

---

## 🎬 Act 1: Registering & Logging In as an Employee

### 💻 UI Action
1. Navigate to the Login screen.
2. Click **Register** at the bottom.
3. Fill out the registration form with:
   - **Name:** `Jane Doe`
   - **Email:** `jane.doe@dsu.edu.in`
   - **Password:** `password123`
   - **Role:** Select `Employee` or `Intern`.
4. Click **Create Account**.

### 🗣️ What to Say
> *"Welcome to the DSU International Affairs ERP! Today we are showcasing the Employee side, which focuses on streamlined, decentralized data input under strict security safeguards. We will begin by registering Jane Doe as a new Employee. Once Jane registers, she cannot immediately access the system—her account enters a 'Pending Admin Approval' state to prevent unauthorized access. Once our Administrator approves Jane's account, she can sign in securely."*

### 🧱 Behind the Scenes
* The server hashes the password and registers Jane in the `User` collection with `role: 'employee'`, `approved: false`, and `approvalStatus: 'pending'`.
* This prevents any login attempts until an Admin explicitly grants access.

---

## 🎬 Act 2: Browsing & Contributing Data

### 💻 UI Action
1. Log in as an approved Employee.
2. Navigate to the **Partners** module on the sidebar.
3. Show the table of active partners and use the search bar to find `Stanford`.
4. Click the **+ Add Partner** button at the top-right.
5. Fill out the Partner Form:
   - **University:** `Oxford University`
   - **Country:** `United Kingdom`
   - **MoU Status:** `Signed`
   - **Agreement Type:** `Student & Faculty Exchange`
6. Click **Submit**.

### 🗣️ What to Say
> *"Jane has now logged in successfully. She is greeted with the Partner Insights dashboard. Here she can see, search, and filter the global list of university partners. Suppose Jane wants to add a new MoU with Oxford University. She simply clicks 'Add Partner' and fills in the structured form. When she clicks 'Submit', the new partner record is created, but because she is an Employee, it remains in the active database list."*

---

## 🎬 Act 3: Editing a Record (Triggering Staging)

### 💻 UI Action
1. Select an existing active partner in the list.
2. Click the **Edit** (yellow pencil) icon.
3. In the Edit form, modify the University name or add contact person details:
   - Change Contact Person to: `Dr. Sarah Jenkins`
4. Click **Save Changes**.
5. The system will display a success toast: `"Edit request submitted for approval"`.
6. Navigate to **My Requests** in the sidebar to show the request is in the **🟡 Pending** state.
7. Show that if Jane returns to the main **Partners** list, the contact person **has not changed** yet—the live list still shows the old value!

### 🗣️ What to Say
> *"Now let's demonstrate the power of our data safety workflow. Suppose Jane notices an error in one of our active partner records and wants to update the contact person. She clicks the Edit icon, changes the contact person, and clicks save. Notice the success message: 'Edit request submitted for approval'. Instead of directly modifying the active database record and bypassing validation, her edit is automatically staged in a 'pending_edit' state. If we look at the main Partners list, the contact person has not changed yet. This guarantees that only validated and approved edits are ever displayed on our official global records."*

### 🧱 Behind the Scenes
* The server detects that `req.user.role !== 'admin'`.
* It updates the document's `status` to `'pending_edit'` and saves the updated form fields inside the `pendingChanges` mixed field in the database.
* The original live fields remain exactly as they were, maintaining absolute dashboard integrity.

---

## 🎬 Act 4: Deleting a Record (Preventing Accidental Loss)

### 💻 UI Action
1. Find another active partner or event in the list.
2. Click the **Delete** (red trash can) icon.
3. A confirmation modal will appear. The system **requires Jane to enter a deletion reason**.
4. Type: `MOU expired and not renewed`.
5. Click **Confirm Delete**.
6. The system will display a success toast: `"Delete request submitted for approval"`.
7. Navigate to **My Requests** and show the new pending delete request.
8. Point out that the record **is still visible** in the main list, but now displays a visual indicator or cannot be edited again while a deletion is pending.

### 🗣️ What to Say
> *"Accidental data deletions are a major risk in complex systems. If Jane attempts to delete a partnership, the ERP prompts her to enter a formal reason. Once she confirms, the record is not instantly removed from the database. Instead, the request is staged in a 'pending_delete' state with her explanation preserved. The record remains intact until an Administrator reviews her reason and formally deletes it. This gives our department a robust audit log and an immediate safety net against critical data loss."*

### 🧱 Behind the Scenes
* The server sets `status = 'pending_delete'` and `deletionReason = 'MOU expired and not renewed'`.
* The document is preserved in the database until an Admin approves the delete request, which finally executes `findByIdAndDelete`.

---

## 🎬 Act 5: Tracking Status & Rejections on "My Requests"

### 💻 UI Action
1. Click **My Requests** in the sidebar.
2. Show the list of Jane's previous submissions:
   - One **🟢 Approved** (with the Admin's name who approved it).
   - One **🔴 Rejected** (with a clear rejection reason, e.g., *"Incorrect MoU signed copy, please upload page 4."*).
3. Click **Edit** on the rejected item to show the form auto-populated with the previous values.
4. Correct the fields and click **Resubmit**.

### 🗣️ What to Say
> *"Jane has full transparency over her submissions. In the 'My Requests' tab, she can track her entire history. She can see which items were approved, and crucially, which were rejected. If an Admin rejects a request, they must provide a reason. Jane can review this feedback, click Edit to open her original form with all her previous entries, correct the mistake, and resubmit it with a single click. This completes a highly collaborative, secure, and bulletproof data entry cycle."*

---

## 🏆 Presentation Key Takeaways
1. **Zero Data Corruption Risk:** No non-admin user can corrupt or delete live international affairs records directly.
2. **Complete Auditing:** Every contribution, edit, or deletion is attributed to an employee and logged.
3. **Admin Control:** Administrators maintain absolute authority over the official database through a smooth staging panel.
