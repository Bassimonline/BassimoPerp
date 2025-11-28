
import { TokenConfig } from './types';

export const AVAILABLE_TOKENS: TokenConfig[] = [
  { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', name: 'Bitcoin' },
  { symbol: 'ETHUSDT', base: 'ETH', quote: 'USDT', name: 'Ethereum' },
  { symbol: 'SOLUSDT', base: 'SOL', quote: 'USDT', name: 'Solana' },
  { symbol: 'BNBUSDT', base: 'BNB', quote: 'USDT', name: 'BNB' },
  { symbol: 'XRPUSDT', base: 'XRP', quote: 'USDT', name: 'Ripple' },
  { symbol: 'DOGEUSDT', base: 'DOGE', quote: 'USDT', name: 'Dogecoin' },
  { symbol: 'ADAUSDT', base: 'ADA', quote: 'USDT', name: 'Cardano' },
  { symbol: 'AVAXUSDT', base: 'AVAX', quote: 'USDT', name: 'Avalanche' },
  { symbol: 'DOTUSDT', base: 'DOT', quote: 'USDT', name: 'Polkadot' },
  { symbol: 'LINKUSDT', base: 'LINK', quote: 'USDT', name: 'Chainlink' },
  { symbol: 'MATICUSDT', base: 'MATIC', quote: 'USDT', name: 'Polygon' },
  { symbol: 'SHIBUSDT', base: 'SHIB', quote: 'USDT', name: 'Shiba Inu' },
  { symbol: 'PEPEUSDT', base: 'PEPE', quote: 'USDT', name: 'Pepe' },
  { symbol: 'WIFUSDT', base: 'WIF', quote: 'USDT', name: 'dogwifhat' }
];

export const getIconUrl = (base: string) => {
    // Fallback logic for generic icons or specific overrides if needed
    return `https://assets.coincap.io/assets/icons/${base.toLowerCase()}@2x.png`;
};
