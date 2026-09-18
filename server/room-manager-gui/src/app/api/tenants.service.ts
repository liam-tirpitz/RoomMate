import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {IEWSTenant} from '@interfaces/IEWSTenant';

export interface IConnectionTest {
  ok: boolean;
  error?: string;
}

@Injectable({providedIn: 'root'})
export class TenantsService {
  private readonly base = '/api/tenants';

  constructor(private http: HttpClient) {}

  list(): Observable<IEWSTenant[]> {
    return this.http.get<IEWSTenant[]>(this.base);
  }

  create(tenant: IEWSTenant): Observable<IEWSTenant> {
    return this.http.post<IEWSTenant>(this.base, tenant);
  }

  update(id: string, tenant: IEWSTenant): Observable<IEWSTenant> {
    return this.http.put<IEWSTenant>(`${this.base}/${id}`, tenant);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // Signs in to Exchange with the stored credentials; answers 200 with ok false when that fails
  test(id: string): Observable<IConnectionTest> {
    return this.http.post<IConnectionTest>(`${this.base}/${id}/test`, {});
  }
}
