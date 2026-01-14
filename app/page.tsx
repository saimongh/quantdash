"use client";

import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, Activity, Plus, Trash2, TrendingDown, BarChart3, Target, Search, Loader2, AlertTriangle, Layers, Zap, CheckCircle2, Github } from 'lucide-react';
import { calculateBlackScholes } from '../utils/finance';

// ============================================================================
// LOGIC ENGINES (Math & Calculations)
// ============================================================================

function generateGaussianRandom(): number {
  let u1 = 0, u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

function simulateGBMPath(S0: number, r: number, sigma: number, T: number, steps: number): number[] {
  const dt = T / steps;
  const path = new Array(steps + 1);
  path[0] = S0;

  for (let i = 1; i <= steps; i++) {
    const Z = generateGaussianRandom();
    const drift = (r - 0.5 * sigma * sigma) * dt;
    const diffusion = sigma * Math.sqrt(dt) * Z;
    path[i] = path[i - 1] * Math.exp(drift + diffusion);
  }

  return path;
}

interface Asset {
  id: string;
  name: string;
  currentValue: number;
  targetAllocation: number;
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#6366f1', '#14b8a6'];

// ============================================================================
// STABLE UI COMPONENTS 
// ============================================================================

const GlassCard = ({ children, className = "" }: any) => (
  <div className={`relative overflow-hidden bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-xl ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
    <div className="relative z-10 p-6 md:p-8">{children}</div>
  </div>
);

const SliderInput = ({ label, value, onChange, min, max, step, unit = '' }: any) => {
  const isPrefix = unit === '$';
  
  return (
    <div className="group mb-5">
      <div className="flex justify-between items-end mb-2">
        <label className="text-xs uppercase tracking-widest text-white/40 font-medium">{label}</label>
        
        {/* Interactive Input Box */}
        <div className="flex items-center bg-emerald-900/20 px-2 py-1 rounded border border-emerald-500/20 focus-within:border-emerald-500/50 transition-colors">
          {isPrefix && <span className="text-emerald-500/50 font-mono text-sm mr-1">{unit}</span>}
          <input
            type="number"
            value={typeof value === 'number' ? Number(value.toFixed(4)) : value}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) onChange(val);
            }}
            step={step}
            className="bg-transparent text-emerald-300 font-mono text-sm w-20 text-right focus:outline-none appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {!isPrefix && unit && <span className="text-emerald-500/50 font-mono text-sm ml-1">{unit}</span>}
        </div>
      </div>
      
      <div className="relative h-6 flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all hover:[&::-webkit-slider-thumb]:scale-110"
        />
      </div>
    </div>
  );
};

const KPICard = ({ title, value, icon: Icon, type = 'neutral' }: any) => {
  const colors = {
    positive: 'text-emerald-400 from-emerald-500/10 to-transparent border-emerald-500/20',
    negative: 'text-indigo-400 from-indigo-500/10 to-transparent border-indigo-500/20',
    neutral: 'text-blue-400 from-blue-500/10 to-transparent border-blue-500/20',
  };
  const activeColor = type === 'positive' ? colors.positive : type === 'negative' ? colors.negative : colors.neutral;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${activeColor} border backdrop-blur-md rounded-2xl p-6 flex flex-col justify-between h-32 group hover:scale-[1.02] transition-transform duration-500`}>
      <div className="flex justify-between items-start">
        <span className="text-xs uppercase tracking-widest text-white/40 font-semibold">{title}</span>
        <Icon className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="text-3xl font-light tracking-tight text-white">
        ${value.toFixed(2)}
      </div>
    </div>
  );
};

const GreekCard = ({ name, value, description }: any) => (
  <div className="bg-white/5 border border-white/5 hover:border-white/10 rounded-xl p-4 transition-colors">
    <div className="flex justify-between items-center mb-2">
      <span className="text-xs font-mono text-blue-300">{name}</span>
    </div>
    <div className="text-lg font-light text-white/90">{value.toFixed(4)}</div>
    <div className="text-[10px] uppercase tracking-wider text-white/30 mt-1">{description}</div>
  </div>
);

const TickerSearch = ({ ticker, setTicker, handleStockSearch, isFetchingPrice, priceError }: any) => (
  <div className="mb-8 relative z-20">
    <div className="flex gap-0 backdrop-blur-xl bg-white/5 border border-white/10 rounded-full p-1 pl-4 focus-within:border-emerald-500/50 transition-colors max-w-md">
      <Search className="text-white/30 my-auto" size={16} />
      <input
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === 'Enter' && handleStockSearch()}
        placeholder="ENTER TICKER (e.g. SPY)..."
        className="w-full bg-transparent border-none text-white/80 placeholder:text-white/20 text-sm px-3 py-2 focus:outline-none focus:ring-0 font-mono tracking-wider"
      />
      <button
        onClick={handleStockSearch}
        disabled={isFetchingPrice || !ticker}
        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold tracking-widest uppercase"
      >
        {isFetchingPrice ? <Loader2 className="animate-spin" size={14} /> : 'Fetch'}
      </button>
    </div>
    {priceError && <p className="text-xs text-indigo-400 mt-2 ml-4 flex items-center gap-1 font-mono">{priceError}</p>}
  </div>
);

