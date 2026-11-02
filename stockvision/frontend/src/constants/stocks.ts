export interface StockMeta {
  symbol: string;
  name: string;
  sector: string;
}

export const NSE_STOCKS_28: StockMeta[] = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd.', sector: 'Energy / Conglomerate' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services Ltd.', sector: 'Information Technology' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd.', sector: 'Banking & Financials' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd.', sector: 'Banking & Financials' },
  { symbol: 'INFY.NS', name: 'Infosys Ltd.', sector: 'Information Technology' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel Ltd.', sector: 'Telecommunications' },
  { symbol: 'SBIN.NS', name: 'State Bank of India', sector: 'Public Sector Banking' },
  { symbol: 'ITC.NS', name: 'ITC Ltd.', sector: 'Consumer Goods / FMCG' },
  { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever Ltd.', sector: 'FMCG' },
  { symbol: 'LT.NS', name: 'Larsen & Toubro Ltd.', sector: 'Construction & Engineering' },
  { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance Ltd.', sector: 'Financial Services / NBFC' },
  { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank Ltd.', sector: 'Banking & Financials' },
  { symbol: 'AXISBANK.NS', name: 'Axis Bank Ltd.', sector: 'Banking & Financials' },
  { symbol: 'MARUTI.NS', name: 'Maruti Suzuki India Ltd.', sector: 'Automobile' },
  { symbol: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical Industries Ltd.', sector: 'Healthcare / Pharma' },
  { symbol: 'TITAN.NS', name: 'Titan Company Ltd.', sector: 'Consumer Discretionary' },
  { symbol: 'ASIANPAINT.NS', name: 'Asian Paints Ltd.', sector: 'Consumer Goods / Paints' },
  { symbol: 'NTPC.NS', name: 'NTPC Ltd.', sector: 'Utilities / Power Generation' },
  { symbol: 'POWERGRID.NS', name: 'Power Grid Corporation of India Ltd.', sector: 'Utilities / Transmission' },
  { symbol: 'ONGC.NS', name: 'Oil & Natural Gas Corporation Ltd.', sector: 'Energy / Oil & Gas' },
  { symbol: 'TATASTEEL.NS', name: 'Tata Steel Ltd.', sector: 'Metals & Mining' },
  { symbol: 'M&M.NS', name: 'Mahindra & Mahindra Ltd.', sector: 'Automobile / Agriculture' },
  { symbol: 'ADANIENT.NS', name: 'Adani Enterprises Ltd.', sector: 'Commodities & Infrastructure' },
  { symbol: 'WIPRO.NS', name: 'Wipro Ltd.', sector: 'Information Technology' },
  { symbol: 'COALINDIA.NS', name: 'Coal India Ltd.', sector: 'Energy / Mining' },
  { symbol: 'HCLTECH.NS', name: 'HCL Technologies Ltd.', sector: 'Information Technology' },
  { symbol: 'BAJAJ-AUTO.NS', name: 'Bajaj Auto Ltd.', sector: 'Automobile / 2-Wheelers' },
  { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement Ltd.', sector: 'Cement & Building Materials' },
];

export const PRETRAINED_SYMBOLS_LIST = NSE_STOCKS_28.map((s) => s.symbol);

