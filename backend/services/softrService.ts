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
  fields: Record<string, unknown>;
  _originalFields?: Record<string, unknown>;
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

  const transformedFields: Record<string, unknown> = {};

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

/**
 * Get news records with mapped field names
 * Specialized function for the news aggregator with hardcoded table/database IDs
 */
export async function getNewsWithMappedFields(
  options: GetRecordsOptions = {}
): Promise<MappedRecordsResponse> {
  return getRecordsWithMappedFields(NEWS_DATABASE_ID, NEWS_TABLE_ID, options);
}
