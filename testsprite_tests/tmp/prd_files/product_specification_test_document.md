# International Affairs ERP - Product Specification & Test Documentation

## Executive Summary

The **International Affairs ERP** is a comprehensive enterprise resource planning system designed specifically for Dayananda Sagar University's International Affairs department. It manages all international partnerships, collaborations, events, exchanges, and administrative workflows in a centralized, role-based platform.

**Version:** 1.0  
**Target Users:** Administrators, Faculty Members, Staff  
**Platform:** Web Application (React + Node.js + MongoDB)  
**URL:** http://localhost:5173 (Development)

---

## 1. Product Purpose & Vision

### Primary Objectives
1. **Centralize Data Management** - Single source of truth for all international affairs activities
2. **Streamline Workflows** - Automate approval processes and reduce manual work
3. **Enable Reporting** - Generate comprehensive reports with advanced filtering
4. **Track Partnerships** - Maintain detailed records of MoUs, collaborations, and exchanges
5. **Data Import/Export** - Seamless integration with Excel and Google Forms

### Key Stakeholders
- **Administrators** - Full system access, user management, approval authority
- **Faculty/Staff** - Create and edit records, view reports, make requests
- **International Affairs Office** - Primary users managing day-to-day operations

---

## 2. System Architecture

### Technology Stack
**Frontend:**
- React 18 with React Router
- DaisyUI + Tailwind CSS for styling
- Lucide React for icons
- React Hot Toast for notifications
- Recharts for data visualization

**Backend:**
- Node.js + Express.js
- MongoDB with Mongoose
- JWT authentication
- Compression middleware
- Role-based access control

**Features:**
- Lazy loading and code splitting
- Gzip compression
- HTTP caching (5-minute cache for GET requests)
- PDF/DOCX report generation

---

## 3. Core Features

### 3.1 Authentication & Authorization

**Login System:**
- Email and password authentication
- JWT token-based sessions
- Automatic token refresh
- Secure password hashing
- "Remember Me" functionality

**User Roles:**
- `admin` - Full access to all features
- `user` - Limited to CRUD operations, cannot delete without approval

**Protected Routes:**
- All routes require authentication
- Admin-only routes: User Management, Pending Actions
- Conditional UI elements based on role

**Test Scenarios:**
```
✓ User can log in with valid credentials
✓ Invalid credentials show error message
✓ JWT token persists in localStorage
✓ Logout clears token and redirects to login
✓ Protected routes redirect to login when not authenticated
✓ Admin-only pages block non-admin users
```

---

### 3.2 Dashboard

**Purpose:** Provide at-a-glance overview of international affairs activities

**Features:**
- **Stats Cards:**
  - Total Partners count
  - Total Events count
  - Total Conferences count
  - Total Scholars count

- **Charts:**
  - Event Types distribution (Pie Chart)
  - Scholars by Country (Bar Chart)
  - Campus Visits by Month (Line Chart)

- **Data Source:**
  - Single aggregated API endpoint: `/api/reports/dashboard-stats`
  - Optimized for performance with Promise.all

**Expected Behavior:**
- Dashboard loads within 3 seconds
- Charts render with proper theme colors
- Real-time data updates on page load
- Loading spinner while fetching data
- Error toast if data fetch fails

**Test Scenarios:**
```
✓ Dashboard displays correct count for each metric
✓ Charts render without errors
✓ Responsive layout on mobile/tablet/desktop
✓ Data refreshes when navigating away and back
✓ Loading state shows spinner
✓ Error state shows toast notification
```

---

### 3.3 Data Modules (13 Total)

All modules follow a consistent pattern with slight variations based on data type.

#### Module List:
1. **Partners** - University/organization partnerships
2. **Campus Visits** - Visits from international delegations
3. **Events** - International events hosted/attended
4. **Conferences** - Conference participations
5. **MoU Signing Ceremonies** - MoU signing events
6. **Scholars in Residence** - Visiting scholars program
7. **MoU Updates** - MoU renewal and status updates
8. **Immersion Programs** - Student immersion programs
9. **Student Exchange** - Student exchange programs
10. **Masters Abroad** - Students pursuing masters abroad
11. **Memberships** - International organization memberships
12. **Digital Media** - Media coverage tracking
13. **Outreach** - International outreach inquiries

