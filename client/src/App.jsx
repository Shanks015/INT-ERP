import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuth } from './context/AuthContext';
import { AnalyticsProvider } from './context/AnalyticsContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import LoadingSpinner from './components/LoadingSpinner';
import AnalyticsModal from './components/Analytics/AnalyticsModal';

// Auth - Keep login/register eager loaded for faster initial access
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';

// Lazy load all other pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const PendingActions = lazy(() => import('./pages/PendingActions/PendingActions'));
const MyRequests = lazy(() => import('./pages/MyRequests/MyRequests'));
const Reports = lazy(() => import('./pages/Reports/Reports'));
const UserManagement = lazy(() => import('./pages/UserManagement/UserManagement'));

// Partners
const PartnersList = lazy(() => import('./pages/Partners/PartnersList'));
const PartnerForm = lazy(() => import('./pages/Partners/PartnerForm'));

// Campus Visits
const CampusVisitsList = lazy(() => import('./pages/CampusVisits/CampusVisitsList'));
const CampusVisitForm = lazy(() => import('./pages/CampusVisits/CampusVisitForm'));

// Events
const EventsList = lazy(() => import('./pages/Events/EventsList'));
const EventForm = lazy(() => import('./pages/Events/EventForm'));

// Conferences
const ConferencesList = lazy(() => import('./pages/Conferences/ConferencesList'));
const ConferenceForm = lazy(() => import('./pages/Conferences/ConferenceForm'));

// MoU Signing Ceremonies
const MouSigningCeremoniesList = lazy(() => import('./pages/MouSigningCeremonies/MouSigningCeremoniesList'));
const MouSigningCeremonyForm = lazy(() => import('./pages/MouSigningCeremonies/MouSigningCeremonyForm'));

// Scholars in Residence
const ScholarsList = lazy(() => import('./pages/Scholars/ScholarsList'));
const ScholarForm = lazy(() => import('./pages/Scholars/ScholarForm'));

// MoU Updates
const MouUpdatesList = lazy(() => import('./pages/MouUpdates/MouUpdatesList'));
const MouUpdateForm = lazy(() => import('./pages/MouUpdates/MouUpdateForm'));

// Immersion Programs
const ImmersionProgramsList = lazy(() => import('./pages/ImmersionPrograms/ImmersionProgramsList'));
const ImmersionProgramForm = lazy(() => import('./pages/ImmersionPrograms/ImmersionProgramForm'));

// Student Exchange
const StudentExchangeList = lazy(() => import('./pages/StudentExchange/StudentExchangeList'));
const StudentExchangeForm = lazy(() => import('./pages/StudentExchange/StudentExchangeForm'));

// Masters Abroad
const MastersAbroadList = lazy(() => import('./pages/MastersAbroad/MastersAbroadList'));
const MastersAbroadForm = lazy(() => import('./pages/MastersAbroad/MastersAbroadForm'));

// Memberships
const MembershipsList = lazy(() => import('./pages/Memberships/MembershipsList'));
const MembershipForm = lazy(() => import('./pages/Memberships/MembershipForm'));

// Digital Media
const DigitalMediaList = lazy(() => import('./pages/DigitalMedia/DigitalMediaList'));
const DigitalMediaForm = lazy(() => import('./pages/DigitalMedia/DigitalMediaForm'));

// Social Media
const SocialMediaList = lazy(() => import('./pages/SocialMedia/SocialMediaList'));
const SocialMediaForm = lazy(() => import('./pages/SocialMedia/SocialMediaForm'));

// Outreach
const OutreachList = lazy(() => import('./pages/Outreach/OutreachList'));
const OutreachForm = lazy(() => import('./pages/Outreach/OutreachForm'));
const OutreachNewList = lazy(() => import('./pages/OutreachNew/OutreachNewList'));
const OutreachNewForm = lazy(() => import('./pages/OutreachNew/OutreachNewForm'));

// Meeting Trackers
const MeetingTrackersList = lazy(() => import('./pages/MeetingTrackers/MeetingTrackersList'));
const MeetingTrackerForm = lazy(() => import('./pages/MeetingTrackers/MeetingTrackerForm'));

// Settings
const Settings = lazy(() => import('./pages/Settings/Settings'));
const MailboxConnections = lazy(() => import('./pages/Settings/MailboxConnections'));

