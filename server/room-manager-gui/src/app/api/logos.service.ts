import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {ILogo} from '@interfaces/ILogo';

@Injectable({providedIn: 'root'})
export class LogosService {
  private readonly base = '/api/logos';

  constructor(private http: HttpClient) {}

  list(): Observable<ILogo[]> {
    return this.http.get<ILogo[]>(this.base);
  }

  // The server names the logo after the file and answers 409 if that name exists, unless overwrite is set
  upload(file: File, overwrite = false): Observable<ILogo> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<ILogo>(this.base, form, {params: overwrite ? {overwrite: true} : {}});
  }

  delete(name: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(name)}`);
  }

  url(name: string): string {
    return `${this.base}/${encodeURIComponent(name)}`;
  }
}
