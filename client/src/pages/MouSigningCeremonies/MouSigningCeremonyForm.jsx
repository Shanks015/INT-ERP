import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, PenTool, User, MapPin } from 'lucide-react';

const MouSigningCeremonyForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({ date: '', type: '', visitorName: '', university: '', department: '', eventSummary: '', campus: '', driveLink: '' });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);

    useEffect(() => { if (isEdit) fetchItem(); }, [id]);

    const fetchItem = async () => {
        try {
            const response = await api.get(`/mou-signing-ceremonies/${id}`);
            const item = response.data.data;
            setFormData({
                date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
                type: item.type || '',
                visitorName: item.visitorName || '',
                university: item.university || '',
                department: item.department || '',
                eventSummary: item.eventSummary || '',
                campus: item.campus || '',
                driveLink: item.driveLink || ''
            });
        } catch (error) {
            toast.error('Error fetching record');
            navigate('/mou-signing-ceremonies');
        } finally {
            setFetchLoading(false);
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEdit) {
                await api.put(`/mou-signing-ceremonies/${id}`, formData);
                toast.success(isAdmin ? 'Record updated successfully' : 'Update request submitted for approval');
            } else {
                await api.post('/mou-signing-ceremonies', formData);
                toast.success('Record created successfully');
            }
            window.dispatchEvent(new Event('pendingCountUpdated'));
            navigate('/mou-signing-ceremonies');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving record');
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
                            {isEdit ? 'Edit Ceremony' : 'New MoU Signing'}
                        </h1>
                        <p className="text-base-content/60">
                            {isEdit ? 'Update ceremony details' : 'Register a new MoU signing ceremony event'}
                        </p>
                    </div>
                    <button onClick={() => navigate('/mou-signing-ceremonies')} className="btn btn-ghost gap-2">
                        <ArrowLeft size={20} />
                        Back to List
                    </button>
                </div>

                <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-content/5 overflow-hidden">
                    {/* Decorative Header Bar */}
                    <div className="h-2 bg-primary w-full"></div>

                    <div className="card-body p-6 md:p-10 gap-8">
                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Section 1: Ceremony Overview */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <PenTool size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Ceremony Overview</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Ceremony Type</span></label>
                                        <input
                                            type="text"
                                            name="type"
                                            placeholder="e.g. Virtual, In-Person"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.type}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full md:col-span-2">
                                        <label className="label font-medium"><span className="label-text">Event Summary</span></label>
                                        <textarea
                                            name="eventSummary"
                                            placeholder="Brief description of the ceremony..."
                                            className="textarea textarea-bordered w-full h-24 focus:textarea-primary transition-all"
                                            rows={3}
                                            value={formData.eventSummary}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Parties Involved */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                                        <User size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Parties Involved</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Visitor Name *</span></label>
                                        <input
                                            type="text"
                                            name="visitorName"
                                            placeholder="Signatory Name"
                                            className="input input-bordered w-full focus:input-primary transition-all font-semibold"
                                            value={formData.visitorName}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">University *</span></label>
                                        <input
                                            type="text"
                                            name="university"
                                            placeholder="Partner University"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.university}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Department</span></label>
                                        <input
                                            type="text"
                                            name="department"
                                            placeholder="Department"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.department}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Location & Resources */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-accent/10 rounded-lg text-accent">
                                        <MapPin size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Location & Resources</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Campus Location</span></label>
                                        <input
                                            type="text"
                                            name="campus"
                                            placeholder="Specific Campus"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.campus}
                                            onChange={handleChange}
                                        />
                                    </div>

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
                                    {loading ? 'Saving...' : (isEdit ? 'Update Ceremony' : 'Create Ceremony')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MouSigningCeremonyForm;
