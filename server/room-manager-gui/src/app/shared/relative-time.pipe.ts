import {Pipe, PipeTransform} from '@angular/core';

// "5 min ago" for ISO timestamps; the exact time goes in a title attribute where it matters
@Pipe({name: 'relativeTime', standalone: true, pure: false})
export class RelativeTimePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return 'never';
    const then = new Date(value).getTime();
    if (isNaN(then)) return value;
    const seconds = Math.round((Date.now() - then) / 1000);
    const abs = Math.abs(seconds);
    const suffix = seconds >= 0 ? 'ago' : 'from now';
    if (abs < 60) return `${abs} s ${suffix}`;
    if (abs < 3600) return `${Math.round(abs / 60)} min ${suffix}`;
    if (abs < 86400) return `${Math.round(abs / 3600)} h ${suffix}`;
    return `${Math.round(abs / 86400)} d ${suffix}`;
  }
}
