import { Component, signal, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="auth-page" style="justify-content:center;align-items:center">
      <div class="fp-card animate-fade-in-up">
        <div style="font-size:48px;margin-bottom:16px;text-align:center">🔐</div>
        <h2 style="color:var(--color-primary);text-align:center;margin-bottom:8px">Forgot Password?</h2>
        <p style="color:var(--color-text-muted);text-align:center;margin-bottom:28px;font-size:0.875rem">
          Enter your university email and we'll send you a reset link.
        </p>

        <ng-container *ngIf="!sent(); else sentMsg">
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <mat-form-field>
              <mat-label>University Email</mat-label>
              <input matInput formControlName="email" type="email" placeholder="you@liceo.edu.ph">
              <mat-icon matPrefix>email</mat-icon>
              <mat-error>Enter a valid email</mat-error>
            </mat-form-field>
            <button mat-raised-button color="primary" type="submit" style="width:100%;height:50px;margin-top:8px" [disabled]="form.invalid || loading()">
              <mat-spinner *ngIf="loading()" diameter="20"></mat-spinner>
              <span *ngIf="!loading()">Send Reset Link</span>
            </button>
          </form>
        </ng-container>

        <ng-template #sentMsg>
          <div style="text-align:center;padding:24px 0">
            <div style="font-size:48px">✅</div>
            <p style="color:var(--color-success);font-weight:600;margin-top:12px">{{ sentMessage() }}</p>
            <p *ngIf="!devResetUrl()" style="color:var(--color-text-muted);font-size:0.875rem">Check your email inbox and follow the instructions.</p>
            
            <!-- Dev mode: show direct reset link -->
            <div *ngIf="devResetUrl()" style="margin-top:16px">
              <p style="color:var(--color-warning);font-size:0.8rem;margin-bottom:12px">
                ⚠️ Email not configured — use the button below to reset your password directly.
              </p>
              <a mat-raised-button color="primary" [href]="devResetUrl()" style="width:100%;height:44px">
                🔑 Reset Password Now
              </a>
            </div>
          </div>
        </ng-template>

        <div style="text-align:center;margin-top:20px">
          <a routerLink="/login" style="color:var(--color-primary);font-size:0.875rem">← Back to Sign In</a>
        </div>
      </div>
    </div>
  `,
  styles: [`.fp-card { background: white; border-radius: 20px; padding: 48px 40px; width: 100%; max-width: 420px; box-shadow: var(--shadow-xl); }`]
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);

  loading = signal(false);
  sent = signal(false);
  sentMessage = signal('Reset link sent!');
  devResetUrl = signal<string | null>(null);

  form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.auth.forgotPassword(this.form.value.email!).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        this.sent.set(true);
        if (res.devMode && res.devResetUrl) {
          this.sentMessage.set('Reset link generated!');
          this.devResetUrl.set(res.devResetUrl);
        } else {
          this.sentMessage.set(res.message || 'Reset link sent!');
        }
      },
      error: (e) => { 
        this.loading.set(false); 
        this.toast.error(e?.error?.message || 'Failed to request password reset.');
      }
    });
  }
}
