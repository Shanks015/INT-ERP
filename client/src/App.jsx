import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import LoadingSpinner from './components/LoadingSpinner';

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

// Outreach
const OutreachList = lazy(() => import('./pages/Outreach/OutreachList'));
const OutreachForm = lazy(() => import('./pages/Outreach/OutreachForm'));

function App() {
    const { user, loading } = useAuth();

    if (loading) {
        return (<div className="flex items-center justify-center min-h-screen"><span className="loading loading-spinner loading-lg"></span></div>);
    }

    return (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                    <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
                    <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />

                    <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<Dashboard />} />

                        <Route path="partners" element={<PartnersList />} />
                        <Route path="partners/new" element={<PartnerForm />} />
                        <Route path="partners/edit/:id" element={<PartnerForm />} />

                        <Route path="campus-visits" element={<CampusVisitsList />} />
                        <Route path="campus-visits/new" element={<CampusVisitForm />} />
                        <Route path="campus-visits/edit/:id" element={<CampusVisitForm />} />

                        <Route path="events" element={<EventsList />} />
                        <Route path="events/new" element={<EventForm />} />
                        <Route path="events/edit/:id" element={<EventForm />} />

                        <Route path="conferences" element={<ConferencesList />} />
                        <Route path="conferences/new" element={<ConferenceForm />} />
                        <Route path="conferences/edit/:id" element={<ConferenceForm />} />

                        <Route path="mou-signing-ceremonies" element={<MouSigningCeremoniesList />} />
                        <Route path="mou-signing-ceremonies/new" element={<MouSigningCeremonyForm />} />
                        <Route path="mou-signing-ceremonies/edit/:id" element={<MouSigningCeremonyForm />} />

                        <Route path="scholars-in-residence" element={<ScholarsList />} />
                        <Route path="scholars-in-residence/new" element={<ScholarForm />} />
                        <Route path="scholars-in-residence/edit/:id" element={<ScholarForm />} />

                        <Route path="mou-updates" element={<MouUpdatesList />} />
                        <Route path="mou-updates/new" element={<MouUpdateForm />} />
                        <Route path="mou-updates/edit/:id" element={<MouUpdateForm />} />

                        <Route path="immersion-programs" element={<ImmersionProgramsList />} />
                        <Route path="immersion-programs/new" element={<ImmersionProgramForm />} />
                        <Route path="immersion-programs/edit/:id" element={<ImmersionProgramForm />} />

                        <Route path="student-exchange" element={<StudentExchangeList />} />
                        <Route path="student-exchange/new" element={<StudentExchangeForm />} />
                        <Route path="student-exchange/edit/:id" element={<StudentExchangeForm />} />

                        <Route path="masters-abroad" element={<MastersAbroadList />} />
                        <Route path="masters-abroad/new" element={<MastersAbroadForm />} />
                        <Route path="masters-abroad/edit/:id" element={<MastersAbroadForm />} />

                        <Route path="memberships" element={<MembershipsList />} />
                        <Route path="memberships/new" element={<MembershipForm />} />
                        <Route path="memberships/edit/:id" element={<MembershipForm />} />

                        <Route path="digital-media" element={<DigitalMediaList />} />
                        <Route path="digital-media/new" element={<DigitalMediaForm />} />
                        <Route path="digital-media/edit/:id" element={<DigitalMediaForm />} />

                        <Route path="outreach" element={<OutreachList />} />
                        <Route path="outreach/new" element={<OutreachForm />} />
                        <Route path="outreach/edit/:id" element={<OutreachForm />} />

                        <Route path="pending-actions" element={<ProtectedRoute adminOnly><PendingActions /></ProtectedRoute>} />
                        <Route path="my-requests" element={<MyRequests />} />
                        <Route path="reports" element={<Reports />} />
                        <Route path="user-management" element={<ProtectedRoute adminOnly><UserManagement /></ProtectedRoute>} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}

export default App;
