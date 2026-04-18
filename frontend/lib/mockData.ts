export interface Portfolio {
  id: string;
  broker: string;
  name: string;
  brokerColor: string;
  totalValueKrw: number;
  returnPct: number;
  active: boolean;
}

export interface Holding {
  symbol: string;
  name: string;
  code: string;
  market: 'KR' | 'US';
  sector: string;
  sectorColor: string;
  quantity: number;
  currentPrice: number;
  avgCost: number;
  returnPct: number;
  profitKrw: number;
  weightPct: number;
  currency: 'KRW' | 'USD';
  changeToday: number;
}

export interface TreemapItem {
  name: string;
  code?: string;
  size: number;
  change: number;
}

export interface TreemapSector {
  name: string;
  children: TreemapItem[];
}

export const portfolios: Portfolio[] = [
  { id: 'kakao-dc',   broker: '삼성증권', name: '카카오페이_DC 계좌 포트폴리오', brokerColor: '#1a56db', totalValueKrw: 1018168,   returnPct: 21.47, active: true },
  { id: 'kiwoom',     broker: '키움증권', name: '연금저축 계좌 포트폴리오',       brokerColor: '#e02424', totalValueKrw: 7836210,   returnPct: 6.4,  active: true },
  { id: 'daishin',    broker: '대신증권', name: '40118350201 포트폴리오',          brokerColor: '#0e9f6e', totalValueKrw: 35,        returnPct: 0,    active: true },
  { id: 'miraeasset', broker: '미래에셋', name: '주식회사 092677668320 포트폴리오', brokerColor: '#6875f5', totalValueKrw: 83,        returnPct: 0,    active: true },
  { id: 'samsung1',   broker: '삼성증권', name: '포트폴리오',                      brokerColor: '#1a56db', totalValueKrw: 1013400,   returnPct: 24.83, active: true },
  { id: 'kis',        broker: '한국투자', name: '7287882329 포트폴리오',            brokerColor: '#ff5a1f', totalValueKrw: 0,         returnPct: 0,    active: false },
  { id: 'samsung2',   broker: '삼성증권', name: '709031749829 포트폴리오',          brokerColor: '#1a56db', totalValueKrw: 27713300,  returnPct: 34.57, active: true },
];

export const totalAsset = 301121636;
export const totalProfit = 67976771;
export const totalReturnPct = 29.86;
export const monthlyDividend = 427508;

export const treemapData: TreemapSector[] = [
  {
    name: 'ETF',
    children: [
      { name: 'SOL국제금', size: 27327680, change: -0.1 },
      { name: 'SOL국제금(H)', size: 17114040, change: 0.3 },
      { name: 'TLTW', size: 14425610, change: 0.7 },
      { name: 'IAUI', size: 13465000, change: 1.3 },
      { name: 'KODEX미국나스닥', size: 25438710, change: 0.5 },
      { name: 'TIGERUL', size: 7781175, change: 0.5 },
      { name: '1Q미국나스닥', size: 6272115, change: 0.5 },
      { name: 'KODEXMS', size: 5800000, change: 1.2 },
      { name: 'KODEX미국A', size: 20081600, change: 0.0 },
    ],
  },
  {
    name: '첨단기술',
    children: [
      { name: 'TSLA', size: 14200000, change: 3.0 },
      { name: 'CLS', size: 4621000, change: 3.6 },
      { name: 'NVDA', size: 9000000, change: 1.7 },
      { name: 'SK하이닉스', size: 5000000, change: 0.8 },
      { name: 'AVGO', size: 7000000, change: 2.0 },
      { name: '기타', size: 8661899, change: -5.5 },
      { name: '7806', size: 3200000, change: 0.3 },
    ],
  },
  {
    name: 'IT',
    children: [
      { name: 'GOOGL', size: 18960021, change: 1.7 },
      { name: 'META', size: 6000000, change: 1.7 },
      { name: 'AMZN', size: 5000000, change: 0.4 },
    ],
  },
  {
    name: '산업재',
    children: [
      { name: 'LITE', size: 6520590, change: 0.3 },
      { name: 'GEV', size: 3800000, change: 2.5 },
      { name: 'LILLY', size: 2690000, change: 2.6 },
    ],
  },
  {
    name: '유통',
    children: [{ name: '유통', size: 3000000, change: 0.2 }],
  },
  {
    name: '현금',
    children: [{ name: '현금', size: 5000000, change: 0.0 }],
  },
];

