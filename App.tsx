
import React, { useState, useCallback, useEffect } from 'react';
import { getCryptoAnalysis } from './services/geminiService';
import type { CryptoSignal, GroundingSource, TradingType, TimeFrame, SignalAction, Confidence } from './services/geminiService';
import { placeBybitOrder, getWalletBalance } from './services/bybitService';
import type { OrderDetails } from './services/bybitService';
import Spinner from './components/Spinner';
import MoonIcon from './components/MoonIcon';
import SunIcon from './components/SunIcon';
import Logo from './components/Logo';
import CustomDropdown from './components/CustomDropdown';
import PriceChart from './components/PriceChart';
import SettingsIcon from './components/SettingsIcon';
import SettingsModal from './components/SettingsModal';
import Notification from './components/Notification';

// START: Inlined Icon Components
const LinkIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"/></svg>
);
const EntryIcon = ({ className = '' }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>;
const TargetIcon = ({ className = '' }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
const StopLossIcon = ({ className = '' }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>;
const ConfidenceIcon = ({ className = '' }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>;
const HoldIcon = ({ className = '' }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13H8v-2h8v2h-4z"/></svg>;
const TradeIcon = ({ className = '' }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5.5H22V1H17zM2 12.5h5V7H2zM17 18.5h5v-5.5h-5z"></path></svg>;

// END: Inlined Icon Components

const SegmentedControl = ({ options, selected, onChange, theme, disabled = false }) => (
    <div className={`flex w-full sm:w-auto p-1 rounded-lg transition-colors ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'}`}>
        {options.map(option => (
            <button
                key={option.value}
                onClick={() => onChange(option.value)}
                disabled={disabled}
                className={`flex-1 text-sm font-semibold px-4 py-1.5 rounded-md transition-all duration-300 disabled:opacity-50 ${
                    selected === option.value
                        ? `shadow ${theme === 'dark' ? 'bg-slate-600 text-white' : 'bg-white text-slate-800'}`
                        : theme === 'dark' ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-300/60'
                }`}
            >
                {option.label}
            </button>
        ))}
    </div>
);

type ApiKeys = { key: string; secret: string; tradeMode: 'live' | 'demo'; };
type NotificationState = { type: 'success' | 'error'; message: string } | null;

const App: React.FC = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [selectedCoin, setSelectedCoin] = useState<string>('BTC');
    const [tradingType, setTradingType] = useState<TradingType>('Futures');
    const [timeFrame, setTimeFrame] = useState<TimeFrame>('4H');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<CryptoSignal | null>(null);
    const [sources, setSources] = useState<GroundingSource[]>([]);
    
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [apiKeys, setApiKeys] = useState<ApiKeys | null>(null);
    const [notification, setNotification] = useState<NotificationState>(null);
    
    const [tradeMargin, setTradeMargin] = useState('');
    const [tradeLeverage, setTradeLeverage] = useState('10');
    const [tradeTakeProfit, setTradeTakeProfit] = useState('');
    const [tradeStopLoss, setTradeStopLoss] = useState('');
    const [isTrading, setIsTrading] = useState(false);

    const [walletBalance, setWalletBalance] = useState<string | null>(null);
    const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(false);

    const availableCoins = ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP'];
    const coinOptions = availableCoins.map(c => ({ label: c, value: c }));
    
    const tradingTypeOptions = [{ label: 'Spot', value: 'Spot' }, { label: 'Futures', value: 'Futures' }];
    const timeFrameOptions = [
        { label: '1 Minute', value: '1m' }, { label: '5 Minutes', value: '5m' }, { label: '15 Minutes', value: '15m' }, { label: '1 Hour', value: '1H' }, { label: '4 Hours', value: '4H' }, { label: '1 Day', value: '1D' },
    ];

    const fetchBalance = useCallback(async (keys: ApiKeys) => {
        if (!keys || !keys.key) return;
        setIsBalanceLoading(true);
        try {
            const balance = await getWalletBalance({ keys });
            setWalletBalance(balance);
        } catch (error) {
            console.error("Failed to fetch wallet balance:", error);
            setWalletBalance(null); // Set to null on error
        } finally {
            setIsBalanceLoading(false);
        }
    }, []);

    useEffect(() => {
        document.body.classList.add('transition-colors', 'duration-300');
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        setTheme(savedTheme || 'dark');
        
        const savedKeysRaw = localStorage.getItem('bybitApiKeys');
        if (savedKeysRaw) {
            const savedKeys = JSON.parse(savedKeysRaw);
            if (!savedKeys.tradeMode) {
                savedKeys.tradeMode = 'live';
            }
            setApiKeys(savedKeys);
            fetchBalance(savedKeys);
        }
    }, [fetchBalance]);
    
    useEffect(() => {
        if (analysisResult) {
            setTradeTakeProfit(analysisResult.takeProfit);
            setTradeStopLoss(analysisResult.stopLoss);
            // Reset margin and leverage for a new signal
            setTradeMargin('');
            setTradeLeverage('10');
        }
    }, [analysisResult]);

    useEffect(() => {
        if (theme === 'dark') {
            document.body.classList.add('bg-[#0B0F19]');
            document.body.classList.remove('bg-slate-100');
        } else {
            document.body.classList.add('bg-slate-100');
            document.body.classList.remove('bg-[#0B0F19]');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const handleSaveApiKeys = (keys: ApiKeys) => {
        localStorage.setItem('bybitApiKeys', JSON.stringify(keys));
        setApiKeys(keys);
        fetchBalance(keys);
        setNotification({ type: 'success', message: 'API Settings saved successfully.' });
    };
    
    const handleDisconnectApi = () => {
        localStorage.removeItem('bybitApiKeys');
        setApiKeys(null);
        setWalletBalance(null);
        setNotification({ type: 'success', message: 'API connection has been removed.' });
    };

    const handleAnalyze = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);
        setSources([]);
        try {
            const { analysis, sources } = await getCryptoAnalysis(selectedCoin, tradingType, timeFrame);
            setAnalysisResult(analysis);
            setSources(sources);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [selectedCoin, tradingType, timeFrame]);
    
     const handleExecuteTrade = useCallback(async () => {
        if (!apiKeys || !analysisResult) return;

        const margin = parseFloat(tradeMargin);
        const leverage = parseFloat(tradeLeverage);
        const entryPrice = parseFloat(analysisResult.entryPrice.replace(/[^0-9.]/g, ''));
        
        if (isNaN(margin) || margin <= 0) {
            setNotification({ type: 'error', message: 'Please enter a valid margin amount.' });
            return;
        }
        if (isNaN(leverage) || leverage <= 0) {
            setNotification({ type: 'error', message: 'Please enter a valid leverage.' });
            return;
        }
        if (isNaN(entryPrice) || entryPrice <= 0) {
            setNotification({ type: 'error', message: 'Invalid entry price from signal. Cannot calculate quantity.' });
            return;
        }
        
        const positionValue = margin * leverage;
        const quantity = positionValue / entryPrice;
        // Bybit has precision rules. 3 decimals for BTC, more for others. Let's use a dynamic approach or a safe bet.
        const coinPrecision = analysisResult.coin === 'BTC' ? 3 : (analysisResult.coin === 'ETH' ? 3 : 2);
        const formattedQty = quantity.toFixed(Math.max(0, coinPrecision));

        const side = analysisResult.action === 'Long' || analysisResult.action === 'Buy' ? 'Buy' : 'Sell';
        const confirmationMessage = `Confirm Trade:\n
- Account: ${apiKeys.tradeMode.toUpperCase()}
- Action: ${side.toUpperCase()} ${analysisResult.coin}/USDT
- Margin: ${margin} USDT
- Leverage: ${leverage}x
- Quantity: ≈${formattedQty} ${analysisResult.coin}
- Take Profit: ${tradeTakeProfit}
- Stop Loss: ${tradeStopLoss}
\nAre you sure you want to place this order?`;

        if (window.confirm(confirmationMessage)) {
            setIsTrading(true);
            setNotification(null);
            try {
                const orderDetails: OrderDetails = {
                    symbol: `${analysisResult.coin}USDT`,
                    side,
                    qty: formattedQty,
                    leverage: tradeLeverage,
                    takeProfit: tradeTakeProfit,
                    stopLoss: tradeStopLoss,
                };
                
                const result = await placeBybitOrder({ keys: apiKeys, order: orderDetails });
                setNotification({ type: 'success', message: `Trade executed successfully! Order ID: ${result.orderId}` });
                fetchBalance(apiKeys);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during trade execution.';
                setNotification({ type: 'error', message: `Trade Failed: ${errorMessage}` });
                console.error(err);
            } finally {
                setIsTrading(false);
            }
        }
    }, [apiKeys, analysisResult, tradeMargin, tradeLeverage, tradeTakeProfit, tradeStopLoss, fetchBalance]);
    
    const getSignalAppearance = (action: SignalAction) => {
        const isLong = action === 'Long' || action === 'Buy';
        const isShort = action === 'Short' || action === 'Sell';
        const isHold = action === 'Hold';

        if (isLong) return {
            textColor: 'text-green-400', ringColor: 'ring-green-500/20',
            bgColor: theme === 'dark' ? 'bg-green-900/30' : 'bg-green-50',
            badgeColor: theme === 'dark' ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700',
            tradeButton: 'from-green-500 to-emerald-600 hover:shadow-green-500/50',
        };
        if (isShort) return {
            textColor: 'text-red-400', ringColor: 'ring-red-500/20',
            bgColor: theme === 'dark' ? 'bg-red-900/30' : 'bg-red-50',
            badgeColor: theme === 'dark' ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700',
            tradeButton: 'from-red-500 to-rose-600 hover:shadow-red-500/50',
        };
        if (isHold) return {
            textColor: 'text-blue-400', ringColor: 'ring-blue-500/20',
            bgColor: theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50',
            badgeColor: theme === 'dark' ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700',
            tradeButton: '',
        }
        return {
            textColor: 'text-slate-400', ringColor: 'ring-slate-500/20',
            bgColor: theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100',
            badgeColor: theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600',
            tradeButton: '',
        };
    };

    const PricePoint = ({ icon: Icon, label, value, colorClass }) => (
        <div className={`p-4 rounded-xl flex items-center gap-4 ${theme === 'dark' ? 'bg-[#1E293B]' : 'bg-white/60'}`}>
            <div className={`p-2 rounded-full ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'}`}>
                <Icon className={`w-6 h-6 ${colorClass}`} />
            </div>
            <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
                <p className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{value}</p>
            </div>
        </div>
    );
    
    const renderAnalysisSection = () => {
        if (isLoading) return <div className={`flex flex-col items-center justify-center p-10 rounded-2xl h-48 transition-colors ${theme === 'dark' ? 'bg-[#1E293B]/50' : 'bg-slate-100'}`}><Spinner size="lg" /><p className={`mt-4 font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Analyzing {selectedCoin} on {timeFrame}...</p></div>;
        if (error) return <div className={`text-center p-6 rounded-lg ${theme === 'dark' ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-700'}`}><h3 className="font-bold">An Error Occurred</h3><p className="text-sm mt-1">{error}</p></div>;
        if (!analysisResult) return <div className={`flex items-center justify-center text-center p-6 rounded-2xl h-32`}><p className={`max-w-md font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Select parameters and click "Generate Signal" for AI analysis.</p></div>;

        const appearance = getSignalAppearance(analysisResult.action);
        const pair = analysisResult.tradingType === 'Futures' ? `${analysisResult.coin}/USDT` : analysisResult.coin;
        const cleanedSummary = (analysisResult.summary || '').replace(/\\n/g, '\n').replace(/\[\d+(, ?\d+)*\]/g, '').trim();

        if (analysisResult.action === 'Hold') {
            return (
                 <div className={`space-y-6 p-6 rounded-2xl border transition-colors ${theme === 'dark' ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'} ${appearance.ringColor} ring-4`}>
                    <div className="flex items-center gap-4"><div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-100'}`}><HoldIcon className={`w-8 h-8 ${appearance.textColor}`} /></div><div><h2 className={`text-2xl font-bold ${appearance.textColor}`}>Hold Signal for {pair}</h2><p className={`mt-1 font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>No clear trading opportunity.</p></div></div>
                    <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-[#121829] border-slate-700' : 'bg-slate-50 border-slate-200'}`}><h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Analysis Summary</h3><p className={`mt-2 whitespace-pre-wrap leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{cleanedSummary}</p></div>
                </div>
            )
        }
        
        const canTrade = analysisResult.tradingType === 'Futures' && (analysisResult.action === 'Long' || analysisResult.action === 'Short');

        return (
            <div className={`space-y-6 p-4 sm:p-6 rounded-2xl border transition-colors ${appearance.bgColor} ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'} ${appearance.ringColor} ring-4`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className={`px-4 py-1.5 text-lg font-bold rounded-full ${appearance.badgeColor}`}>{analysisResult.action}</span>
                    <h2 className={`text-2xl sm:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{pair}</h2>
                    <span className={`text-sm font-medium px-2 py-1 rounded ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{analysisResult.timeFrame}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <PricePoint icon={EntryIcon} label="Entry Price" value={analysisResult.entryPrice} colorClass={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} />
                    <PricePoint icon={TargetIcon} label="Take Profit" value={analysisResult.takeProfit} colorClass={theme === 'dark' ? 'text-green-400' : 'text-green-600'} />
                    <PricePoint icon={StopLossIcon} label="Stop Loss" value={analysisResult.stopLoss} colorClass={theme === 'dark' ? 'text-red-400' : 'text-red-600'} />
                </div>
                <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-[#121829] border-slate-700' : 'bg-white border-slate-200'}`}>
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Analysis & Strategy</h3>
                    <div className={`mt-3 mb-3 inline-flex items-center gap-2 text-sm font-semibold py-1 px-3 rounded-full ${theme === 'dark' ? 'bg-slate-700 text-yellow-300' : 'bg-yellow-100 text-yellow-800'}`}><ConfidenceIcon className="w-4 h-4" /> {analysisResult.confidence} Confidence</div>
                    <p className={`whitespace-pre-wrap leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{cleanedSummary}</p>
                </div>
                
                {canTrade && (
                    <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-[#121829] border-slate-700' : 'bg-white border-slate-200'}`}>
                         <h3 className={`text-lg font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}><TradeIcon className={appearance.textColor}/> Execute Trade via Bybit ({apiKeys?.tradeMode === 'demo' ? 'Demo' : 'Live'})</h3>
                        {!apiKeys ? (
                            <div className={`mt-3 text-center py-4 px-3 rounded-lg ${theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                                Please <button onClick={() => setIsSettingsOpen(true)} className="font-bold underline text-blue-400">connect your Bybit API keys</button> to enable trading.
                            </div>
                        ) : (
                            <div className="mt-4 space-y-4">
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                     <div>
                                        <label htmlFor="margin" className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Margin (USDT)</label>
                                        <input type="number" id="margin" value={tradeMargin} onChange={(e) => setTradeMargin(e.target.value)} placeholder="e.g. 100" className={`w-full font-semibold rounded-lg py-2 px-3 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-700/50 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500' : 'bg-slate-100 text-slate-800 border border-slate-300 focus:ring-2 focus:ring-blue-500'}`} />
                                     </div>
                                      <div>
                                        <label htmlFor="leverage" className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Leverage</label>
                                        <div className="relative">
                                          <input type="number" id="leverage" value={tradeLeverage} onChange={(e) => setTradeLeverage(e.target.value)} placeholder="e.g. 10" className={`w-full font-semibold rounded-lg py-2 pl-3 pr-6 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-700/50 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500' : 'bg-slate-100 text-slate-800 border border-slate-300 focus:ring-2 focus:ring-blue-500'}`} />
                                          <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>x</span>
                                        </div>
                                     </div>
                               </div>
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                     <div>
                                        <label htmlFor="takeProfit" className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Take Profit</label>
                                        <input type="text" id="takeProfit" value={tradeTakeProfit} onChange={(e) => setTradeTakeProfit(e.target.value)} placeholder="Enter TP price" className={`w-full font-semibold rounded-lg py-2 px-3 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-700/50 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500' : 'bg-slate-100 text-slate-800 border border-slate-300 focus:ring-2 focus:ring-blue-500'}`} />
                                     </div>
                                     <div>
                                        <label htmlFor="stopLoss" className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Stop Loss</label>
                                        <input type="text" id="stopLoss" value={tradeStopLoss} onChange={(e) => setTradeStopLoss(e.target.value)} placeholder="Enter SL price" className={`w-full font-semibold rounded-lg py-2 px-3 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-700/50 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500' : 'bg-slate-100 text-slate-800 border border-slate-300 focus:ring-2 focus:ring-blue-500'}`} />
                                     </div>
                               </div>
                                <div className="pt-2">
                                     <button onClick={handleExecuteTrade} disabled={isTrading || !tradeMargin || !tradeLeverage} className={`w-full bg-gradient-to-r text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg flex items-center justify-center ${appearance.tradeButton}`}>
                                        {isTrading ? <Spinner size="sm"/> : (analysisResult.action === 'Long' ? 'Execute Long' : 'Execute Short')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {sources.length > 0 && (
                    <div>
                       <h4 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Data Sources</h4>
                       <div className="flex flex-wrap gap-2">{sources.map((source, index) => (<a href={source.uri} key={index} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1.5 text-xs py-1 px-2.5 rounded-full border transition-colors ${theme === 'dark' ? 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300'}`}><LinkIcon /> {new URL(source.uri).hostname}</a>))}</div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`min-h-screen flex flex-col items-center p-4 sm:p-6 transition-colors duration-300 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            <Notification notification={notification} onDismiss={() => setNotification(null)} />
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onSave={handleSaveApiKeys} onDisconnect={handleDisconnectApi} theme={theme} currentKeys={apiKeys} />
            
            <div className="w-full max-w-4xl mx-auto space-y-6">
                <header className="flex items-center justify-between">
                    <h1 className={`text-xl font-bold flex items-center gap-2 transition-colors duration-300 ${theme === 'dark' ? 'text-[#6099EB]' : 'text-blue-600'}`}><Logo /> CryptoPulse AI</h1>
                    <div className="flex items-center gap-2">
                        {apiKeys && (
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${theme === 'dark' ? 'bg-[#1E293B]' : 'bg-slate-100'}`}>
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${apiKeys.tradeMode === 'demo' ? 'bg-yellow-400' : 'bg-green-400'}`} title={`${apiKeys.tradeMode === 'demo' ? 'Demo' : 'Live'} Account`}></span>
                                    <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>{apiKeys.tradeMode === 'demo' ? 'Demo' : 'Live'}:</span>
                                </div>
                                {isBalanceLoading ? (
                                    <div className="w-20 h-5 flex items-center">
                                        <Spinner size="sm" />
                                    </div>
                                ) : (
                                    <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                                        {walletBalance !== null ? `${walletBalance} USDT` : '---'}
                                    </span>
                                )}
                            </div>
                        )}
                        <button onClick={() => setIsSettingsOpen(true)} className={`p-2 w-10 h-10 rounded-full transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'}`} aria-label="Open settings">
                            <SettingsIcon />
                        </button>
                        <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className={`relative p-2 w-10 h-10 rounded-full transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'}`} aria-label="Toggle theme">
                            <span className={`absolute inset-0 flex items-center justify-center transform transition-all duration-300 ${theme === 'dark' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}><SunIcon /></span>
                            <span className={`absolute inset-0 flex items-center justify-center transform transition-all duration-300 ${theme === 'dark' ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}`}><MoonIcon /></span>
                        </button>
                    </div>
                </header>
                
                <div className={`sticky top-4 z-10 p-4 rounded-2xl border shadow-lg transition-all duration-300 ${theme === 'dark' ? 'bg-[#121829]/80 border-slate-700/50 shadow-black/20 backdrop-blur-md' : 'bg-white/80 border-slate-200 shadow-slate-200/50 backdrop-blur-md'}`}>
                    <div className="flex flex-col lg:flex-row items-center gap-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex-1 gap-3 w-full">
                            <CustomDropdown options={coinOptions} value={selectedCoin} onChange={setSelectedCoin} theme={theme} disabled={isLoading} />
                            <SegmentedControl options={tradingTypeOptions} selected={tradingType} onChange={setTradingType} theme={theme} disabled={isLoading} />
                            <CustomDropdown options={timeFrameOptions.map(t => ({label: t.label, value: t.value.replace(' ','')}))} value={timeFrame} onChange={(v) => setTimeFrame(v as TimeFrame)} theme={theme} disabled={isLoading}/>
                        </div>
                        <button onClick={handleAnalyze} disabled={isLoading} className="w-full lg:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-2.5 px-6 rounded-lg transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/50">
                            {isLoading ? <Spinner size="sm" /> : <Logo />}
                            {isLoading ? 'Analyzing...' : 'Generate Signal'}
                        </button>
                    </div>
                </div>

                <main className="flex-grow space-y-6">
                    {analysisResult && !isLoading && !error && (<div className={`h-[450px] rounded-2xl overflow-hidden border transition-colors ${theme === 'dark' ? 'bg-[#121829] border-slate-700/50' : 'bg-white border-slate-200'}`}><PriceChart theme={theme} coin={selectedCoin} timeFrame={timeFrame} /></div>)}
                    {renderAnalysisSection()}
                </main>
            </div>
            <style>{`body { font-family: 'Space Grotesk', sans-serif; }`}</style>
        </div>
    );
};

export default App;
