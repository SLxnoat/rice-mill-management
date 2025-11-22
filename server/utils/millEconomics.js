const DEFAULT_RECOVERY_RATE = 0.67;
const DEFAULT_OWNER_SALARY_PCT = 0.25;

const safeNumber = (value) => (Number.isFinite(value) ? value : 0);

const safeDivide = (numerator, denominator, fallback = 0) => {
    const num = safeNumber(numerator);
    const den = safeNumber(denominator);
    if (!den) return fallback;
    return num / den;
};

const round = (value, decimals = 2) => {
    const factor = 10 ** decimals;
    return Math.round((safeNumber(value)) * factor) / factor;
};

const calcPaddyRequirement = (targetRiceKg, recoveryRate = DEFAULT_RECOVERY_RATE) => {
    if (!targetRiceKg) return 0;
    const rate = recoveryRate || DEFAULT_RECOVERY_RATE;
    return round(safeDivide(targetRiceKg, rate));
};

const calcCOGSPerKg = (totalPaddyCost, totalRiceOutput) => {
    return round(safeDivide(totalPaddyCost, totalRiceOutput));
};

const calcRevenuePerKg = (totalRevenue, totalRiceSold) => {
    return round(safeDivide(totalRevenue, totalRiceSold));
};

const calcGrossProfit = (totalRevenue, totalPaddyCost) => {
    return round(totalRevenue - totalPaddyCost);
};

const calcGrossProfitPerKg = (revenuePerKg, cogsPerKg) => {
    return round(revenuePerKg - cogsPerKg);
};

const calcNetProfitBeforeOwner = (grossProfit, totalOpex) => {
    return round(grossProfit - totalOpex);
};

const calcOwnerSalary = (netProfitBeforeOwner, ownerPct = DEFAULT_OWNER_SALARY_PCT) => {
    if (!netProfitBeforeOwner || netProfitBeforeOwner <= 0) return 0;
    return round(netProfitBeforeOwner * ownerPct);
};

const calcFinalNetProfit = (netProfitBeforeOwner, ownerSalary) => {
    return round(netProfitBeforeOwner - ownerSalary);
};

const calcBreakEvenKg = (fixedCosts, profitPerKg) => {
    if (!profitPerKg) return null;
    return round(safeDivide(fixedCosts, profitPerKg));
};

const calcRecommendedPrice = (cogsPerKg, desiredMarginPerKg) => {
    return round((cogsPerKg || 0) + (desiredMarginPerKg || 0));
};

module.exports = {
    DEFAULT_RECOVERY_RATE,
    DEFAULT_OWNER_SALARY_PCT,
    safeDivide,
    round,
    calcPaddyRequirement,
    calcCOGSPerKg,
    calcRevenuePerKg,
    calcGrossProfit,
    calcGrossProfitPerKg,
    calcNetProfitBeforeOwner,
    calcOwnerSalary,
    calcFinalNetProfit,
    calcBreakEvenKg,
    calcRecommendedPrice,
};

