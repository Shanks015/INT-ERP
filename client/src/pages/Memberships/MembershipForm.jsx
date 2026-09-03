import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, Award, Calendar, Link as LinkIcon } from 'lucide-react';
import ScholarsDateField from '../../components/ScholarsDateField';
import CountrySelect from '../../components/CountrySelect';
import Combobox from '../../components/Combobox';
import { MEMBERSHIP_STATUSES, MEMBERSHIP_DURATIONS } from '../../constants/options';
import { withCurrentOption } from '../../utils/optionUtils';
import { dateToUTCISO } from '../../utils/dateFormat';

const MembershipForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({ date: null, name: '', membershipStatus: '', country: '', membershipDuration: '', summary: '', startDate: null, endDate: null, driveLink: '' });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);

    useEffect(() => { if (isEdit) fetchItem(); }, [id]);

    const fetchItem = async () => {
        try {
            const response = await api.get(`/memberships/${id}`);
            const item = response.data.data;
            setFormData({
                date: item.date ? new Date(item.date) : null,
                name: item.name || '',
                membershipStatus: item.membershipStatus || '',
                country: item.country || '',
                membershipDuration: item.membershipDuration || '',
                summary: item.summary || '',
                startDate: item.startDate ? new Date(item.startDate) : null,
                endDate: item.endDate ? new Date(item.endDate) : null,
                driveLink: item.driveLink || ''
            });
        } catch (error) {
            toast.error('Error fetching membership');
            navigate('/memberships');
        } finally {
            setFetchLoading(false);
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const setDate = (key) => (value) => setFormData((prev) => ({ ...prev, [key]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.date) {
            toast.error('Initial Date is required (dd/MMM/yyyy)');
            return;
        }
        if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
            toast.error('End Date cannot be before Start Date');
            return;
        }

        const payload = {
            ...formData,
            date: dateToUTCISO(formData.date),
            startDate: formData.startDate ? dateToUTCISO(formData.startDate) : null,
            endDate: formData.endDate ? dateToUTCISO(formData.endDate) : null
        };

        setLoading(true);
        try {
            if (isEdit) {
                await api.put(`/memberships/${id}`, payload);
                toast.success(isAdmin ? 'Membership updated successfully' : 'Update request submitted for approval');
            } else {
                await api.post('/memberships', payload);
                toast.success('Membership created successfully');
            }
            window.dispatchEvent(new Event('pendingCountUpdated'));
            navigate('/memberships');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving membership');
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
                            {isEdit ? 'Edit Membership' : 'New Membership'}
                        </h1>
                        <p className="text-base-content/60">
                            {isEdit ? 'Update membership details' : 'Register a new institutional membership'}
                        </p>
                    </div>
                    <button onClick={() => navigate('/memberships')} className="btn btn-ghost gap-2">
                        <ArrowLeft size={20} />
                        Back to List
                    </button>
                </div>

                <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-content/5 overflow-hidden">
                    {/* Decorative Header Bar */}
                    <div className="h-2 bg-primary w-full"></div>

                    <div className="card-body p-6 md:p-10 gap-8">
                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Section 1: Membership Details */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Award size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Membership Details</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="form-control w-full lg:col-span-2">
                                        <label className="label font-medium"><span className="label-text">Membership Name *</span></label>
                                        <input
                                            type="text"
                                            name="name"
                                            placeholder="Full Name of the Membership"
                                            className="input input-bordered w-full focus:input-primary transition-all font-semibold"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Status</span></label>
                                        <select
                                            name="membershipStatus"
                                            className="select select-bordered w-full focus:select-primary transition-all"
                                            value={formData.membershipStatus}
                                            onChange={handleChange}
                                        >
                                            <option value="">Select Status</option>
                                            {withCurrentOption(MEMBERSHIP_STATUSES, formData.membershipStatus).map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Duration</span></label>
                                        <Combobox
                                            options={MEMBERSHIP_DURATIONS}
                                            value={formData.membershipDuration}
                                            onChange={(value) => setFormData((prev) => ({ ...prev, membershipDuration: value }))}
                                            placeholder="e.g. 1 Year, Lifetime"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                        />
                                    </div>
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Country</span></label>
                                        <CountrySelect
                                            value={formData.country}
                                            onChange={(value) => setFormData((prev) => ({ ...prev, country: value }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Dates & Timeline */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                                        <Calendar size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Important Dates</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Initial Date *</span></label>
                                        <ScholarsDateField value={formData.date} onChange={setDate('date')} required />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Start Date</span></label>
                                        <ScholarsDateField value={formData.startDate} onChange={setDate('startDate')} />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">End Date</span></label>
                                        <ScholarsDateField value={formData.endDate} onChange={setDate('endDate')} />
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

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Summary</span></label>
                                        <textarea
                                            name="summary"
                                            placeholder="Brief summary..."
                                            className="textarea textarea-bordered w-full h-24 focus:textarea-primary transition-all"
                                            value={formData.summary}
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
                                    {loading ? 'Saving...' : (isEdit ? 'Update Membership' : 'Create Membership')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MembershipForm;

