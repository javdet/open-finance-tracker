/**
 * Application data access layer (frontend): API clients for accounts,
 * operations, and budgets, including budget vs actual report.
 */
export {
	deleteAccount,
	fetchAccountById,
	fetchAccounts,
	fetchBalanceHistory,
	createAccount,
	updateAccount,
} from './accounts'
export type {
	BalanceHistoryPoint,
	BalanceHistoryResponse,
} from './accounts'
export {
	createOperation,
	deleteOperation,
	fetchCategoryTotalsInBase,
	fetchCategoryUsage,
	fetchOperationById,
	fetchOperations,
	updateOperation,
} from './operations'
export type {
	CategoryTotalsInBaseQuery,
	CategoryTotalsInBaseResponse,
	CategoryTotalsInBaseRow,
	CategoryUsageResponse,
	ListOperationsResponse,
} from './operations'
export {
	createBudget,
	deleteBudget,
	fetchBudgetById,
	fetchBudgetItems,
	fetchBudgetVsActualReport,
	fetchBudgets,
	updateBudget,
} from './budgets'
export {
	applyTemplate,
	createTemplate,
	createTemplateItem,
	deleteTemplate,
	deleteTemplateItem,
	fetchTemplateById,
	fetchTemplateItems,
	fetchTemplates,
	updateTemplate,
	updateTemplateItem,
} from './budget-templates'
export {
	createCategory,
	fetchCategories,
	fetchCategoryGroups,
	updateCategory,
} from './categories'
export {
	createScheduledTransaction,
	deleteScheduledTransaction,
	fetchScheduledCategoryTotals,
	fetchScheduledTransactionById,
	fetchScheduledTransactions,
	updateScheduledTransaction,
} from './scheduled-transactions'
export type { ScheduledCategoryTotalsResponse } from './scheduled-transactions'
export { fetchLatestExchangeRates } from './currency'
export {
	createApiKey,
	fetchApiKeys,
	revokeApiKey,
} from './api-keys'
export type { ApiKey, ApiKeyWithRaw } from './api-keys'
export {
	createSmsMapping,
	deleteSmsMapping,
	fetchSmsMappings,
	updateSmsMapping,
} from './sms-account-mappings'
export type {
	CreateSmsMappingInput,
	SmsAccountMapping,
	UpdateSmsMappingInput,
} from './sms-account-mappings'
export { fetchSmsImports } from './sms-imports'
export type { SmsImport, SmsImportsResponse } from './sms-imports'
export { get, post, patch, del, BASE_URL } from './client'
export type { ApiOptions } from './client'
export {
	login,
	logout,
	fetchMe,
	changeCredentials,
} from './auth'
export type { AuthMeResponse, LoginResponse } from './auth'
