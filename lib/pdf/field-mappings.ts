// lib/pdf/field-mappings.ts — ESIS regex patterns §7.2

export const ESIS_PATTERNS: Record<string, RegExp[]> = {
  lenderName: [
    /Lender:\s+([^\n]+)/i,
    /^Lender\s*\n\s*([^\n]+)/m,
  ],
  loanAmount: [
    /Amount and currency of the loan to be (?:granted|switched):\s*£([\d,]+(?:\.\d{2})?)/i,
    /Loan Amount:\s*£?([\d,]+(?:\.\d{2})?)/i,
  ],
  loanAmountWithFeeAdded: [
    /loan to be (?:granted|switched):\s*£([\d,]+(?:\.\d{2})?)\s+plus a fee of\s*£([\d,]+(?:\.\d{2})?)\s+which will be added/i,
  ],
  arrangementFeeAddedToLoan: [
    /which will be added to your loan/i,
    /adding it to the loan/i,
    /added to the loan/i,
  ],
  termYears: [
    /Duration of the loan:\s+(\d+)\s+years?/i,
    /a term of (\d+) years?/i,
  ],
  productDescription: [
    /Product Description:\s+([^\n]+?)\s+Product Code:/i,
    /Product description:\s+([^\n]+)/i,
  ],
  productCode: [/Product Code:\s+([A-Z0-9]+)/i],
  initialRatePercent: [
    /fixed rate of ([\d.]+)%\s+until/i,
    /initial (?:fixed )?interest rate of ([\d.]+)%/i,
    /Initial Rate:\s+([\d.]+)%/i,
  ],
  initialRateEndDate: [
    /fixed (?:rate )?(?:until|to|till)\s+(\d{1,2}[\s-]\w+[\s-]\d{4}|\d{2}[/-]\d{2}[/-]\d{4})/i,
    /until\s+(\d{2}[/-]\d{2}[/-]\d{4})/i,
    /till\s+(\d{2}-\d{2}-\d{2,4})/i,
  ],
  reversionRatePercent: [
    /currently\s+([\d.]+)%(?:,\s+for the remaining)/i,
    /Standard Mortgage Rate.*?currently\s+([\d.]+)%/i,
    /SVR.*?currently\s+([\d.]+)%/i,
    /variable rate.*?currently\s+([\d.]+)%/i,
  ],
  aprcPercent: [
    /APRC (?:applicable to your loan )?is\s+([\d.]+)%/i,
    /APRC:\s+([\d.]+)%/i,
  ],
  totalAmountRepayable: [
    /Total amount to be repaid:\s*£([\d,]+)/i,
    /Total amount repayable:\s*£([\d,]+)/i,
  ],
  arrangementFeeAmount: [
    /Account Fee\s+£([\d,]+(?:\.\d{2})?)/i,
    /product fee of\s*£([\d,]+(?:\.\d{2})?)/i,
    /arrangement fee.*?£([\d,]+(?:\.\d{2})?)/i,
  ],
  brokerFeeAmount: [
    /Broker Fee\s+£([\d,]+(?:\.\d{2})?)/i,
    /broker.*?fee.*?£([\d,]+(?:\.\d{2})?)/i,
  ],
  procFeeAmount: [
    /will pay\s+[^\n]+?(?:a total of|an amount of)\s*£([\d,]+(?:\.\d{2})?)/i,
  ],
  cashbackAmount: [
    /cashback of\s*£([\d,]+(?:\.\d{2})?)/i,
  ],
  propertyValue: [
    /Value of the property assumed.*?:\s*£([\d,]+)/i,
    /Property (?:Price|Value):\s*£?([\d,]+)/i,
  ],
  monthlyPaymentInitial: [
    /(\d+)\s+payments at a fixed rate.*?£([\d,]+\.\d{2})/i,
    /(\d+) payments of\s*£([\d,]+\.\d{2})/i,
    /Initial Monthly Payment:\s*£?([\d,]+\.\d{2})/i,
  ],
  monthlyPaymentReversion: [
    /(\d+)\s+payments at a variable rate.*?£([\d,]+\.\d{2})/i,
    /Followed by\s+\d+\s+payments of\s*£([\d,]+\.\d{2})/i,
  ],
  portability: [
    /You have the right to transfer this product/i,
    /Portability/i,
  ],
  overpaymentPercent: [
    /overpayments.*?up to\s+(\d+)%/i,
    /additional capital repayments of up to\s+(\d+)%/i,
  ],
}

export const REQUIRED_FIELDS = [
  "lenderName",
  "loanAmount",
  "termYears",
  "initialRatePercent",
  "initialRateEndDate",
  "reversionRatePercent",
  "monthlyPaymentInitial",
  "monthlyPaymentReversion",
  "aprcPercent",
  "totalAmountRepayable",
] as const

export const MONETARY_FIELDS = new Set([
  "loanAmount", "arrangementFeeAmount", "brokerFeeAmount", "procFeeAmount",
  "cashbackAmount", "propertyValue", "monthlyPaymentInitial",
  "monthlyPaymentReversion", "totalAmountRepayable",
])

export const PERCENT_FIELDS = new Set([
  "initialRatePercent", "reversionRatePercent", "aprcPercent", "overpaymentPercent",
])

export const DATE_FIELDS = new Set(["initialRateEndDate"])
export const BOOLEAN_FIELDS = new Set(["arrangementFeeAddedToLoan", "portability"])

// Multi-group patterns — last group is the numeric value we want
export const MULTI_GROUP_FIELDS = new Set(["monthlyPaymentInitial", "monthlyPaymentReversion"])
