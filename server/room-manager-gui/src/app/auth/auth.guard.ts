import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {map} from 'rxjs/operators';
import {AuthService} from '../api/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.check().pipe(
    map(ok => ok || router.createUrlTree(['/login'], {queryParams: {returnUrl: state.url}}))
  );
};
