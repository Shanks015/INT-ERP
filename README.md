# International Affairs ERP System

A comprehensive Enterprise Resource Planning system for managing international affairs activities at Dayananda Sagar University.

## 🚀 Features

- **12 Data Modules**: Partners, Campus Visits, Events, Conferences, MoU Signing, Scholars, MoU Updates, Immersion Programs, Student Exchange, Masters Abroad, Memberships, Digital Media
- **User Management**: Role-based access (Admin, Employee, Intern) with registration approval workflow
- **Approval Workflow**: Admin approval for all data modifications
- **Advanced Reporting**: PDF & DOCX report generation with filters
- **Import/Export**: Excel bulk import and CSV export for all modules
- **Theme Switcher**: 32 DaisyUI themes
- **Responsive Design**: Mobile-friendly interface

## 📋 Tech Stack

**Frontend:**
- React 18 + Vite
- TailwindCSS + DaisyUI
- React Router
- Axios
- Lucide Icons

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- PDFKit & DOCX for reports
- XLSX for Excel import

## 🛠️ Installation

### Prerequisites
- Node.js 18+
- MongoDB

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/Shanks015/INT-ERP.git
cd INT-ERP
```

2. **Install dependencies**
```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

3. **Configure environment variables**

Create `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/int-erp
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

4. **Create admin user**
```bash
cd server
npm run create-admin
```

5. **Run the application**
```bash
# Backend (from server directory)
npm run dev

# Frontend (from client directory, new terminal)
npm run dev
```

6. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

## 🔐 Default Credentials

- **Email**: admin@dsu.edu
- **Password**: admin123

## 📦 Deployment

### Recommended: Render.com (Free Tier)

**Backend:**
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set root directory to `server`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables

**Frontend:**
1. Create a new Static Site on Render
2. Connect your GitHub repository
3. Set root directory to `client`
4. Build command: `npm run build`
5. Publish directory: `dist`

**MongoDB:**
- Use MongoDB Atlas (free tier)
- Update MONGODB_URI in environment variables

### Alternative: Railway.app

Similar setup to Render, also offers free tier with good MongoDB support.

## 📝 User Registration Approval

All new user registrations require admin approval:
1. Users register → Account created as "Pending"
2. Admin reviews in "User Management" page
3. Admin approves/rejects with reason
4. Approved users can login

## 🎨 Features Overview

- **Dashboard**: Analytics and statistics
- **CRUD Operations**: Full create, read, update, delete for all modules
- **Approval System**: Non-admin changes require approval
- **Reports**: Generate comprehensive PDF/DOCX reports
- **Data Import**: Bulk import from Excel files
- **Data Export**: Export to CSV
- **User Management**: Admin approval for new registrations
- **Theme Customization**: 32 beautiful themes

## 📄 License

MIT License

## 👥 Contributors

Developed for Dayananda Sagar University
