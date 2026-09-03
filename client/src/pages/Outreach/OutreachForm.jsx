import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, Globe, User, MessageSquare, Send, Bot } from 'lucide-react';
import ScholarsDateField from '../../components/ScholarsDateField';
import CountrySelect from '../../components/CountrySelect';
import Combobox from '../../components/Combobox';
import { dateToUTCISO } from '../../utils/dateFormat';

// Model enum: ['Not Sent', 'Pending Partner Review', 'Reply Detected', 'Replied', 'Closed']
const OUTREACH_STATUS_OPTIONS = ['Not Sent', 'Pending Partner Review', 'Reply Detected', 'Replied', 'Closed'];
const PARTNERSHIP_TYPE_SUGGESTIONS = ['Student Exchange', 'Research', 'Joint Degree', 'MoU/MoA', 'Faculty Exchange', 'Internship', 'Training', 'Collaborative Program'];

const OutreachForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user, isAdmin } = useAuth();
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
        notes: '',
        // New tracking fields
        sentDate: null,
        sentFromEmail: '',
        outreachStatus: 'Not Sent',
        automationActive: false
    });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);

    useEffect(() => {
        if (isEdit) {
            fetchOutreach();
        } else {
            // Pre-fill sender email from logged-in user
            setFormData(prev => ({
                ...prev,
                sentFromEmail: user?.email || ''
            }));
        }
    }, [id]);

    // Auto-manage automationActive when outreachStatus changes
    const handleStatusChange = (newStatus) => {
        setFormData(prev => ({
            ...prev,
            outreachStatus: newStatus,
            automationActive: newStatus === 'Pending Partner Review' ? true : prev.automationActive,
            // Auto-set sentDate to today if switching to Pending and no sentDate yet
            sentDate: (newStatus === 'Pending Partner Review' && !prev.sentDate)
                ? new Date()
                : prev.sentDate
        }));
    };

    const setDate = (key) => (value) => setFormData((prev) => ({ ...prev, [key]: value }));

    const fetchOutreach = async () => {
        try {
            const response = await api.get(`/outreach/${id}`);
            const data = response.data.data;
            setFormData({
                name:             data.name || '',
                country:          data.country || '',
                university:       data.university || '',
                contactPerson:    data.contactPerson || '',
                email:            data.email || '',
                phone:            data.phone || '',
                website:          data.website || '',
                partnershipType:  data.partnershipType || '',
                reply:            data.reply || '',
                notes:            data.notes || '',
                sentDate:         data.sentDate ? new Date(data.sentDate) : null,
                sentFromEmail:    data.sentFromEmail || '',
                outreachStatus:   data.outreachStatus || 'Not Sent',
                automationActive: data.automationActive || false
            });
        } catch (error) {
            toast.error('Error fetching outreach data');
            navigate('/outreach');
        } finally {
            setFetchLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                sentDate: formData.sentDate ? dateToUTCISO(formData.sentDate) : null,
                sentByEmployee: user?._id
            };

            if (isEdit) {
                await api.put(`/outreach/${id}`, payload);
                toast.success(isAdmin ? 'Outreach updated successfully' : 'Update request submitted for approval');
            } else {
                await api.post('/outreach', payload);
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

    const showAutomationToggle = formData.outreachStatus === 'Pending Partner Review';

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
                                        <input type="text" name="name" placeholder="Institution Name"
                                            className="input input-bordered w-full focus:input-primary transition-all font-semibold"
                                            value={formData.name} onChange={handleChange} required />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Country *</span></label>
                                        <CountrySelect
                                            value={formData.country}
                                            onChange={(value) => setFormData((prev) => ({ ...prev, country: value }))}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">University</span></label>
                                        <input type="text" name="university" placeholder="University Name"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.university} onChange={handleChange} />
                                    </div>

                                    <div className="form-control w-full lg:col-span-3">
                                        <label className="label font-medium"><span className="label-text">Website</span></label>
                                        <input type="url" name="website" placeholder="https://example.com"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.website} onChange={handleChange} />
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
                                        <input type="text" name="contactPerson" placeholder="Name"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.contactPerson} onChange={handleChange} />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Email</span></label>
                                        <input type="email" name="email" placeholder="email@example.com"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.email} onChange={handleChange} />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Phone</span></label>
                                        <input type="tel" name="phone" placeholder="+1 234 567 890"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.phone} onChange={handleChange} />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Outreach Tracking */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-info/10 rounded-lg text-info">
                                        <Send size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Outreach Tracking</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Outreach Status</span></label>
                                        <select
                                            name="outreachStatus"
                                            className="select select-bordered w-full focus:select-primary"
                                            value={formData.outreachStatus}
                                            onChange={(e) => handleStatusChange(e.target.value)}
                                        >
                                            {OUTREACH_STATUS_OPTIONS.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Date Sent</span></label>
                                        <ScholarsDateField value={formData.sentDate} onChange={setDate('sentDate')} />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Sent From Email</span></label>
                                        <input type="email" name="sentFromEmail" placeholder="your@email.com"
                                            className="input input-bordered w-full focus:input-primary"
                                            value={formData.sentFromEmail} onChange={handleChange} />
                                    </div>

                                    {/* Automation toggle — only shown when Pending Partner Review */}
                                    {showAutomationToggle && (
                                        <div className="form-control w-full lg:col-span-3">
                                            <div className="flex items-center gap-4 p-4 bg-info/5 border border-info/20 rounded-xl">
                                                <div className="p-2 bg-info/10 rounded-lg text-info">
                                                    <Bot size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-sm">Enable Follow-up Automation</p>
                                                    <p className="text-xs text-base-content/60">
                                                        System will send reminder emails at 14 and 28 days if no reply is detected
                                                    </p>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    name="automationActive"
                                                    className="toggle toggle-info"
                                                    checked={formData.automationActive}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section 4: Engagement & Notes */}
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
                                        <Combobox
                                            options={PARTNERSHIP_TYPE_SUGGESTIONS}
                                            value={formData.partnershipType}
                                            onChange={(value) => setFormData((prev) => ({ ...prev, partnershipType: value }))}
                                            placeholder="e.g. Research, Exchange, Joint Degree"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                        />
                                        <label className="label">
                                            <span className="label-text-alt text-base-content/60">Select existing or type new</span>
                                        </label>
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium">
                                            <span className="label-text">Reply / Comments</span>
                                            <span className="label-text-alt text-base-content/40">Notes only — use Outreach Status for tracking</span>
                                        </label>
                                        <textarea name="reply" placeholder="Any verbal or informal response notes..."
                                            className="textarea textarea-bordered w-full focus:textarea-primary transition-all"
                                            rows={2} value={formData.reply} onChange={handleChange} />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Internal Notes</span></label>
                                        <textarea name="notes" placeholder="Additional internal notes..."
                                            className="textarea textarea-bordered w-full h-24 focus:textarea-primary transition-all"
                                            rows={3} value={formData.notes} onChange={handleChange} />
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
