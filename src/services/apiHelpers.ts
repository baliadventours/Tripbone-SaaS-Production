import axios from "axios";
import path from "path";
import fs from "fs";
import { getAdminDb } from "./firebaseAdmin.js";

// --- CONVERSANT FIRESTORE REST API HELPERS (BYPASS GCP ADC CONSTRAINTS FOR PREVIEWS) ---
export function parseRestValue(value: any): any {
  if (!value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return parseInt(value.integerValue, 10);
  if ('doubleValue' in value) return parseFloat(value.doubleValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) {
    const values = value.arrayValue.values || [];
    return values.map((v: any) => parseRestValue(v));
  }
  if ('mapValue' in value) {
    const fields = value.mapValue.fields || {};
    const res: any = {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = parseRestValue(v);
    }
    return res;
  }
  if ('nullValue' in value) return null;
  return value;
}

export function parseRestDocument(doc: any) {
  if (!doc || !doc.fields) return null;
  const idStr = doc.name ? doc.name.split('/').pop() : '';
  const parsed: any = { id: idStr };
  for (const [key, val] of Object.entries(doc.fields)) {
    parsed[key] = parseRestValue(val);
  }
  return parsed;
}

export async function fetchFromREST(
  collectionName: string,
  docId?: string,
  queryOptions?: { 
    whereFilters?: Array<{ field: string; op: 'EQUAL' | 'IN'; value: any }>;
    orderByField?: string;
    direction?: 'ASCENDING' | 'DESCENDING';
    limit?: number;
  }
) {
  let projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0785892115';
  let databaseId = process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)';
  let apiKey = '';
  let authDomain = '';

  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      projectId = config.projectId || projectId;
      databaseId = config.firestoreDatabaseId || databaseId;
      apiKey = config.apiKey || apiKey;
      authDomain = config.authDomain || authDomain;
    }
  } catch (e) {}

  const headers: Record<string, string> = {};
  if (authDomain) {
    headers['Referer'] = `https://${authDomain}/`;
    headers['Origin'] = `https://${authDomain}`;
  }

  if (docId) {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${collectionName}/${docId}${apiKey ? `?key=${apiKey}` : ''}`;
    const res = await axios.get(url, { headers });
    return parseRestDocument(res.data);
  } else {
    const structuredQuery: any = {
      from: [{ collectionId: collectionName }]
    };

    if (queryOptions?.whereFilters && queryOptions.whereFilters.length > 0) {
      if (queryOptions.whereFilters.length === 1) {
        const filter = queryOptions.whereFilters[0];
        structuredQuery.where = {
          fieldFilter: {
            field: { fieldPath: filter.field },
            op: filter.op,
            value: typeof filter.value === 'string' 
              ? { stringValue: filter.value }
              : (Array.isArray(filter.value) 
                ? { arrayValue: { values: filter.value.map(v => ({ stringValue: v })) } }
                : { booleanValue: filter.value })
          }
        };
      } else {
        structuredQuery.where = {
          compositeFilter: {
            op: 'AND',
            filters: queryOptions.whereFilters.map(f => ({
              fieldFilter: {
                field: { fieldPath: f.field },
                op: f.op,
                value: typeof f.value === 'string'
                  ? { stringValue: f.value }
                  : (Array.isArray(f.value)
                    ? { arrayValue: { values: f.value.map(v => ({ stringValue: v })) } }
                    : { booleanValue: f.value })
              }
            }))
          }
        };
      }
    }

    if (queryOptions?.orderByField) {
      structuredQuery.orderBy = [{
        field: { fieldPath: queryOptions.orderByField },
        direction: queryOptions.direction || 'ASCENDING'
      }];
    }

    if (queryOptions?.limit) {
      structuredQuery.limit = queryOptions.limit;
    }

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery${apiKey ? `?key=${apiKey}` : ''}`;
    const res = await axios.post(url, { structuredQuery }, { headers });
    
    const documents = (res.data || [])
      .map((item: any) => item.document ? parseRestDocument(item.document) : null)
      .filter(Boolean);
    
    return documents;
  }
}

// Robust Gemini API helper that falls back to stable alternative models if the primary model is unavailable.
export async function generateContentWithFallback(ai: any, params: any) {
  const modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3-flash-preview", "gemini-3.1-flash-lite"];
  const initialModel = params.model || "gemini-3.5-flash";
  const uniqueModels = Array.from(new Set([initialModel, ...modelsToTry]));

  let lastError: any = null;
  for (const model of uniqueModels) {
    try {
      console.log(`[Gemini Fallback Router] Attempting generation with model: ${model}`);
      const response = await ai.models.generateContent({
        ...params,
        model: model
      });
      console.log(`[Gemini Fallback Router] Successfully generated content using model: ${model}`);
      return response;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini Fallback Router] Failed with model ${model}:`, err.message || err);

      // If we failed and there are tools configured, try one more time for this model without tools (in case of tool support issues)
      if (params.config?.tools || params.tools) {
        try {
          console.log(`[Gemini Fallback Router] Retrying model ${model} without tools...`);
          const cleanParams = { ...params };
          if (cleanParams.config) {
            cleanParams.config = { ...cleanParams.config };
            delete cleanParams.config.tools;
          }
          delete cleanParams.tools;
          
          const response = await ai.models.generateContent({
            ...cleanParams,
            model: model
          });
          console.log(`[Gemini Fallback Router] Successfully generated content (sans tools) using model: ${model}`);
          return response;
        } catch (retryErr: any) {
          console.warn(`[Gemini Fallback Router] Retry without tools also failed for ${model}:`, retryErr.message || retryErr);
        }
      }
    }
  }
  throw lastError;
}

// Helper to dynamically resolve per-tenant Gemini API Key
export async function resolveTenantGeminiKey(tenantId?: string | null): Promise<string | undefined> {
  if (!tenantId) return undefined;
  const db = getAdminDb();
  try {
    const commSettingsDoc = await db.collection('communicationSettings').doc(tenantId).get();
    if (commSettingsDoc.exists) {
      const data = commSettingsDoc.data();
      if (data?.geminiApiKey) {
        return data.geminiApiKey;
      }
    }
  } catch (err) {
    console.error("[resolveTenantGeminiKey Error]:", err);
  }
  return undefined;
}
