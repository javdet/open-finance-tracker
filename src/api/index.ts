/**
 * Application data access layer (frontend): API clients for accounts,
 * operations, and budgets, including budget vs actual report.
 */
export {
	deleteAccount,
	fetchAccountById,
	fetchAccounts,
	createAccount,
	updateAccount,
} from './accounts'
export {
	createOperation,
	deleteOperation,
	fetchCategoryUsage,
	fetchOperationById,
	fetchOperations,
	updateOperation,
} from './operations'
export type {
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
export { fetchLatestExchangeRates } from './currency'
export { get, post, patch, del, BASE_URL } from './client'
export type { ApiOptions } from './client'