#### Standard Module Features:

**LIST VIEW:**
- Paginated table display (20 items per page)
- Search functionality (searches across all fields)
- Status filter dropdown (All/Active/Pending Edit/Pending Delete)
- Action buttons:
  - 👁️ **View Details** (Eye icon) - Opens DetailModal
  - ✏️ **Edit** - Navigate to edit form
  - 🗑️ **Delete** - Opens DeleteConfirmModal (requires reason if not admin)
- **Add New** button (top-right)
- **Import CSV** button (bulk data import)
- **Export CSV** button (download filtered data)
- **Drive Link** column where applicable (opens in new tab)

**CREATE/EDIT FORM:**
- All required fields marked with asterisk (*)
- Date pickers for date fields
- Dropdowns for predefined options (e.g., Status, Campus, Direction)
- Text areas for long-form content (summary, description)
- Drive Link field for Google Drive attachments
- **Submit** button (creates/updates record)
- **Cancel** button (returns to list view)
- Form validation (required fields, date formats)
- Success toast on save
- Error toast on validation failure

**DETAIL MODAL:**
- Triggered by Eye icon click
- Displays ALL fields in a modal overlay
- Fields organized in a clean, readable format
- Dates formatted as readable strings
- Links are clickable
- **Close** button or click outside to dismiss

**DELETE CONFIRMATION:**
- Modal asking "Are you sure?"
- Non-admins must provide deletion reason
- **Confirm** button (performs delete)
- **Cancel** button (dismisses modal)
- Success toast on delete
- Refreshes list after deletion

---

### 3.4 Module-Specific Fields

