import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft } from 'lucide-react';

const CampusVisitForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        date: '',
        visitorName: '',
        universityName: '',
        country: '',
        type: '',
        department: '',
        campus: '',
        purpose: '',
        summary: '',
        driveLink: ''
    });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);

    useEffect(() => {
        if (isEdit) {
            fetchCampusVisit();
        }
    }, [id]);

    const fetchCampusVisit = async () => {
        try {
            const response = await api.get(`/campus-visits/${id}`);
            const visit = response.data.data;
            setFormData({
                date: visit.date ? new Date(visit.date).toISOString().split('T')[0] : '',
                visitorName: visit.visitorName || '',
                universityName: visit.universityName || '',
                country: visit.country || '',
                type: visit.type || '',
                department: visit.department || '',
                campus: visit.campus || '',
                purpose: visit.purpose || '',
                summary: visit.summary || '',
                driveLink: visit.driveLink || ''
            });
        } catch (error) {
            toast.error('Error fetching campus visit');
            navigate('/campus-visits');
        } finally {
            setFetchLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isEdit) {
                await api.put(`/campus-visits/${id}`, formData);
                toast.success(isAdmin ? 'Campus visit updated successfully' : 'Update request submitted for approval');
            } else {
                await api.post('/campus-visits', formData);
                toast.success('Campus visit created successfully');
            }

            window.dispatchEvent(new Event('pendingCountUpdated'));
            navigate('/campus-visits');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving campus visit');
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <button onClick={() => navigate('/campus-visits')} className="btn btn-ghost btn-sm mb-4">
                    <ArrowLeft size={18} />
                    Back to Campus Visits
                </button>
                <h1 className="text-3xl font-bold">
                    {isEdit ? 'Edit Campus Visit' : 'Add New Campus Visit'}
                </h1>
            </div>

            <div className="card bg-base-100 shadow-xl max-w-2xl">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text">Date *</span>
                                </label>
                                <input
                                    type="date"
                                    name="date"
                                    className="input input-bordered w-full"
                                    value={formData.date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text">Visitor Name *</span>
                                </label>
                                <input
                                    type="text"
                                    name="visitorName"
                                    placeholder="Enter visitor name"
                                    className="input input-bordered w-full"
                                    value={formData.visitorName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text">University Name *</span>
                                </label>
                                <input
                                    type="text"
                                    name="universityName"
                                    placeholder="Enter university name"
                                    className="input input-bordered w-full"
                                    value={formData.universityName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text">Country *</span>
                                </label>
                                <input
                                    type="text"
                                    name="country"
                                    placeholder="Enter country"
                                    className="input input-bordered w-full"
                                    value={formData.country}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text">Type</span>
                                </label>
                                <input
                                    type="text"
                                    name="type"
                                    placeholder="Visit type (e.g., Collaboration)"
                                    className="input input-bordered w-full"
                                    value={formData.type}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text">Department</span>
                                </label>
                                <input
                                    type="text"
                                    name="department"
                                    placeholder="Enter department"
                                    className="input input-bordered w-full"
                                    value={formData.department}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-control w-full md:col-span-2">
                                <label className="label">
                                    <span className="label-text">Campus</span>
                                </label>
                                <input
                                    type="text"
                                    name="campus"
                                    placeholder="Enter campus"
                                    className="input input-bordered w-full"
                                    value={formData.campus}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-control w-full md:col-span-2">
                                <label className="label">
                                    <span className="label-text">Purpose</span>
                                </label>
                                <input
                                    type="text"
                                    name="purpose"
                                    placeholder="Purpose of visit"
                                    className="input input-bordered w-full"
                                    value={formData.purpose}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-control w-full md:col-span-2">
                                <label className="label">
                                    <span className="label-text">Summary</span>
                                </label>
                                <textarea
                                    name="summary"
                                    placeholder="Visit summary"
                                    className="textarea textarea-bordered w-full"
                                    rows="4"
                                    value={formData.summary}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-control w-full md:col-span-2">
                                <label className="label">
                                    <span className="label-text">Drive Link</span>
                                </label>
                                <input
                                    type="url"
                                    name="driveLink"
                                    placeholder="https://drive.google.com/..."
                                    className="input input-bordered w-full"
                                    value={formData.driveLink}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="form-control mt-6">
                            <button
                                type="submit"
                                className={`btn btn-primary ${loading ? 'loading' : ''}`}
                                disabled={loading}
                            >
                                {!loading && <Save size={18} className="mr-2" />}
                                {loading ? 'Saving...' : (isEdit ? 'Update Campus Visit' : 'Create Campus Visit')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CampusVisitForm;
