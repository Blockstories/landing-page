const SOFTR_BASE_URL = process.env.SOFTR_BASE_URL || "https://api.softr.io/v1";

function getAuthHeaders(): HeadersInit {
  return {
    "Softr-Api-Key": process.env.SOFTR_API_KEY || "",
    "Content-Type": "application/json"
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Softr API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }
  return response.json() as Promise<T>;
}

export interface RecordField {
  [fieldId: string]: unknown;
}

export interface Record {
  id: string;
  fields: RecordField;
  created_at?: string;
  updated_at?: string;
}

export interface RecordListMetadata {
  offset: number;
  limit: number;
  total: number;
}

export interface RecordsResponse {
  data: Record[];
  metadata: RecordListMetadata;
}

export interface GetRecordsOptions {
  fieldNames?: boolean;
  viewId?: string;
  paging?: {
    offset?: number;
    limit?: number;
  };
}

export async function getRecords(
  databaseId: string,
  tableId: string,
  options: GetRecordsOptions = {}
): Promise<RecordsResponse> {
  const params = new URLSearchParams();

  if (options.fieldNames) {
    params.append("fieldNames", "true");
  }
  if (options.viewId) {
    params.append("viewId", options.viewId);
  }
  if (options.paging) {
    if (options.paging.offset !== undefined) {
      params.append("offset", options.paging.offset.toString());
    }
    if (options.paging.limit !== undefined) {
      params.append("limit", options.paging.limit.toString());
    }
  }

  const queryString = params.toString();
  const url = `${SOFTR_BASE_URL}/databases/${databaseId}/tables/${tableId}/records${queryString ? "?" + queryString : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders()
  });

  return handleResponse<RecordsResponse>(response);
}

// Table schema types
export interface TableField {
  id: string;
  name: string;
  type: string;
  settings?: Record<string, unknown>;
}

export interface TableSchema {
  id: string;
  name: string;
  fields: TableField[];
}

export interface TableSchemaResponse {
  data: TableSchema;
}

/**
 * Get table schema including field definitions
 */
export async function getTableSchema(
  databaseId: string,
  tableId: string
): Promise<TableSchema> {
  const url = `${SOFTR_BASE_URL}/databases/${databaseId}/tables/${tableId}`;

  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders()
  });

  const result = await handleResponse<TableSchemaResponse>(response);
  return result.data;
}