#### Partners
```javascript
{
  partnerName: String (required),
  country: String (required),
  university: String,
  category: String (enum: Academic, Industry, Government, NGO),
  contactPerson: String,
  contactEmail: String,
  status: String (enum: active, pending_edit, pending_delete),
  driveLink: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Campus Visits
```javascript
{
  date: Date (required),
  visitorName: String (required),
  designation: String,
  universityName: String (required),
  country: String,
  campus: String (enum: Bangalore, Harihara, Kudremukh),
  purpose: String,
  summary: String,
  driveLink: String,
  status: String
}
```

#### Events
```javascript
{
  date: Date (required),
  name: String (required),
  type: String (enum: Conference, Workshop, Seminar, Cultural, Sports),
  universityCountry: String,
  campus: String (enum: Bangalore, Harihara, Kudremukh),
  description: String,
  driveLink: String,
  status: String
}
```

#### Scholars in Residence
```javascript
{
  name: String (required),
  country: String (required),
  university: String,
  department: String,
  category: String (enum: Professor, Researcher, Student, Industry Expert),
  fromDate: Date,
  toDate: Date,
  campus: String,
  summary: String,
  driveLink: String,
  status: String
}
```

#### MoU Updates
```javascript
{
  partnerName: String (required),
  country: String,
  department: String,
  agreementType: String (enum: MoU, MoA, Collaboration Agreement),
  signedDate: Date,
  completedDate: Date,
  expiryDate: Date,
  term: Number (years),
  status: String,
  driveLink: String
}
```

#### Immersion Programs
```javascript
{
  programName: String (required),
  direction: String (enum: Incoming, Outgoing, required),
  country: String,
  arrivalDate: Date,
  departureDate: Date,
  numberOfStudents: Number,
  feesPerPax: Number,
  summary: String,
  driveLink: String,
  status: String
}
```

#### Digital Media
```javascript
{
  title: String (required),
  channel: String (enum: Newspaper, TV, Online, Radio, Magazine),
  publicationName: String,
  date: Date,
  summary: String,
  articleLink: String,
  driveLink: String,
  status: String
}
```

#### Outreach
```javascript
{
  email: String (required),
  name: String,
  organizationName: String,
  country: String,
  message: String,
  reply: String,
  partnershipType: String,
  status: String,
  createdAt: Date
}
```

---

### 3.5 Reports Module

**Purpose:** Generate comprehensive PDF/DOCX reports with advanced filtering

**Features:**

**Module Selection:**
- Dropdown with 13 modules + "All Modules" option
- Selecting a module shows module-specific filters dynamically

**Date Range Filters:**
- Manual date pickers (From Date, To Date)
- Quick preset buttons:
  - **This Month** - Sets dates to start of current month → today
  - **Last 3 Months** - Sets dates to 3 months ago → today
  - **This Year** - Sets dates to January 1st → today
  - **All Time** - Sets dates from 2000 → today

**Generic Filters:**
- **Status** - All/Active/Pending Edit/Pending Delete

**Module-Specific Filters (Dynamic):**

| Module | Additional Filters |
|--------|-------------------|
| Partners | Country, Category |
| Campus Visits | Campus, Country |
| Events | Event Type, Campus |
| Conferences | Country, Campus |
| Scholars | Country, Department, Category |
| MoU Updates | Country, Department, Agreement Type |
| Immersion Programs | Direction, Country |
| Student Exchange | Direction, Country |
| Memberships | Country, Membership Status |
| Digital Media | Channel |
| Outreach | Country, Partnership Type |

**Export Format:**
- PDF (Adobe Reader compatible)
- DOCX (Microsoft Word compatible)

**Filter Summary Sidebar:**
- Real-time display of selected filters
- Shows: Module, Date Range, Status, Format, and all active module-specific filters
- Tips card with usage hints

**Expected Behavior:**
- Selecting a module reveals relevant filters
- Quick date buttons populate dates automatically
- Filter summary updates in real-time
- Download button generates report with correct filters
- File downloads with format: `report-{module}-{date}.{format}`
- Success toast on successful download
- Error toast if generation fails

**Test Scenarios:**
```
✓ Module dropdown shows all 13 modules + All option
✓ Selecting "Partners" shows Country and Category filters
✓ Selecting "Events" shows Event Type and Campus filters
✓ "This Month" button populates correct dates
✓ Filter summary updates when filters change
✓ PDF download works with all filters applied
✓ DOCX download works with all filters applied
✓ Report contains correctly filtered data
✓ "Clear Filters" button resets all fields
```

---

### 3.6 User Management (Admin Only)

**Purpose:** Manage system users and their roles

**Features:**
- List all users with email, name, role
- Create new users
- Edit existing users (change name, email, role)
- Delete users
- Toggle user roles (admin/user)

**Form Fields:**
```javascript
{
  name: String (required),
  email: String (required, unique),
  password: String (required for new users),
  role: String (enum: admin, user)
}
```

**Access Control:**
- Only admins can access /user-management
- Non-admins redirected to dashboard

**Test Scenarios:**
```
✓ Admin can view user management page
✓ Non-admin cannot access user management
✓ Admin can create new user
✓ Email validation works (unique, valid format)
✓ Password strength requirements enforced
✓ Admin can edit user details
✓ Admin can change user role
✓ Admin can delete user
✓ Cannot delete self
```

---

### 3.7 Approval Workflow System

**Purpose:** Enable non-admins to request edits and deletions

**Pending Actions (Admin Only):**
- View all pending edit/delete requests
- Approve or reject requests
- See requester name and reason
- Approve button applies changes
- Reject button discards request

**My Requests (All Users):**
- View own pending requests
- See request status (pending/approved/rejected)
- Cannot modify pending requests

**Workflow:**
1. Non-admin user creates/edits record → Status: `active`
2. Non-admin user clicks delete → Status changes to `pending_delete`, reason required
3. Admin reviews in Pending Actions
4. Admin approves → Record deleted
5. Admin rejects → Status reverts to `active`

**Test Scenarios:**
```
✓ Non-admin delete request creates pending_delete status
✓ Pending Actions shows all pending_delete items
✓ Admin can approve delete (record removed)
✓ Admin can reject delete (status reverts)
✓ My Requests shows user's own pending items
✓ Admins can delete directly without approval
```

---

### 3.8 Data Import/Export

**CSV Import:**
- Import button on each module list page
- Modal with file upload
- Accepts `.csv` files
- Validates data format
- Shows preview before import
- Success message with count of imported records
- Error message for invalid data

**CSV Export:**
- Export button on each module list page
- Downloads current filtered data as CSV
- Filename format: `{module}-export-{date}.csv`
- Includes all visible columns

**Excel Import (Bulk):**
- Server-side script: `server/scripts/importData.js`
- Imports from: `Internationalisation (Responses) (1).xlsx`
- Maps Excel columns to database fields
- Handles date conversions
- Creates records in bulk

**Google Forms Integration:**
- Webhook endpoint: `/api/google-forms/webhook`
- Receives POST requests from Google Apps Script
- Auto-creates records from form submissions
- Validates required fields

**Test Scenarios:**
```
✓ CSV import accepts valid file
✓ CSV import rejects invalid format
✓ CSV import shows preview
✓ Imported data appears in list
✓ CSV export downloads correct data
✓ Excel bulk import processes all rows
✓ Google Forms webhook creates records
```

---

## 4. UI/UX Specifications

### Design System

**Color Palette:**
- Primary: Blue (#0066CC)
- Secondary: Purple
- Success: Green
- Error: Red
- Warning: Yellow
- Base: Grayscale

**Typography:**
- Headers: Bold, 2xl-3xl
- Body: Regular, base
- Labels: Semibold, sm

**Components:**
- **Buttons:** Rounded, with icons, loading states
- **Cards:** Shadow-xl, rounded-lg, padding
- **Modals:** Centered overlay, backdrop blur
- **Forms:** Input-bordered, label above field
- **Tables:** Striped rows, hover effects
- **Pagination:** Centered buttons with page info

**Responsive Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

**Accessibility:**
- All buttons have titles
- Forms have proper labels
- ARIA attributes where applicable
- Keyboard navigation support

---

## 5. Performance Specifications

### Target Metrics

**Page Load Times:**
- First Contentful Paint: < 1.8s
- Time to Interactive: < 3.8s
- Dashboard load: < 3s
- List page load: < 2s

**Optimization Techniques:**
- ✅ Lazy loading for all routes (60-70% bundle reduction)
- ✅ Gzip compression (70-80% transfer size reduction)
- ✅ HTTP caching (5-minute cache for GET requests)
- ✅ Code splitting via React.lazy
- ✅ Aggregated dashboard API (single request vs. multiple)

**Expected Request Counts:**
- Initial load: 10-15 requests (down from 60-70)
- Dashboard: 1-2 requests (aggregated)
- Module list: 1-2 requests (data + stats)

---

## 6. Test Scenarios by Module

### End-to-End User Workflows

**Workflow 1: Admin Creates Partner**
```
1. Login as admin (admin@dsu.edu.in / admin123)
2. Navigate to Partners module
3. Click "Add Partner" button
4. Fill required fields:
   - Partner Name: "University of Example"
   - Country: "United States"
   - University: "Example University"
   - Category: "Academic"
