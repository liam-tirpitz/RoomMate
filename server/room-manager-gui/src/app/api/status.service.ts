import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of, shareReplay} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {IServerStatus} from '@interfaces/IServerStatus';

export type {IServerStatus};

// What the UI assumes when the server has no /api/status yet or the request fails
const FALLBACK: IServerStatus = {storage: 'FILE', writable: false, version: 'unknown', auth: 'token'};

@Injectable({providedIn: 'root'})
export class StatusService {
  private status$?: Observable<IServerStatus>;

  constructor(private http: HttpClient) {}

  get(): Observable<IServerStatus> {
    if (!this.status$) {
      this.status$ = this.http.get<IServerStatus>('/api/status').pipe(
        catchError(() => of(FALLBACK)),
        shareReplay(1)
      );
    }
    return this.status$;
  }

  reset() {
    this.status$ = undefined;
  }
}