// ============================================================================
// DYNAMIC BLOG SECTION
// ============================================================================

const BLOG_CONTENT = {
    derivatives: [
      { 
        id: 1, 
        title: "Implied vs. Realized Volatility: Trading the Spread", 
        category: "Options Theory", 
        read: "4 MIN",
        color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" 
      },
      { 
        id: 2, 
        title: "Understanding Gamma Scalping in Low Vol Environments", 
        category: "Advanced Greeks", 
        read: "7 MIN", 
        color: "text-indigo-400 border-indigo-500/20 bg-indigo-500/10" 
      },
      { 
        id: 3, 
        title: "The Limitations of Black-Scholes in Crypto Markets", 
        category: "Model Risk", 
        read: "5 MIN", 
        color: "text-blue-400 border-blue-500/20 bg-blue-500/10" 
      }
    ],
    montecarlo: [
      { 
        id: 1, 
        title: "Why Geometric Brownian Motion isn't always enough", 
        category: "Stochastic Calc", 
        read: "6 MIN", 
        color: "text-violet-400 border-violet-500/20 bg-violet-500/10" 
      },
      { 
        id: 2, 
        title: "Interpreting Value at Risk (VaR) with 95% Confidence", 
        category: "Risk Metrics", 
        read: "3 MIN", 
        color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" 
      },
      { 
        id: 3, 
        title: "Convergence Rates: How many iterations do you really need?", 
        category: "Simulation Opt", 
        read: "5 MIN", 
        color: "text-blue-400 border-blue-500/20 bg-blue-500/10" 
      }
    ],
    allocation: [
      { 
        id: 1, 
        title: "Modern Portfolio Theory: Beyond the Efficient Frontier", 
        category: "Asset Mgmt", 
        read: "8 MIN", 
        color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" 
      },
      { 
        id: 2, 
        title: "Rebalancing Strategies: Calendar vs. Threshold", 
        category: "Execution", 
        read: "4 MIN", 
        color: "text-indigo-400 border-indigo-500/20 bg-indigo-500/10" 
      },
      { 
        id: 3, 
        title: "The Role of Correlation in Downside Protection", 
        category: "Diversification", 
        read: "6 MIN", 
        color: "text-violet-400 border-violet-500/20 bg-violet-500/10" 
      }
    ]
  };
  
  // ============================================================================
// METHODOLOGY FOOTER COMPONENT
// ============================================================================

