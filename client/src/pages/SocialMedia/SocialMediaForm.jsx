import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, FileText, Link as LinkIcon, Facebook, Instagram, Linkedin } from 'lucide-react';

const SocialMediaForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        postName: '',
        caption: '',
        fbLink: '',
        instaLink: '',
        linkedinLink: '',
        vkLink: ''
    });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEdit);

    useEffect(() => { if (isEdit) fetchItem(); }, [id]);

    const fetchItem = async () => {
        try {
            const response = await api.get(`/social-media/${id}`);
            const item = response.data.data;
            setFormData({
                postName: item.postName || '',
                caption: item.caption || '',
                fbLink: item.fbLink || '',
                instaLink: item.instaLink || '',
                linkedinLink: item.linkedinLink || '',
                vkLink: item.vkLink || ''
            });
        } catch (error) {
            toast.error('Error fetching post');
            navigate('/social-media');
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
                await api.put(`/social-media/${id}`, formData);
                toast.success(isAdmin ? 'Post updated successfully' : 'Update request submitted for approval');
            } else {
                await api.post('/social-media', formData);
                toast.success('Post created successfully');
            }
            window.dispatchEvent(new Event('pendingCountUpdated'));
            navigate('/social-media');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving post');
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
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => navigate('/social-media')} className="btn btn-ghost btn-sm"><ArrowLeft size={20} /></button>
                    <div><h1 className="text-3xl font-bold">{isEdit ? 'Edit' : 'Add'} Social Media Post</h1><p className="text-base-content/70">Enter post details and platform links</p></div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            {/* Post Details Section */}
                            <div className="mb-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-1 h-6 bg-primary rounded-full"></div>
                                    <FileText className="text-primary" size={20} />
                                    <h2 className="text-xl font-semibold">Post Details</h2>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <div className="form-control">
                                        <label className="label"><span className="label-text font-medium">Post Name <span className="text-error">*</span></span></label>
                                        <input type="text" name="postName" value={formData.postName} onChange={handleChange} className="input input-bordered focus:input-primary transition-all" placeholder="Enter post name" required />
                                    </div>

                                    <div className="form-control">
                                        <label className="label"><span className="label-text font-medium">Caption</span></label>
                                        <textarea name="caption" value={formData.caption} onChange={handleChange} className="textarea textarea-bordered focus:textarea-primary transition-all h-24" placeholder="Enter post caption"></textarea>
                                    </div>
                                </div>
                            </div>

                            {/* Platform Links Section */}
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-1 h-6 bg-primary rounded-full"></div>
                                    <LinkIcon className="text-primary" size={20} />
                                    <h2 className="text-xl font-semibold">Platform Links</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="form-control">
                                        <label className="label"><span className="label-text font-medium flex items-center gap-2"><Facebook size={16} /> Facebook Link</span></label>
                                        <input type="url" name="fbLink" value={formData.fbLink} onChange={handleChange} className="input input-bordered focus:input-primary transition-all" placeholder="https://facebook.com/..." />
                                    </div>

                                    <div className="form-control">
                                        <label className="label"><span className="label-text font-medium flex items-center gap-2"><Instagram size={16} /> Instagram Link</span></label>
                                        <input type="url" name="instaLink" value={formData.instaLink} onChange={handleChange} className="input input-bordered focus:input-primary transition-all" placeholder="https://instagram.com/..." />
                                    </div>

                                    <div className="form-control">
                                        <label className="label"><span className="label-text font-medium flex items-center gap-2"><Linkedin size={16} /> LinkedIn Link</span></label>
                                        <input type="url" name="linkedinLink" value={formData.linkedinLink} onChange={handleChange} className="input input-bordered focus:input-primary transition-all" placeholder="https://linkedin.com/..." />
                                    </div>

                                    <div className="form-control">
                                        <label className="label"><span className="label-text font-medium">VK Link</span></label>
                                        <input type="url" name="vkLink" value={formData.vkLink} onChange={handleChange} className="input input-bordered focus:input-primary transition-all" placeholder="https://vk.com/..." />
                                    </div>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="card-actions justify-end gap-2 mt-8 pt-6 border-t border-base-300">
                                <button type="button" onClick={() => navigate('/social-media')} className="btn btn-ghost">Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? <span className="loading loading-spinner"></span> : <Save size={18} />}
                                    {loading ? 'Saving...' : isEdit ? 'Update Post' : 'Create Post'}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SocialMediaForm;
