import { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeSwitcher from '../components/ThemeSwitcher';
import {
    LayoutDashboard,
    Users,
    Building2,
    Calendar,
    FileText,
    Plane,
    GraduationCap,
    FileEdit,
    Globe,
    UserCheck,
    BookOpen,
    Users2,
    Image,
    Bell,
    LogOut,
    Menu,
    X,
    Database
} from 'lucide-react';

const MainLayout = () => {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [pendingCount, setPendingCount] = useState(0);
    const [drawerOpen, setDrawerOpen] = useState(false);

    useEffect(() => {
        // Fetch pending count for admin
        if (isAdmin) {
            fetchPendingCount();

            // Listen for pending count updates
            const handlePendingUpdate = () => fetchPendingCount();
            window.addEventListener('pendingCountUpdated', handlePendingUpdate);

            return () => {
                window.removeEventListener('pendingCountUpdated', handlePendingUpdate);
            };
        }
    }, [isAdmin]);

    const fetchPendingCount = async () => {
        // This will be implemented to fetch total pending across all modules
        // For now, setting to 0
        setPendingCount(0);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const sidebarContent = (
        <>
            <li>
                <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>
                    <LayoutDashboard size={18} /> Dashboard
                </Link>
            </li>

            <li><Link to="/partners" className={location.pathname.includes('/partners') ? 'active' : ''}><Users size={18} /> Partners</Link></li>
            <li><Link to="/campus-visits" className={location.pathname.includes('/campus-visits') ? 'active' : ''}><Building2 size={18} /> Campus Visits</Link></li>
            <li><Link to="/events" className={location.pathname.includes('/events') ? 'active' : ''}><Calendar size={18} /> Events</Link></li>
            <li><Link to="/conferences" className={location.pathname.includes('/conferences') ? 'active' : ''}><Globe size={18} /> Conferences</Link></li>
            <li><Link to="/mou-signing-ceremonies" className={location.pathname.includes('/mou-signing-ceremonies') ? 'active' : ''}><FileText size={18} /> MoU Signing</Link></li>
            <li><Link to="/scholars-in-residence" className={location.pathname.includes('/scholars-in-residence') ? 'active' : ''}><GraduationCap size={18} /> Scholars</Link></li>
            <li><Link to="/mou-updates" className={location.pathname.includes('/mou-updates') ? 'active' : ''}><FileEdit size={18} /> MoU Updates</Link></li>
            <li><Link to="/immersion-programs" className={location.pathname.includes('/immersion-programs') ? 'active' : ''}><Plane size={18} /> Immersion Programs</Link></li>
            <li><Link to="/student-exchange" className={location.pathname.includes('/student-exchange') ? 'active' : ''}><UserCheck size={18} /> Student Exchange</Link></li>
            <li><Link to="/masters-abroad" className={location.pathname.includes('/masters-abroad') ? 'active' : ''}><BookOpen size={18} /> Masters Abroad</Link></li>
            <li><Link to="/memberships" className={location.pathname.includes('/memberships') ? 'active' : ''}><Users2 size={18} /> Memberships</Link></li>
            <li><Link to="/digital-media" className={location.pathname.includes('/digital-media') ? 'active' : ''}><Image size={18} /> Digital Media</Link></li>

            <li>
                <Link to="/reports" className={location.pathname === '/reports' ? 'active' : ''}>
                    <FileText size={18} /> Reports
                </Link>
            </li>

            {isAdmin && (
                <>
                    <div className="divider my-2"></div>
                    <li>
                        <Link to="/user-management" className={location.pathname === '/user-management' ? 'active' : ''}>
                            <Users size={18} /> User Management
                        </Link>
                    </li>
                    <li>
                        <Link to="/pending-actions" className={location.pathname === '/pending-actions' ? 'active' : ''}>
                            <Bell size={18} /> Pending Actions
                            {pendingCount > 0 && <span className="badge badge-error badge-sm">{pendingCount}</span>}
                        </Link>
                    </li>
                </>
            )}

            {!isAdmin && (
                <>
                    <div className="divider my-2"></div>
                    <li>
                        <Link to="/my-requests" className={location.pathname === '/my-requests' ? 'active' : ''}>
                            <FileEdit size={18} /> My Requests
                        </Link>
                    </li>
                </>
            )}
        </>
    );

    return (
        <div className="drawer lg:drawer-open">
            <input
                id="main-drawer"
                type="checkbox"
                className="drawer-toggle"
                checked={drawerOpen}
                onChange={(e) => setDrawerOpen(e.target.checked)}
            />

            <div className="drawer-content flex flex-col">
                {/* Navbar */}
                <div className="navbar bg-base-100 shadow-md px-4">
                    <div className="flex-none lg:hidden">
                        <label
                            htmlFor="main-drawer"
                            className="btn btn-square btn-ghost"
                            onClick={() => setDrawerOpen(true)}
                        >
                            <Menu size={24} />
                        </label>
                    </div>

                    <div className="flex-1">
                        <h1 className="text-xl font-bold">International Affairs ERP</h1>
                    </div>

                    <div className="flex-none gap-2">
                        {isAdmin && (
                            <Link to="/pending-actions" className="btn btn-ghost btn-circle">
                                <div className="indicator">
                                    <Bell size={20} />
                                    {pendingCount > 0 && (
                                        <span className="badge badge-sm badge-error indicator-item">
                                            {pendingCount}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        )}

                        <ThemeSwitcher />

                        <div className="dropdown dropdown-end">
                            <div
                                tabIndex={0}
                                role="button"
                                className="btn btn-ghost btn-circle avatar placeholder"
                            >
                                <div className="bg-neutral text-neutral-content rounded-full w-10">
                                    <span className="text-lg">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <ul
                                tabIndex={0}
                                className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52"
                            >
                                <li className="menu-title">
                                    <span>{user?.name}</span>
                                    <span className="text-xs">{user?.email}</span>
                                </li>
                                <li>
                                    <span className="badge badge-primary badge-sm">
                                        {user?.role}
                                    </span>
                                </li>
                                <li>
                                    <button onClick={handleLogout}>
                                        <LogOut size={16} />
                                        Logout
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Page content */}
                <div className="p-4 lg:p-6 bg-base-200 min-h-screen">
                    <Outlet />
                </div>
            </div>

            {/* Sidebar */}
            <div className="drawer-side">
                <label
                    htmlFor="main-drawer"
                    className="drawer-overlay"
                    onClick={() => setDrawerOpen(false)}
                ></label>

                <div className="menu p-4 w-80 min-h-full bg-base-100 text-base-content">
                    <div className="flex items-center justify-between mb-4 lg:mb-6">
                        <h2 className="text-lg font-bold">Menu</h2>
                        <button
                            className="btn btn-ghost btn-sm btn-circle lg:hidden"
                            onClick={() => setDrawerOpen(false)}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <ul className="menu p-0">
                        {sidebarContent}
                    </ul>

                    <div className="divider"></div>
                    <div>
                        <button onClick={handleLogout} className="btn btn-error btn-outline btn-block btn-sm">
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MainLayout;