const TAB_INFO = {
    derivatives: {
      title: "Methodology: Black-Scholes-Merton Model",
      text: "This module utilizes the Black-Scholes differential equation to determine the fair price of European call and put options. By analyzing five key input variables—spot price, strike price, time to expiration, risk-free rate, and volatility—it derives theoretical option values. The engine also calculates the 'Greeks' (Delta, Gamma, Theta, Vega, Rho), offering deep insight into how sensitive the option's price is to market fluctuations."
    },
    montecarlo: {
      title: "Methodology: Stochastic Simulation",
      text: "This engine employs Geometric Brownian Motion (GBM) to simulate thousands of potential future price paths for the underlying asset. Unlike static models, this stochastic approach accounts for random market variance over time. By aggregating these iterations, the system estimates the probability of the option expiring in-the-money and calculates the Value at Risk (VaR), providing a statistical measure of potential downside exposure."
    },
    allocation: {
      title: "Methodology: Strategic Rebalancing",
      text: "This tool assists in maintaining a disciplinced investment strategy by comparing your current portfolio composition against your target asset allocation. Using a drift-based calculation, it identifies assets that are over- or under-weighted relative to your goals. The system then generates a precise Buy/Sell order schedule to restore optimal portfolio balance, minimizing drift and aligning risk exposure with your original intent."
    }
  };
  
  const InfoSection = ({ activeTab }: { activeTab: string }) => {
    const content = TAB_INFO[activeTab as keyof typeof TAB_INFO];
    if (!content) return null;
  
    return (
      <div key={activeTab} className="mt-10 pt-6 border-t border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-700">
         <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 relative overflow-hidden group">
           
           {/* Subtle ambient glow matching the theme */}
           <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
  
           <div className="relative z-10">
             <h3 className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-emerald-400 font-medium mb-4">
               <span className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
               {content.title}
             </h3>
             <p className="text-sm font-light leading-relaxed text-white/50 max-w-4xl">
               {content.text}
             </p>
           </div>
         </div>
      </div>
    );
  };

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function QuantDash() {
  const [activeTab, setActiveTab] = useState<'derivatives' | 'montecarlo' | 'allocation'>('derivatives');

  // --- HISTORICAL DATA STATE ---
  const [ticker, setTicker] = useState('');
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [priceError, setPriceError] = useState('');

  // --- BLACK-SCHOLES STATE ---
  const [S, setS] = useState(100);
  const [K, setK] = useState(100);
  const [T, setT] = useState(1);
  const [r, setR] = useState(5);
  const [sigma, setSigma] = useState(20);

  // --- MONTE CARLO STATE ---
  const [mcParams, setMcParams] = useState({
    S0: 100,
    K: 100,
    T: 1,
    r: 0.05,
    sigma: 0.2,
    iterations: 2000,
    steps: 50,
    optionType: 'call' as 'call' | 'put'
  });
  const [mcResults, setMcResults] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // --- PORTFOLIO STATE ---
  const [assets, setAssets] = useState<Asset[]>([
    { id: '1', name: 'US Stocks', currentValue: 50000, targetAllocation: 40 },
    { id: '2', name: 'Bonds', currentValue: 30000, targetAllocation: 30 },
    { id: '3', name: 'International', currentValue: 20000, targetAllocation: 30 },
  ]);

  // ============================================================================
  // LOGIC IMPLEMENTATION
  // ============================================================================
  
  const handleStockSearch = async () => {
    if (!ticker) return;
    setIsFetchingPrice(true);
    setPriceError('');

    try {
      const API_KEY = 'FYYX9SDAG15X3QIM'; 
      const response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${API_KEY}`);
      const data = await response.json();

      if (data['Note'] || data['Information']) {
        throw new Error("API Limit (Try again in 1min)");
      }
      
      const priceString = data['Global Quote']?.['05. price'];
      if (!priceString) {
        throw new Error("Symbol not found");
      }

      const price = parseFloat(priceString);

      if (activeTab === 'derivatives') {
        setS(price);
        setK(price); 
      } else if (activeTab === 'montecarlo') {
        setMcParams(prev => ({ ...prev, S0: price, K: price }));
      }

    } catch (err) {
      setPriceError(err instanceof Error ? err.message : 'Fetch failed');
    } finally {
      setIsFetchingPrice(false);
    }
  };

  const result = useMemo(() => {
    return calculateBlackScholes(S, K, T, r / 100, sigma / 100);
  }, [S, K, T, r, sigma]);

  const chartData = useMemo(() => {
    const data = [];
    const minS = S * 0.5;
    const maxS = S * 1.5;
    const step = (maxS - minS) / 50;

    for (let price = minS; price <= maxS; price += step) {
      const bs = calculateBlackScholes(price, K, T, r / 100, sigma / 100);
      data.push({
        price: price.toFixed(2),
        call: bs.callPrice.toFixed(2),
        put: bs.putPrice.toFixed(2),
      });
    }
    return data;
  }, [S, K, T, r, sigma]);

  const runMonteCarloSimulation = () => {
    setIsCalculating(true);
    
    setTimeout(() => {
      const { S0, K, T, r, sigma, iterations, steps, optionType } = mcParams;
      const allPaths: number[][] = [];
      const payoffs: number[] = [];
      let sumPayoff = 0;
      let sumPayoffSquared = 0;
      let inTheMoneyCount = 0;

      for (let i = 0; i < iterations; i++) {
        const path = simulateGBMPath(S0, r, sigma, T, steps);
        allPaths.push(path);

        const ST = path[path.length - 1];
        let payoff = 0;

        if (optionType === 'call') {
          payoff = Math.max(ST - K, 0);
        } else {
          payoff = Math.max(K - ST, 0);
        }

        if (payoff > 0) inTheMoneyCount++;

        const discountedPayoff = payoff * Math.exp(-r * T);
        payoffs.push(discountedPayoff);
        sumPayoff += discountedPayoff;
        sumPayoffSquared += discountedPayoff * discountedPayoff;
      }

      const optionPrice = sumPayoff / iterations;
      const variance = (sumPayoffSquared / iterations) - (optionPrice * optionPrice);
      const standardError = Math.sqrt(variance / iterations);
      const inTheMoneyProbability = (inTheMoneyCount / iterations) * 100;

      payoffs.sort((a, b) => a - b);
      const index5th = Math.floor(iterations * 0.05);
      const payoff5th = payoffs[index5th];
      const valueAtRisk = optionPrice - payoff5th;

      const visualPaths: number[][] = [];
      const step = Math.max(1, Math.floor(iterations / 20));
      for (let i = 0; i < iterations; i += step) {
        if (visualPaths.length < 20) {
          visualPaths.push(allPaths[i]);
        }
      }

      setMcResults({
        optionPrice,
        standardError,
        inTheMoneyProbability,
        valueAtRisk, 
        visualPaths
      });
      setIsCalculating(false);
    }, 50);
  };

  const mcChartData = useMemo(() => {
    if (!mcResults) return [];
    const data: any[] = [];
    const steps = mcResults.visualPaths[0]?.length || 0;
    for (let step = 0; step < steps; step++) {
      const point: any = { step };
      mcResults.visualPaths.forEach((path: number[], idx: number) => {
        point[`path${idx}`] = path[step];
      });
      data.push(point);
    }
    return data;
  }, [mcResults]);

  const calculations = useMemo(() => {
    const totalValue = assets.reduce((sum, a) => sum + (a.currentValue || 0), 0);
    const totalAllocation = assets.reduce((sum, a) => sum + (a.targetAllocation || 0), 0);
    const isValid = Math.abs(totalAllocation - 100) < 0.01;

    const actions = assets.map(asset => {
      const targetValue = (totalValue * (asset.targetAllocation || 0)) / 100;
      const delta = targetValue - (asset.currentValue || 0);
      return {
        ...asset,
        targetValue,
        delta,
        action: delta > 0.01 ? 'BUY' : delta < -0.01 ? 'SELL' : 'HOLD',
      };
    });

    // Filter out HOLDs
    const actionableItems = actions.filter(a => a.action !== 'HOLD');

    const currentData = assets.filter(a => a.currentValue > 0).map(a => ({ name: a.name || 'Unnamed', value: a.currentValue }));
    const targetData = assets.filter(a => a.targetAllocation > 0 && totalValue > 0).map(a => ({ name: a.name || 'Unnamed', value: (totalValue * a.targetAllocation) / 100 }));

    return { totalValue, totalAllocation, isValid, actions, actionableItems, currentData, targetData };
  }, [assets]);

  const addAsset = () => setAssets([...assets, { id: Date.now().toString(), name: '', currentValue: 0, targetAllocation: 0 }]);
  const removeAsset = (id: string) => setAssets(assets.filter(a => a.id !== id));
  const updateAsset = (id: string, field: keyof Asset, value: string | number) => setAssets(assets.map(a => (a.id === id ? { ...a, [field]: value } : a)));

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <main className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 relative overflow-hidden">
      
      {/* ATMOSPHERIC BACKGROUND */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-violet-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-900/10 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[40%] w-[500px] h-[500px] bg-blue-900/5 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      {/* HEADER */}
      <nav className="border-b border-white/5 bg-[#050505]/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Zap size={18} className="text-white fill-white" />
             </div>
             <div>
               <h1 className="text-xl font-light tracking-tight text-white">Quant<span className="font-medium text-emerald-400">Dash</span></h1>
               <div className="text-[10px] text-white/30 uppercase tracking-[0.2em]">Financial Modeling</div>
             </div>
          </div>
          
          <div className="flex bg-white/5 p-1 rounded-full border border-white/5">
            {[
              { id: 'derivatives', icon: BarChart3, label: 'Black Scholes' },
              { id: 'montecarlo', icon: Activity, label: 'Monte Carlo' },
              { id: 'allocation', icon: Layers, label: 'Portfolio' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-xs font-medium tracking-wide transition-all duration-300 ${
                  activeTab === tab.id 
                    ? 'bg-emerald-500/10 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20' 
                    : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
            <a 
                href="https://github.com/saimongh/EMT-Practical-Exam-Simulator/tree/main#readme" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-2 rounded-full text-xs font-medium tracking-wide text-white/40 hover:text-white hover:bg-white/5 border border-transparent transition-all duration-300"
              >
                <Github size={14} />
                Source Code
              </a>
            
          </div>
        </div>
      </nav>

      <div className="max-w-[1600px] mx-auto p-6 md:p-10">
        
        {/* ======================= TAB: DERIVATIVES ======================= */}
        {activeTab === 'derivatives' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="lg:col-span-4">
               <GlassCard className="h-full">
                  <TickerSearch 
                    ticker={ticker} 
                    setTicker={setTicker} 
                    handleStockSearch={handleStockSearch} 
                    isFetchingPrice={isFetchingPrice} 
                    priceError={priceError} 
                  />
                  <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-4">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-semibold tracking-widest text-white/70 uppercase">Market Parameters</h2>
                  </div>
                  <div className="space-y-6">
                    <SliderInput label="Underlying Price (S)" value={S} onChange={setS} min={1} max={500} step={0.01} unit="$" />
                    <SliderInput label="Strike Price (K)" value={K} onChange={setK} min={1} max={500} step={0.01} unit="$" />
                    <SliderInput label="Expiration (T)" value={T} onChange={setT} min={0.01} max={5} step={0.01} unit=" yr" />
                    <SliderInput label="Risk-Free Rate (r)" value={r} onChange={setR} min={0} max={20} step={0.1} unit="%" />
                    <SliderInput label="Volatility (σ)" value={sigma} onChange={setSigma} min={1} max={200} step={1} unit="%" />
                  </div>
               </GlassCard>
            </div>
            <div className="lg:col-span-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <KPICard title="Call Option" value={result.callPrice} icon={TrendingUp} type="positive" />
                <KPICard title="Put Option" value={result.putPrice} icon={DollarSign} type="negative" />
              </div>
              <GlassCard>
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-lg font-light text-white/90">Option vs Underlying</h3>
                   <div className="flex gap-4 text-xs">
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400"></div><span className="text-white/50">Call</span></div>
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-400"></div><span className="text-white/50">Put</span></div>
                   </div>
                </div>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="price" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(5,5,5,0.8)', borderColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', color: '#fff' }} itemStyle={{ fontSize: '12px' }} labelStyle={{ color: '#fff', marginBottom: '5px' }} />
                      <Line type="monotone" dataKey="call" stroke="#34d399" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: "#34d399" }} />
                      <Line type="monotone" dataKey="put" stroke="#818cf8" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: "#818cf8" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <GreekCard name="Delta (Δ)" value={result.delta} description="Price sensitivity" />
                  <GreekCard name="Gamma (Γ)" value={result.gamma} description="Rate of Delta" />
                  <GreekCard name="Theta (Θ)" value={result.theta} description="Time decay" />
                  <GreekCard name="Vega (ν)" value={result.vega} description="Vol sensitivity" />
                  <GreekCard name="Rho (ρ)" value={result.rho} description="Rate sensitivity" />
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB: MONTE CARLO ======================= */}
        {activeTab === 'montecarlo' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="lg:col-span-4">
              <GlassCard className="h-full">
                <TickerSearch 
                  ticker={ticker} 
                  setTicker={setTicker} 
                  handleStockSearch={handleStockSearch} 
                  isFetchingPrice={isFetchingPrice} 
                  priceError={priceError} 
                />
                <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-4">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-semibold tracking-widest text-white/70 uppercase">Simulation Config</h2>
                </div>
                <div className="mb-8">
                  <label className="text-xs uppercase tracking-widest text-white/40 font-medium mb-3 block">Option Type</label>
                  <div className="grid grid-cols-2 gap-2 bg-black/20 p-1 rounded-xl">
                    <button onClick={() => setMcParams({ ...mcParams, optionType: 'call' })} className={`py-2 rounded-lg text-xs font-medium transition-all ${mcParams.optionType === 'call' ? 'bg-emerald-500/20 text-emerald-300 shadow-inner' : 'text-white/30 hover:text-white'}`}>CALL</button>
                    <button onClick={() => setMcParams({ ...mcParams, optionType: 'put' })} className={`py-2 rounded-lg text-xs font-medium transition-all ${mcParams.optionType === 'put' ? 'bg-indigo-500/20 text-indigo-300 shadow-inner' : 'text-white/30 hover:text-white'}`}>PUT</button>
                  </div>
                </div>
                <div className="space-y-6">
                  <SliderInput label="Spot Price (S₀)" value={mcParams.S0} onChange={(v: number) => setMcParams({ ...mcParams, S0: v })} min={1} max={500} step={0.01} unit="$" />
                  <SliderInput label="Strike Price (K)" value={mcParams.K} onChange={(v: number) => setMcParams({ ...mcParams, K: v })} min={1} max={500} step={0.01} unit="$" />
                  <SliderInput label="Iterations" value={mcParams.iterations} onChange={(v: number) => setMcParams({ ...mcParams, iterations: Math.round(v) })} min={1000} max={10000} step={500} />
                  <SliderInput label="Time Steps" value={mcParams.steps} onChange={(v: number) => setMcParams({ ...mcParams, steps: Math.round(v) })} min={10} max={200} step={10} />
                </div>
                <button onClick={runMonteCarloSimulation} disabled={isCalculating} className="w-full mt-8 bg-gradient-to-r from-emerald-600 to-emerald-400 hover:to-emerald-300 text-black font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100">{isCalculating ? <Loader2 className="animate-spin mx-auto" /> : 'RUN SIMULATION'}</button>
              </GlassCard>
            </div>
            <div className="lg:col-span-8 space-y-6">
               {mcResults && (
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-2xl backdrop-blur-md">
                       <div className="text-[10px] uppercase text-emerald-300/50 mb-1">Estimated Price</div>
                       <div className="text-2xl font-light text-emerald-300">${mcResults.optionPrice.toFixed(4)}</div>
                    </div>
                    <div className="bg-blue-500/5 border border-blue-500/10 p-5 rounded-2xl backdrop-blur-md">
                       <div className="text-[10px] uppercase text-blue-300/50 mb-1">Std Error</div>
                       <div className="text-2xl font-light text-blue-300">±{mcResults.standardError.toFixed(4)}</div>
                    </div>
                    <div className="bg-violet-500/5 border border-violet-500/10 p-5 rounded-2xl backdrop-blur-md">
                       <div className="text-[10px] uppercase text-violet-300/50 mb-1">ITM Prob</div>
                       <div className="text-2xl font-light text-violet-300">{mcResults.inTheMoneyProbability.toFixed(1)}%</div>
                    </div>
                    <div className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-2xl backdrop-blur-md relative overflow-hidden group">
                       <div className="absolute right-0 top-0 p-3 opacity-20"><AlertTriangle className="text-indigo-400" /></div>
                       <div className="text-[10px] uppercase text-indigo-300/50 mb-1">95% VaR</div>
                       <div className="text-2xl font-light text-indigo-300">${mcResults.valueAtRisk.toFixed(4)}</div>
                    </div>
                 </div>
               )}
               <GlassCard className="min-h-[400px]">
                  <h3 className="text-lg font-light text-white/90 mb-6">Monte Carlo Paths</h3>
                  {!mcResults ? (
                    <div className="h-[300px] flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl bg-black/20">
                      <Activity className="text-white/10 mb-4 w-12 h-12" />
                      <p className="text-white/30 text-sm font-mono">AWAITING SIMULATION DATA</p>
                    </div>
                  ) : (
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mcChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="step" hide />
                          <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                          <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} />
                          {mcResults.visualPaths.map((_: any, idx: number) => (
                            <Line key={idx} type="natural" dataKey={`path${idx}`} stroke={`hsl(${140 + idx * 10}, 60%, ${50 + (idx % 2) * 10}%)`} strokeWidth={1} dot={false} strokeOpacity={0.3} />
                          ))}
                          <Line type="monotone" dataKey={() => mcParams.K} stroke="#818cf8" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
               </GlassCard>
            </div>
          </div>
        )}

        {/* ======================= TAB: PORTFOLIO ======================= */}
        {activeTab === 'allocation' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="lg:col-span-12">
               <GlassCard>
                 <div className="flex justify-between items-center mb-8">
                   <h2 className="text-xl font-light text-white">Asset Allocation</h2>
                   <button onClick={addAsset} className="flex items-center gap-2 bg-white/5 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-full text-xs uppercase tracking-wider transition-all">
                     <Plus size={16} /> Add Asset
                   </button>
                 </div>
                 <div className="overflow-hidden rounded-2xl border border-white/5">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/5 text-xs uppercase tracking-widest text-white/40">
                          <th className="p-4 font-medium">Asset</th>
                          <th className="p-4 font-medium">Value</th>
                          <th className="p-4 font-medium">Target %</th>
                          <th className="p-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {assets.map((asset) => (
                          <tr key={asset.id} className="hover:bg-white/5 transition-colors group">
                            <td className="p-4"><input type="text" value={asset.name} onChange={e => updateAsset(asset.id, 'name', e.target.value)} className="bg-transparent text-white focus:outline-none focus:text-emerald-400 font-medium" /></td>
                            <td className="p-4"><div className="flex items-center text-white/70"><span className="mr-1 text-white/30">$</span><input type="number" value={asset.currentValue || ''} onChange={e => updateAsset(asset.id, 'currentValue', parseFloat(e.target.value) || 0)} className="bg-transparent focus:outline-none font-mono" /></div></td>
                            <td className="p-4"><div className="flex items-center text-white/70"><input type="number" value={asset.targetAllocation || ''} onChange={e => updateAsset(asset.id, 'targetAllocation', parseFloat(e.target.value) || 0)} className="bg-transparent focus:outline-none font-mono w-16" /><span className="ml-1 text-white/30">%</span></div></td>
                            <td className="p-4 text-right"><button onClick={() => removeAsset(asset.id)} className="text-white/20 hover:text-indigo-400 transition-colors"><Trash2 size={16} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
                 <div className="mt-6 flex justify-end">
                    {calculations.isValid ? (
                      <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20 text-xs">
                        <Zap size={14} /> Allocation Valid (${calculations.totalValue.toLocaleString()})
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/20 text-xs">
                         <AlertTriangle size={14} /> Target must sum to 100% (Current: {calculations.totalAllocation.toFixed(1)}%)
                      </div>
                    )}
                 </div>
               </GlassCard>
             </div>

             <div className="lg:col-span-8">
                <GlassCard>
                  <h3 className="text-sm uppercase tracking-widest text-white/40 mb-6">Allocation Balance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* WHEEL 1: CURRENT */}
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-white/30 mb-4 tracking-widest uppercase">Current Distribution</span>
                        <div className="h-[200px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={calculations.currentData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                                  {calculations.currentData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#000', borderRadius: '10px', border: '1px solid #333' }} itemStyle={{ color: '#fff' }} formatter={(val) => `$${val.toLocaleString()}`} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                    </div>

                    {/* WHEEL 2: TARGET */}
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-white/30 mb-4 tracking-widest uppercase">Target Distribution</span>
                        <div className="h-[200px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={calculations.targetData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                                  {calculations.targetData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#000', borderRadius: '10px', border: '1px solid #333' }} itemStyle={{ color: '#fff' }} formatter={(val) => `$${val.toLocaleString()}`} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                    </div>
                  </div>
                </GlassCard>
             </div>

             <div className="lg:col-span-4">
               <GlassCard className="h-full">
                 <h3 className="text-sm uppercase tracking-widest text-white/40 mb-6">Rebalancing Actions</h3>
                 <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                   {calculations.actionableItems.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-[200px] text-center">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500/20 mb-4" />
                        <p className="text-white/40 text-sm">Portfolio Perfectly Balanced</p>
                        <p className="text-white/20 text-xs mt-1">No actions required.</p>
                     </div>
                   ) : (
                     calculations.actionableItems.map((action) => (
                       <div key={action.id} className={`p-4 rounded-xl border flex justify-between items-center ${
                         action.action === 'BUY' ? 'bg-emerald-500/5 border-emerald-500/20' : 
                         'bg-indigo-500/5 border-indigo-500/20'
                       }`}>
                         <div className="flex items-center gap-3">
                           {action.action === 'BUY' ? <TrendingUp className="text-emerald-400" size={18} /> : <TrendingDown className="text-indigo-400" size={18} />}
                           <div>
                             <div className="text-sm font-medium text-white">{action.name}</div>
                             <div className="text-[10px] text-white/40 uppercase tracking-wider">{action.action} ORDER</div>
                           </div>
                         </div>
                         <div className="text-right">
                            <div className={`font-mono ${action.action === 'BUY' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                              ${Math.abs(action.delta).toLocaleString()}
                            </div>
                         </div>
                       </div>
                     ))
                   )}
                 </div>
               </GlassCard>
             </div>
          </div>
              )}
              
              <InfoSection activeTab={activeTab} />

      </div>
    </main>
  );
}
