import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, Globe, User, Phone, Link2, BookOpen } from 'lucide-react';
import CountrySelect from '../../components/CountrySelect';
import Combobox from '../../components/Combobox';

const PARTNERSHIP_TYPE_SUGGESTIONS = ['Student Exchange', 'Research', 'Joint Degree', 'MoU/MoA', 'Faculty Exchange', 'Internship', 'Training', 'Collaborative Program'];

const OutreachNewForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useAuth();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        university: '',
        country: '',
        contactName: '',
        contactPerson: '',
        email: '',
        phone: '',
        website: '',
        partnershipType: '',
        department: '',
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
            const response = await api.get(`/outreach-new/${id}`);
            const data = response.data.data;
            setFormData({
                university:      data.university || '',
                country:         data.country || '',
                contactName:     data.contactName || '',
                contactPerson:   data.contactPerson || '',
                email:           data.email || '',
                phone:           data.phone || '',
                website:         data.website || '',
                partnershipType: data.partnershipType || '',
                department:      data.department || '',
                notes:           data.notes || ''
            });
        } catch (error) {
            toast.error('Error fetching outreach data');
            navigate('/outreach-new');
        } finally {
            setFetchLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isEdit) {
                await api.put(`/outreach-new/${id}`, formData);
                toast.success('Outreach record updated successfully ✅');
            } else {
                await api.post('/outreach-new', formData);
                toast.success('Outreach record created successfully ✅');
            }
            navigate('/outreach-new');
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
                            {isEdit ? 'Edit Outreach (New)' : 'New Outreach (New)'}
                        </h1>
                        <p className="text-base-content/60">
                            {isEdit ? 'Update outreach activity details' : 'Log a new outreach initiative'}
                        </p>
                    </div>
                    <button onClick={() => navigate('/outreach-new')} className="btn btn-ghost gap-2">
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
                                        <label className="label font-medium"><span className="label-text">University / Institution *</span></label>
                                        <input type="text" name="university" placeholder="University Name"
                                            className="input input-bordered w-full focus:input-primary transition-all font-semibold"
                                            value={formData.university} onChange={handleChange} required />
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
                                        <label className="label font-medium"><span className="label-text">Website</span></label>
                                        <input type="url" name="website" placeholder="https://example.edu"
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

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Contact Name</span></label>
                                        <input type="text" name="contactName" placeholder="Dr. John Doe"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.contactName} onChange={handleChange} />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Contact Person Designation</span></label>
                                        <input type="text" name="contactPerson" placeholder="Dean of IA"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.contactPerson} onChange={handleChange} />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Email Address *</span></label>
                                        <input type="email" name="email" placeholder="dean.ia@example.edu"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.email} onChange={handleChange} required />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Phone Number</span></label>
                                        <input type="tel" name="phone" placeholder="+1234567890"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.phone} onChange={handleChange} />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Department</span></label>
                                        <input type="text" name="department" placeholder="International Affairs"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.department} onChange={handleChange} />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Partnership Interest Type</span></label>
                                        <Combobox
                                            options={PARTNERSHIP_TYPE_SUGGESTIONS}
                                            value={formData.partnershipType}
                                            onChange={(value) => setFormData((prev) => ({ ...prev, partnershipType: value }))}
                                            placeholder="Student Exchange / Research"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                        />
                                        <label className="label">
                                            <span className="label-text-alt text-base-content/60">Select existing or type new</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Notes & Comments */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-info/10 rounded-lg text-info">
                                        <BookOpen size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Notes & Remarks</h3>
                                </div>

                                <div className="form-control w-full">
                                    <textarea name="notes" placeholder="Add any background notes, context, or follow-up details..."
                                        className="textarea textarea-bordered w-full min-h-[120px] focus:textarea-primary transition-all"
                                        value={formData.notes} onChange={handleChange}></textarea>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-6 border-t border-base-200">
                                <button type="button" onClick={() => navigate('/outreach-new')} className="btn btn-outline">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary gap-2" disabled={loading}>
                                    {loading ? <span className="loading loading-spinner" /> : <Save size={18} />}
                                    Save Record
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OutreachNewForm;
