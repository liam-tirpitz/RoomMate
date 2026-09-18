import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {IOrganization} from '@interfaces/IOrganization';

@Injectable({providedIn: 'root'})
export class OrganizationService {
  private readonly base = '/api/organization';

  constructor(private http: HttpClient) {}

  get(): Observable<IOrganization> {
    return this.http.get<IOrganization>(this.base);
  }

  update(organization: IOrganization): Observable<IOrganization> {
    return this.http.put<IOrganization>(this.base, organization);
  }
}
