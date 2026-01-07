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
        school: '',
        mouStatus: '',
        activeStatus: 'Active',
        contactPerson: '',
        email: '',
        phoneNumber: '',
        agreementType: '',
        link: '',
        completedOn: '',
        submitted: '',
        signingDate: '',
        expiringDate: ''
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
                school: partner.school || '',
                mouStatus: partner.mouStatus || '',
                activeStatus: partner.activeStatus || 'Active',
                contactPerson: partner.contactPerson || '',
                email: partner.email || '',
                phoneNumber: partner.phoneNumber || '',
                agreementType: partner.agreementType || '',
                link: partner.link || '',
                completedOn: partner.completedOn ? partner.completedOn.split('T')[0] : '',
                submitted: partner.submitted ? partner.submitted.split('T')[0] : '',
                signingDate: partner.signingDate ? partner.signingDate.split('T')[0] : '',
                expiringDate: partner.expiringDate ? partner.expiringDate.split('T')[0] : ''
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
                        {/* Basic Information */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
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
                                        <span className="label-text">School/Department</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="school"
                                        placeholder="Enter school/department"
                                        className="input input-bordered w-full"
                                        value={formData.school}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text">Agreement Type</span>
                                    </label>
                                    <select
                                        name="agreementType"
                                        className="select select-bordered w-full"
                                        value={formData.agreementType}
                                        onChange={handleChange}
                                    >
                                        <option value="">Select type</option>
                                        <option value="MoU">MoU</option>
                                        <option value="MoA">MoA</option>
                                        <option value="Bilateral Agreement">Bilateral Agreement</option>
                                        <option value="Student Exchange">Student Exchange</option>
                                        <option value="Faculty Exchange">Faculty Exchange</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-3">Contact Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text">Contact Person</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="contactPerson"
                                        placeholder="Enter contact person name"
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
                                        placeholder="Enter email address"
                                        className="input input-bordered w-full"
                                        value={formData.email}
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

                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text">Link/Website</span>
                                    </label>
                                    <input
                                        type="url"
                                        name="link"
                                        placeholder="Enter website URL"
                                        className="input input-bordered w-full"
                                        value={formData.link}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Status Information */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-3">Status</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text">MoU Status</span>
                                    </label>
                                    <select
                                        name="mouStatus"
                                        className="select select-bordered w-full"
                                        value={formData.mouStatus}
                                        onChange={handleChange}
                                    >
                                        <option value="">Select status</option>
                                        <option value="Draft">Draft</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Signed">Signed</option>
                                        <option value="Expired">Expired</option>
                                        <option value="Renewed">Renewed</option>
                                    </select>
                                </div>

                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text">Active Status *</span>
                                    </label>
                                    <select
                                        name="activeStatus"
                                        className="select select-bordered w-full"
                                        value={formData.activeStatus}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-3">Important Dates</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text">Completed On</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="completedOn"
                                        className="input input-bordered w-full"
                                        value={formData.completedOn}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text">Submitted Date</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="submitted"
                                        className="input input-bordered w-full"
                                        value={formData.submitted}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text">Signing Date</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="signingDate"
                                        className="input input-bordered w-full"
                                        value={formData.signingDate}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text">Expiring Date</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="expiringDate"
                                        className="input input-bordered w-full"
                                        value={formData.expiringDate}
                                        onChange={handleChange}
                                    />
                                </div>
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
