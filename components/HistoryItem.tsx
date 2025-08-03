
import React from 'react';
import ReuseIcon from './ReuseIcon';
import TrashIcon from './TrashIcon';

// Types defined locally to resolve compilation errors.
// This component and its related types are currently unused in the main application.
type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

interface HistoryEntry {
    id: string;
    prompt: string;
    images: string[];
    aspectRatio: AspectRatio;
    timestamp: number;
}

interface HistoryItemProps {
    entry: HistoryEntry;
    theme: 'light' | 'dark';
    aspectRatioTailwind: { [key in AspectRatio]: string };
    onDelete: (id: string) => void;
    onReuse: (entry: HistoryEntry) => void;
}

const formatTimestamp = (timestamp: number): string => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    if (diffInSeconds < 60) return rtf.format(-diffInSeconds, 'second');
    if (diffInSeconds < 3600) return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    if (diffInSeconds < 86400) return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    if (diffInSeconds < 86400 * 7) return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');

    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(past);
};

const HistoryItem: React.FC<HistoryItemProps> = ({ entry, theme, aspectRatioTailwind, onDelete, onReuse }) => {
    const { id, prompt, images, aspectRatio, timestamp } = entry;
    
    const buttonClasses = theme === 'dark'
        ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
        : 'bg-slate-200 text-slate-700 hover:bg-slate-300';
    
    return (
        <article className={`rounded-2xl border p-5 space-y-4 transition-colors duration-300 ${theme === 'dark' ? 'bg-[#121829] border-slate-700/50' : 'bg-white border-slate-200'}`} aria-labelledby={`history-prompt-${id}`}>
            <div className="flex justify-between items-start gap-4">
                <p id={`history-prompt-${id}`} className={`flex-1 font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-800'}`}>{prompt}</p>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button 
                        onClick={() => onReuse(entry)} 
                        title="Reuse prompt and settings"
                        aria-label="Reuse prompt and settings"
                        className={`p-2 rounded-lg transition-colors ${buttonClasses}`}
                    >
                        <ReuseIcon />
                    </button>
                    <button 
                        onClick={() => onDelete(id)} 
                        title="Delete from history"
                        aria-label="Delete item from history"
                        className={`p-2 rounded-lg transition-colors ${buttonClasses} hover:text-red-400 focus-visible:text-red-400`}
                    >
                        <TrashIcon />
                    </button>
                </div>
            </div>

            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4`}>
                {images.map((src, index) => (
                    <div key={index} className={`relative group rounded-lg overflow-hidden ${aspectRatioTailwind[aspectRatio]} ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
                        <img src={src} alt={`History image ${index + 1} for prompt: ${prompt}`} className="w-full h-full object-cover" />
                    </div>
                ))}
            </div>

            <div className="text-right text-xs font-medium">
                <span className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {formatTimestamp(timestamp)}
                </span>
            </div>
        </article>
    );
};

export default HistoryItem;