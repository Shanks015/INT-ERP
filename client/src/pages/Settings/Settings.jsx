import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Settings as SettingsIcon, User, Lock, Palette } from 'lucide-react';
import ProfileTab from './ProfileTab';
import SecurityTab from './SecurityTab';
import PreferencesTab from './PreferencesTab';

const Settings = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'preferences', label: 'Preferences', icon: Palette }
    ];

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <SettingsIcon size={32} className="text-primary" />
                <div>
                    <h1 className="text-3xl font-bold">Settings</h1>
                    <p className="text-base-content/70 mt-1">
                        Manage your account settings and preferences
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    {/* Tab Headers */}
                    <div className="tabs tabs-boxed mb-6">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    className={`tab gap-2 ${activeTab === tab.id ? 'tab-active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    <Icon size={16} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab Content */}
                    <div className="mt-4">
                        {activeTab === 'profile' && <ProfileTab />}
                        {activeTab === 'security' && <SecurityTab />}
                        {activeTab === 'preferences' && <PreferencesTab />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;

