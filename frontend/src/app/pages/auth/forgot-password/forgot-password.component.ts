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
        <div style="font-size:72px;margin-bottom:24px;text-align:center">🏥</div>
        <h2 style="color:var(--color-primary);text-align:center;margin-bottom:12px">Forgot Password?</h2>
        
        <div class="info-alert" style="margin-bottom: 24px">
          <p style="color:var(--color-text);text-align:center;font-size:0.95rem;line-height:1.6">
            For security reasons, password resets are handled directly by the university administrators.
          </p>
        </div>

        <div class="contact-card">
          <p style="font-weight: 600; color: var(--color-primary); margin-bottom: 8px">How to reset:</p>
          <ul style="padding-left: 20px; color: var(--color-text-muted); font-size: 0.875rem; line-height: 1.6">
            <li>Visit your assigned department.</li>
            <li>Present your University ID for verification.</li>
            <li>Request a password reset.</li>
          </ul>
        </div>

        <div style="text-align:center;margin-top:32px">
          <a routerLink="/login" mat-stroked-button color="primary" style="width:100%;height:46px;display:flex;align-items:center;justify-content:center">
            ← Back to Sign In
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fp-card { background: white; border-radius: 20px; padding: 48px 40px; width: 100%; max-width: 440px; box-shadow: var(--shadow-xl); }
    .info-alert { background: rgba(139,26,26,0.05); border-radius: 12px; padding: 16px; border: 1px solid rgba(139,26,26,0.1); }
    .contact-card { background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; }
  `]
})
export class ForgotPasswordComponent {}
