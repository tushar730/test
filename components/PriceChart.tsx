
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    createChart,
    CrosshairMode,
    ISeriesApi,
    UTCTimestamp,
    IChartApi,
    IRange,
    Time,
} from 'lightweight-charts';
import type { TimeFrame } from '../services/geminiService';
import type { CandlestickData } from '../services/cryptoDataService';
import { getHistoricalData, getLivePrice } from '../services/cryptoDataService';
import Spinner from './Spinner';

interface PriceChartProps {
    theme: 'light' | 'dark';
    coin: string;
    timeFrame: TimeFrame;
}

const timeFrameToSeconds: Record<TimeFrame, number> = {
    '1m': 60, '5m': 5 * 60, '15m': 15 * 60,
    '1H': 3600, '4H': 4 * 3600,
    '1D': 86400,
};

const PriceChart: React.FC<PriceChartProps> = ({ theme, coin, timeFrame }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    
    const [chartData, setChartData] = useState<CandlestickData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMoreHistory, setHasMoreHistory] = useState(true);
    
    const visibleRangeToRestoreRef = useRef<IRange<Time> | null>(null);

    // Effect for creating and configuring the chart instance
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            crosshair: {
                mode: CrosshairMode.Normal,
            },
            timeScale: {
                rightOffset: 12,
            },
        });
        chartRef.current = chart;

        candlestickSeriesRef.current = (chart as any).addCandlestickSeries({});

        const resizeObserver = new ResizeObserver(entries => {
            if (!entries || entries.length === 0) return;
            const { width, height } = entries[0].contentRect;
            chart.resize(width, height);
        });
        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
        };
    }, []); // Only runs once to create the chart

    // Effect for updating chart theme
    useEffect(() => {
        if (!chartRef.current) return;
        chartRef.current.applyOptions({
             layout: {
                background: { color: theme === 'dark' ? '#121829' : '#FFFFFF' },
                textColor: theme === 'dark' ? '#D1D5DB' : '#1F2937',
            },
            grid: {
                vertLines: { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
                horzLines: { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
            },
             rightPriceScale: {
                borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
            },
            timeScale: {
                borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
            },
        });
        candlestickSeriesRef.current?.applyOptions({
            upColor: theme === 'dark' ? '#22C55E' : '#16A34A',
            downColor: theme === 'dark' ? '#EF4444' : '#DC2626',
            borderDownColor: theme === 'dark' ? '#EF4444' : '#DC2626',
            borderUpColor: theme === 'dark' ? '#22C55E' : '#16A34A',
            wickDownColor: theme === 'dark' ? '#EF4444' : '#DC2626',
            wickUpColor: theme === 'dark' ? '#22C55E' : '#16A34A',
        });
    }, [theme]);

    // Effect to apply data to chart and restore scroll position
    useEffect(() => {
        if (candlestickSeriesRef.current) {
            candlestickSeriesRef.current.setData(chartData);

            if (visibleRangeToRestoreRef.current && chartRef.current) {
                chartRef.current.timeScale().setVisibleRange(visibleRangeToRestoreRef.current);
                visibleRangeToRestoreRef.current = null; // Clear after use
            }
        }
    }, [chartData]);
    
    // History loading logic
    const handleVisibleTimeRangeChange = useCallback(() => {
        if (isLoadingHistory || !hasMoreHistory || loading || chartData.length === 0) {
            return;
        }

        const logicalRange = chartRef.current?.timeScale().getVisibleLogicalRange();

        // If user is scrolled to the beginning (with a buffer)
        if (logicalRange && logicalRange.from < 10) {
            setIsLoadingHistory(true);
            const oldestDataPoint = chartData[0];
            const toTs = oldestDataPoint.time as number;

            // Store current visible range before loading new data
            visibleRangeToRestoreRef.current = chartRef.current?.timeScale().getVisibleRange() || null;

            getHistoricalData(coin, timeFrame, toTs)
                .then(newData => {
                    if (newData.length === 0) {
                        setHasMoreHistory(false);
                    } else {
                        // Prepend new historical data
                        setChartData(prevData => [...newData, ...prevData]);
                    }
                })
                .catch(err => {
                    console.error("Failed to load historical chart data:", err);
                    setHasMoreHistory(false);
                })
                .finally(() => {
                    setIsLoadingHistory(false);
                });
        }
    }, [isLoadingHistory, hasMoreHistory, loading, chartData.length, coin, timeFrame]);

    // Subscribe to scroll events for history loading
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart || chartData.length === 0) return;
        
        const timeScale = chart.timeScale();
        timeScale.subscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange);

        return () => timeScale.unsubscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange);
    }, [handleVisibleTimeRangeChange, chartData.length]);


    // Effect for initial data fetching and resets
    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);
        setHasMoreHistory(true);
        setChartData([]); // Clear previous data
        
        getHistoricalData(coin, timeFrame)
            .then(data => {
                if (!isMounted) return;
                setChartData(data);
                chartRef.current?.timeScale().fitContent();
            })
            .catch(err => {
                if (!isMounted) return;
                setError(err.message || "Failed to load chart data.");
                setChartData([]);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });
            
        return () => { isMounted = false; };
    }, [coin, timeFrame]);
    
    // Effect for live price updates
    useEffect(() => {
        if (loading || error || !timeFrameToSeconds[timeFrame]) return;

        let isSubscribed = true;
        const interval = setInterval(() => {
            getLivePrice(coin)
                .then(price => {
                    if (!isSubscribed) return;

                    setChartData(currentData => {
                        if (currentData.length === 0) return [];
                        
                        const lastCandle = currentData[currentData.length - 1];
                        const barDurationSeconds = timeFrameToSeconds[timeFrame];
                        const nextCandleTime = ((lastCandle.time as number) + barDurationSeconds) as UTCTimestamp;
                        const nowInSeconds = Math.floor(Date.now() / 1000);

                        if (nowInSeconds >= nextCandleTime) {
                             const newCandle: CandlestickData = {
                                time: nextCandleTime,
                                open: price,
                                high: price,
                                low: price,
                                close: price,
                            };
                            return [...currentData, newCandle];
                        } else {
                            const updatedCandle: CandlestickData = {
                                ...lastCandle,
                                close: price,
                                high: Math.max(lastCandle.high, price),
                                low: Math.min(lastCandle.low, price),
                            };
                            return [...currentData.slice(0, -1), updatedCandle];
                        }
                    });
                })
                .catch(err => {
                    if (!isSubscribed) return;
                    console.warn(`Live update for ${coin} failed: ${err.message}`);
                });
        }, 2000);

        return () => {
            isSubscribed = false;
            clearInterval(interval);
        };
    }, [loading, error, coin, timeFrame]);


    return (
        <div ref={chartContainerRef} className="w-full h-full relative">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-transparent backdrop-blur-sm z-10">
                    <div className="flex flex-col items-center gap-2">
                        <Spinner size="lg" />
                        <span className={`font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Loading Chart Data...</span>
                    </div>
                </div>
            )}
             {!loading && isLoadingHistory && (
                <div className={`absolute top-4 left-4 z-10 p-2 rounded-lg backdrop-blur-sm ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-200/50'}`}>
                    <div className="flex items-center gap-2">
                        <Spinner size="sm" />
                        <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Loading History...</span>
                    </div>
                </div>
            )}
            {!loading && error && (
                 <div className="absolute inset-0 flex items-center justify-center bg-transparent z-10 p-4">
                     <div className={`text-center p-4 rounded-lg ${theme === 'dark' ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-700'}`}>
                         <p className="font-bold">Chart Error</p>
                         <p className="text-sm">{error}</p>
                     </div>
                 </div>
            )}
        </div>
    );
};

export default PriceChart;