5. Add Drive Link (optional)
6. Click "Submit"
7. Verify success toast appears
8. Verify redirect to partners list
9. Verify new partner appears in list
10. Click Eye icon to view details
11. Verify all fields displayed correctly
```

**Workflow 2: Non-Admin Deletes Record**
```
1. Login as non-admin user
2. Navigate to any module (e.g., Events)
3. Click delete button on a record
4. Verify delete confirmation modal appears
5. Verify "Reason" field is required
6. Enter reason: "Duplicate entry"
7. Click "Confirm"
8. Verify success toast
9. Verify record status changed to "pending_delete"
10. Navigate to "My Requests"
11. Verify delete request appears there
12. Logout and login as admin
13. Navigate to "Pending Actions"
14. Verify delete request appears
15. Click "Approve"
16. Verify record is deleted
```

**Workflow 3: Generate Filtered Report**
```
1. Navigate to Reports page
2. Select module: "Partners"
3. Verify Country and Category filters appear
4. Select Country: "United States"
5. Click "This Month" quick date button
6. Verify dates populate automatically
7. Verify Filter Summary shows: Partners, This Month dates, Country: United States
8. Select Format: PDF
9. Click "Download Report"
10. Verify loading state during generation
11. Verify PDF downloads successfully
12. Open PDF and verify:
    - Contains only US partners
    - Contains only records from this month
    - Formatted correctly
