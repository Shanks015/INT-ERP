import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, Calendar, Globe, Link as LinkIcon, Info, Users, FileText } from 'lucide-react';

const MeetingTrackerForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        meetingId: '',
        meetingTitle: '',
        date: '',
        startTime: '',
        endTime: '',
        timezone: 'IST',
        mode: 'Online',
        platformLocation: '',
        hostOrganization: '',
        hostName: '',
        hostEmail: '',
        participants: '',
        keyAgenda: '',
        discussionSummary: '',
        actionItems: '',
        nextMeetingDate: '',
        driveLink: '',
        remarks: ''
    });
    
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);

    useEffect(() => {
        if (isEdit) fetchMeeting();
    }, [id]);

    const fetchMeeting = async () => {
        try {
            const response = await api.get(`/meeting-trackers/${id}`);
            const meeting = response.data.data;
            setFormData({
                meetingId: meeting.meetingId || '',
                meetingTitle: meeting.meetingTitle || '',
                date: meeting.date ? new Date(meeting.date).toISOString().split('T')[0] : '',
                startTime: meeting.startTime || '',
                endTime: meeting.endTime || '',
                timezone: meeting.timezone || 'IST',
                mode: meeting.mode || 'Online',
                platformLocation: meeting.platformLocation || '',
                hostOrganization: meeting.hostOrganization || '',
                hostName: meeting.hostName || '',
                hostEmail: meeting.hostEmail || '',
                participants: meeting.participants || '',
                keyAgenda: meeting.keyAgenda || '',
                discussionSummary: meeting.discussionSummary || '',
                actionItems: meeting.actionItems || '',
                nextMeetingDate: meeting.nextMeetingDate ? new Date(meeting.nextMeetingDate).toISOString().split('T')[0] : '',
                driveLink: meeting.driveLink || '',
                remarks: meeting.remarks || ''
            });
        } catch (error) {
            toast.error('Error fetching meeting record');
            navigate('/meeting-trackers');
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
                await api.put(`/meeting-trackers/${id}`, formData);
                toast.success(isAdmin ? 'Meeting record updated successfully' : 'Update request submitted for approval');
            } else {
                await api.post('/meeting-trackers', formData);
                toast.success('Meeting record created successfully');
            }
            window.dispatchEvent(new Event('pendingCountUpdated'));
            navigate('/meeting-trackers');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving meeting record');
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
                            {isEdit ? 'Edit Meeting Entry' : 'New Meeting Entry'}
                        </h1>
                        <p className="text-base-content/60">
                            {isEdit ? 'Update meeting tracking details' : 'Register a new meeting details'}
                        </p>
                    </div>
                    <button onClick={() => navigate('/meeting-trackers')} className="btn btn-ghost gap-2">
                        <ArrowLeft size={20} />
                        Back to List
                    </button>
                </div>

                <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-content/5 overflow-hidden">
                    <div className="h-2 bg-primary w-full"></div>

                    <div className="card-body p-6 md:p-10 gap-8">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            
                            {/* Section 1: Meeting Info */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Info size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Meeting Information</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Meeting ID *</span></label>
                                        <input
                                            type="text"
                                            name="meetingId"
                                            placeholder="e.g. IA-001"
                                            className="input input-bordered w-full focus:input-primary transition-all font-semibold"
                                            value={formData.meetingId}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full md:col-span-2">
                                        <label className="label font-medium"><span className="label-text">Meeting Title *</span></label>
                                        <input
                                            type="text"
                                            name="meetingTitle"
                                            placeholder="Enter meeting title"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.meetingTitle}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Date *</span></label>
                                        <input
                                            type="date"
                                            name="date"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.date}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Start Time</span></label>
                                        <input
                                            type="text"
                                            name="startTime"
                                            placeholder="e.g. 10:30 AM"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.startTime}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">End Time</span></label>
                                        <input
                                            type="text"
                                            name="endTime"
                                            placeholder="e.g. 11:30 AM"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.endTime}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Time Zone</span></label>
                                        <input
                                            type="text"
                                            name="timezone"
                                            placeholder="e.g. IST"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.timezone}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Mode & Host */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                                        <Globe size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Mode & Hosts</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Mode *</span></label>
                                        <select
                                            name="mode"
                                            className="select select-bordered w-full focus:select-primary transition-all"
                                            value={formData.mode}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="Online">Online</option>
                                            <option value="Offline">Offline</option>
                                            <option value="Hybrid">Hybrid</option>
                                        </select>
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Platform / Location</span></label>
                                        <input
                                            type="text"
                                            name="platformLocation"
                                            placeholder="e.g. Microsoft Teams / Room 302"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.platformLocation}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Host Organization</span></label>
                                        <input
                                            type="text"
                                            name="hostOrganization"
                                            placeholder="Host Organization Name"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.hostOrganization}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Host Name</span></label>
                                        <input
                                            type="text"
                                            name="hostName"
                                            placeholder="Host Name"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.hostName}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Host Email</span></label>
                                        <input
                                            type="email"
                                            name="hostEmail"
                                            placeholder="Host Email Address"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.hostEmail}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Participants</span></label>
                                        <input
                                            type="text"
                                            name="participants"
                                            placeholder="External or internal participants list"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.participants}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Agenda & Action Items */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-base-200 pb-4">
                                    <div className="p-2 bg-accent/10 rounded-lg text-accent">
                                        <FileText size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Agenda & Outcomes</h3>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Key Agenda</span></label>
                                        <textarea
                                            name="keyAgenda"
                                            placeholder="Primary agenda items..."
                                            className="textarea textarea-bordered w-full h-24 focus:textarea-primary transition-all"
                                            value={formData.keyAgenda}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Discussion Summary</span></label>
                                        <textarea
                                            name="discussionSummary"
                                            placeholder="Detailed discussion highlights..."
                                            className="textarea textarea-bordered w-full h-24 focus:textarea-primary transition-all"
                                            value={formData.discussionSummary}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Action Items</span></label>
                                        <textarea
                                            name="actionItems"
                                            placeholder="Decided action items..."
                                            className="textarea textarea-bordered w-full h-24 focus:textarea-primary transition-all"
                                            value={formData.actionItems}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="form-control w-full">
                                            <label className="label font-medium"><span className="label-text">Next Meeting Date</span></label>
                                            <input
                                                type="date"
                                                name="nextMeetingDate"
                                                className="input input-bordered w-full focus:input-primary transition-all"
                                                value={formData.nextMeetingDate}
                                                onChange={handleChange}
                                            />
                                        </div>

                                        <div className="form-control w-full">
                                            <label className="label font-medium"><span className="label-text">Drive Link (MoM/Recording)</span></label>
                                            <input
                                                type="url"
                                                name="driveLink"
                                                placeholder="https://drive.google.com/..."
                                                className="input input-bordered w-full focus:input-primary transition-all"
                                                value={formData.driveLink}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-control w-full">
                                        <label className="label font-medium"><span className="label-text">Remarks</span></label>
                                        <input
                                            type="text"
                                            name="remarks"
                                            placeholder="Any other comments or follow-up details"
                                            className="input input-bordered w-full focus:input-primary transition-all"
                                            value={formData.remarks}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-6 border-t border-base-200">
                                <button type="submit" className={`btn btn-primary btn-lg px-8 ${loading ? 'loading' : ''}`} disabled={loading}>
                                    {!loading && <Save size={20} className="mr-2" />}
                                    {loading ? 'Saving...' : (isEdit ? 'Update Meeting' : 'Create Meeting')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MeetingTrackerForm;