// Activity Logs (Admin only)
const ActivityLogs = lazy(() => import('./pages/ActivityLogs/ActivityLogs'));

function App() {
    const { user, loading } = useAuth();

    if (loading) {
        return (<div className="flex items-center justify-center min-h-screen"><span className="loading loading-spinner loading-lg"></span></div>);
    }

    return (
        <AnalyticsProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Toaster position="top-right" />
                <AnalyticsModal />
                <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
                        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />

                        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                            <Route index element={<Navigate to="/dashboard" replace />} />
                            <Route path="dashboard" element={<ProtectedRoute module="dashboard"><Dashboard /></ProtectedRoute>} />

                            <Route path="partners" element={<ProtectedRoute module="partners"><PartnersList /></ProtectedRoute>} />
                            <Route path="partners/new" element={<ProtectedRoute module="partners"><PartnerForm /></ProtectedRoute>} />
                            <Route path="partners/edit/:id" element={<ProtectedRoute module="partners"><PartnerForm /></ProtectedRoute>} />

                            <Route path="campus-visits" element={<ProtectedRoute module="campus-visits"><CampusVisitsList /></ProtectedRoute>} />
                            <Route path="campus-visits/new" element={<ProtectedRoute module="campus-visits"><CampusVisitForm /></ProtectedRoute>} />
                            <Route path="campus-visits/edit/:id" element={<ProtectedRoute module="campus-visits"><CampusVisitForm /></ProtectedRoute>} />

                            <Route path="events" element={<ProtectedRoute module="events"><EventsList /></ProtectedRoute>} />
                            <Route path="events/new" element={<ProtectedRoute module="events"><EventForm /></ProtectedRoute>} />
                            <Route path="events/edit/:id" element={<ProtectedRoute module="events"><EventForm /></ProtectedRoute>} />

                            <Route path="conferences" element={<ProtectedRoute module="conferences"><ConferencesList /></ProtectedRoute>} />
                            <Route path="conferences/new" element={<ProtectedRoute module="conferences"><ConferenceForm /></ProtectedRoute>} />
                            <Route path="conferences/edit/:id" element={<ProtectedRoute module="conferences"><ConferenceForm /></ProtectedRoute>} />

                            <Route path="mou-signing-ceremonies" element={<ProtectedRoute module="mou-signing-ceremonies"><MouSigningCeremoniesList /></ProtectedRoute>} />
                            <Route path="mou-signing-ceremonies/new" element={<ProtectedRoute module="mou-signing-ceremonies"><MouSigningCeremonyForm /></ProtectedRoute>} />
                            <Route path="mou-signing-ceremonies/edit/:id" element={<ProtectedRoute module="mou-signing-ceremonies"><MouSigningCeremonyForm /></ProtectedRoute>} />

                            <Route path="scholars-in-residence" element={<ProtectedRoute module="scholars-in-residence"><ScholarsList /></ProtectedRoute>} />
                            <Route path="scholars-in-residence/new" element={<ProtectedRoute module="scholars-in-residence"><ScholarForm /></ProtectedRoute>} />
                            <Route path="scholars-in-residence/edit/:id" element={<ProtectedRoute module="scholars-in-residence"><ScholarForm /></ProtectedRoute>} />

                            <Route path="mou-updates" element={<ProtectedRoute module="mou-updates"><MouUpdatesList /></ProtectedRoute>} />
                            <Route path="mou-updates/new" element={<ProtectedRoute module="mou-updates"><MouUpdateForm /></ProtectedRoute>} />
                            <Route path="mou-updates/edit/:id" element={<ProtectedRoute module="mou-updates"><MouUpdateForm /></ProtectedRoute>} />

                            <Route path="immersion-programs" element={<ProtectedRoute module="immersion-programs"><ImmersionProgramsList /></ProtectedRoute>} />
                            <Route path="immersion-programs/new" element={<ProtectedRoute module="immersion-programs"><ImmersionProgramForm /></ProtectedRoute>} />
                            <Route path="immersion-programs/edit/:id" element={<ProtectedRoute module="immersion-programs"><ImmersionProgramForm /></ProtectedRoute>} />

                            <Route path="student-exchange" element={<ProtectedRoute module="student-exchange"><StudentExchangeList /></ProtectedRoute>} />
                            <Route path="student-exchange/new" element={<ProtectedRoute module="student-exchange"><StudentExchangeForm /></ProtectedRoute>} />
                            <Route path="student-exchange/edit/:id" element={<ProtectedRoute module="student-exchange"><StudentExchangeForm /></ProtectedRoute>} />

                            <Route path="masters-abroad" element={<ProtectedRoute module="masters-abroad"><MastersAbroadList /></ProtectedRoute>} />
                            <Route path="masters-abroad/new" element={<ProtectedRoute module="masters-abroad"><MastersAbroadForm /></ProtectedRoute>} />
                            <Route path="masters-abroad/edit/:id" element={<ProtectedRoute module="masters-abroad"><MastersAbroadForm /></ProtectedRoute>} />

                            <Route path="memberships" element={<ProtectedRoute module="memberships"><MembershipsList /></ProtectedRoute>} />
                            <Route path="memberships/new" element={<ProtectedRoute module="memberships"><MembershipForm /></ProtectedRoute>} />
                            <Route path="memberships/edit/:id" element={<ProtectedRoute module="memberships"><MembershipForm /></ProtectedRoute>} />

                            <Route path="digital-media" element={<ProtectedRoute module="digital-media"><DigitalMediaList /></ProtectedRoute>} />
                            <Route path="digital-media/new" element={<ProtectedRoute module="digital-media"><DigitalMediaForm /></ProtectedRoute>} />
                            <Route path="digital-media/edit/:id" element={<ProtectedRoute module="digital-media"><DigitalMediaForm /></ProtectedRoute>} />

                            <Route path="social-media" element={<ProtectedRoute module="social-media"><SocialMediaList /></ProtectedRoute>} />
                            <Route path="social-media/new" element={<ProtectedRoute module="social-media"><SocialMediaForm /></ProtectedRoute>} />
                            <Route path="social-media/:id" element={<ProtectedRoute module="social-media"><SocialMediaForm /></ProtectedRoute>} />

                            <Route path="outreach" element={<ProtectedRoute module="outreach"><OutreachList /></ProtectedRoute>} />
                            <Route path="outreach/new" element={<ProtectedRoute module="outreach"><OutreachForm /></ProtectedRoute>} />
                            <Route path="outreach/edit/:id" element={<ProtectedRoute module="outreach"><OutreachForm /></ProtectedRoute>} />

                            <Route path="outreach-new" element={<ProtectedRoute module="outreach"><OutreachNewList /></ProtectedRoute>} />
                            <Route path="outreach-new/new" element={<ProtectedRoute module="outreach"><OutreachNewForm /></ProtectedRoute>} />
                            <Route path="outreach-new/edit/:id" element={<ProtectedRoute module="outreach"><OutreachNewForm /></ProtectedRoute>} />

                            <Route path="meeting-trackers" element={<ProtectedRoute module="meeting-trackers"><MeetingTrackersList /></ProtectedRoute>} />
                            <Route path="meeting-trackers/new" element={<ProtectedRoute module="meeting-trackers"><MeetingTrackerForm /></ProtectedRoute>} />
                            <Route path="meeting-trackers/edit/:id" element={<ProtectedRoute module="meeting-trackers"><MeetingTrackerForm /></ProtectedRoute>} />

                            <Route path="pending-actions" element={<ProtectedRoute adminOnly><PendingActions /></ProtectedRoute>} />
                            <Route path="my-requests" element={<MyRequests />} />
                            <Route path="reports" element={<ProtectedRoute module="reports"><Reports /></ProtectedRoute>} />
                            <Route path="user-management" element={<ProtectedRoute adminOnly><UserManagement /></ProtectedRoute>} />
                            <Route path="settings" element={<ProtectedRoute module="settings"><Settings /></ProtectedRoute>} />
                            <Route path="mailbox-connections" element={<ProtectedRoute adminOnly><MailboxConnections /></ProtectedRoute>} />
                            <Route path="activity-logs" element={<ProtectedRoute adminOnly><ActivityLogs /></ProtectedRoute>} />
                        </Route>

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Suspense>
            </BrowserRouter>
        </AnalyticsProvider>
    );
}

export default App;