```

**Workflow 4: Import Data from CSV**
```
1. Navigate to Campus Visits
2. Click "Import CSV" button
3. Upload valid CSV file with 10 records
4. Verify preview modal shows data
5. Click "Import"
6. Verify success toast with count (10 records imported)
7. Refresh list page
8. Verify all 10 records appear
```

---

## 7. API Endpoints Reference

### Authentication
```
POST /api/auth/login - User login
POST /api/auth/register - User registration
GET /api/auth/me - Get current user
POST /api/auth/logout - User logout
```

### Modules (Pattern applies to all 13 modules)
```
GET /api/{module} - List all records (with pagination & filters)
GET /api/{module}/stats - Get count statistics
GET /api/{module}/:id - Get single record
POST /api/{module} - Create new record
PUT /api/{module}/:id - Update existing record
DELETE /api/{module}/:id - Delete record
POST /api/{module}/export - Export to CSV
POST /api/{module}/import - Import from CSV
```

### Reports
```
GET /api/reports/dashboard-stats - Get dashboard statistics
POST /api/reports/generate - Generate PDF/DOCX report with filters
```

### Admin
```
GET /api/users - List all users (admin only)
POST /api/users - Create user (admin only)
PUT /api/users/:id - Update user (admin only)
DELETE /api/users/:id - Delete user (admin only)
GET /api/pending-actions - List pending edits/deletes (admin only)
POST /api/pending-actions/approve/:id - Approve request (admin only)
POST /api/pending-actions/reject/:id - Reject request (admin only)
```

---

## 8. Test Data

### Sample Admin Credentials
```
Email: admin@dsu.edu.in
Password: admin123
Role: admin
```

### Sample User Credentials
```
Email: user@dsu.edu.in
Password: user123
Role: user
```

### Sample Test Records

**Partner:**
```json
{
  "partnerName": "Stanford University",
  "country": "United States",
  "university": "Stanford University",
  "category": "Academic",
  "contactPerson": "Dr. John Smith",
  "contactEmail": "john.smith@stanford.edu",
  "driveLink": "https://drive.google.com/example"
}
```

**Event:**
```json
{
  "date": "2024-01-15",
  "name": "International Student Welcome Day",
  "type": "Cultural",
  "universityCountry": "India",
  "campus": "Bangalore",
  "description": "Welcome event for international students"
}
```

---

## 9. Known Issues & Limitations

1. **Masters Abroad Module** - Currently has no data populated
2. **Multi-Select Modules** - Reports currently support "All" or "One", not multi-select
3. **Real-Time Updates** - Lists don't auto-refresh, require manual reload
4. **File Size Limits** - Import CSV limited to reasonable file sizes
5. **Browser Support** - Optimized for modern browsers (Chrome, Firefox, Edge, Safari)

---

## 10. Success Criteria

The system is working correctly if:

✅ **Authentication works correctly** - Login, logout, role-based access  
✅ **All 13 modules display data** - List, create, edit, delete, view details  
✅ **DetailModal shows all fields** - Eye icon opens modal with complete record data  
✅ **Reports generate correctly** - PDF/DOCX with correct filters applied  
✅ **Dynamic filters appear** - Module-specific filters show when module selected  
✅ **Quick dates work** - Buttons populate date fields correctly  
✅ **Import/Export functions** - CSV import and export work properly  
✅ **Approval workflow functions** - Pending actions show, admin can approve/reject  
✅ **Performance targets met** - Page loads under 3 seconds, requests reduced to 10-15  
✅ **Mobile responsive** - Works on mobile, tablet, and desktop  
✅ **No console errors** - Clean console during normal operation  

---

## 11. Testing Checklist

### Smoke Testing
- [ ] Application loads without errors
- [ ] Login page displays correctly
- [ ] Can login with valid credentials
- [ ] Dashboard loads and displays data
- [ ] Navigation works (all menu items clickable)
- [ ] Can logout successfully

### Functional Testing
- [ ] All 13 modules accessible
- [ ] CRUD operations work for each module
- [ ] Search filters work
- [ ] Pagination works
- [ ] DetailModal displays all fields
- [ ] Reports page loads
- [ ] Module-specific filters appear dynamically
- [ ] Report downloads successfully
- [ ] User management works (admin only)
- [ ] Approval workflow functions

### Performance Testing
- [ ] Initial load < 3 seconds
- [ ] HTTP requests reduced to 10-15 per page
- [ ] No memory leaks during navigation
- [ ] Compression enabled (check Network tab)
- [ ] Caching headers present

### Security Testing
- [ ] Cannot access admin pages as non-admin
- [ ] JWT tokens expire appropriately
- [ ] Password is hashed (not stored in plain text)
- [ ] Protected routes redirect to login
- [ ] CORS configured correctly

### UI/UX Testing
- [ ] Responsive on mobile (< 768px)
- [ ] Responsive on tablet (768px - 1024px)
- [ ] Responsive on desktop (> 1024px)
- [ ] All buttons have hover states
- [ ] Loading states show during async operations
- [ ] Error messages are clear and helpful
- [ ] Success messages appear after actions

---

## 12. Deployment Checklist

Before deploying to production:

- [ ] Build production bundle: `npm run build`
- [ ] Test production build: `npm run preview`
- [ ] Run Lighthouse audit (target: 90+ score)
- [ ] Configure environment variables
- [ ] Set up MongoDB connection string
- [ ] Configure JWT secret
- [ ] Enable HTTPS
- [ ] Set up domain and DNS
- [ ] Configure CORS for production domain
- [ ] Test all features in production environment
- [ ] Set up monitoring and logging
- [ ] Create database backups

---

## Appendix A: Environment Variables

```bash
# Server (.env)
PORT=5000
MONGODB_URI=mongodb://localhost:27017/erp-db
JWT_SECRET=your-secret-key
NODE_ENV=production
CLIENT_URL=https://your-domain.com

