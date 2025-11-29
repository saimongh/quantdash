"use client";

import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, Activity, Plus, Trash2, TrendingDown, BarChart3, Target } from 'lucide-react';

// ============================================================================
// BLACK-SCHOLES IMPLEMENTATION
// ============================================================================

interface BlackScholesResult {
  callPrice: number;
  putPrice: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function calculateBlackScholes(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number
): BlackScholesResult {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  const Nd1 = normalCDF(d1);
  const Nd2 = normalCDF(d2);
  const Nmd1 = normalCDF(-d1);
  const Nmd2 = normalCDF(-d2);
  const nd1 = normalPDF(d1);

  const callPrice = S * Nd1 - K * Math.exp(-r * T) * Nd2;
  const putPrice = K * Math.exp(-r * T) * Nmd2 - S * Nmd1;

  const delta = Nd1;
  const gamma = nd1 / (S * sigma * Math.sqrt(T));
  const theta = -(S * nd1 * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * Nd2;
  const vega = S * nd1 * Math.sqrt(T);
  const rho = K * T * Math.exp(-r * T) * Nd2;

  return { callPrice, putPrice, delta, gamma, theta: theta / 365, vega: vega / 100, rho: rho / 100 };
}

// ============================================================================
// PORTFOLIO TYPES
// ============================================================================

interface Asset {
  id: string;
  name: string;
  currentValue: number;
  targetAllocation: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function QuantDash() {
  const [activeTab, setActiveTab] = useState<'derivatives' | 'allocation'>('derivatives');

  // Options State
  const [S, setS] = useState(100);
  const [K, setK] = useState(100);
  const [T, setT] = useState(1);
  const [r, setR] = useState(5);
  const [sigma, setSigma] = useState(20);

  // Portfolio State
  const [assets, setAssets] = useState<Asset[]>([
    { id: '1', name: 'US Stocks', currentValue: 50000, targetAllocation: 40 },
    { id: '2', name: 'Bonds', currentValue: 30000, targetAllocation: 30 },
    { id: '3', name: 'International', currentValue: 20000, targetAllocation: 30 },
  ]);

  // Options Calculations
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

  // Portfolio Calculations
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

    const currentData = assets
      .filter(a => a.currentValue > 0)
      .map(a => ({
        name: a.name || 'Unnamed',
        value: a.currentValue,
      }));

    const targetData = assets
      .filter(a => a.targetAllocation > 0 && totalValue > 0)
      .map(a => ({
        name: a.name || 'Unnamed',
        value: (totalValue * a.targetAllocation) / 100,
      }));

    return { totalValue, totalAllocation, isValid, actions, currentData, targetData };
  }, [assets]);

  // Portfolio Functions
  const addAsset = () => {
    setAssets([
      ...assets,
      { id: Date.now().toString(), name: '', currentValue: 0, targetAllocation: 0 },
    ]);
  };

  const removeAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
  };

  const updateAsset = (id: string, field: keyof Asset, value: string | number) => {
    setAssets(assets.map(a => (a.id === id ? { ...a, [field]: value } : a)));
  };

  // ============================================================================
  // SHARED COMPONENTS
  // ============================================================================

