
import React, { useState, useEffect } from 'react';
import CloseIcon from './CloseIcon';

type ApiKeys = { key: string; secret: string; tradeMode: 'live' | 'demo' };

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (keys: ApiKeys) => void;
    onDisconnect: () => void;
    theme: 'light' | 'dark';
    currentKeys: ApiKeys | null;
}

const TradeModeSelector: React.FC<{ selected: 'live' | 'demo', onChange: (mode: 'live' | 'demo') => void, theme: 'light' | 'dark' }> = ({ selected, onChange, theme }) => {
    const options = [
        { label: 'Live Account', value: 'live' as const },
        { label: 'Demo Account', value: 'demo' as const }
    ];
    return (
        <div>
            <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Trading Mode</label>
            <div className={`flex w-full p-1 rounded-lg transition-colors ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
                {options.map(option => (
                    <button
                        type="button"
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={`flex-1 text-sm font-semibold px-4 py-1.5 rounded-md transition-all duration-300 ${
                            selected === option.value
                                ? `shadow ${theme === 'dark' ? 'bg-slate-600 text-white' : 'bg-white text-slate-800'}`
                                : theme === 'dark' ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-300/60'
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, onDisconnect, theme, currentKeys }) => {
    const [key, setKey] = useState('');
    const [secret, setSecret] = useState('');
    const [tradeMode, setTradeMode] = useState<'live' | 'demo'>('live');

    useEffect(() => {
        if (isOpen) {
            setKey(currentKeys?.key || '');
            setSecret(currentKeys?.secret || '');
            setTradeMode(currentKeys?.tradeMode || 'live');
        }
    }, [currentKeys, isOpen]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (key && secret) {
            onSave({ key, secret, tradeMode });
            onClose();
        }
    };
    
    const handleDisconnect = () => {
        onDisconnect();
        onClose();
    }

    if (!isOpen) return null;
    
    const bgColor = theme === 'dark' ? 'bg-[#121829]' : 'bg-white';
    const textColor = theme === 'dark' ? 'text-slate-300' : 'text-slate-800';
    const inputBg = theme === 'dark' ? 'bg-slate-700/50 border-slate-600 focus:ring-blue-500' : 'bg-slate-100 border-slate-300 focus:ring-blue-500';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className={`relative w-full max-w-lg rounded-2xl border p-6 sm:p-8 shadow-2xl ${bgColor} ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'} ${textColor}`} onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-slate-700/50' : 'hover:bg-slate-200'}`} aria-label="Close settings">
                    <CloseIcon />
                </button>
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Exchange Connection</h2>
                <p className="mt-2 text-sm text-slate-400">Connect your Bybit account to execute trades directly. Your keys are stored securely in your browser and never leave your device.</p>
                
                <form onSubmit={handleSave} className="mt-6 space-y-5">
                    <TradeModeSelector selected={tradeMode} onChange={setTradeMode} theme={theme} />
                    <div>
                        <label htmlFor="apiKey" className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Bybit API Key</label>
                        <input id="apiKey" type="text" value={key} onChange={e => setKey(e.target.value)} placeholder="Enter your API Key" required className={`w-full font-semibold rounded-lg py-2.5 px-3 transition-colors duration-300 border ${inputBg}`} />
                    </div>
                    <div>
                        <label htmlFor="apiSecret" className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Bybit API Secret</label>
                        <input id="apiSecret" type="password" value={secret} onChange={e => setSecret(e.target.value)} placeholder="Enter your API Secret" required className={`w-full font-semibold rounded-lg py-2.5 px-3 transition-colors duration-300 border ${inputBg}`} />
                    </div>
                    <div className="flex flex-col sm:flex-row-reverse items-center gap-3 pt-4">
                        <button type="submit" className="w-full sm:w-auto bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-lg transition-all hover:bg-blue-700 disabled:opacity-50" disabled={!key || !secret}>
                            {currentKeys ? 'Update Connection' : 'Save & Connect'}
                        </button>
                        {currentKeys && (
                            <button type="button" onClick={handleDisconnect} className={`w-full sm:w-auto font-semibold py-2.5 px-6 rounded-lg transition-colors ${theme === 'dark' ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-100'}`}>
                                Disconnect
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SettingsModal;
