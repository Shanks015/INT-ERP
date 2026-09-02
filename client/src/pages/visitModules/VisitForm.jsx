import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, MapPin, Calendar, FileText } from 'lucide-react';
import ScholarsDateField from '../../components/ScholarsDateField';

/**
 * Create/edit form shared by the three campus modules (Campus Visit,
 * Seminar/Guest Lecture, Consultant Visit). Record shape is identical across
 * modules — only the endpoint/labels and whether the type is user-selectable
 * differ. Dates enter and display as dd/MMM/yyyy via ScholarsDateField.
 */
const VisitForm = ({ config }) => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const isEdit = Boolean(id);
    const showTypeSelect = config.typeOptions.length > 1;

    const [formData, setFormData] = useState({
        date: null,
        type: config.typeDefault,
        visitorName: '',
        universityName: '',
        country: '',
        department: '',
        campus: '',
        summary: '',
        driveLink: '',
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);

    useEffect(() => {
        if (isEdit) fetchRecord();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchRecord = async () => {
        try {
            const response = await api.get(`/${config.module}/${id}`);
            const record = response.data.data;
            setFormData({
                date: record.date ? new Date(record.date) : null,
                type: record.type || config.typeDefault,
                visitorName: record.visitorName || '',
                universityName: record.universityName || '',
                country: record.country || '',
                department: record.department || '',
                campus: record.campus || '',
                summary: record.summary || '',
                driveLink: record.driveLink || '',
                notes: record.notes || ''
            });
        } catch (error) {
            toast.error('Error fetching record');
            navigate(`/${config.module}`);
        } finally {
            setFetchLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const setDate = (date) => {
        setFormData(prev => ({ ...prev, date }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.date) {
            toast.error('Please enter a valid date');
            return;
        }
        setLoading(true);

        try {
            const payload = {
                ...formData,
                date: formData.date.toISOString(),
                type: showTypeSelect ? formData.type : config.typeDefault
            };
            if (isEdit) {
                await api.put(`/${config.module}/${id}`, payload);
                toast.success(isAdmin ? `${config.moduleLabel} updated successfully` : 'Update request submitted for approval');
            } else {
                await api.post(`/${config.module}`, payload);
                toast.success(`${config.moduleLabel} created successfully`);
            }

            window.dispatchEvent(new Event('pendingCountUpdated'));
            navigate(`/${config.module}`);
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
                            {isEdit ? `Edit ${config.moduleLabel}` : `New ${config.moduleLabel}`}
                        </h1>
                        <p className="text-base-content/60">
                            {isEdit ? 'Update record details' : `Register a new ${config.moduleLabel.toLowerCase()} record`}
                        </p>
                    </div>
                    <button onClick={() => navigate(`/${config.module}`)} className="btn btn-ghost gap-2">
                        <ArrowLeft size={20} />
                        Back to List
                    </button>
                </div>

                <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-content/5 overflow-hidden">
                    {/* Decorative Header Bar */}
                    <div className="h-2 bg-primary w-full"></div>

                    <div className="card-body p-6 md:p-10 gap-8">
                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Section 1: Visitor / Record Details */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Calendar size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">{config.moduleLabel} Details</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Date *</span></label>
                                        <ScholarsDateField value={formData.date} onChange={setDate} required />
                                    </div>

                                    {showTypeSelect && (
                                        <div className="form-control w-full">
                                            <label className="label font-medium"><span className="label-text">Type</span></label>
                                            <select
                                                name="type"
                                                className="select select-bordered w-full focus:select-primary transition-all"
                                                value={formData.type}
                                                onChange={handleChange}
                                            >
                                                <option value="">Select Type</option>
                                                {config.typeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </div>
                                    )}

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
                                        <label className="label font-medium"><span className="label-text">Summary</span></label>
                                        <textarea
                                            name="summary"
                                            placeholder={`Detailed summary of the ${config.moduleLabel.toLowerCase()}...`}
                                            className="textarea textarea-bordered w-full h-24 focus:textarea-primary transition-all"
                                            value={formData.summary}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Resources & Notes */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-accent/10 rounded-lg text-accent">
                                        <FileText size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Resources & Notes</h3>
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
                                    {loading ? 'Saving...' : (isEdit ? 'Update Record' : 'Create Record')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VisitForm;
