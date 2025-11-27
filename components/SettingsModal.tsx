
import React from 'react';
import { UserSettings } from '../types';
import { X, Bell, Send, Mail, Bot, ShieldAlert } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (newSettings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  if (!isOpen) return null;

  const [localSettings, setLocalSettings] = React.useState<UserSettings>(settings);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-md rounded-xl border border-border shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-border bg-background">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            System Configuration
          </h2>
          <button onClick={onClose} className="text-textSecondary hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
            
            {/* Auto-Trading */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
                    <Bot className="w-4 h-4" /> AI Co-Pilot Settings
                </h3>
                <div className="bg-background p-4 rounded-lg border border-border space-y-4">
                    <label className="flex items-center justify-between cursor-pointer">
                        <div className="flex flex-col">
                            <span className="text-sm text-textPrimary font-medium">Enable Co-Pilot (Auto-Manage)</span>
                            <span className="text-[10px] text-textSecondary">AI manages/flips trades AFTER you open them.</span>
                        </div>
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={localSettings.autoTrade}
                                onChange={e => setLocalSettings({...localSettings, autoTrade: e.target.checked})}
                            />
                            <div className="w-11 h-6 bg-surfaceHighlight peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </div>
                    </label>

                    {localSettings.autoTrade && (
                        <div>
                            <div className="flex justify-between text-xs text-textSecondary mb-1">
                                <span>Min. Confidence to Flip/Manage</span>
                                <span className="text-primary font-bold">{(localSettings.minConfidence * 100).toFixed(0)}%</span>
                            </div>
                            <input 
                                type="range" 
                                min="0.5" 
                                max="0.95" 
                                step="0.05"
                                value={localSettings.minConfidence}
                                onChange={(e) => setLocalSettings({...localSettings, minConfidence: parseFloat(e.target.value)})}
                                className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <p className="text-[10px] text-textSecondary mt-2 flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 text-warning" />
                                AI will only reverse/flip positions if confidence > threshold.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Notifications */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
                    <Bell className="w-4 h-4" /> Notifications
                </h3>
                <div className="bg-background p-4 rounded-lg border border-border space-y-3">
                    <label className="flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            checked={localSettings.notifications.push}
                            onChange={e => setLocalSettings({
                                ...localSettings, 
                                notifications: {...localSettings.notifications, push: e.target.checked}
                            })}
                            className="form-checkbox bg-surface border-border text-primary rounded focus:ring-primary focus:ring-offset-background" 
                        />
                        <span className="text-sm text-textPrimary">Browser Push</span>
                    </label>

                    <label className="flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            checked={localSettings.notifications.telegram}
                            onChange={e => setLocalSettings({
                                ...localSettings, 
                                notifications: {...localSettings.notifications, telegram: e.target.checked}
                            })}
                            className="form-checkbox bg-surface border-border text-primary rounded focus:ring-primary focus:ring-offset-background" 
                        />
                        <span className="text-sm text-textPrimary flex items-center gap-2"><Send className="w-3 h-3"/> Telegram</span>
                    </label>
                    {localSettings.notifications.telegram && (
                        <input 
                            type="text" 
                            placeholder="@YourTelegramHandle"
                            value={localSettings.telegramHandle || ''}
                            onChange={e => setLocalSettings({...localSettings, telegramHandle: e.target.value})}
                            className="w-full bg-surface border border-border rounded p-2 text-xs text-white focus:border-primary focus:outline-none"
                        />
                    )}

                    <label className="flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            checked={localSettings.notifications.email}
                            onChange={e => setLocalSettings({
                                ...localSettings, 
                                notifications: {...localSettings.notifications, email: e.target.checked}
                            })}
                            className="form-checkbox bg-surface border-border text-primary rounded focus:ring-primary focus:ring-offset-background" 
                        />
                        <span className="text-sm text-textPrimary flex items-center gap-2"><Mail className="w-3 h-3"/> Email Alerts</span>
                    </label>
                    {localSettings.notifications.email && (
                        <input 
                            type="email" 
                            placeholder="trader@example.com"
                            value={localSettings.emailAddress || ''}
                            onChange={e => setLocalSettings({...localSettings, emailAddress: e.target.value})}
                            className="w-full bg-surface border border-border rounded p-2 text-xs text-white focus:border-primary focus:outline-none"
                        />
                    )}
                </div>
            </div>
        </div>

        <div className="p-4 border-t border-border bg-background flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-textSecondary hover:text-white transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-6 py-2 text-xs font-bold bg-primary text-black rounded hover:bg-primaryHover transition-colors">Save Changes</button>
        </div>
      </div>
    </div>
  );
};
