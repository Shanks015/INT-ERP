import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft } from 'lucide-react';

const StudentExchangeForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        direction: '',
        studentName: '',
        exchangeUniversity: '',
        course: '',
        semesterYear: '',
        exchangeStatus: '',
        usnNo: '',
        fromDate: '',
        toDate: '',
        driveLink: ''
    });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);

    useEffect(() => { if (isEdit) fetchItem(); }, [id]);

    const fetchItem = async () => {
        try {
            const response = await api.get(`/student-exchange/${id}`);
            const item = response.data.data;
            setFormData({
                direction: item.direction || '',
                studentName: item.studentName || '',
                exchangeUniversity: item.exchangeUniversity || '',
                course: item.course || '',
                semesterYear: item.semesterYear || '',
                exchangeStatus: item.exchangeStatus || '',
                usnNo: item.usnNo || '',
                fromDate: item.fromDate ? new Date(item.fromDate).toISOString().split('T')[0] : '',
                toDate: item.toDate ? new Date(item.toDate).toISOString().split('T')[0] : '',
                driveLink: item.driveLink || ''
            });
        } catch (error) {
            toast.error('Error fetching record');
            navigate('/student-exchange');
        } finally {
            setFetchLoading(false);
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEdit) {
                await api.put(`/student-exchange/${id}`, formData);
                toast.success(isAdmin ? 'Record updated successfully' : 'Update request submitted for approval');
            } else {
                await api.post('/student-exchange', formData);
                toast.success('Record created successfully');
            }
            window.dispatchEvent(new Event('pendingCountUpdated'));
            navigate('/student-exchange');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving record');
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div>
            <div className="mb-6">
                <button onClick={() => navigate('/student-exchange')} className="btn btn-ghost btn-sm mb-4"><ArrowLeft size={18} />Back</button>
                <h1 className="text-3xl font-bold">{isEdit ? 'Edit Student Exchange' : 'Add Student Exchange'}</h1>
            </div>

            <div className="card bg-base-100 shadow-xl max-w-2xl">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control w-full"><label className="label"><span className="label-text">Direction *</span></label><select name="direction" className="select select-bordered w-full" value={formData.direction} onChange={handleChange} required><option value="">Select</option><option value="Incoming">Incoming</option><option value="Outgoing">Outgoing</option></select></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Student Name *</span></label><input type="text" name="studentName" placeholder="Student name" className="input input-bordered w-full" value={formData.studentName} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">USN No</span></label><input type="text" name="usnNo" placeholder="USN Number" className="input input-bordered w-full" value={formData.usnNo} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Exchange University *</span></label><input type="text" name="exchangeUniversity" placeholder="University" className="input input-bordered w-full" value={formData.exchangeUniversity} onChange={handleChange} required /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Course</span></label><input type="text" name="course" placeholder="Course" className="input input-bordered w-full" value={formData.course} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Semester/Year</span></label><input type="text" name="semesterYear" placeholder="e.g. Fall 2024" className="input input-bordered w-full" value={formData.semesterYear} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">Exchange Status</span></label><input type="text" name="exchangeStatus" placeholder="Status" className="input input-bordered w-full" value={formData.exchangeStatus} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">From Date</span></label><input type="date" name="fromDate" className="input input-bordered w-full" value={formData.fromDate} onChange={handleChange} /></div>
                            <div className="form-control w-full"><label className="label"><span className="label-text">To Date</span></label><input type="date" name="toDate" className="input input-bordered w-full" value={formData.toDate} onChange={handleChange} /></div>
                            <div className="form-control w-full md:col-span-2"><label className="label"><span className="label-text">Drive Link</span></label><input type="url" name="driveLink" placeholder="https://drive.google.com/..." className="input input-bordered w-full" value={formData.driveLink} onChange={handleChange} /></div>
                        </div>
                        <div className="form-control mt-6">
                            <button type="submit" className={`btn btn-primary ${loading ? 'loading' : ''}`} disabled={loading}>{!loading && <Save size={18} className="mr-2" />}{loading ? 'Saving...' : (isEdit ? 'Update' : 'Create')}</button>
                        </div>
                    </form>
                </div>
            </div >
        </div >
    );
};

export default StudentExchangeForm;
