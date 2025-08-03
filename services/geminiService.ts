
import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;
const getAi = (): GoogleGenAI => {
    if (ai) return ai;
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set. Please configure it to use the AI features.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return ai;
};

export type TradingType = 'Spot' | 'Futures';
export type TimeFrame = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';
export type SignalAction = 'Long' | 'Short' | 'Buy' | 'Sell' | 'Hold';
export type Confidence = string;

export interface CryptoSignal {
    coin: string;
    timeFrame: TimeFrame;
    tradingType: TradingType;
    action: SignalAction;
    entryPrice: string;
    takeProfit: string;
    stopLoss: string;
    confidence: Confidence;
    summary: string;
}

export interface GroundingSource {
    uri: string;
    title: string;
}

export const getCryptoAnalysis = async (
    coin: string,
    tradingType: TradingType,
    timeFrame: TimeFrame
): Promise<{ analysis: CryptoSignal; sources: GroundingSource[] }> => {
    try {
        const aiInstance = getAi();
        const pair = tradingType === 'Futures' ? `${coin}USDT` : coin;

        const actionType = tradingType === 'Futures' ? "'Long' or 'Short'" : "'Buy' or 'Sell'";
        
        const jsonSchemaString = `{
    "coin": "string, should be '${coin}'",
    "timeFrame": "string, should be '${timeFrame}'",
    "tradingType": "string, should be '${tradingType}'",
    "action": "string (${actionType}, or 'Hold')",
    "entryPrice": "string (a SINGLE, precise price, e.g. '68500', not a range. 'N/A' for Hold)",
    "takeProfit": "string (a single price target, e.g. '69500', or 'N/A' for Hold)",
    "stopLoss": "string (a single price, e.g. '68000', or 'N/A' for Hold)",
    "confidence": "string representing confidence (e.g., 'High', 'Medium', 'Low')",
    "summary": "string containing a bullet-pointed list (3-4 points) with '\\\\n' for newlines. The first bullet MUST be the strongest reason for the signal. All special characters must be properly escaped."
}`;

        const prompt = `Act as an expert cryptocurrency trading analyst. Your analysis MUST be based on the "CME Gaps + Fair Value Gaps (FVG) + Price Action" methodology.

Provide a decisive, actionable trading signal for ${pair} on the ${timeFrame} timeframe.

Your entire response MUST be a single, raw JSON object, without any markdown formatting (like \`\`\`json), comments, or other text.

The JSON object must conform to this structure:
${jsonSchemaString}

- For 'Futures' trading, the action MUST be 'Long' or 'Short'. For 'Spot' trading, it MUST be 'Buy' or 'Sell'.
- The 'Hold' action should only be used in extremely rare cases of perfectly balanced consolidation where no directional edge can be found.
- The 'entryPrice', 'takeProfit', and 'stopLoss' values MUST be realistic and achievable within the selected '${timeFrame}' timeframe. For shorter timeframes like '15m', price targets must be tight. For longer timeframes like '1D', they can be wider.
- Your summary MUST be a concise, bullet-pointed list. Use a hyphen (-) for each bullet and use a double backslash for newlines (\\\\n). Do NOT include citation markers like [1].
- Base your analysis on real-time data from your search tool. Ensure all fields in the JSON schema are present.`;

        const response = await aiInstance.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const analysisText = response.text;
        if (!analysisText) {
            throw new Error("Received an empty response from the AI.");
        }
        
        let jsonString = analysisText;

        const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonString = jsonMatch[1].trim();
        } else {
            const startIndex = jsonString.indexOf('{');
            const endIndex = jsonString.lastIndexOf('}');
            if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                jsonString = jsonString.substring(startIndex, endIndex + 1);
            }
        }
        
        const analysis: CryptoSignal = JSON.parse(jsonString);
        
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        const rawSources = groundingMetadata?.groundingChunks?.map(chunk => chunk.web) ?? [];
        const sources: GroundingSource[] = rawSources.map(s => ({ uri: s?.uri ?? '', title: s?.title ?? 'Untitled Source' })).filter(s => s.uri);

        return { analysis, sources };

    } catch (error) {
        console.error("Error fetching crypto analysis:", error);
        if (error instanceof Error) {
            if (error.message.startsWith("API_KEY")) throw error;
            if (error instanceof SyntaxError) {
                 throw new Error(`Failed to parse the AI's response. The data was not valid JSON. Please try again.`);
            }
            throw new Error(`Failed to get analysis. ${error.message}`);
        }
        throw new Error("An unknown error occurred while fetching analysis.");
    }
};
