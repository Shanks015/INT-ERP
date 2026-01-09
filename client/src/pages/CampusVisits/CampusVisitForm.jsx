import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, User, MapPin, Link as LinkIcon } from 'lucide-react';

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
                <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-base-200 p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-base-content mb-2">
                            {isEdit ? 'Edit Campus Visit' : 'New Campus Visit'}
                        </h1>
                        <p className="text-base-content/60">
                            {isEdit ? 'Update visit details' : 'Register a new international campus visit'}
                        </p>
                    </div>
                    <button onClick={() => navigate('/campus-visits')} className="btn btn-ghost gap-2">
                        <ArrowLeft size={20} />
                        Back to List
                    </button>
                </div>

                <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-content/5 overflow-hidden">
                    {/* Decorative Header Bar */}
                    <div className="h-2 bg-primary w-full"></div>

                    <div className="card-body p-6 md:p-10 gap-8">
                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Section 1: Visit Details */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <User size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Visitor Information</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Date *</span></label>
                                        <input
                                            type="date"
                                            name="date"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.date}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full lg:col-span-2">
                                        <label className="label font-medium"><span className="label-text">Visitor Name *</span></label>
                                        <input
                                            type="text"
                                            name="visitorName"
                                            placeholder="Full name of visitor"
                                            className="input input-bordered w-full focus:input-primary transition-all font-semibold"
                                            value={formData.visitorName}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">University/Institution *</span></label>
                                        <input
                                            type="text"
                                            name="universityName"
                                            placeholder="Visitor's institution"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.universityName}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Country *</span></label>
                                        <input
                                            type="text"
                                            name="country"
                                            placeholder="Country of origin"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.country}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Visit Type</span></label>
                                        <input
                                            type="text"
                                            name="type"
                                            placeholder="e.g. Collaboration, Inspection"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.type}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Context & Location */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                                        <MapPin size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Context & Location</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Hosting Department</span></label>
                                        <input
                                            type="text"
                                            name="department"
                                            placeholder="Department"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.department}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Campus Location</span></label>
                                        <input
                                            type="text"
                                            name="campus"
                                            placeholder="Specific campus"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.campus}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full md:col-span-2">
                                        <label className="label font-medium"><span className="label-text">Purpose of Visit</span></label>
                                        <input
                                            type="text"
                                            name="purpose"
                                            placeholder="Main objective"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.purpose}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full md:col-span-2">
                                        <label className="label font-medium"><span className="label-text">Visit Summary</span></label>
                                        <textarea
                                            name="summary"
                                            placeholder="Detailed summary of the visit..."
                                            className="textarea textarea-bordered w-full h-24 focus:textarea-primary transition-all"
                                            value={formData.summary}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Resources */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-accent/10 rounded-lg text-accent">
                                        <LinkIcon size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Resources</h3>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Drive Link</span></label>
                                        <input
                                            type="url"
                                            name="driveLink"
                                            placeholder="https://drive.google.com/..."
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.driveLink}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-6 border-t border-base-200">
                                <button
                                    type="submit"
                                    className={`btn btn-primary btn-lg px-8 ${loading ? 'loading' : ''}`}
                                    disabled={loading}
                                >
                                    {!loading && <Save size={20} className="mr-2" />}
                                    {loading ? 'Saving...' : (isEdit ? 'Update Campus Visit' : 'Create Campus Visit')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CampusVisitForm;
