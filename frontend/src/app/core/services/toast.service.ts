import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private defaults: MatSnackBarConfig = {
    duration: 3500,
    horizontalPosition: 'right',
    verticalPosition: 'top'
  };

  constructor(private snackBar: MatSnackBar) {}

  success(message: string, duration?: number): void {
    this.snackBar.open(message, '✕', { ...this.defaults, duration: duration || this.defaults.duration, panelClass: ['success-snack'] });
  }

  error(message: string, duration?: number): void {
    this.snackBar.open(message, '✕', { ...this.defaults, duration: duration || 5000, panelClass: ['error-snack'] });
  }

  info(message: string, duration?: number): void {
    this.snackBar.open(message, '✕', { ...this.defaults, duration: duration || this.defaults.duration, panelClass: ['info-snack'] });
  }

  extractError(err: any): string {
    return err?.error?.message || err?.error?.errors?.[0]?.msg || err?.message || 'An unexpected error occurred.';
  }
}
