
type ApiKeys = { key: string; secret: string; tradeMode?: 'live' | 'demo' };
export type OrderDetails = {
    symbol: string;
    side: 'Buy' | 'Sell';
    qty: string;
    leverage: string;
    takeProfit?: string;
    stopLoss?: string;
}

interface BybitRequest {
    keys: ApiKeys;
    order: OrderDetails;
}

const API_URL = "https://api.bybit.com";
const RECV_WINDOW = 5000; // 5 seconds

// Helper to convert ArrayBuffer to hex string
function bufferToHex(buffer: ArrayBuffer): string {
    return [...new Uint8Array(buffer)]
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Securely sign the request using Web Crypto API
async function signRequest(apiSecret: string, payload: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(apiSecret);
    const payloadData = encoder.encode(payload);

    const key = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signatureBuffer = await window.crypto.subtle.sign('HMAC', key, payloadData);
    return bufferToHex(signatureBuffer);
}

export async function placeBybitOrder({ keys, order }: BybitRequest): Promise<{ orderId: string }> {
    const { key, secret } = keys;
    const { symbol, side, qty, leverage, takeProfit, stopLoss } = order;
    
    if (!key || !secret) {
        throw new Error("API Key and Secret are required.");
    }
    
    // --- Step 1: Set Leverage ---
    try {
        const leverageEndpoint = "/v5/position/set-leverage";
        const leverageTimestamp = Date.now().toString();
        const leverageBody = {
            category: "linear",
            symbol: symbol,
            buyLeverage: leverage,
            sellLeverage: leverage,
        };
        const leverageBodyString = JSON.stringify(leverageBody);
        const leveragePayload = leverageTimestamp + key + RECV_WINDOW + leverageBodyString;
        const leverageSignature = await signRequest(secret, leveragePayload);
        
        const leverageHeaders: HeadersInit = {
            'Content-Type': 'application/json',
            'X-BAPI-API-KEY': key,
            'X-BAPI-SIGN': leverageSignature,
            'X-BAPI-TIMESTAMP': leverageTimestamp,
            'X-BAPI-RECV-WINDOW': RECV_WINDOW.toString(),
        };
        if (keys.tradeMode === 'demo') {
            leverageHeaders['X-BAPI-DEMO-TRADING'] = '1';
        }
        
        const leverageResponse = await fetch(API_URL + leverageEndpoint, {
            method: 'POST',
            headers: leverageHeaders,
            body: leverageBodyString,
        });

        const leverageResult = await leverageResponse.json();
        // retCode 110025 means leverage is not modified, which is not an error for us.
        if (leverageResult.retCode !== 0 && leverageResult.retCode !== 110025) {
             throw new Error(`Set Leverage Failed (${leverageResult.retCode}): ${leverageResult.retMsg}`);
        }
    } catch (error) {
        console.error("Error setting Bybit leverage:", error);
        if (error instanceof Error) throw error;
        throw new Error("An unknown error occurred while setting leverage on Bybit.");
    }

    // --- Step 2: Create Order ---
    const tp = (takeProfit && takeProfit !== 'N/A') ? parseFloat(takeProfit.replace(/[^0-9.]/g, '')).toString() : undefined;
    const sl = (stopLoss && stopLoss !== 'N/A') ? parseFloat(stopLoss.replace(/[^0-9.]/g, '')).toString() : undefined;

    const endpoint = "/v5/order/create";
    const timestamp = Date.now().toString();

    const body: any = {
        category: "linear",
        symbol: symbol,
        side: side,
        orderType: "Market",
        qty: qty,
    };
    
    if (tp) body.takeProfit = tp;
    if (sl) body.stopLoss = sl;

    const bodyString = JSON.stringify(body);
    const payload = timestamp + key + RECV_WINDOW + bodyString;
    
    try {
        const signature = await signRequest(secret, payload);
        
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'X-BAPI-API-KEY': key,
            'X-BAPI-SIGN': signature,
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-RECV-WINDOW': RECV_WINDOW.toString(),
        };

        if (keys.tradeMode === 'demo') {
            headers['X-BAPI-DEMO-TRADING'] = '1';
        }

        const response = await fetch(API_URL + endpoint, {
            method: 'POST',
            headers,
            body: bodyString,
        });

        const result = await response.json();

        if (result.retCode !== 0) {
            throw new Error(`Create Order Failed (${result.retCode}): ${result.retMsg}`);
        }
        
        if (!result.result || !result.result.orderId) {
            throw new Error("Bybit response did not include an orderId.");
        }

        return { orderId: result.result.orderId };

    } catch (error) {
        console.error("Error placing Bybit order:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("An unknown error occurred while communicating with Bybit.");
    }
}

export async function getWalletBalance({ keys }: { keys: ApiKeys }): Promise<string> {
    const { key, secret } = keys;
    if (!key || !secret) {
        throw new Error("API Key and Secret are required.");
    }

    const endpoint = "/v5/account/wallet-balance";
    const timestamp = Date.now().toString();
    const queryString = "accountType=CONTRACT";
    const payload = timestamp + key + RECV_WINDOW + queryString;
    
    try {
        const signature = await signRequest(secret, payload);
        
        const headers: HeadersInit = {
            'X-BAPI-API-KEY': key,
            'X-BAPI-SIGN': signature,
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-RECV-WINDOW': RECV_WINDOW.toString(),
        };

        if (keys.tradeMode === 'demo') {
            headers['X-BAPI-DEMO-TRADING'] = '1';
        }

        const response = await fetch(`${API_URL}${endpoint}?${queryString}`, {
            method: 'GET',
            headers,
        });

        const result = await response.json();

        if (result.retCode !== 0) {
            throw new Error(`Get Balance Failed (${result.retCode}): ${result.retMsg}`);
        }
        
        const contractAccount = result.result?.list?.find((acc: any) => acc.accountType === 'CONTRACT');
        if (!contractAccount) {
            throw new Error("CONTRACT account type not found in Bybit response. Please ensure you have a standard derivatives account.");
        }
        
        const usdtCoin = contractAccount.coin?.find((c: any) => c.coin === 'USDT');
        if (!usdtCoin || usdtCoin.walletBalance === undefined) {
             return "0.00"; // Return 0 if USDT wallet doesn't exist.
        }
        
        const balance = parseFloat(usdtCoin.walletBalance);
        if (isNaN(balance)) {
             throw new Error("Invalid wallet balance received from Bybit.");
        }
        
        // Format to 2 decimal places with commas
        return balance.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    } catch (error) {
        console.error("Error fetching Bybit wallet balance:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("An unknown error occurred while fetching wallet balance from Bybit.");
    }
}
