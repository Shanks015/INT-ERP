import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft } from 'lucide-react';

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
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <button onClick={() => navigate('/outreach')} className="btn btn-ghost btn-sm mb-4">
                    <ArrowLeft size={18} />
                    Back to Outreach
                </button>
                <h1 className="text-3xl font-bold">
                    {isEdit ? 'Edit Outreach' : 'Add New Outreach'}
                </h1>
            </div>

            <div className="card bg-base-100 shadow-xl max-w-2xl">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text">Name *</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Enter name"
                                    className="input input-bordered w-full"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text">Country *</span>
                                </label>
                                <input
                                    type="text"
                                    name="country"
                                    placeholder="Enter country"
                                    className="input input-bordered w-full"
                                    value={formData.country}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text">University</span>
                                </label>
                                <input
                                    type="text"
                                    name="university"
                                    placeholder="Enter university name"
                                    className="input input-bordered w-full"
                                    value={formData.university}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text">Contact Person</span>
                                </label>
                                <input
                                    type="text"
                                    name="contactPerson"
                                    placeholder="Enter contact person"
                                    className="input input-bordered w-full"
                                    value={formData.contactPerson}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text">Email</span>
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Enter email"
                                    className="input input-bordered w-full"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text">Phone</span>
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    placeholder="Enter phone number"
                                    className="input input-bordered w-full"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-control w-full md:col-span-2">
                                <label className="label">
                                    <span className="label-text">Website</span>
                                </label>
                                <input
                                    type="url"
                                    name="website"
                                    placeholder="Enter website URL"
                                    className="input input-bordered w-full"
                                    value={formData.website}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-control w-full md:col-span-2">
                                <label className="label">
                                    <span className="label-text">Partnership Type</span>
                                </label>
                                <input
                                    type="text"
                                    name="partnershipType"
                                    placeholder="Enter partnership type"
                                    className="input input-bordered w-full"
                                    value={formData.partnershipType}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-control w-full md:col-span-2">
                                <label className="label">
                                    <span className="label-text">Reply</span>
                                </label>
                                <textarea
                                    name="reply"
                                    placeholder="Enter reply details"
                                    className="textarea textarea-bordered w-full"
                                    rows={2}
                                    value={formData.reply}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-control w-full md:col-span-2">
                                <label className="label">
                                    <span className="label-text">Notes</span>
                                </label>
                                <textarea
                                    name="notes"
                                    placeholder="Enter any notes"
                                    className="textarea textarea-bordered w-full"
                                    rows={3}
                                    value={formData.notes}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="form-control mt-6">
                            <button
                                type="submit"
                                className={`btn btn-primary ${loading ? 'loading' : ''}`}
                                disabled={loading}
                            >
                                {!loading && <Save size={18} className="mr-2" />}
                                {loading ? 'Saving...' : (isEdit ? 'Update Outreach' : 'Create Outreach')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default OutreachForm;
