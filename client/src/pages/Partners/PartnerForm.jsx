import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, Globe, Link as LinkIcon, Calendar } from 'lucide-react';
import { getCaseInsensitiveUnique } from '../../utils/filterUtils';
import ScholarsDateField from '../../components/ScholarsDateField';
import CountrySelect from '../../components/CountrySelect';
import Combobox from '../../components/Combobox';
import { AGREEMENT_TYPES, PARTNER_MOU_STATUS, ACTIVE_STATUSES } from '../../constants/options';
import { withCurrentOption } from '../../utils/optionUtils';
import { dateToUTCISO } from '../../utils/dateFormat';

const PartnerForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        country: '',
        university: '',
        school: '',
        mouStatus: '',
        activeStatus: 'Active',
        contactPerson: '',
        email: '',
        phoneNumber: '',
        agreementType: '',
        link: '',
        completedOn: null,
        submitted: null,
        signingDate: null,
        expiringDate: null
    });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);
    const [agreementTypes, setAgreementTypes] = useState([]);

    useEffect(() => {
        if (isEdit) {
            fetchPartner();
        }
        fetchAgreementTypes();
    }, [id]);

    const fetchAgreementTypes = async () => {
        try {
            const response = await api.get('/partners', { params: { limit: 1000 } });
            const partners = response.data.data || [];
            const types = getCaseInsensitiveUnique(partners, 'agreementType');
            setAgreementTypes(types);
        } catch (error) {
            console.error('Error fetching agreement types:', error);
        }
    };

    const fetchPartner = async () => {
        try {
            const response = await api.get(`/partners/${id}`);
            const partner = response.data.data;
            setFormData({
                country: partner.country || '',
                university: partner.university || '',
                school: partner.school || '',
                mouStatus: partner.mouStatus || '',
                activeStatus: partner.activeStatus || 'Active',
                contactPerson: partner.contactPerson || '',
                email: partner.email || '',
                phoneNumber: partner.phoneNumber || '',
                agreementType: partner.agreementType || '',
                link: partner.link || '',
                completedOn: partner.completedOn ? new Date(partner.completedOn) : null,
                submitted: partner.submitted ? new Date(partner.submitted) : null,
                signingDate: partner.signingDate ? new Date(partner.signingDate) : null,
                expiringDate: partner.expiringDate ? new Date(partner.expiringDate) : null
            });
        } catch (error) {
            toast.error('Error fetching partner');
            navigate('/partners');
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

    const setDate = (key) => (value) => setFormData((prev) => ({ ...prev, [key]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.signingDate && formData.expiringDate && formData.signingDate > formData.expiringDate) {
            toast.error('Signing Date cannot be after Expiring Date');
            return;
        }

        const payload = {
            ...formData,
            completedOn: formData.completedOn ? dateToUTCISO(formData.completedOn) : null,
            submitted: formData.submitted ? dateToUTCISO(formData.submitted) : null,
            signingDate: formData.signingDate ? dateToUTCISO(formData.signingDate) : null,
            expiringDate: formData.expiringDate ? dateToUTCISO(formData.expiringDate) : null
        };

        setLoading(true);

        try {
            if (isEdit) {
                await api.put(`/partners/${id}`, payload);
                if (isAdmin) {
                    toast.success('Partner updated successfully');
                } else {
                    toast.success('Update request submitted for approval');
                }
            } else {
                await api.post('/partners', payload);
                toast.success('Partner created successfully');
            }

            // Trigger pending count update
            window.dispatchEvent(new Event('pendingCountUpdated'));

            navigate('/partners');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving partner');
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
                            {isEdit ? 'Edit Partner' : 'New Partnership'}
                        </h1>
                        <p className="text-base-content/60">
                            {isEdit ? 'Update partnership details and status' : 'Register a new international partnership'}
                        </p>
                    </div>
                    <button onClick={() => navigate('/partners')} className="btn btn-ghost gap-2">
                        <ArrowLeft size={20} />
                        Back to List
                    </button>
                </div>

                <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-content/5 overflow-hidden">
                    {/* Decorative Header Bar */}
                    <div className="h-2 bg-primary w-full"></div>

                    <div className="card-body p-6 md:p-10 gap-8">
                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Section 1: Basic Info */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Globe size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Institution Details</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Country *</span></label>
                                        <CountrySelect
                                            value={formData.country}
                                            onChange={(value) => setFormData((prev) => ({ ...prev, country: value }))}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full lg:col-span-2">
                                        <label className="label font-medium"><span className="label-text">University Name *</span></label>
                                        <input
                                            type="text"
                                            name="university"
                                            placeholder="e.g. University of Cambridge"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.university}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">School/Department</span></label>
                                        <input
                                            type="text"
                                            name="school"
                                            placeholder="Specific department (Optional)"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.school}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Agreement Type</span></label>
                                        <Combobox
                                            options={[...new Set([...AGREEMENT_TYPES, ...agreementTypes])]}
                                            value={formData.agreementType}
                                            onChange={(value) => setFormData((prev) => ({ ...prev, agreementType: value }))}
                                            placeholder="Select or enter agreement type"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Contact Info */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                                        <LinkIcon size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Contact & Reference</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Contact Person</span></label>
                                        <input
                                            type="text"
                                            name="contactPerson"
                                            placeholder="Name of representative"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.contactPerson}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Email Address</span></label>
                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="official@university.edu"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.email}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Phone Number</span></label>
                                        <input
                                            type="tel"
                                            name="phoneNumber"
                                            placeholder="+1 234 567 890"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.phoneNumber}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Website / Link</span></label>
                                        <input
                                            type="url"
                                            name="link"
                                            placeholder="https://..."
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.link}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Status & Dates */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-accent/10 rounded-lg text-accent">
                                        <Calendar size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Status & Timeline</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">MoU Status</span></label>
                                        <select
                                            name="mouStatus"
                                            className="select select-bordered w-full focus:select-primary transition-all"
                                            value={formData.mouStatus}
                                            onChange={handleChange}
                                        >
                                            <option value="">Select Status</option>
                                            {withCurrentOption(PARTNER_MOU_STATUS, formData.mouStatus).map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Active Status *</span></label>
                                        <select
                                            name="activeStatus"
                                            className={`select select-bordered w-full font-bold ${formData.activeStatus === 'Active' ? 'text-success' : 'text-error'}`}
                                            value={formData.activeStatus}
                                            onChange={handleChange}
                                            required
                                        >
                                            {withCurrentOption(ACTIVE_STATUSES, formData.activeStatus).map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Signing Date</span></label>
                                        <ScholarsDateField value={formData.signingDate} onChange={setDate('signingDate')} />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Expiring Date</span></label>
                                        <ScholarsDateField value={formData.expiringDate} onChange={setDate('expiringDate')} />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Completed On</span></label>
                                        <ScholarsDateField value={formData.completedOn} onChange={setDate('completedOn')} />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Submitted Date</span></label>
                                        <ScholarsDateField value={formData.submitted} onChange={setDate('submitted')} />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end pt-6 border-t border-base-200">
                                <button
                                    type="submit"
                                    className={`btn btn-primary btn-lg px-8 ${loading ? 'loading' : ''}`}
                                    disabled={loading}
                                >
                                    {!loading && <Save size={20} className="mr-2" />}
                                    {loading ? 'Saving...' : (isEdit ? 'Update Partner' : 'Create Partner')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PartnerForm;

