
import React, { useEffect } from 'react';
import { AppNotification } from '../types';
import { X, CheckCircle, Info, AlertTriangle, AlertOctagon } from 'lucide-react';

interface NotificationToastProps {
  notifications: AppNotification[];
  removeNotification: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notifications, removeNotification }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {notifications.map((note) => (
        <ToastItem key={note.id} note={note} onClose={() => removeNotification(note.id)} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  note: AppNotification;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ note, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const styles = {
        info: 'bg-surface border-primary/50 text-white',
        success: 'bg-surface border-success/50 text-white',
        warning: 'bg-surface border-primary text-white',
        error: 'bg-surface border-danger text-white',
    };

    const icons = {
        info: <Info className="w-5 h-5 text-primary" />,
        success: <CheckCircle className="w-5 h-5 text-success" />,
        warning: <AlertTriangle className="w-5 h-5 text-primary" />,
        error: <AlertOctagon className="w-5 h-5 text-danger" />,
    };

    return (
        <div className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-2xl min-w-[300px] max-w-sm backdrop-blur-xl animate-slide-up ${styles[note.type]}`}>
            <div className="mt-0.5">{icons[note.type]}</div>
            <div className="flex-1">
                {note.title && <h4 className="font-bold text-sm mb-1">{note.title}</h4>}
                <p className="text-xs text-gray-300 leading-relaxed">{note.message}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};