  const SliderInput = ({ label, value, onChange, min, max, step, unit = '' }: any) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <span className="text-sm font-bold text-emerald-400">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
      />
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );

  const KPICard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-sm font-medium">{title}</span>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className={`text-3xl font-bold ${color}`}>
        ${value.toFixed(4)}
      </div>
    </div>
  );

  const GreekCard = ({ name, value, description }: any) => (
    <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
      <div className="text-xs text-slate-400 mb-1">{name}</div>
      <div className="text-xl font-bold text-slate-200">{value.toFixed(4)}</div>
      <div className="text-xs text-slate-500 mt-1">{description}</div>
    </div>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                QuantDash
              </h1>
              <p className="text-slate-400 text-sm mt-1">Quantitative Finance Toolkit</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('derivatives')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'derivatives'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <BarChart3 size={18} />
              Derivatives Pricing
            </button>
            <button
              onClick={() => setActiveTab('allocation')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'allocation'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <Target size={18} />
              Portfolio Rebalancing
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {activeTab === 'derivatives' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Input Panel */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
                <h2 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  Market Parameters
                </h2>
                <div className="space-y-6">
                  <SliderInput
                    label="Underlying Price (S)"
                    value={S}
                    onChange={setS}
                    min={1}
                    max={500}
                    step={1}
                    unit="$"
                  />
                  <SliderInput
                    label="Strike Price (K)"
                    value={K}
                    onChange={setK}
                    min={1}
                    max={500}
                    step={1}
                    unit="$"
                  />
                  <SliderInput
                    label="Time to Expiration (T)"
                    value={T}
                    onChange={setT}
                    min={0.01}
                    max={5}
                    step={0.01}
                    unit=" years"
                  />
                  <SliderInput
                    label="Risk-Free Rate (r)"
                    value={r}
                    onChange={setR}
                    min={0}
                    max={20}
                    step={0.1}
                    unit="%"
                  />
                  <SliderInput
                    label="Implied Volatility (σ)"
                    value={sigma}
                    onChange={setSigma}
                    min={1}
                    max={200}
                    step={1}
                    unit="%"
                  />
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <KPICard
                  title="Call Option Price"
                  value={result.callPrice}
                  icon={TrendingUp}
                  color="text-emerald-400"
                />
                <KPICard
                  title="Put Option Price"
                  value={result.putPrice}
                  icon={DollarSign}
                  color="text-rose-400"
                />
              </div>

              {/* Chart */}
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-slate-200 mb-4">Option Price vs. Underlying Asset Price</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="price"
                      stroke="#94a3b8"
                      label={{ value: 'Stock Price ($)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      label={{ value: 'Option Price ($)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#e2e8f0'
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="call"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={false}
                      name="Call Price"
                    />
                    <Line
                      type="monotone"
                      dataKey="put"
                      stroke="#f43f5e"
                      strokeWidth={3}
                      dot={false}
                      name="Put Price"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Greeks */}
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-slate-200 mb-4">The Greeks (Call Option)</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <GreekCard name="Delta (Δ)" value={result.delta} description="Price sensitivity" />
                  <GreekCard name="Gamma (Γ)" value={result.gamma} description="Delta change" />
                  <GreekCard name="Theta (Θ)" value={result.theta} description="Time decay/day" />
                  <GreekCard name="Vega (ν)" value={result.vega} description="Vol sensitivity" />
                  <GreekCard name="Rho (ρ)" value={result.rho} description="Rate sensitivity" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'allocation' && (
          <div className="space-y-6">
            {/* Asset Input Section */}
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-slate-200">Your Assets</h2>
                <button
                  onClick={addAsset}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus size={20} />
                  Add Asset
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold">Asset Name</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold">Current Value</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold">Target Allocation (%)</th>
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset) => (
                      <tr key={asset.id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={asset.name}
                            onChange={e => updateAsset(asset.id, 'name', e.target.value)}
                            placeholder="e.g., US Stocks"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                            <input
                              type="number"
                              value={asset.currentValue || ''}
                              onChange={e => updateAsset(asset.id, 'currentValue', parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="relative">
                            <input
                              type="number"
                              value={asset.targetAllocation || ''}
                              onChange={e => updateAsset(asset.id, 'targetAllocation', parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full pr-8 pl-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                            <span className="absolute right-3 top-2.5 text-slate-400">%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => removeAsset(asset.id)}
                            className="text-rose-400 hover:text-rose-300 p-2 hover:bg-rose-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Validation Message */}
              <div className="mt-4">
                {!calculations.isValid && calculations.totalAllocation > 0 && (
                  <div className="bg-rose-900/20 border border-rose-500/50 rounded-lg p-4 flex items-center gap-2">
                    <div className="text-rose-400 font-semibold">⚠ Target allocations must sum to 100%</div>
                    <div className="text-rose-300 ml-auto">
                      Current: {calculations.totalAllocation.toFixed(1)}%
                    </div>
                  </div>
                )}
                {calculations.isValid && (
                  <div className="bg-emerald-900/20 border border-emerald-500/50 rounded-lg p-4 flex items-center gap-2">
                    <div className="text-emerald-400 font-semibold">✓ Portfolio allocation is valid</div>
                    <div className="text-emerald-300 ml-auto">
                      Total Value: ${calculations.totalValue.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Split View: Charts + Action Plan */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Charts Section */}
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
                <h2 className="text-2xl font-semibold text-slate-200 mb-6">Allocation Overview</h2>
                
                <div className="space-y-8">
                  {/* Current Allocation */}
                  <div>
                    <h3 className="text-lg font-medium text-slate-300 mb-4 text-center">Current Allocation</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={calculations.currentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {calculations.currentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => `$${value.toLocaleString()}`}
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #475569',
                            borderRadius: '8px',
                            color: '#e2e8f0'
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Target Allocation */}
                  <div>
                    <h3 className="text-lg font-medium text-slate-300 mb-4 text-center">Target Allocation</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={calculations.targetData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {calculations.targetData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => `$${value.toLocaleString()}`}
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #475569',
                            borderRadius: '8px',
                            color: '#e2e8f0'
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Action Plan */}
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
                <h2 className="text-2xl font-semibold text-slate-200 mb-6">Action Plan</h2>
                
                {calculations.isValid ? (
                  <div className="space-y-3">
                    {calculations.actions.map((action) => (
                      <div
                        key={action.id}
                        className={`p-4 rounded-lg border-2 ${
                          action.action === 'BUY'
                            ? 'bg-emerald-900/20 border-emerald-500/50'
                            : action.action === 'SELL'
                            ? 'bg-rose-900/20 border-rose-500/50'
                            : 'bg-slate-800/30 border-slate-700/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {action.action === 'BUY' && <TrendingUp className="text-emerald-400" size={24} />}
                            {action.action === 'SELL' && <TrendingDown className="text-rose-400" size={24} />}
                            <div>
                              <div className="font-semibold text-slate-200">{action.name || 'Unnamed'}</div>
                              <div className="text-sm text-slate-400">
                                Current: ${action.currentValue.toLocaleString()} → Target: ${action.targetValue.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div
                              className={`text-xl font-bold ${
                                action.action === 'BUY'
                                  ? 'text-emerald-400'
                                  : action.action === 'SELL'
                                  ? 'text-rose-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {action.action}
                            </div>
                            <div className="text-lg font-semibold text-slate-200">
                              ${Math.abs(action.delta).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-12">
                    <p className="text-lg">Please ensure target allocations sum to 100% to see your action plan.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}