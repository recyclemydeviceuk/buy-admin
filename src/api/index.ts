import { httpApi } from './http/adapter';
import type { AdminApi } from './types';

/** The admin talks only to the BuyUpon backend (VITE_API_BASE_URL). */
export const api: AdminApi = httpApi;
