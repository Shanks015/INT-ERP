import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, Globe, User, MessageSquare } from 'lucide-react';

const OutreachForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        name: '',
        country: '',
        university: '',
        contactPerson: '',
        email: '',
        phone: '',
        website: '',
        partnershipType: '',
        reply: '',
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);

    useEffect(() => {
        if (isEdit) {
            fetchOutreach();
        }
    }, [id]);

    const fetchOutreach = async () => {
        try {
            const response = await api.get(`/outreach/${id}`);
            const data = response.data.data;
            setFormData({
                name: data.name || '',
                country: data.country || '',
                university: data.university || '',
                contactPerson: data.contactPerson || '',
                email: data.email || '',
                phone: data.phone || '',
                website: data.website || '',
                partnershipType: data.partnershipType || '',
                reply: data.reply || '',
                notes: data.notes || ''
            });
        } catch (error) {
            toast.error('Error fetching outreach data');
            navigate('/outreach');
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
                await api.put(`/outreach/${id}`, formData);
                if (isAdmin) {
                    toast.success('Outreach updated successfully');
                } else {
                    toast.success('Update request submitted for approval');
                }
            } else {
                await api.post('/outreach', formData);
                toast.success('Outreach created successfully');
            }

            window.dispatchEvent(new Event('pendingCountUpdated'));
            navigate('/outreach');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving outreach');
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
                            {isEdit ? 'Edit Outreach' : 'New Outreach'}
                        </h1>
                        <p className="text-base-content/60">
                            {isEdit ? 'Update outreach activity details' : 'Log a new outreach initiative'}
                        </p>
                    </div>
                    <button onClick={() => navigate('/outreach')} className="btn btn-ghost gap-2">
                        <ArrowLeft size={20} />
                        Back to List
                    </button>
                </div>

                <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-content/5 overflow-hidden">
                    {/* Decorative Header Bar */}
                    <div className="h-2 bg-primary w-full"></div>

                    <div className="card-body p-6 md:p-10 gap-8">
                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Section 1: Institution Details */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Globe size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Institution Details</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Name *</span></label>
                                        <input
                                            type="text"
                                            name="name"
                                            placeholder="Institution Name"
                                            className="input input-bordered w-full focus:input-primary transition-all font-semibold"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Country *</span></label>
                                        <input
                                            type="text"
                                            name="country"
                                            placeholder="Country"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.country}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">University</span></label>
                                        <input
                                            type="text"
                                            name="university"
                                            placeholder="University Name"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.university}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full lg:col-span-3">
                                        <label className="label font-medium"><span className="label-text">Website</span></label>
                                        <input
                                            type="url"
                                            name="website"
                                            placeholder="https://example.com"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.website}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Contact Information */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                                        <User size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Contact Information</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Contact Person</span></label>
                                        <input
                                            type="text"
                                            name="contactPerson"
                                            placeholder="Name"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.contactPerson}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Email</span></label>
                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="email@example.com"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.email}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Phone</span></label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            placeholder="+1 234 567 890"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.phone}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Engagement & Notes */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-accent/10 rounded-lg text-accent">
                                        <MessageSquare size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Engagement & Notes</h3>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Partnership Type</span></label>
                                        <input
                                            type="text"
                                            name="partnershipType"
                                            placeholder="e.g. Research, Exchange, Joint Degree"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.partnershipType}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Reply / Status</span></label>
                                        <textarea
                                            name="reply"
                                            placeholder="Outcome or current status..."
                                            className="textarea textarea-bordered w-full focus:textarea-primary transition-all"
                                            rows={2}
                                            value={formData.reply}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Internal Notes</span></label>
                                        <textarea
                                            name="notes"
                                            placeholder="Additional internal notes..."
                                            className="textarea textarea-bordered w-full h-24 focus:textarea-primary transition-all"
                                            rows={3}
                                            value={formData.notes}
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
                                    {loading ? 'Saving...' : (isEdit ? 'Update Outreach' : 'Create Outreach')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OutreachForm;

