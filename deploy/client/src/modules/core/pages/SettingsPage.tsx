import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { useTheme, ThemeColor } from '../../../context/ThemeContext';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Check, Shield, Palette, Sun, Moon, Coffee } from 'lucide-react';

export const SettingsPage = () => {
  const { accentColor, setAccentColor, themeMode, setThemeMode } = useTheme();
  const { user } = useAuth();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const colors: { id: ThemeColor; name: string; class: string }[] = [
    { id: 'blue', name: 'Blue', class: 'bg-blue-600' },
    { id: 'purple', name: 'Purple', class: 'bg-purple-600' },
    { id: 'emerald', name: 'Emerald', class: 'bg-emerald-600' },
    { id: 'rose', name: 'Rose', class: 'bg-rose-600' },
    { id: 'amber', name: 'Amber', class: 'bg-amber-600' },
  ];

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    try {
      await axios.post('/api/auth/change-password', {
        currentPassword,
        newPassword
      });
      setMessage({ type: 'success', text: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to change password' });
    }
  };

  const isDark = themeMode === 'dark';
  const isSepia = themeMode === 'sepia';
  const cardCls = `rounded-xl border p-6 ${
    isDark ? 'bg-gray-800 border-gray-700' :
    isSepia ? 'bg-amber-100/60 border-amber-200' :
    'bg-white border-gray-200 shadow-sm'
  }`;
  const headingCls = isDark ? 'text-white' : isSepia ? 'text-amber-900' : 'text-gray-900';
  const labelCls   = isDark ? 'text-gray-400' : isSepia ? 'text-amber-700' : 'text-gray-500';
  const inputCls   = `w-full rounded-lg px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    isDark ? 'bg-gray-900 border-gray-700 text-white' :
    isSepia ? 'bg-amber-50 border-amber-200 text-amber-900' :
    'bg-gray-50 border-gray-200 text-gray-900'
  }`;

  const themeOptions = [
    { mode: 'light' as const,  Icon: Sun,    label: 'Light', iconBg: 'bg-yellow-50',  iconColor: 'text-yellow-500' },
    { mode: 'dark'  as const,  Icon: Moon,   label: 'Dark',  iconBg: 'bg-slate-800',   iconColor: 'text-blue-400'   },
    { mode: 'sepia' as const,  Icon: Coffee, label: 'Sepia', iconBg: 'bg-amber-100',   iconColor: 'text-amber-600'  },
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className={`text-3xl font-bold mb-2 ${headingCls}`}>User Settings</h1>

        {/* Theme Mode */}
        <div className={cardCls}>
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Palette className="w-5 h-5 text-purple-500" />
            </div>
            <h2 className={`text-xl font-bold ${headingCls}`}>Interface Theme</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {themeOptions.map(({ mode, Icon, label, iconBg, iconColor }) => (
              <button
                key={mode}
                onClick={() => setThemeMode(mode)}
                className={`flex flex-col items-center justify-center p-5 rounded-xl border-2 transition-all gap-3 ${
                  themeMode === mode
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : isDark ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-700'
                    : isSepia ? 'border-amber-200 hover:border-amber-300 hover:bg-amber-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className={`p-2.5 rounded-full ${iconBg}`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <span className={`font-semibold text-sm ${headingCls}`}>{label}</span>
                {themeMode === mode && <div className="w-2 h-2 rounded-full bg-blue-500" />}
              </button>
            ))}
          </div>
        </div>

        {/* Accent Color */}
        <div className={cardCls}>
          <div className="flex items-center gap-3 mb-5">
            <Palette className="w-6 h-6 text-blue-500" />
            <h2 className={`text-xl font-bold ${headingCls}`}>Accent Color</h2>
          </div>
          <div className="grid grid-cols-5 gap-4">
            {colors.map((color) => (
              <button
                key={color.id}
                onClick={() => setAccentColor(color.id)}
                className={`relative h-20 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                  accentColor === color.id
                    ? 'border-blue-500 shadow-md'
                    : isDark ? 'border-gray-600 hover:border-gray-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-9 h-9 rounded-full ${color.class} shadow-sm`} />
                <span className={`text-xs font-medium ${labelCls}`}>{color.name}</span>
                {accentColor === color.id && (
                  <div className="absolute top-1.5 right-1.5 bg-blue-500 text-white rounded-full p-0.5">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className={cardCls}>
          <div className="flex items-center gap-3 mb-5">
            <Shield className="w-6 h-6 text-emerald-500" />
            <h2 className={`text-xl font-bold ${headingCls}`}>Security</h2>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            {message.text && (
              <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                {message.text}
              </div>
            )}
            {[
              { label: 'Current Password', val: currentPassword, set: setCurrentPassword },
              { label: 'New Password',     val: newPassword,     set: setNewPassword     },
              { label: 'Confirm Password', val: confirmPassword, set: setConfirmPassword },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label className={`block text-sm font-medium mb-1 ${labelCls}`}>{label}</label>
                <input type="password" required value={val} onChange={(e) => set(e.target.value)} className={inputCls} />
              </div>
            ))}
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
              Update Password
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};