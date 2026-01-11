# Equity Index Contango Tracker

This project provides a CLI tool to calculate and visualize the contango/backwardation of equity index futures relative to their underlying spot prices.

## Features
- Fetches current spot prices for major equity indexes (e.g., S&P 500, Nasdaq 100, Nikkei 225, Russell 2000).
- Fetches futures prices for the four main expiration months (March, June, September, December).
- Calculates the absolute and percentage difference (contango/backwardation).
- Normalizes the contango to an annualized percentage.
- Displays the results in a formatted table in the CLI.

## Calculation Logic
1. **Contango/Backwardation**: `(Futures Price - Spot Price) / Spot Price`
2. **Annualized Contango**: `((1 + Basis) ^ (365 / Days to Expiration)) - 1`

## Implementation
- **Language**: Node.js
- **Libraries**: `yahoo-finance2` for data, `cli-table3` for CLI output.
