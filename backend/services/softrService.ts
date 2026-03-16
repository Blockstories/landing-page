import "../loadEnv.js";
import { getRecords, getTableSchema, GetRecordsOptions, RecordsResponse, Record } from "../integrations/softr.js";

// Cache for field mapping (fieldId -> fieldName)
let fieldMappingCache: Map<string, string> | null = null;
let fieldMappingCacheTime: number | null = null;
const FIELD_MAPPING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface FieldMapping {
  [fieldId: string]: string;
}

export interface MappedRecordsResponse extends Omit<RecordsResponse, 'data'> {
  data: MappedRecord[];
}

export interface MappedRecord extends Omit<Record, 'fields'> {
  fields: { [key: string]: unknown };
  _originalFields?: { [key: string]: unknown };
}

/**
 * Fetch and cache field mapping from table schema
 */
export async function getFieldMapping(
  databaseId: string,
  tableId: string
): Promise<FieldMapping> {
  // Return cached mapping if still valid
  if (
    fieldMappingCache &&
    fieldMappingCacheTime &&
    Date.now() - fieldMappingCacheTime < FIELD_MAPPING_CACHE_TTL
  ) {
    return Object.fromEntries(fieldMappingCache);
  }

  try {
    const schema = await getTableSchema(databaseId, tableId);
    const mapping = new Map<string, string>();

    schema.fields.forEach((field) => {
      if (field.id && field.name) {
        mapping.set(field.id, field.name);
      }
    });

    fieldMappingCache = mapping;
    fieldMappingCacheTime = Date.now();

    return Object.fromEntries(mapping);
  } catch (error) {
    console.error("Failed to fetch field mapping:", error);
    return {};
  }
}

/**
 * Clear the field mapping cache
 */
export function clearFieldMappingCache(): void {
  fieldMappingCache = null;
  fieldMappingCacheTime = null;
}

/**
 * Transform a single record's fields from IDs to readable names
 */
export function transformRecordFields(
  record: Record,
  fieldMapping: FieldMapping
): MappedRecord {
  if (!record || !record.fields) {
    return record as MappedRecord;
  }

  const transformedFields: { [key: string]: unknown } = {};

  Object.keys(record.fields).forEach((fieldId) => {
    const fieldName = fieldMapping[fieldId] || fieldId;
    transformedFields[fieldName] = record.fields[fieldId];
  });

  return {
    ...record,
    fields: transformedFields,
    _originalFields: record.fields,
  };
}

/**
 * Get records with mapped field names (human-readable)
 * This is the primary method for consuming Softr data
 */
export async function getRecordsWithMappedFields(
  databaseId: string,
  tableId: string,
  options: GetRecordsOptions = {}
): Promise<MappedRecordsResponse> {
  // Fetch records and schema in parallel
  const [records, fieldMapping] = await Promise.all([
    getRecords(databaseId, tableId, options),
    getFieldMapping(databaseId, tableId),
  ]);

  // Transform records
  const mappedData = records.data.map((record) =>
    transformRecordFields(record, fieldMapping)
  );

  return {
    ...records,
    data: mappedData,
  };
}

/**
 * Get raw records (field IDs)
 * Use this when you need the original Softr field IDs
 */
export async function getRecordsRaw(
  databaseId: string,
  tableId: string,
  options: GetRecordsOptions = {}
): Promise<RecordsResponse> {
  return getRecords(databaseId, tableId, options);
}

// News Aggregator constants - hardcoded for separation of concerns
const NEWS_DATABASE_ID = process.env.SOFTR_DATABASE_ID || "";
const NEWS_TABLE_ID = process.env.SOFTR_TABLE_ID || "";

// Theme-to-view mapping for Market Flow tabs
// Each theme maps to a specific Softr view ID that filters by that theme
const THEME_VIEW_MAP: { [key: string]: string } = {
  default: process.env.SOFTR_VIEW_CREATEDAT_ID || process.env.SOFTR_VIEW_ID || "",
  tokenization: process.env.SOFTR_VIEW_TOKENIZATION_CREATEDAT_ID || "",
  stablecoins: process.env.SOFTR_VIEW_STABLECOINS_CREATEDAT_ID || "",
  regulation: process.env.SOFTR_VIEW_REGULATION_CREATEDAT_ID || "",
  "market-structure": process.env.SOFTR_VIEW_MARKETSTRUCTURE_CREATEDAT_ID || "",
};

/**
 * Get latest news records (for "Latest" tab)
 * Uses the default createdAt view to get the most recent news across all themes
 */
export async function getLatestNews(
  options: Omit<GetRecordsOptions, "viewId"> = {}
): Promise<MappedRecordsResponse> {
  const viewId = THEME_VIEW_MAP.default;

  if (!viewId) {
    console.warn("[softrService] No default view ID found for latest news");
  }

  return getRecordsWithMappedFields(NEWS_DATABASE_ID, NEWS_TABLE_ID, {
    ...options,
    viewId,
  });
}

/**
 * Get news records filtered by theme
 * Maps theme names to specific Softr views for proper separation of concerns
 * @param theme - The theme/category name (e.g., 'tokenization', 'stablecoins', 'regulation', 'market-structure')
 * @param options - Additional query options
 */
export async function getNewsByTheme(
  theme: string,
  options: Omit<GetRecordsOptions, "viewId"> = {}
): Promise<MappedRecordsResponse> {
  const normalizedTheme = theme.toLowerCase().trim();
  const viewId = THEME_VIEW_MAP[normalizedTheme] || THEME_VIEW_MAP.default;

  if (!viewId) {
    console.warn(`[softrService] No view ID found for theme: ${theme}`);
  }

  return getRecordsWithMappedFields(NEWS_DATABASE_ID, NEWS_TABLE_ID, {
    ...options,
    viewId,
  });
}

/**
 * Get news records for multiple themes in a single call
 * Returns an object with theme names as keys
 * @param themes - Array of theme names to fetch
 * @param options - Additional query options per theme
 */
export async function getNewsForThemes(
  themes: string[],
  options: Omit<GetRecordsOptions, "viewId"> = {}
): Promise<{ [key: string]: MappedRecordsResponse }> {
  const results: { [key: string]: MappedRecordsResponse } = {};

  await Promise.all(
    themes.map(async (theme) => {
      try {
        results[theme] = await getNewsByTheme(theme, options);
      } catch (error) {
        console.error(`[softrService] Failed to fetch news for theme: ${theme}`, error);
        results[theme] = { data: [], metadata: { offset: 0, limit: options.paging?.limit || 10, total: 0 } };
      }
    })
  );

  return results;
}
