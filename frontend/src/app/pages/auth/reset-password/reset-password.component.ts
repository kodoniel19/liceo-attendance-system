import { Component, signal, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="auth-page" style="justify-content:center;align-items:center">
      <div class="fp-card animate-fade-in-up">
        <div style="font-size:48px;margin-bottom:16px;text-align:center">🔑</div>
        <h2 style="color:var(--color-primary);text-align:center;margin-bottom:8px">Reset Password</h2>
        <p style="color:var(--color-text-muted);text-align:center;margin-bottom:28px;font-size:0.875rem">
          Create a new secure password for your account.
        </p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <mat-form-field>
            <mat-label>New Password</mat-label>
            <input matInput formControlName="password" [type]="showPass() ? 'text' : 'password'">
            <mat-icon matPrefix>lock</mat-icon>
            <button mat-icon-button matSuffix type="button" (click)="showPass.update(v => !v)">
              <mat-icon>{{ showPass() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-error *ngIf="form.get('password')?.hasError('minlength')">Min 8 characters</mat-error>
          </mat-form-field>

          <button mat-raised-button color="primary" type="submit" style="width:100%;height:50px;margin-top:8px" [disabled]="form.invalid || loading()">
            <mat-spinner *ngIf="loading()" diameter="20"></mat-spinner>
            <span *ngIf="!loading()">Reset Password</span>
          </button>
        </form>

        <div style="text-align:center;margin-top:20px"><a routerLink="/login" style="color:var(--color-primary);font-size:0.875rem">← Back to Sign In</a></div>
      </div>
    </div>
  `,
  styles: [`.fp-card { background: white; border-radius: 20px; padding: 48px 40px; width: 100%; max-width: 420px; box-shadow: var(--shadow-xl); }`]
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  showPass = signal(false);
  loading = signal(false);
  token = '';

  form = this.fb.group({ password: ['', [Validators.required, Validators.minLength(8)]] });

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) { this.toast.error('Invalid reset link.'); this.router.navigate(['/login']); }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.auth.resetPassword(this.token, this.form.value.password!).subscribe({
      next: () => { this.loading.set(false); this.toast.success('Password reset! Please login.'); this.router.navigate(['/login']); },
      error: (err) => { this.loading.set(false); this.toast.error(this.toast.extractError(err)); }
    });
  }
}
