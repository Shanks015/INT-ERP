import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft } from 'lucide-react';

const PartnerForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        country: '',
        university: '',
        contactName: '',
        email: '',
        reply: '',
        contactPerson: '',
        phoneNumber: ''
    });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);

    useEffect(() => {
        if (isEdit) {
            fetchPartner();
        }
    }, [id]);

    const fetchPartner = async () => {
        try {
            const response = await api.get(`/partners/${id}`);
            const partner = response.data.data;
            setFormData({
                country: partner.country || '',
                university: partner.university || '',
                contactName: partner.contactName || '',
                email: partner.email || '',
                reply: partner.reply || '',
                contactPerson: partner.contactPerson || '',
                phoneNumber: partner.phoneNumber || ''
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isEdit) {
                await api.put(`/partners/${id}`, formData);
                if (isAdmin) {
                    toast.success('Partner updated successfully');
                } else {
                    toast.success('Update request submitted for approval');
                }
            } else {
                await api.post('/partners', formData);
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
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <button onClick={() => navigate('/partners')} className="btn btn-ghost btn-sm mb-4">
                    <ArrowLeft size={18} />
                    Back to Partners
                </button>
                <h1 className="text-3xl font-bold">
                    {isEdit ? 'Edit Partner' : 'Add New Partner'}
                </h1>
            </div>

            <div className="card bg-base-100 shadow-xl max-w-2xl">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    <span className="label-text">University *</span>
                                </label>
                                <input
                                    type="text"
                                    name="university"
                                    placeholder="Enter university name"
                                    className="input input-bordered w-full"
                                    value={formData.university}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text">Contact Name</span>
                                </label>
                                <input
                                    type="text"
                                    name="contactName"
                                    placeholder="Enter contact name"
                                    className="input input-bordered w-full"
                                    value={formData.contactName}
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
                                    <span className="label-text">Phone Number</span>
                                </label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    placeholder="Enter phone number"
                                    className="input input-bordered w-full"
                                    value={formData.phoneNumber}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-control w-full md:col-span-2">
                                <label className="label">
                                    <span className="label-text">Reply/Notes</span>
                                </label>
                                <textarea
                                    name="reply"
                                    placeholder="Enter any notes or replies"
                                    className="textarea textarea-bordered w-full"
                                    rows={3}
                                    value={formData.reply}
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
                                {loading ? 'Saving...' : (isEdit ? 'Update Partner' : 'Create Partner')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PartnerForm;
