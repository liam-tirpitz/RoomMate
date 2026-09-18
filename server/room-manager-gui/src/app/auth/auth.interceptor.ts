import {HttpErrorResponse, HttpInterceptorFn} from '@angular/common/http';
import {inject} from '@angular/core';
import {Router} from '@angular/router';
import {throwError} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {AuthService} from '../api/auth.service';

// Adds the bearer token to management API calls and sends the user back to the login page on 401.
// OIDC sessions need nothing here: the browser sends the session cookie itself.
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;
  if (token && request.url.startsWith('/api/')) {
    request = request.clone({setHeaders: {Authorization: `Bearer ${token}`}});
  }
  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !request.url.startsWith('/api/auth/')) {
        auth.clear();
        router.navigate(['/login'], {queryParams: {returnUrl: router.url}});
      }
      return throwError(() => error);
    })
  );
};
