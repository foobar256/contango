const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const Table = require('cli-table3');

// Disable logging of yahoo-finance2
// yahooFinance.setGlobalConfig({ validation: { logErrors: false } });

function getThirdFriday(year, month) {
    // month is 0-indexed in JS Date (0=Jan, 2=Mar, etc.)
    let date = new Date(year, month, 1);
    // Find the first Friday
    // date.getDay() returns 0 for Sunday, 5 for Friday
    let firstFriday = 1 + ((5 - date.getDay() + 7) % 7);
    // Third Friday is 14 days later
    return new Date(year, month, firstFriday + 14);
}

const indexes = [
    { name: 'S&P 500', spot: '^GSPC', futuresPrefix: 'ES' },
    { name: 'Nasdaq 100', spot: '^NDX', futuresPrefix: 'NQ' },
    { name: 'Dow Jones', spot: '^DJI', futuresPrefix: 'YM' },
    { name: 'Nikkei 225', spot: '^N225', futuresPrefix: 'NK225' },
    { name: 'Russell 2000', spot: '^RUT', futuresPrefix: 'RTY' },
    { name: 'Micro Russell 2000', spot: '^RUT', futuresPrefix: 'M2K' }
];

const contractMonths = [
    { month: 2, code: 'H' }, // March
    { month: 5, code: 'M' }, // June
    { month: 8, code: 'U' }, // Sept
    { month: 11, code: 'Z' } // Dec
];

async function calculateContango() {
    const table = new Table({
        head: ['Index', 'Contract', 'Symbol', 'Spot', 'Future', 'Basis %', 'Spread %', 'Annual %', 'Days'],
        style: { head: ['cyan'] }
    });

    const now = new Date();
    const currentYear = now.getFullYear();

    for (const index of indexes) {
        try {
            const spotQuote = await yahooFinance.quote(index.spot);
            const spotPrice = spotQuote.regularMarketPrice;
            let frontMonthPrice = null;

            const results = [];

            for (const { month, code } of contractMonths) {
                // Determine year
                let year = currentYear;
                if (month < now.getMonth() || (month === now.getMonth() && now.getDate() > getThirdFriday(year, month).getDate())) {
                    year++;
                }

                const yearSuffix = year.toString().slice(-2);
                
                // Specific symbols for this contract
                let symbolsToTry = [];
                if (index.name === 'Nikkei 225') {
                    symbolsToTry = [
                        `NK225${code}${yearSuffix}.OS`,
                        `NIY${code}${yearSuffix}.CME`,
                        `NK${code}${yearSuffix}.CME`
                    ];
                } else {
                    symbolsToTry = [
                        `${index.futuresPrefix}${code}${yearSuffix}.CME`,
                        `${index.futuresPrefix}${code}${yearSuffix}.CBOT`,
                        `${index.futuresPrefix}${code}${yearSuffix}`
                    ];
                }

                let futureQuote = null;
                let usedSymbol = '';
                
                for (const sym of symbolsToTry) {
                    try {
                        const q = await yahooFinance.quote(sym);
                        if (q && q.regularMarketPrice) {
                            futureQuote = q;
                            usedSymbol = sym;
                            break;
                        }
                    } catch (e) {}
                }

                if (!futureQuote && month === contractMonths.find(m => 
                    m.month > now.getMonth() || (m.month === now.getMonth() && now.getDate() <= getThirdFriday(currentYear, m.month).getDate())
                )?.month) {
                    const fallbackSym = `${index.futuresPrefix}=F`;
                    try {
                        const q = await yahooFinance.quote(fallbackSym);
                        if (q && q.regularMarketPrice) {
                            futureQuote = q;
                            usedSymbol = fallbackSym;
                        }
                    } catch (e) {}
                }

                if (futureQuote) {
                    const futurePrice = futureQuote.regularMarketPrice;
                    const expiryDate = getThirdFriday(year, month);
                    const daysToExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

                    if (daysToExpiry <= 0) continue;

                    if (frontMonthPrice === null) frontMonthPrice = futurePrice;

                    const basis = (futurePrice - spotPrice) / spotPrice;
                    const spread = (futurePrice - frontMonthPrice) / frontMonthPrice;
                    const annualized = (Math.pow(1 + basis, 365 / daysToExpiry) - 1) * 100;

                    results.push([
                        index.name,
                        `${code}${yearSuffix}`,
                        usedSymbol,
                        spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                        futurePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                        (basis * 100).toFixed(2) + '%',
                        (spread * 100).toFixed(2) + '%',
                        (annualized >= 0 ? '+' : '') + annualized.toFixed(2) + '%',
                        daysToExpiry
                    ]);
                }
            }

            results.forEach(row => table.push(row));
        } catch (error) {
            console.error(`Error processing ${index.name}: ${error.message}`);
        }
    }

    console.log(table.toString());
}

calculateContango();
