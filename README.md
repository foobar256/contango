# Contango Tracker

A Node.js tool to calculate and visualize contango and backwardation in major equity index futures.

## Features

- Fetches real-time spot and futures data using Yahoo Finance.
- Supports major indices: S&P 500, Nasdaq 100, Dow Jones, Nikkei 225, and Russell 2000.
- Calculates:
    - **Basis %**: The difference between spot and futures prices.
    - **Spread %**: The difference between the current contract and the front-month contract (useful for curve slope analysis).
    - **Annualized %**: The projected annual yield of the basis.
- Automatically handles contract month codes (H, M, U, Z) and expiry calculations (Third Friday).

## Installation

```bash
npm install
```

## Usage

```bash
node index.js
```

## Important Note on Nikkei 225

When comparing CME-traded Nikkei futures (`NIY`) against the Tokyo spot index (`^N225`), you may see extreme annualized basis percentages during US trading hours. This is usually a result of time-zone mismatches (the spot index is "stale" while the futures are active). 

In such cases, refer to the **Spread %** column to see the actual slope of the futures curve, which is generally unaffected by spot price lag.

## Dependencies

- `yahoo-finance2`: For market data.
- `cli-table3`: For terminal visualization.
