import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { LRUCache } from 'lru-cache';

// Read-through cache for catalog metadata — phase 04 endpoints. 30-second
// TTL is acceptable: catalog edits propagate within one cache cycle, and
// query-svc reads vastly outnumber writes. Webhook-based invalidation is
// out of scope for the prototype.
@Injectable()
export class CatalogClient {
  private readonly log = new Logger(CatalogClient.name);
  private readonly axios: AxiosInstance;
  private readonly cache = new LRUCache<string, object>({ max: 500, ttl: 30_000 });

  constructor(private readonly cfg: ConfigService) {
    this.axios = axios.create({
      baseURL: cfg.get<string>('CATALOG_API') ?? 'http://localhost:3001/api/v1',
      timeout: 10_000,
    });
  }

  private headers(token: string) {
    return { authorization: `Bearer ${token}` };
  }

  async getMetric(id: string, token: string) {
    const key = `metric:${id}`;
    const hit = this.cache.get(key);
    if (hit) return hit as Record<string, unknown>;
    const { data } = await this.axios.get(`/metrics/${id}`, { headers: this.headers(token) });
    this.cache.set(key, data);
    return data as Record<string, unknown>;
  }

  async getMetricBindings(id: string, token: string) {
    const key = `bindings:${id}`;
    const hit = this.cache.get(key);
    if (hit) return hit as { items: unknown[] };
    const { data } = await this.axios.get(`/metrics/${id}/bindings`, { headers: this.headers(token) });
    this.cache.set(key, data);
    return data as { items: unknown[] };
  }

  async getSegment(id: string, token: string) {
    const key = `segment:${id}`;
    const hit = this.cache.get(key);
    if (hit) return hit as Record<string, unknown>;
    const { data } = await this.axios.get(`/segments/${id}`, { headers: this.headers(token) });
    this.cache.set(key, data);
    return data as Record<string, unknown>;
  }
}
