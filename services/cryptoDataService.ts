
import { TimeFrame } from './geminiService';
import type { UTCTimestamp } from 'lightweight-charts';

export interface CandlestickData {
    time: UTCTimestamp;
    open: number;
    high: number;
    low: number;
    close: number;
}

// Mapping our app's TimeFrame to CryptoCompare's API timeframes
const timeFrameToCryptoCompare: Record<TimeFrame, { unit: string; aggregate: number }> = {
    '1m': { unit: 'minute', aggregate: 1 },
    '5m': { unit: 'minute', aggregate: 5 },
    '15m': { unit: 'minute', aggregate: 15 },
    '1H': { unit: 'hour', aggregate: 1 },
    '4H': { unit: 'hour', aggregate: 4 },
    '1D': { unit: 'day', aggregate: 1 },
};


export const getHistoricalData = async (
    coin: string,
    timeFrame: TimeFrame,
    toTs?: number
): Promise<CandlestickData[]> => {
    if (!timeFrameToCryptoCompare[timeFrame]) {
        throw new Error(`Unsupported timeframe: ${timeFrame}`);
    }
    const mapping = timeFrameToCryptoCompare[timeFrame];
    // CryptoCompare uses 'histoday', 'histohour', 'histominute'
    const apiTimeframe = mapping.unit === 'day' ? 'histoday' : mapping.unit === 'hour' ? 'histohour' : 'histominute';
    const aggregate = mapping.aggregate;
    const limit = 200; // Number of data points
    const symbol = coin.toUpperCase();

    let url = `https://min-api.cryptocompare.com/data/v2/${apiTimeframe}?fsym=${symbol}&tsym=USDT&limit=${limit}&aggregate=${aggregate}`;
    if (toTs) {
        url += `&toTs=${toTs}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.Message || `Failed to fetch data for ${symbol}`);
        }
        const data = await response.json();

        if (data.Response === 'Error') {
            throw new Error(data.Message);
        }

        if (!data.Data || !data.Data.Data || data.Data.Data.length === 0) {
            // Return empty array if no data, which is expected when reaching end of history
            if (toTs) return []; 
            throw new Error(`No data available for ${symbol} on the ${timeFrame} timeframe.`);
        }

        const mappedData = data.Data.Data.map((d: any): CandlestickData => ({
            time: d.time as UTCTimestamp,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
        }));
        
        // When using toTs, CryptoCompare includes the candle at that timestamp.
        // We filter it out to prevent having a duplicate candle in our chart data.
        if (toTs) {
            return mappedData.filter(d => (d.time as number) < toTs);
        }

        return mappedData;

    } catch (error) {
        console.error(`Error fetching historical data for ${coin}:`, error);
        throw error;
    }
};

export const getLivePrice = async (coin: string): Promise<number> => {
    const symbol = coin.toUpperCase();
    const url = `https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USDT`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.Message || `Failed to fetch live price for ${symbol}`);
        }
        const data = await response.json();
        if (data.Response === 'Error' || typeof data.USDT !== 'number') {
            throw new Error(data.Message || `Could not find live price for ${symbol}`);
        }
        return data.USDT;
    } catch (error) {
        console.warn(`Could not fetch live price for ${coin}:`, error);
        throw error;
    }
};
