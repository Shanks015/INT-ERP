import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Clock, Upload } from 'lucide-react';
import DeleteConfirmModal from '../../components/Modal/DeleteConfirmModal';
import ImportModal from '../../components/Modal/ImportModal';

const CampusVisitsList = () => {
    const { user, isAdmin } = useAuth();
    const [campusVisits, setCampusVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [importModal, setImportModal] = useState(false);

    useEffect(() => {
        fetchCampusVisits();
    }, []);

    const fetchCampusVisits = async () => {
        try {
            const response = await api.get('/campus-visits');
            setCampusVisits(response.data.data || []);
        } catch (error) {
            toast.error('Error fetching campus visits');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (reason) => {
        try {
            await api.delete(`/campus-visits/${deleteModal.item._id}`, {
                data: { reason }
            });

            toast.success(isAdmin ? 'Campus visit deleted successfully' : 'Delete request submitted for approval');
            fetchCampusVisits();
            window.dispatchEvent(new Event('pendingCountUpdated'));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting campus visit');
        }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.post('/campus-visits/export-csv', {}, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'campus-visits-export.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.success('CSV exported successfully');
        } catch (error) {
            toast.error('Error exporting CSV');
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
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Campus Visits</h1>
                    <p className="text-base-content/70 mt-2">
                        Manage campus visitor records
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setImportModal(true)} className="btn btn-outline">
                        <Upload size={18} />
                        Import
                    </button>
                    <button onClick={handleExportCSV} className="btn btn-outline">
                        <Download size={18} />
                        Export CSV
                    </button>
                    <Link to="/campus-visits/new" className="btn btn-primary">
                        <Plus size={18} />
                        Add Campus Visit
                    </Link>
                </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Visitor Name</th>
                                    <th>University</th>
                                    <th>Country</th>
                                    <th>Type</th>
                                    <th>Department</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {campusVisits.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-8">
                                            No campus visits found. Add your first visit!
                                        </td>
                                    </tr>
                                ) : (
                                    campusVisits.map((visit) => (
                                        <tr key={visit._id}>
                                            <td>{new Date(visit.date).toLocaleDateString()}</td>
                                            <td>{visit.visitorName}</td>
                                            <td>{visit.universityName}</td>
                                            <td>{visit.country}</td>
                                            <td>{visit.type || '-'}</td>
                                            <td>{visit.department || '-'}</td>
                                            <td>
                                                {visit.status === 'pending_edit' && (
                                                    <span className="badge badge-warning gap-2">
                                                        <Clock size={14} />
                                                        Edit Pending
                                                    </span>
                                                )}
                                                {visit.status === 'pending_delete' && (
                                                    <span className="badge badge-error gap-2">
                                                        <Clock size={14} />
                                                        Delete Pending
                                                    </span>
                                                )}
                                                {visit.status === 'active' && (
                                                    <span className="badge badge-success">Active</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <Link
                                                        to={`/campus-visits/edit/${visit._id}`}
                                                        className={`btn btn-warning btn-sm ${visit.status !== 'active' ? 'btn-disabled' : ''
                                                            }`}
                                                    >
                                                        <Edit size={16} />
                                                    </Link>
                                                    <button
                                                        onClick={() => setDeleteModal({ isOpen: true, item: visit })}
                                                        className={`btn btn-error btn-sm ${visit.status !== 'active' ? 'btn-disabled' : ''
                                                            }`}
                                                        disabled={visit.status !== 'active'}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <DeleteConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, item: null })}
                onConfirm={handleDelete}
                itemName={deleteModal.item?.visitorName}
                requireReason={!isAdmin}
            />
            <ImportModal
                isOpen={importModal}
                onClose={() => setImportModal(false)}
                onSuccess={fetchCampusVisits}
                moduleName="campus-visits"
            />
        </div>
    );
};

export default CampusVisitsList;
