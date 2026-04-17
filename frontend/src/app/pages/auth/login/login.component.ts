import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

declare var google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule, MatCheckboxModule
  ],
  template: `
    <div class="auth-page">
      <!-- Left Panel -->
      <div class="auth-page__left animate-fade-in">
        <div class="auth-left-content">
          <img src="assets/images/logo.png" alt="LDCU Logo" class="auth-brand-logo animate-bounce-subtle">
          <h1 class="auth-left-title">Liceo de Cagayan University</h1>
          <p class="auth-left-subtitle">QR Code Attendance Management System</p>
        </div>
      </div>

      <!-- Right Panel -->
      <div class="auth-page__right animate-fade-in-up">
        <div class="auth-form-wrap">
          <!-- Mobile Branding -->
          <div class="mobile-branding-header">
             <img src="assets/images/logo.png" alt="LDCU Logo" class="mobile-logo">
             <h1 class="mobile-title">Liceo de Cagayan University</h1>
             <p class="mobile-subtitle">QR Code Attendance System</p>
          </div>

          <div class="auth-header">
            <div class="auth-badge">Welcome back</div>
            <h2>Sign In</h2>
            <p>Enter your university credentials to continue</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
            <mat-form-field>
              <mat-label>University Email</mat-label>
              <input matInput formControlName="email" type="email" placeholder="you@liceo.edu.ph" autocomplete="email">
              <mat-icon matPrefix>email</mat-icon>
              <mat-error *ngIf="form.get('email')?.hasError('required')">Email is required</mat-error>
              <mat-error *ngIf="form.get('email')?.hasError('email')">Enter a valid email</mat-error>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Password</mat-label>
              <input matInput formControlName="password" [type]="showPassword() ? 'text' : 'password'" autocomplete="current-password">
              <mat-icon matPrefix>lock</mat-icon>
              <button mat-icon-button matSuffix type="button" (click)="showPassword.update(v => !v)">
                <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="form.get('password')?.hasError('required')">Password is required</mat-error>
            </mat-form-field>

            <div class="auth-row">
              <a routerLink="/forgot-password" class="auth-link">Forgot Password?</a>
            </div>

            <button mat-raised-button color="primary" type="submit" class="auth-submit-btn"
              [disabled]="form.invalid || loading()">
              <mat-spinner *ngIf="loading()" diameter="20"></mat-spinner>
              <span *ngIf="!loading()">Sign In</span>
            </button>

            <div class="auth-divider"><span>OR</span></div>
            
            <div id="google-btn-container" class="google-btn-wrapper"></div>
            
            <div class="auth-divider"><span>New to the system?</span></div>

            <a routerLink="/register" mat-stroked-button color="primary" class="auth-register-btn">
              Create Account
            </a>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-left-content { position: relative; z-index: 1; text-align: center; }
    .auth-brand-logo { width: 140px; height: auto; margin-bottom: 24px; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.2)); }
    .auth-left-title { font-size: 1.8rem; color: #fff; font-weight: 800; margin-bottom: 8px; }
    .auth-left-subtitle { color: rgba(255,255,255,0.7); font-size: 0.95rem; margin-bottom: 48px; }
    .auth-features { display: flex; flex-direction: column; gap: 20px; text-align: left; max-width: 320px; }
    .auth-feature {
      display: flex; align-items: flex-start; gap: 16px;
      background: rgba(255,255,255,0.08); border-radius: 12px; padding: 16px;
      border: 1px solid rgba(255,255,255,0.12);
      .auth-feature__icon { font-size: 28px; flex-shrink: 0; margin-top: 2px; }
      strong { display: block; color: #C9A227; font-size: 0.875rem; margin-bottom: 3px; }
      p { margin: 0; color: rgba(255,255,255,0.6); font-size: 0.8rem; line-height: 1.5; }
    }

    .auth-form-wrap { width: 100%; max-width: 380px; }
    .auth-badge {
      display: inline-block; background: rgba(139,26,26,0.1);
      color: var(--color-primary); padding: 4px 14px;
      border-radius: 20px; font-size: 0.75rem; font-weight: 600;
      letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 12px;
    }
    .auth-header h2 { font-size: 2rem; color: var(--color-primary); margin-bottom: 8px; }
    .auth-header p  { color: var(--color-text-muted); font-size: 0.875rem; margin-bottom: 32px; }

    .auth-form { display: flex; flex-direction: column; gap: 8px; }
    .auth-row { display: flex; justify-content: flex-end; margin-top: -4px; }
    .auth-link { font-size: 0.8rem; color: var(--color-primary); font-weight: 500; }
    .auth-submit-btn { height: 50px; font-size: 1rem !important; margin-top: 8px; width: 100%; }
    .auth-register-btn { width: 100%; height: 46px; display: flex; align-items: center; justify-content: center; }
    .auth-divider { display: flex; align-items: center; gap: 12px; margin: 16px 0 8px; color: #aaa; font-size: 0.8rem;
      &::before, &::after { content: ''; flex: 1; height: 1px; background: var(--color-border); } }

    .demo-creds {
      margin-top: 24px; padding: 14px; background: #fdf8f8;
      border: 1px dashed var(--color-primary); border-radius: 10px;
      .demo-title { font-size: 0.75rem; font-weight: 600; color: #888; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.08em; }
      .demo-row {
        display: flex; align-items: center; gap: 10px; padding: 6px 0;
        font-size: 0.78rem; cursor: pointer; border-radius: 6px;
        padding: 6px 8px; transition: background 0.15s;
        &:hover { background: rgba(139,26,26,0.04); }
        code { background: #f0e8e8; color: var(--color-primary); padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; }
      }
      .demo-badge {
        background: var(--color-primary); color: white;
        padding: 2px 8px; border-radius: 12px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
        min-width: 68px; text-align: center;
      }
    }
    
    .google-btn-wrapper { display: flex; justify-content: center; height: 44px; margin-bottom: 8px; }
    @media (max-width: 480px) {
      .auth-header h2 { font-size: 1.6rem; }
      .auth-header p { font-size: 0.8rem; margin-bottom: 20px; }
      .auth-badge { padding: 3px 10px; font-size: 0.65rem; }
      .auth-form { gap: 4px; }
      .auth-submit-btn { height: 46px; }
      .google-btn-wrapper { height: 40px; margin-bottom: 4px; }
      .auth-divider { margin: 12px 0 4px; }
    }
  `]
})
export class LoginComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);

  loading = this.auth.loading;
  showPassword = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  ngOnInit(): void {
    this.initGoogleSignIn();
  }

  ngOnDestroy(): void {
    // Cleanup global callback to prevent memory leaks if recreated
    delete (window as any).handleGoogleCredentialResponse;
  }

  initGoogleSignIn(): void {
    (window as any).handleGoogleCredentialResponse = (response: any) => {
      this.auth.googleLogin(response.credential).subscribe({
        next: (res) => {
          if (res.needsRegistration) {
            // Redirect to register with Google profile pre-filled
            const p = res.googleProfile;
            this.router.navigate(['/register'], {
              queryParams: {
                googleEmail: p.email,
                googleFirstName: p.firstName,
                googleLastName: p.lastName,
                googlePicture: p.picture || ''
              }
            });
            this.toast.success('Please complete your registration to continue.');
          } else {
            this.toast.success('Google login successful! 🎉');
            this.auth.redirectToDashboard();
          }
        },
        error: (err) => this.toast.error(err?.error?.message || 'Google sign-in failed')
      });
    };

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (typeof google === 'undefined') return;
      google.accounts.id.initialize({
        client_id: (environment as any).googleClientId,
        callback: (window as any).handleGoogleCredentialResponse
      });
      google.accounts.id.renderButton(
        document.getElementById("google-btn-container"),
        { theme: "outline", size: "large", width: 380, shape: "pill" }
      );
    };
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const { email, password } = this.form.value;
    this.auth.login({ email: email!, password: password! }).subscribe({
      next: () => {
        this.toast.success('Welcome back! 🎉');
        this.auth.redirectToDashboard();
      },
      error: (err) => this.toast.error(this.toast.extractError(err))
    });
  }
}
