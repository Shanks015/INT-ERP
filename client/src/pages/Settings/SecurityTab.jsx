import { useState, useEffect } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Save } from 'lucide-react';
import { toDDMMM } from '../../utils/dateFormat';

const SecurityTab = () => {
    const [loading, setLoading] = useState(false);
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [lastPasswordChange, setLastPasswordChange] = useState(null);

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const response = await api.get('/settings/me');
            setLastPasswordChange(response.data.data.lastPasswordChange);
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    const checkPasswordStrength = (password) => {
        // Scored against meaningful thresholds ABOVE the enforced 8-character
        // minimum, so an 8-char password isn't automatically "medium".
        let strength = 0;
        if (password.length >= 10) strength++;
        if (password.length >= 14) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z\d]/.test(password)) strength++;
        return strength;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        if (name === 'newPassword') {
            setPasswordStrength(checkPasswordStrength(value));
        }
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords({ ...showPasswords, [field]: !showPasswords[field] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.newPassword !== formData.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        if (formData.newPassword.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        try {
            setLoading(true);
            await api.put('/settings/me/password', {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });

            toast.success('Password changed successfully');
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            fetchUserData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error changing password');
        } finally {
            setLoading(false);
        }
    };

    const getStrengthColor = () => {
        if (passwordStrength <= 1) return 'error';
        if (passwordStrength <= 3) return 'warning';
        return 'success';
    };

    const getStrengthText = () => {
        if (passwordStrength <= 1) return 'Weak';
        if (passwordStrength <= 3) return 'Medium';
        return 'Strong';
    };

    return (
        <div className="space-y-6">
            {/* Last Password Change */}
            {lastPasswordChange && (
                <div className="alert alert-info">
                    <Lock size={20} />
                    <span>
                        Last password change: {toDDMMM(lastPasswordChange)}
                    </span>
                </div>
            )}

            {/* Change Password Form */}
            <form onSubmit={handleSubmit} className="card bg-base-200">
                <div className="card-body">
                    <h3 className="card-title text-lg">Change Password</h3>

                    {/* Current Password */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Current Password</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.current ? "text" : "password"}
                                name="currentPassword"
                                value={formData.currentPassword}
                                onChange={handleChange}
                                className="input input-bordered w-full pr-10"
                                required
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('current')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-circle"
                            >
                                {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* New Password */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">New Password</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.new ? "text" : "password"}
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleChange}
                                className="input input-bordered w-full pr-10"
                                required
                                minLength={8}
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('new')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-circle"
                            >
                                {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        {/* Password Strength Indicator */}
                        {formData.newPassword && (
                            <div className="mt-2">
                                <div className="flex items-center justify-between text-sm mb-1">
                                    <span>Password strength:</span>
                                    <span className={`font-semibold text-${getStrengthColor()}`}>
                                        {getStrengthText()}
                                    </span>
                                </div>
                                <progress
                                    className={`progress progress-${getStrengthColor()} w-full`}
                                    value={passwordStrength}
                                    max="5"
                                ></progress>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Confirm New Password</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.confirm ? "text" : "password"}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="input input-bordered w-full pr-10"
                                required
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('confirm')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-circle"
                            >
                                {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        {/* Match Indicator */}
                        {formData.confirmPassword && (
                            <label className="label">
                                {formData.newPassword === formData.confirmPassword ? (
                                    <span className="label-text-alt text-success flex items-center gap-1">
                                        <CheckCircle size={14} />
                                        Passwords match
                                    </span>
                                ) : (
                                    <span className="label-text-alt text-error flex items-center gap-1">
                                        <XCircle size={14} />
                                        Passwords do not match
                                    </span>
                                )}
                            </label>
                        )}
                    </div>

                    <div className="card-actions justify-end mt-4">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || formData.newPassword !== formData.confirmPassword}
                        >
                            {loading ? (
                                <span className="loading loading-spinner loading-sm"></span>
                            ) : (
                                <>
                                    <Save size={16} />
                                    Change Password
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>

            {/* Password Requirements */}
            <div className="card bg-base-200">
                <div className="card-body">
                    <h3 className="card-title text-lg">Password Requirements</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Minimum 8 characters (enforced)</li>
                        <li>For a stronger password: mix uppercase and lowercase letters, add a number, and use symbols</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default SecurityTab;

