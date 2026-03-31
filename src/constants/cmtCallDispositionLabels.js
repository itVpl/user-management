/**
 * CMT call disposition labels that must stay aligned with backend
 * `utils/cmtCallDispositionUtils.js` (e.g. `CMT_ALL_CATEGORY_OPTIONS_LIST`).
 *
 * Call Data and Call Data Reports load options from
 * `GET /api/v1/analytics/8x8/call-records/category-options` — no duplicate full lists here.
 * Use these constants only when the frontend needs an exact string (filters, tests, copy).
 */

/** Appended to the combined CMT list; valid on PUT category for CMT users. */
export const CMT_CUSTOM_EDIT_DISPOSITION = "Custom Edit";

/**
 * CMT-only: user picks this, then enters a string; stored category is
 * `${CMT_ADD_LOAD_REFERENCE_DISPOSITION}: <user text>` (see UserCallerData.jsx).
 * Backend must allow this label on PUT and the prefixed form (or legacy same-value).
 */
export const CMT_ADD_LOAD_REFERENCE_DISPOSITION = "Add Load Reference No.";

export const cmtLoadReferenceCategoryPrefix = () => `${CMT_ADD_LOAD_REFERENCE_DISPOSITION}: `;
