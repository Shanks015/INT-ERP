import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const MyRequests = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const modules = [
        { name: 'partners', label: 'Partners', endpoint: '/partners' },
        { name: 'campus-visits', label: 'Campus Visits', endpoint: '/campus-visits' },
        { name: 'events', label: 'Events', endpoint: '/events' },
        { name: 'conferences', label: 'Conferences', endpoint: '/conferences' },
        { name: 'mou-signing-ceremonies', label: 'MoU Signing Ceremonies', endpoint: '/mou-signing-ceremonies' },
        { name: 'scholars-in-residence', label: 'Scholars', endpoint: '/scholars-in-residence' },
        { name: 'mou-updates', label: 'MoU Updates', endpoint: '/mou-updates' },
        { name: 'immersion-programs', label: 'Immersion Programs', endpoint: '/immersion-programs' },
        { name: 'student-exchange', label: 'Student Exchange', endpoint: '/student-exchange' },
        { name: 'masters-abroad', label: 'Masters Abroad', endpoint: '/masters-abroad' },
        { name: 'memberships', label: 'Memberships', endpoint: '/memberships' },
        { name: 'digital-media', label: 'Digital Media', endpoint: '/digital-media' },
    ];

    useEffect(() => {
        fetchMyRequests();
    }, []);

    const fetchMyRequests = async () => {
        setLoading(true);
        try {
            const responses = await Promise.all(
                modules.map(module =>
                    api.get(module.endpoint).catch(() => ({ data: { data: [] } }))
                )
            );

            const myRequests = responses.flatMap((response, index) => {
                const items = response.data.data || [];
                return items
                    .filter(item =>
                        (item.status === 'pending_edit' || item.status === 'pending_delete') &&
                        (item.updatedBy?.email === user?.email || item.createdBy?.email === user?.email)
                    )
                    .map(item => ({
                        ...item,
                        moduleName: modules[index].name,
                        moduleLabel: modules[index].label,
                        moduleEndpoint: modules[index].endpoint
                    }));
            });

            setRequests(myRequests);
        } catch (error) {
            toast.error('Error fetching your requests');
        } finally {
            setLoading(false);
        }
    };

    const getDisplayValue = (item) => {
        return item.title || item.name || item.studentName || item.visitorName ||
            item.scholarName || item.university || item.conferenceName ||
            item.contactName || 'Unknown';
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending_edit':
                return (
                    <span className="badge badge-warning gap-2">
                        <Clock size={14} />
                        Edit Pending
                    </span>
                );
            case 'pending_delete':
                return (
                    <span className="badge badge-error gap-2">
                        <Clock size={14} />
                        Delete Pending
                    </span>
                );
            default:
                return <span className="badge">Unknown</span>;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold">My Requests</h1>
                <p className="text-base-content/70 mt-2">
                    Track your pending edit and delete requests
                </p>
            </div>

            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    {requests.length === 0 ? (
                        <div className="text-center py-8">
                            <CheckCircle size={48} className="mx-auto mb-4 text-success" />
                            <p className="text-lg">No pending requests</p>
                            <p className="text-sm text-base-content/70">
                                You don't have any pending changes waiting for approval
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table table-zebra">
                                <thead>
                                    <tr>
                                        <th>Module</th>
                                        <th>Item</th>
                                        <th>Request Type</th>
                                        <th>Status</th>
                                        <th>Submitted</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.map((request) => (
                                        <tr key={`${request.moduleName}-${request._id}`}>
                                            <td>
                                                <span className="badge badge-outline">{request.moduleLabel}</span>
                                            </td>
                                            <td className="font-medium">{getDisplayValue(request)}</td>
                                            <td>
                                                {request.status === 'pending_edit' && 'Edit Request'}
                                                {request.status === 'pending_delete' && 'Delete Request'}
                                            </td>
                                            <td>{getStatusBadge(request.status)}</td>
                                            <td>{new Date(request.updatedAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <div className="alert alert-info mt-6">
                <AlertCircle size={20} />
                <div>
                    <p className="font-semibold">About Pending Requests</p>
                    <p className="text-sm">
                        Your edit and delete requests need admin approval. You'll be notified once they're reviewed.
                        While a record is pending, you cannot make further changes to it.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MyRequests;