# Client (.env)
VITE_API_URL=https://api.your-domain.com
```

---

## Appendix B: Folder Structure

```
new-hope-erp/
├── client/                 # React frontend
│   ├── src/
│   │   ├── api/           # API service
│   │   ├── components/    # Reusable components
│   │   ├── context/       # React context (Auth)
│   │   ├── layouts/       # Layout components
│   │   ├── pages/         # Page components (13 modules + auth + admin)
│   │   ├── App.jsx        # Main app with routing
│   │   └── main.jsx       # Entry point
│   └── package.json
│
├── server/                # Node.js backend
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── models/        # Mongoose schemas
│   │   ├── routes/        # Express routes
│   │   ├── middleware/    # Auth middleware
│   │   └── server.js      # Express server
│   ├── scripts/           # Utility scripts (import data)
│   └── package.json
│
└── package.json           # Root package.json (runs both)
```

---

## Conclusion

This document provides a complete specification of the International Affairs ERP system suitable for:
- **Testing** - Comprehensive test scenarios for all features
- **Development** - Clear feature specifications and expected behaviors
- **Documentation** - Reference for all modules, APIs, and workflows
- **Onboarding** - New team members can understand the entire system

For questions or clarifications, refer to the implementation code or consult the development team.

---

**Document Version:** 1.0  
**Last Updated:** January 3, 2026  
**Author:** Development Team  
**Status:** Ready for Testing
