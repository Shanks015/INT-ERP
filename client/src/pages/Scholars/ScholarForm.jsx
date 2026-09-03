import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, GraduationCap, Calendar, FileText, Phone, Mail, Award, Timer } from 'lucide-react';
import ScholarsDateField from '../../components/ScholarsDateField';
import CountrySelect from '../../components/CountrySelect';
import { SCHOLAR_DESIGNATIONS, SCHOLAR_CAMPUSES, SCHOLAR_STATUSES } from '../../constants/options';
import { withCurrentOption } from '../../utils/optionUtils';
import { dateToUTCISO } from '../../utils/dateFormat';

const ScholarForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        scholarName: '',
        designation: '',
        university: '',
        country: '',
        qsRanking: '',
        durationDays: '',
        startDate: null,
        endDate: null,
        department: '',
        campus: '',
        scholarStatus: '',
        email: '',
        mobile: '',
        summary: '',
        driveLink: '',
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);

    useEffect(() => {
        if (isEdit) fetchItem();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchItem = async () => {
        try {
            const response = await api.get(`/scholars-in-residence/${id}`);
            const item = response.data.data;
            setFormData({
                scholarName: item.scholarName || '',
                designation: item.designation || '',
                university: item.university || '',
                country: item.country || '',
                qsRanking: item.qsRanking ? String(item.qsRanking) : '',
                durationDays: item.durationDays ? String(item.durationDays) : '',
                startDate: item.startDate ? new Date(item.startDate) : null,
                endDate: item.endDate ? new Date(item.endDate) : null,
                department: item.department || '',
                campus: item.campus || '',
                scholarStatus: item.scholarStatus || '',
                email: item.email || '',
                mobile: item.mobile || '',
                summary: item.summary || '',
                driveLink: item.driveLink || '',
                notes: item.notes || ''
            });
        } catch (error) {
            toast.error('Error fetching scholar');
            navigate('/scholars-in-residence');
        } finally {
            setFetchLoading(false);
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const setDate = (key) => (value) => setFormData((prev) => ({ ...prev, [key]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.startDate) {
            toast.error('Start Date is required (dd/MMM/yyyy)');
            return;
        }
        if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
            toast.error('End Date cannot be before Start Date');
            return;
        }

        // Convert '' -> null for optional numbers and strings the model validates
        const payload = {
            scholarName: formData.scholarName.trim(),
            designation: formData.designation.trim(),
            university: formData.university.trim(),
            country: formData.country.trim(),
            qsRanking: formData.qsRanking === '' || formData.qsRanking == null ? null : Number(formData.qsRanking),
            durationDays: formData.durationDays === '' || formData.durationDays == null ? null : Number(formData.durationDays),
            startDate: dateToUTCISO(formData.startDate),
            endDate: formData.endDate ? dateToUTCISO(formData.endDate) : null,
            department: formData.department.trim(),
            campus: formData.campus.trim(),
            scholarStatus: formData.scholarStatus.trim(),
            email: formData.email.trim() || null,
            mobile: formData.mobile.trim() || null,
            summary: formData.summary.trim(),
            driveLink: formData.driveLink.trim() || null,
            notes: formData.notes.trim()
        };

        setLoading(true);
        try {
            if (isEdit) {
                await api.put(`/scholars-in-residence/${id}`, payload);
                toast.success(isAdmin ? 'Scholar updated successfully' : 'Update request submitted for approval');
            } else {
                await api.post('/scholars-in-residence', payload);
                toast.success('Scholar created successfully');
            }
            window.dispatchEvent(new Event('pendingCountUpdated'));
            navigate('/scholars-in-residence');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving scholar');
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
                            {isEdit ? 'Edit Scholar' : 'New Scholar'}
                        </h1>
                        <p className="text-base-content/60">
                            {isEdit ? 'Update scholar details' : 'Register a new scholar in residence'}
                        </p>
                    </div>
                    <button onClick={() => navigate('/scholars-in-residence')} className="btn btn-ghost gap-2">
                        <ArrowLeft size={20} />
                        Back to List
                    </button>
                </div>

                <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-content/5 overflow-hidden">
                    {/* Decorative Header Bar */}
                    <div className="h-2 bg-primary w-full"></div>

                    <div className="card-body p-6 md:p-10 gap-8">
                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Section 1: Scholar Profile */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <GraduationCap size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Scholar Profile</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="form-control w-full lg:col-span-2">
                                        <label className="label font-medium"><span className="label-text">Scholar Name *</span></label>
                                        <input
                                            type="text"
                                            name="scholarName"
                                            placeholder="Full Name"
                                            className="input input-bordered w-full focus:input-primary transition-all font-semibold"
                                            value={formData.scholarName}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Designation</span></label>
                                        <select
                                            name="designation"
                                            className="select select-bordered w-full focus:select-primary transition-all"
                                            value={formData.designation}
                                            onChange={handleChange}
                                        >
                                            <option value="">Select Designation</option>
                                            {withCurrentOption(SCHOLAR_DESIGNATIONS, formData.designation).map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">University</span></label>
                                        <input
                                            type="text"
                                            name="university"
                                            placeholder="Home University"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.university}
                                            onChange={handleChange}
                                        />
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
                                        <label className="label font-medium"><span className="label-text">QS Ranking</span></label>
                                        <div className="relative">
                                            <Award size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
                                            <input
                                                type="number"
                                                name="qsRanking"
                                                min="1"
                                                placeholder="e.g. 251"
                                                className="input input-bordered w-full pl-9 focus:input-primary transition-all"
                                                value={formData.qsRanking}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Status</span></label>
                                        <select
                                            name="scholarStatus"
                                            className="select select-bordered w-full focus:select-primary transition-all"
                                            value={formData.scholarStatus}
                                            onChange={handleChange}
                                        >
                                            <option value="">Select Status</option>
                                            {withCurrentOption(SCHOLAR_STATUSES, formData.scholarStatus).map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Visit & Timeline */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                                        <Calendar size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Visit &amp; Timeline</h3>
                                    <span className="text-sm text-base-content/40 ml-auto hidden sm:inline">Dates use dd/MMM/yyyy</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Start Date *</span></label>
                                        <ScholarsDateField value={formData.startDate} onChange={setDate('startDate')} required />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">End Date</span></label>
                                        <ScholarsDateField value={formData.endDate} onChange={setDate('endDate')} />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Duration / Days</span></label>
                                        <div className="relative">
                                            <Timer size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
                                            <input
                                                type="number"
                                                name="durationDays"
                                                min="1"
                                                placeholder="e.g. 15"
                                                className="input input-bordered w-full pl-9 focus:input-primary transition-all"
                                                value={formData.durationDays}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Accommodation / Campus</span></label>
                                        <select
                                            name="campus"
                                            className="select select-bordered w-full focus:select-primary transition-all"
                                            value={formData.campus}
                                            onChange={handleChange}
                                        >
                                            <option value="">Select Campus</option>
                                            {withCurrentOption(SCHOLAR_CAMPUSES, formData.campus).map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-control w-full md:col-span-2">
                                        <label className="label font-medium"><span className="label-text">Schools / Department</span></label>
                                        <input
                                            type="text"
                                            name="department"
                                            placeholder="Host Department / School"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.department}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Contact */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-accent/10 rounded-lg text-accent">
                                        <Phone size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Contact Details</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Email</span></label>
                                        <div className="relative">
                                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
                                            <input
                                                type="email"
                                                name="email"
                                                placeholder="name@university.edu"
                                                className="input input-bordered w-full pl-9 focus:input-primary transition-all"
                                                value={formData.email}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Mobile</span></label>
                                        <div className="relative">
                                            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
                                            <input
                                                type="text"
                                                name="mobile"
                                                inputMode="tel"
                                                placeholder="+91 98XXXXXXXX"
                                                className="input input-bordered w-full pl-9 focus:input-primary transition-all"
                                                value={formData.mobile}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Remarks & Attachments */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-accent/10 rounded-lg text-accent">
                                        <FileText size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Remarks &amp; Attachments</h3>
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
                                        <label className="label font-medium"><span className="label-text">Remarks / Summary</span></label>
                                        <textarea
                                            name="summary"
                                            placeholder="Brief summary / remarks about the visit..."
                                            className="textarea textarea-bordered w-full h-24 focus:textarea-primary transition-all"
                                            rows="3"
                                            value={formData.summary}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium">
                                            <span className="label-text">Notes</span>
                                            <span className="label-text-alt text-base-content/40">Short note shown on the list page</span>
                                        </label>
                                        <textarea
                                            name="notes"
                                            placeholder="e.g. Wrong link - should be updated"
                                            className="textarea textarea-bordered w-full focus:textarea-primary transition-all"
                                            rows="2"
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
                                    {loading ? 'Saving...' : (isEdit ? 'Update Scholar' : 'Create Scholar')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScholarForm;
