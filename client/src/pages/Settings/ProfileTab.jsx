import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { Camera, User as UserIcon, Mail, Shield, Save, Trash2 } from 'lucide-react';

const ProfileTab = () => {
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: ''
    });
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || ''
            });
            setPhotoPreview(user.profilePhoto ? `${import.meta.env.VITE_API_URL}${user.profilePhoto}` : null);
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('File size must be less than 5MB');
                return;
            }
            setProfilePhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handlePhotoUpload = async () => {
        if (!profilePhoto) return;

        const photoFormData = new FormData();
        photoFormData.append('photo', profilePhoto);

        try {
            setLoading(true);
            const response = await api.post('/settings/me/photo', photoFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            updateUser(response.data.data);
            setProfilePhoto(null);
            toast.success('Profile photo updated successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error uploading photo');
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoDelete = async () => {
        try {
            setLoading(true);
            await api.delete('/settings/me/photo');
            setPhotoPreview(null);
            setProfilePhoto(null);
            updateUser({ ...user, profilePhoto: null });
            toast.success('Profile photo deleted');
        } catch (error) {
            toast.error('Error deleting photo');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            const response = await api.put('/settings/me', formData);
            updateUser(response.data.data);
            toast.success('Profile updated successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error updating profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Profile Photo */}
            <div className="card bg-base-200">
                <div className="card-body">
                    <h3 className="card-title text-lg">Profile Photo</h3>
                    <div className="flex items-center gap-6">
                        <div className="avatar">
                            <div className="w-24 h-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Profile" />
                                ) : (
                                    <div className="flex items-center justify-center bg-primary text-primary-content text-3xl font-bold">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoChange}
                                className="file-input file-input-bordered file-input-sm w-full max-w-xs"
                                disabled={loading}
                            />
                            <p className="text-sm text-base-content/60 mt-2">
                                JPG, PNG or GIF. Max size 5MB.
                            </p>
                        </div>

                        {profilePhoto && (
                            <button
                                onClick={handlePhotoUpload}
                                className="btn btn-primary btn-sm"
                                disabled={loading}
                            >
                                <Camera size={16} />
                                Upload
                            </button>
                        )}

                        {photoPreview && !profilePhoto && (
                            <button
                                onClick={handlePhotoDelete}
                                className="btn btn-error btn-sm"
                                disabled={loading}
                            >
                                <Trash2 size={16} />
                                Remove
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Personal Information */}
            <form onSubmit={handleSubmit} className="card bg-base-200">
                <div className="card-body">
                    <h3 className="card-title text-lg">Personal Information</h3>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text flex items-center gap-2">
                                <UserIcon size={16} />
                                Name
                            </span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="input input-bordered"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text flex items-center gap-2">
                                <Mail size={16} />
                                Email
                            </span>
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="input input-bordered"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text flex items-center gap-2">
                                <Shield size={16} />
                                Role
                            </span>
                        </label>
                        <input
                            type="text"
                            value={user?.role || ''}
                            className="input input-bordered"
                            disabled
                        />
                    </div>

                    <div className="card-actions justify-end mt-4">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="loading loading-spinner loading-sm"></span>
                            ) : (
                                <>
                                    <Save size={16} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default ProfileTab;
