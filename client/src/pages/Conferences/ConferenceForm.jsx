import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, Calendar, Link as LinkIcon, MapPin } from 'lucide-react';

const ConferenceForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({ date: '', conferenceName: '', country: '', department: '', campus: '', eventSummary: '', driveLink: '' });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);

    useEffect(() => { if (isEdit) fetchConference(); }, [id]);

    const fetchConference = async () => {
        try {
            const response = await api.get(`/conferences/${id}`);
            const conf = response.data.data;
            setFormData({ date: conf.date ? new Date(conf.date).toISOString().split('T')[0] : '', conferenceName: conf.conferenceName || '', country: conf.country || '', department: conf.department || '', campus: conf.campus || '', eventSummary: conf.eventSummary || '', driveLink: conf.driveLink || '' });
        } catch (error) {
            toast.error('Error fetching conference');
            navigate('/conferences');
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
                await api.put(`/conferences/${id}`, formData);
                toast.success(isAdmin ? 'Conference updated successfully' : 'Update request submitted for approval');
            } else {
                await api.post('/conferences', formData);
                toast.success('Conference created successfully');
            }
            window.dispatchEvent(new Event('pendingCountUpdated'));
            navigate('/conferences');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving conference');
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
                            {isEdit ? 'Edit Conference' : 'New Conference'}
                        </h1>
                        <p className="text-base-content/60">
                            {isEdit ? 'Update conference details' : 'Register a new international conference record'}
                        </p>
                    </div>
                    <button onClick={() => navigate('/conferences')} className="btn btn-ghost gap-2">
                        <ArrowLeft size={20} />
                        Back to List
                    </button>
                </div>

                <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-content/5 overflow-hidden">
                    {/* Decorative Header Bar */}
                    <div className="h-2 bg-primary w-full"></div>

                    <div className="card-body p-6 md:p-10 gap-8">
                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Section 1: Conference Details */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Calendar size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Conference Details</h3>
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
                                        <label className="label font-medium"><span className="label-text">Conference Name *</span></label>
                                        <input
                                            type="text"
                                            name="conferenceName"
                                            placeholder="Full title of the conference"
                                            className="input input-bordered w-full focus:input-primary transition-all font-semibold"
                                            value={formData.conferenceName}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Country *</span></label>
                                        <input
                                            type="text"
                                            name="country"
                                            placeholder="Host country"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.country}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Location & Summary */}
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
                                        <label className="label font-medium"><span className="label-text">Event Summary</span></label>
                                        <textarea
                                            name="eventSummary"
                                            placeholder="Brief summary or description of the conference..."
                                            className="textarea textarea-bordered w-full h-24 focus:textarea-primary transition-all"
                                            rows="3"
                                            value={formData.eventSummary}
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
                                    {loading ? 'Saving...' : (isEdit ? 'Update Conference' : 'Create Conference')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConferenceForm;