export const holdingsKR: Holding[] = [
  { symbol: 'SOL미국주식S&P500(H)', name: 'SOL 미국주식 S&P500(H)', code: '002D85', market: 'KR', sector: '해외ETF', sectorColor: '#1a56db', quantity: 1, currentPrice: 184715, avgCost: 156000, returnPct: 18.41, profitKrw: 28715, weightPct: 35.2, currency: 'KRW', changeToday: 0.5 },
  { symbol: 'KODEX미국나스닥100', name: 'KODEX 미국나스닥100', code: '379800', market: 'KR', sector: '해외ETF', sectorColor: '#1a56db', quantity: 3, currentPrice: 25438710, avgCost: 22000000, returnPct: 15.6, profitKrw: 3438710, weightPct: 28.4, currency: 'KRW', changeToday: 0.5 },
  { symbol: 'KODEX미국S&P500STOPIO', name: 'KODEX 미국S&P500 STOPIO', code: '449170', market: 'KR', sector: '해외ETF', sectorColor: '#6875f5', quantity: 2, currentPrice: 13200000, avgCost: 12000000, returnPct: 10.0, profitKrw: 1200000, weightPct: 18.1, currency: 'KRW', changeToday: 1.2 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', code: 'GOOGL', market: 'KR', sector: 'IT', sectorColor: '#0e9f6e', quantity: 5, currentPrice: 18960021, avgCost: 16000000, returnPct: 18.5, profitKrw: 2960021, weightPct: 10.3, currency: 'KRW', changeToday: 1.7 },
  { symbol: 'SOL국제금', name: 'SOL 국제금채권(H)', code: 'SOL금', market: 'KR', sector: 'ETF', sectorColor: '#f59e0b', quantity: 10, currentPrice: 27327680, avgCost: 27500000, returnPct: -0.6, profitKrw: -172320, weightPct: 8.0, currency: 'KRW', changeToday: -0.1 },
];

export const holdingsUS: Holding[] = [
  { symbol: 'TSLA', name: 'Tesla Inc.', code: 'TSLA', market: 'US', sector: '첨단기술', sectorColor: '#dc2626', quantity: 20, currentPrice: 185, avgCost: 150, returnPct: 23.3, profitKrw: 966000, weightPct: 22.1, currency: 'USD', changeToday: 3.0 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', code: 'NVDA', market: 'US', sector: '첨단기술', sectorColor: '#dc2626', quantity: 10, currentPrice: 112, avgCost: 95, returnPct: 17.9, profitKrw: 321000, weightPct: 15.4, currency: 'USD', changeToday: 1.7 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', code: 'GOOGL', market: 'US', sector: 'IT', sectorColor: '#0e9f6e', quantity: 5, currentPrice: 165, avgCost: 140, returnPct: 17.9, profitKrw: 448000, weightPct: 12.0, currency: 'USD', changeToday: 1.7 },
  { symbol: 'AVGO', name: 'Broadcom Inc.', code: 'AVGO', market: 'US', sector: '첨단기술', sectorColor: '#dc2626', quantity: 8, currentPrice: 195, avgCost: 170, returnPct: 14.7, profitKrw: 370000, weightPct: 10.5, currency: 'USD', changeToday: 2.0 },
  { symbol: 'CLS', name: 'Celestica Inc.', code: 'CLS', market: 'US', sector: '첨단기술', sectorColor: '#dc2626', quantity: 30, currentPrice: 48, avgCost: 35, returnPct: 37.1, profitKrw: 571000, weightPct: 9.8, currency: 'USD', changeToday: 3.6 },
];

export const donutData = [
  { name: 'SOL 미국주식', value: 35.2, color: '#1a56db' },
  { name: 'KODEX 나스닥100', value: 28.4, color: '#6875f5' },
  { name: 'KODEX S&P500', value: 18.1, color: '#0e9f6e' },
  { name: 'GOOGL', value: 10.3, color: '#f59e0b' },
  { name: '기타', value: 8.0, color: '#374151' },
];

export const barHistoryData = [
  { date: '11/24', value: 231000000 },
  { date: '12/24', value: 248000000 },
  { date: '01/25', value: 255000000 },
  { date: '02/25', value: 270000000 },
  { date: '03/25', value: 263000000 },
  { date: '04/25', value: 301121636 },
];
