import { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
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
    const [pendingUsersCount, setPendingUsersCount] = useState(0);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const modules = [
        { name: 'partners', endpoint: '/partners' },
        { name: 'campus-visits', endpoint: '/campus-visits' },
        { name: 'events', endpoint: '/events' },
        { name: 'conferences', endpoint: '/conferences' },
        { name: 'mou-signing-ceremonies', endpoint: '/mou-signing-ceremonies' },
        { name: 'scholars-in-residence', endpoint: '/scholars-in-residence' },
        { name: 'mou-updates', endpoint: '/mou-updates' },
        { name: 'immersion-programs', endpoint: '/immersion-programs' },
        { name: 'student-exchange', endpoint: '/student-exchange' },
        { name: 'masters-abroad', endpoint: '/masters-abroad' },
        { name: 'memberships', endpoint: '/memberships' },
        { name: 'digital-media', endpoint: '/digital-media' },
        { name: 'outreach', endpoint: '/outreach' },
    ];

    useEffect(() => {
        // Fetch pending count for admin
        if (isAdmin) {
            fetchPendingCounts();

            // Listen for pending count updates
            const handlePendingUpdate = () => fetchPendingCounts();
            window.addEventListener('pendingCountUpdated', handlePendingUpdate);

            return () => {
                window.removeEventListener('pendingCountUpdated', handlePendingUpdate);
            };
        }
    }, [isAdmin]);

    const fetchPendingCounts = async () => {
        try {
            // Fetch pending users
            const usersResponse = await api.get('/users?approvalStatus=pending');
            setPendingUsersCount(usersResponse.data.users?.length || 0);

            // Fetch pending actions across all modules
            const actionResponses = await Promise.all(
                modules.map(module =>
                    api.get(`${module.endpoint}/pending/all`).catch(() => ({ data: { data: [] } }))
                )
            );

            const totalPendingActions = actionResponses.reduce((acc, response) => {
                return acc + (response.data.data?.length || 0);
            }, 0);

            setPendingCount(totalPendingActions);
        } catch (error) {
            console.error('Error fetching pending counts:', error);
        }
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
            <li><Link to="/scholars-in-residence" className={location.pathname.includes('/scholars-in-residence') ? 'active' : ''}><GraduationCap size={18} /> Scholars In Residence</Link></li>
            <li><Link to="/mou-updates" className={location.pathname.includes('/mou-updates') ? 'active' : ''}><FileEdit size={18} /> MoU Updates</Link></li>
            <li><Link to="/immersion-programs" className={location.pathname.includes('/immersion-programs') ? 'active' : ''}><Plane size={18} /> Immersion Programs</Link></li>
            <li><Link to="/student-exchange" className={location.pathname.includes('/student-exchange') ? 'active' : ''}><UserCheck size={18} /> Student Exchange</Link></li>
            <li><Link to="/masters-abroad" className={location.pathname.includes('/masters-abroad') ? 'active' : ''}><BookOpen size={18} /> Masters Abroad</Link></li>
            <li><Link to="/memberships" className={location.pathname.includes('/memberships') ? 'active' : ''}><Users2 size={18} /> Memberships</Link></li>
            <li><Link to="/digital-media" className={location.pathname.includes('/digital-media') ? 'active' : ''}><Image size={18} /> Digital Media</Link></li>
            <li><Link to="/outreach" className={location.pathname.includes('/outreach') ? 'active' : ''}><Users size={18} /> Outreach</Link></li>

            <li>
                <Link to="/reports" className={location.pathname === '/reports' ? 'active' : ''}>
                    <FileText size={18} /> Reports
                </Link>
            </li>

            {isAdmin && (
                <>
                    <div className="divider my-2"></div>
                    <li>
                        {user.role === 'admin' && (
                            <NavLink to="/user-management" className={({ isActive }) => `flex items-center gap-3 px-4 py-2 rounded-lg ${isActive ? 'bg-primary text-primary-content' : 'hover:bg-base-200'}`}>
                                <div className="flex items-center gap-3 flex-1">
                                    <Users size={18} />
                                    <span>User Management</span>
                                </div>
                                {pendingUsersCount > 0 && <span className="badge badge-error badge-sm">{pendingUsersCount}</span>}
                            </NavLink>
                        )}
                    </li>
                    <li>
                        <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-3 px-4 py-2 rounded-lg ${isActive ? 'bg-primary text-primary-content' : 'hover:bg-base-200'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            Settings
                        </NavLink>
                    </li>
                    <li>
                        {user.role === 'admin' && (
                            <NavLink to="/activity-logs" className={({ isActive }) => `flex items-center gap-3 px-4 py-2 rounded-lg ${isActive ? 'bg-primary text-primary-content' : 'hover:bg-base-200'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                                Activity Logs
                            </NavLink>
                        )}
                    </li>
                    <li>
                        <Link to="/pending-actions" className={location.pathname === '/pending-actions' ? 'active' : ''}>
                            <div className="flex items-center gap-2 flex-1">
                                <Bell size={18} />
                                <span>Pending Actions</span>
                            </div>
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

            {/* Settings - Available to all users */}
            <div className="divider my-2"></div>
            <li>
                <Link to="/settings" className={location.pathname === '/settings' ? 'active' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    Settings
                </Link>
            </li>
        </>
    );

    const themes = [
        'light',
        'bumblebee',
        'forest',
        'lofi',
        'fantasy',
        'cmyk',
        'autumn',
        'acid',
        'lemonade',
        'winter',
        'halloween',
        'valentine',

        // Commented out themes (uncomment to re-enable):
        // 'dark',
        // 'cupcake',
        // 'emerald',
        // 'corporate',
        // 'synthwave',
        // 'retro',
        // 'cyberpunk',
        // 'aqua',
        // 'garden',
        // 'pastel',
        // 'wireframe',
        // 'black',
        // 'luxury',
        // 'dracula',
        // 'business',
        // 'night',
        // 'coffee',
        // 'dim',
        // 'nord',
        // 'sunset',
    ];
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
                                    <span className="badge badge-primary badge-sm mt-1">
                                        {user?.role}
                                    </span>
                                </li>
                                <div className="divider my-1"></div>
                                <li>
                                    <Link to="/settings">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                        Settings
                                    </Link>
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
