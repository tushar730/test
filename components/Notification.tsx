
import React, { useEffect, useState } from 'react';
import CloseIcon from './CloseIcon';

type NotificationState = {
    type: 'success' | 'error';
    message: string;
} | null;

interface NotificationProps {
    notification: NotificationState;
    onDismiss: () => void;
}

const Notification: React.FC<NotificationProps> = ({ notification, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (notification) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                handleDismiss();
            }, 5000); // Auto-dismiss after 5 seconds
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleDismiss = () => {
        setIsVisible(false);
        // Allow time for fade-out animation before clearing content
        setTimeout(() => {
            onDismiss();
        }, 300);
    };

    if (!notification) {
        return null;
    }

    const baseClasses = "fixed top-5 right-5 w-auto max-w-sm z-50 rounded-lg shadow-lg p-4 flex items-start gap-4 transition-all duration-300";
    const typeClasses = {
        success: 'bg-green-50 text-green-800 border-l-4 border-green-500',
        error: 'bg-red-50 text-red-800 border-l-4 border-red-500',
    };
    const darkTypeClasses = {
        success: 'dark:bg-green-900/50 dark:text-green-300 dark:border-green-500',
        error: 'dark:bg-red-900/50 dark:text-red-300 dark:border-red-500',
    }
    
    const icon = {
       success: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
       error: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    }

    const visibilityClass = isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10';

    return (
        <div className={`${baseClasses} ${typeClasses[notification.type]} ${darkTypeClasses[notification.type]} ${visibilityClass}`}>
            <div className="flex-shrink-0">
                {icon[notification.type]}
            </div>
            <div className="flex-grow text-sm font-semibold">
                {notification.message}
            </div>
            <button onClick={handleDismiss} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                <CloseIcon />
            </button>
        </div>
    );
};

export default Notification;
