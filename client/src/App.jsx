import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
// Auth
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
// Approval Workflow Pages
import PendingActions from './pages/PendingActions/PendingActions';
import MyRequests from './pages/MyRequests/MyRequests';
import Reports from './pages/Reports/Reports';
import UserManagement from './pages/UserManagement/UserManagement';
// Partners
import PartnersList from './pages/Partners/PartnersList';
import PartnerForm from './pages/Partners/PartnerForm';
//Campus Visits
import CampusVisitsList from './pages/CampusVisits/CampusVisitsList';
import CampusVisitForm from './pages/CampusVisits/CampusVisitForm';
// Events
import EventsList from './pages/Events/EventsList';
import EventForm from './pages/Events/EventForm';
// Conferences
import ConferencesList from './pages/Conferences/ConferencesList';
import ConferenceForm from './pages/Conferences/ConferenceForm';
// MoU Signing Ceremonies
import MouSigningCeremoniesList from './pages/MouSigningCeremonies/MouSigningCeremoniesList';
import MouSigningCeremonyForm from './pages/MouSigningCeremonies/MouSigningCeremonyForm';
// Scholars in Residence
import ScholarsList from './pages/Scholars/ScholarsList';
import ScholarForm from './pages/Scholars/ScholarForm';
// MoU Updates
import MouUpdatesList from './pages/MouUpdates/MouUpdatesList';
import MouUpdateForm from './pages/MouUpdates/MouUpdateForm';
// Immersion Programs
import ImmersionProgramsList from './pages/ImmersionPrograms/ImmersionProgramsList';
import ImmersionProgramForm from './pages/ImmersionPrograms/ImmersionProgramForm';
// Student Exchange
import StudentExchangeList from './pages/StudentExchange/StudentExchangeList';
import StudentExchangeForm from './pages/StudentExchange/StudentExchangeForm';
// Masters Abroad
import MastersAbroadList from './pages/MastersAbroad/MastersAbroadList';
import MastersAbroadForm from './pages/MastersAbroad/MastersAbroadForm';
// Memberships
import MembershipsList from './pages/Memberships/MembershipsList';
import MembershipForm from './pages/Memberships/MembershipForm';
// Digital Media
import DigitalMediaList from './pages/DigitalMedia/DigitalMediaList';
import DigitalMediaForm from './pages/DigitalMedia/DigitalMediaForm';

function App() {
    const { user, loading } = useAuth();

    if (loading) {
        return (<div className="flex items-center justify-center min-h-screen"><span className="loading loading-spinner loading-lg"></span></div>);
    }

    return (
        <BrowserRouter>
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

                    <Route path="pending-actions" element={<ProtectedRoute adminOnly><PendingActions /></ProtectedRoute>} />
                    <Route path="my-requests" element={<MyRequests />} />
                    <Route path="reports" element={<Reports />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
