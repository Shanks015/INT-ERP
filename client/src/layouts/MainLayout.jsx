import { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import ThemeSwitcher from '../components/ThemeSwitcher';
import NotificationsBell from '../components/NotificationsBell';
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
    Database,
    ChevronDown,
    Mail
} from 'lucide-react';
import logo from '../assets/logo.png';

const MainLayout = () => {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [pendingCount, setPendingCount] = useState(0);
    const [pendingUsersCount, setPendingUsersCount] = useState(0);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [openDropdowns, setOpenDropdowns] = useState(['mou', 'campusVisits', 'product', 'media']); // Dropdowns open by default

    const hasAccess = (moduleName) => {
        if (user?.role !== 'intern') return true;
        return user.allowedModules?.includes(moduleName);
    };

    const toggleDropdown = (dropdownName) => {
        setOpenDropdowns(prev =>
            prev.includes(dropdownName)
                ? prev.filter(d => d !== dropdownName)
                : [...prev, dropdownName]
        );
    };

    useEffect(() => {
        // Admin nav badges (bell + Pending Actions + pending users). This used to
        // fan out to a /users fetch plus one /pending/all per module (~16 round
        // trips, each shipping full documents) — on EVERY page, because this
        // layout wraps every route. Now it is a single /admin/pending-counts
        // round trip of cheap countDocuments calls.
        if (!isAdmin) return undefined;

        let cancelled = false;
        let debounceTimer = null;

        const load = async () => {
            try {
                const { data } = await api.get('/admin/pending-counts');
                if (cancelled) return;
                setPendingUsersCount(data.pendingUsers || 0);
                setPendingCount(data.total || 0);
            } catch (error) {
                console.error('Error fetching pending counts:', error);
            }
        };

        load();

        // Approve/reject/delete handlers dispatch 'pendingCountUpdated' — often
        // in quick succession (e.g. the Pending Actions page refetches after each
        // one), so debounce before refetching.
        const handlePendingUpdate = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(load, 800);
        };
        window.addEventListener('pendingCountUpdated', handlePendingUpdate);

        return () => {
            cancelled = true;
            clearTimeout(debounceTimer);
            window.removeEventListener('pendingCountUpdated', handlePendingUpdate);
        };
    }, [isAdmin]);

    // Outreach "waiting on you" badge (sidebar). One cheap countDocuments call,
    // then refreshed whenever Outreach Mail sends / marks-read / detects a reply
    // (those actions dispatch 'outreachMailChanged').
    const [outreachReplyCount, setOutreachReplyCount] = useState(0);
    useEffect(() => {
        if (user?.role === 'intern' && !(user.allowedModules || []).includes('outreach')) {
            return undefined;
        }
        let cancelled = false;
        const load = async () => {
            try {
                const { data } = await api.get('/outreach-new/stats');
                if (!cancelled) setOutreachReplyCount(data.data?.replyReceived || 0);
            } catch (e) { /* badge is cosmetic; ignore */ }
        };
        load();
        const onMailChanged = () => load();
        window.addEventListener('outreachMailChanged', onMailChanged);
        return () => {
            cancelled = true;
            window.removeEventListener('outreachMailChanged', onMailChanged);
        };
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const sidebarContent = (
        <>
            {hasAccess('dashboard') && (
                <li>
                    <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>
                        <LayoutDashboard size={18} /> Dashboard
                    </Link>
                </li>
            )}

            {hasAccess('partners') && (
                <li><Link to="/partners" className={location.pathname.includes('/partners') ? 'active' : ''}><Users size={18} /> Partners</Link></li>
            )}

            {/* Campus Visits Dropdown Group */}
            {(hasAccess('campus-visits') || hasAccess('scholars-in-residence')) && (
                <li>
                    <div
                        className={`flex items-center gap-3 cursor-pointer ${location.pathname.includes('/campus-visits') || location.pathname.includes('/seminars') || location.pathname.includes('/consultant-visits') || location.pathname.includes('/scholars') ? 'active' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleDropdown('campusVisits');
                        }}
                    >
                        <Building2 size={18} />
                        <span className="flex-1">Campus Visits</span>
                        <ChevronDown
                            size={16}
                            className={`transition-transform duration-200 ${openDropdowns.includes('campusVisits') ? 'rotate-180' : ''}`}
                        />
                    </div>
                    {openDropdowns.includes('campusVisits') && (
                        <ul className="ml-4 mt-2 space-y-1">
                            {hasAccess('campus-visits') && (
                                <>
                                    <li><Link to="/campus-visits" className={location.pathname.includes('/campus-visits') ? 'active' : ''}><Building2 size={16} /> Campus Visit</Link></li>
                                    <li><Link to="/seminars" className={location.pathname.includes('/seminars') ? 'active' : ''}><UserCheck size={16} /> Guest Lecture / Seminar</Link></li>
                                    <li><Link to="/consultant-visits" className={location.pathname.includes('/consultant-visits') ? 'active' : ''}><UserCheck size={16} /> Consultant Visit / Masters Desk</Link></li>
                                </>
                            )}
                            {hasAccess('scholars-in-residence') && (
                                <li><Link to="/scholars-in-residence" className={location.pathname.includes('/scholars-in-residence') ? 'active' : ''}><GraduationCap size={16} /> Scholars in Residence</Link></li>
                            )}
                        </ul>
                    )}
                </li>
            )}

            {hasAccess('events') && (
                <li><Link to="/events" className={location.pathname.includes('/events') ? 'active' : ''}><Calendar size={18} /> Events</Link></li>
            )}
            {hasAccess('conferences') && (
                <li><Link to="/conferences" className={location.pathname.includes('/conferences') ? 'active' : ''}><Globe size={18} /> Conferences</Link></li>
            )}
            {hasAccess('meeting-trackers') && (
                <li><Link to="/meeting-trackers" className={location.pathname.includes('/meeting-trackers') ? 'active' : ''}><BookOpen size={18} /> Meeting Trackers</Link></li>
            )}

            {/* MoU Dropdown Group */}
            {(hasAccess('mou-updates') || hasAccess('mou-signing-ceremonies') || hasAccess('outreach')) && (
                <li>
                    <div
                        className={`flex items-center gap-3 cursor-pointer ${location.pathname.includes('/mou') || location.pathname.includes('/outreach') ? 'active' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleDropdown('mou');
                        }}
                    >
                        <FileText size={18} />
                        <span className="flex-1">MoU</span>
                        <ChevronDown
                            size={16}
                            className={`transition-transform duration-200 ${openDropdowns.includes('mou') ? 'rotate-180' : ''}`}
                        />
                    </div>
                    {openDropdowns.includes('mou') && (
                        <ul className="ml-4 mt-2 space-y-1">
                            {hasAccess('mou-updates') && (
                                <>
                                    <li><Link to="/mou-updates?recordStatus=active" className={location.pathname.includes('/mou-updates') && location.search.includes('active') ? 'active' : ''}><FileEdit size={16} /> Completed MoUs</Link></li>
                                    <li><Link to="/mou-updates?recordStatus=pending" className={location.pathname.includes('/mou-updates') && location.search.includes('pending') ? 'active' : ''}><FileEdit size={16} /> Work in Progress</Link></li>
                                </>
                            )}
                            {hasAccess('mou-signing-ceremonies') && (
                                <li><Link to="/mou-signing-ceremonies" className={location.pathname.includes('/mou-signing-ceremonies') ? 'active' : ''}><FileText size={16} /> MoU Ceremonies</Link></li>
                            )}
                            {hasAccess('outreach') && (
                                <>
                                    <li><Link to="/outreach" className={location.pathname === '/outreach' ? 'active' : ''}><Users size={16} /> Outreach</Link></li>
                                    <li><Link to="/outreach-new" className={location.pathname.includes('/outreach-new') ? 'active' : ''}>
                                        <Mail size={16} /> Outreach Mail
                                        {outreachReplyCount > 0 && <span className="badge badge-error badge-sm ml-auto">{outreachReplyCount}</span>}
                                    </Link></li>
                                </>
                            )}
                        </ul>
                    )}
                </li>
            )}

            {/* Email mailbox — every outreach user needs one connected to send & reply */}
            {hasAccess('outreach') && (
                <li><Link to="/mailbox-connections" className={location.pathname === '/mailbox-connections' ? 'active' : ''}><Mail size={18} /> {isAdmin ? 'Mailbox Connections' : 'My Mailbox'}</Link></li>
            )}

            {/* Product Dropdown Group */}
            {(hasAccess('student-exchange') || hasAccess('immersion-programs') || hasAccess('masters-abroad')) && (
                <li>
                    <div
                        className={`flex items-center gap-3 cursor-pointer ${location.pathname.includes('/student-exchange') || location.pathname.includes('/immersion') || location.pathname.includes('/masters') ? 'active' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleDropdown('product');
                        }}
                    >
                        <Plane size={18} />
                        <span className="flex-1">Product</span>
                        <ChevronDown
                            size={16}
                            className={`transition-transform duration-200 ${openDropdowns.includes('product') ? 'rotate-180' : ''}`}
                        />
                    </div>
                    {openDropdowns.includes('product') && (
                        <ul className="ml-4 mt-2 space-y-1">
                            {hasAccess('student-exchange') && (
                                <li><Link to="/student-exchange" className={location.pathname.includes('/student-exchange') ? 'active' : ''}><UserCheck size={16} /> Student Exchange</Link></li>
                            )}
                            {hasAccess('immersion-programs') && (
                                <li><Link to="/immersion-programs" className={location.pathname.includes('/immersion-programs') ? 'active' : ''}><Plane size={16} /> Immersion Programs</Link></li>
                            )}
                            {hasAccess('masters-abroad') && (
                                <li><Link to="/masters-abroad" className={location.pathname.includes('/masters-abroad') ? 'active' : ''}><BookOpen size={16} /> Masters Abroad</Link></li>
                            )}
                        </ul>
                    )}
                </li>
            )}
            {hasAccess('memberships') && (
                <li><Link to="/memberships" className={location.pathname.includes('/memberships') ? 'active' : ''}><Users2 size={18} /> Memberships</Link></li>
            )}

            {/* Media Dropdown Group */}
            {(hasAccess('social-media') || hasAccess('digital-media')) && (
                <li>
                    <div
                        className={`flex items-center gap-3 cursor-pointer ${location.pathname.includes('/social-media') || location.pathname.includes('/digital-media') ? 'active' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleDropdown('media');
                        }}
                    >
                        <Image size={18} />
                        <span className="flex-1">Media</span>
                        <ChevronDown
                            size={16}
                            className={`transition-transform duration-200 ${openDropdowns.includes('media') ? 'rotate-180' : ''}`}
                        />
                    </div>
                    {openDropdowns.includes('media') && (
                        <ul className="ml-4 mt-2 space-y-1">
                            {hasAccess('social-media') && (
                                <li><Link to="/social-media" className={location.pathname.includes('/social-media') ? 'active' : ''}><Users size={16} /> Social Media</Link></li>
                            )}
                            {hasAccess('digital-media') && (
                                <li><Link to="/digital-media" className={location.pathname.includes('/digital-media') ? 'active' : ''}><Image size={16} /> Digital Media</Link></li>
                            )}
                        </ul>
                    )}
                </li>
            )}

            {hasAccess('reports') && (
                <li>
                    <Link to="/reports" className={location.pathname === '/reports' ? 'active' : ''}>
                        <FileText size={18} /> Reports
                    </Link>
                </li>
            )}

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
            {hasAccess('settings') && (
                <>
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
            )}
        </>
    );

    return (
        <div className="drawer">
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
                    <div className="flex-none">
                        <label
                            htmlFor="main-drawer"
                            className="btn btn-square btn-ghost"
                        >
                            <Menu size={24} />
                        </label>
                    </div>

                    <div className="flex-1">
                        <img src={logo} alt="Logo" className="h-10 mx-auto" />
                    </div>

                    <div className="flex-none gap-2">
                        <NotificationsBell />

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
                <div className="bg-base-200 min-h-screen p-6 lg:p-10">
                    <div className="mx-auto max-w-7xl">
                        <Outlet />
                    </div>
                </div>
            </div>

            {/* Sidebar */}
            <div className="drawer-side">
                <label
                    className="drawer-overlay"
                    onClick={() => setDrawerOpen(false)}
                ></label>

                <div className="menu p-4 w-80 min-h-full bg-base-100 text-base-content">
                    <div className="flex items-center justify-between mb-4 lg:mb-6">
                        <h2 className="text-lg font-bold">Menu</h2>
                        <button
                            className="btn btn-ghost btn-sm btn-circle"
                            onClick={() => setDrawerOpen(false)}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <ul className="menu p-0 gap-2" onClick={() => setDrawerOpen(false)}>
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
