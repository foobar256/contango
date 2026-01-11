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
    { name: 'Nikkei 225', spot: '^N225', futuresPrefix: 'NIY' },
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
        head: ['Index', 'Contract', 'Spot', 'Future', 'Basis %', 'Annualized %', 'Days'],
        style: { head: ['cyan'] }
    });

    const now = new Date();
    const currentYear = now.getFullYear();

    for (const index of indexes) {
        try {
            const spotQuote = await yahooFinance.quote(index.spot);
            const spotPrice = spotQuote.regularMarketPrice;

            for (const { month, code } of contractMonths) {
                // Determine year
                let year = currentYear;
                if (month < now.getMonth() || (month === now.getMonth() && now.getDate() > getThirdFriday(year, month).getDate())) {
                    year++;
                }

                const yearSuffix = year.toString().slice(-2);
                // Standard Yahoo format for specific futures is ES=F for front, 
                // but specific months can be ESH26.CME or ESM26.CME
                const symbolsToTry = [
                    `${index.futuresPrefix}${code}${yearSuffix}.CME`,
                    `${index.futuresPrefix}${code}${yearSuffix}`,
                    `${index.futuresPrefix}=F` // fallback to front month if we are just testing
                ];

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
                    } catch (e) {
                        // ignore and try next
                    }
                }

                if (futureQuote) {
                    const futurePrice = futureQuote.regularMarketPrice;
                    const expiryDate = getThirdFriday(year, month);
                    const daysToExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

                    if (daysToExpiry <= 0) continue;

                    const basis = (futurePrice - spotPrice) / spotPrice;
                    const annualized = (Math.pow(1 + basis, 365 / daysToExpiry) - 1) * 100;

                    table.push([
                        index.name,
                        `${code}${yearSuffix}`,
                        spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                        futurePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                        (basis * 100).toFixed(2) + '%',
                        (annualized >= 0 ? '+' : '') + annualized.toFixed(2) + '%',
                        daysToExpiry
                    ]);
                    
                    // If we found a specific month, we stop searching for other variants of the same month
                }
            }
        } catch (error) {
            console.error(`Error processing ${index.name}: ${error.message}`);
        }
    }

    console.log(table.toString());
}

calculateContango();
