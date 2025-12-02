# QuantDash 📈

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC?style=flat&logo=tailwind-css)
![Recharts](https://img.shields.io/badge/Viz-Recharts-red)

**QuantDash** is a high-performance financial engineering dashboard engineered for real-time derivatives pricing, stochastic simulation, and portfolio optimization.

It bridges the gap between sophisticated financial modeling and modern front-end architecture, running complex quantitative models—including **Monte Carlo simulations** and **Black-Scholes pricing**—entirely client-side for zero-latency analysis.

🔗 **Live Demo:** [https://quantdash-nine.vercel.app/](https://quantdash-nine.vercel.app/)

---

## ⚡ Key Features

### 1. Derivatives Pricing Engine (Black-Scholes)

- **Real-Time Greek Analysis:** Calculates first and second-order Greeks ($\Delta$, $\Gamma$, $\Theta$, $\nu$, $\rho$) instantly as market parameters change.
- **Dynamic P&L Visualization:** Renders interactive payoff curves across a range of underlying asset prices.
- **Implied Volatility Surface:** Allows users to adjust IV and Risk-Free Rate ($r$) to model different market regimes.

### 2. Monte Carlo Option Simulator

- **Stochastic Modeling:** Simulates thousands of price paths using **Geometric Brownian Motion (GBM)** to estimate option fair value.
- **Risk Analysis (VaR):** Calculates **Value at Risk (95% Confidence)** by analyzing the tail distribution of simulated payoffs.
- **Visual Data:** Plots random walk paths in real-time using performant canvas-based rendering techniques.

### 3. Live Market Data Integration

- **AlphaVantage API:** Connected to live market feeds to fetch real-time Spot Prices ($S_0$) for tickers (e.g., AAPL, NVDA, IBM).
- **Automated Parameterization:** Eliminates manual data entry by auto-populating model inputs based on live market conditions.

### 4. Portfolio Rebalancing Engine

- **Drift Detection:** Automatically calculates deviation between _Current Holdings_ and _Target Allocation_.
- **Order Generation:** Programmatically generates a precise "Buy/Sell" action plan to restore target weights with minimal turnover.

---

## 🛠 Technical Architecture

This project was engineered with a focus on **Type Safety**, **Mathematical Accuracy**, and **UI/UX Polish**.

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router) for server-optimized rendering.
- **Language:** [TypeScript](https://www.typescriptlang.org/) for strict type checking of financial data structures.
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with a custom "Financial Terminal" dark mode aesthetic (Slate/Emerald/Cyan).
- **Input Logic:** Custom `DualInput` components that handle precise decimal inputs alongside gesture-based sliders for sensitivity analysis.

---

## 🧮 Mathematical Implementation

QuantDash implements core quantitative finance models from scratch in pure TypeScript to demonstrate a deep understanding of the underlying mathematics.

### 1. Black-Scholes Model

To ensure performance without heavy scientific libraries (like SciPy), the application uses the **Abramowitz and Stegun** approximation for the Standard Normal Cumulative Distribution Function (CDF):

```typescript
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  // ... polynomial approximation ...
}
```

## ✅ Testing & Verification

Financial software requires rigorous validation. QuantDash includes a comprehensive **Jest** test suite to ensure algorithmic accuracy and economic consistency.

### Unit Tests
The core math engine (`utils/finance.ts`) is isolated and tested against known benchmarks.
* **Benchmark Verification:** Option prices are validated against standard industry calculators to within 4 decimal places.
* **Edge Case Handling:** Deep Out-of-the-Money (OTM) options are verified to approach zero value correctly.

### Financial Consistency (Put-Call Parity)
The system programmatically enforces the fundamental **Put-Call Parity** relationship in its test suite:

$$C - P = S - K \cdot e^{-rT}$$

This ensures that the Call and Put pricing logic remains economically consistent with the underlying asset and risk-free rate at all times.

**Run the test suite:**
```bash
npm test
