import { Component, signal, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatSelectModule, MatProgressSpinnerModule, MatStepperModule, MatAutocompleteModule
  ],
  template: `
    <div class="auth-page">
      <div class="auth-page__left animate-fade-in">
        <div style="position:relative;z-index:1;text-align:center">
          <div style="font-size:72px;margin-bottom:24px">🎓</div>
          <h1 style="font-size:1.8rem;color:#fff;font-weight:800;margin-bottom:8px">Join Liceo<br/>Attendance System</h1>
          <p style="color:rgba(255,255,255,0.7);margin-bottom:32px">Create your account and start tracking attendance seamlessly.</p>
          <div style="font-size: 60px; opacity: 0.15; position: absolute; top: -20px; right: -20px; font-size: 200px; pointer-events: none;">📋</div>
        </div>
      </div>

      <div class="auth-page__right animate-fade-in-up">
        <div style="width:100%;max-width:400px">
          <div class="auth-header">
            <div class="auth-badge">New Account</div>
            <h2 style="font-size:2rem;color:var(--color-primary);margin-bottom:8px">Create Account</h2>
            <p style="color:var(--color-text-muted);font-size:0.875rem;margin-bottom:28px">Fill in your university details below</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <!-- Google pre-fill banner -->
            <div class="google-banner" *ngIf="isGoogleSignUp()">
              <span class="material-icons" style="color:#4285F4;font-size:20px">account_circle</span>
              <div>
                <strong>Google Account Detected</strong>
                <p>Complete the form below to finish registration</p>
              </div>
            </div>
            <div class="register-grid">
              <mat-form-field>
                <mat-label>First Name</mat-label>
                <input matInput formControlName="firstName">
                <mat-icon matPrefix>person</mat-icon>
                <mat-error>Required</mat-error>
              </mat-form-field>

              <mat-form-field>
                <mat-label>Last Name</mat-label>
                <input matInput formControlName="lastName">
                <mat-icon matPrefix>person</mat-icon>
                <mat-error>Required</mat-error>
              </mat-form-field>
            </div>

            <mat-form-field>
              <mat-label>University ID</mat-label>
              <input matInput formControlName="universityId" placeholder="STU-2024-001">
              <mat-icon matPrefix>badge</mat-icon>
              <mat-error>University ID is required</mat-error>
            </mat-form-field>

            <mat-form-field>
              <mat-label>University Email</mat-label>
              <input matInput formControlName="email" type="email" placeholder="you@liceo.edu.ph" [readonly]="isGoogleSignUp()">
              <mat-icon matPrefix>email</mat-icon>
              <mat-icon matSuffix *ngIf="isGoogleSignUp()" style="color:#4285F4">verified</mat-icon>
              <mat-error *ngIf="form.get('email')?.hasError('required')">Required</mat-error>
              <mat-error *ngIf="form.get('email')?.hasError('email')">Valid email required</mat-error>
            </mat-form-field>

            <mat-form-field style="width:100%">
              <mat-label>Department</mat-label>
              <input matInput formControlName="department" 
                     [matAutocomplete]="deptAuto" 
                     placeholder="Type or select department">
              <mat-icon matPrefix>business</mat-icon>
              <mat-autocomplete #deptAuto="matAutocomplete">
                <mat-optgroup *ngFor="let college of departmentGroups" [label]="college.college">
                  <mat-option *ngFor="let dept of college.departments" [value]="dept">{{ dept }}</mat-option>
                </mat-optgroup>
              </mat-autocomplete>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Password</mat-label>
              <input matInput formControlName="password" [type]="showPass() ? 'text' : 'password'">
              <mat-icon matPrefix>lock</mat-icon>
              <button mat-icon-button matSuffix type="button" (click)="showPass.update(v => !v)">
                <mat-icon>{{ showPass() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="form.get('password')?.hasError('required')">Required</mat-error>
              <mat-error *ngIf="form.get('password')?.hasError('minlength')">Min 8 characters</mat-error>
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit" class="auth-submit-btn"
              [disabled]="form.invalid || loading()">
              <mat-spinner *ngIf="loading()" diameter="20"></mat-spinner>
              <span *ngIf="!loading()">Create Account</span>
            </button>

            <p style="text-align:center;margin-top:16px;font-size:0.85rem;color:var(--color-text-muted)">
              Already have an account?
              <a routerLink="/login" style="color:var(--color-primary);font-weight:600">Sign In</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-badge {
      display: inline-block; background: rgba(139,26,26,0.1);
      color: var(--color-primary); padding: 4px 14px;
      border-radius: 20px; font-size: 0.75rem; font-weight: 600;
      letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 12px;
    }
    .register-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .auth-submit-btn { width: 100%; height: 50px; font-size: 1rem !important; margin-top: 8px; }
    .auth-divider { display: flex; align-items: center; gap: 12px; margin: 16px 0 8px; color: #aaa; font-size: 0.8rem;
      &::before, &::after { content: ''; flex: 1; height: 1px; background: var(--color-border); } }
    .google-btn-wrapper { display: flex; justify-content: center; height: 44px; margin-bottom: 8px; }
    .google-banner {
      display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      background: #e8f0fe; border: 1px solid #4285F4; border-radius: 10px; margin-bottom: 16px;
      strong { font-size: 0.85rem; color: #1a1a2e; display: block; }
      p { margin: 2px 0 0; font-size: 0.75rem; color: #64748b; }
    }
    @media (max-width: 480px) { .register-grid { grid-template-columns: 1fr; } }
  `]
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = this.auth.loading;
  showPass = signal(false);
  isGoogleSignUp = signal(false);

  departmentGroups = [
    {
      college: 'College of Engineering', departments: [
        'Department of Civil Engineering', 'Department of Electrical Engineering',
        'Department of Mechanical Engineering', 'Department of Computer Engineering'
      ]
    },
    { college: 'College of Law', departments: ['Law Department (Juris Doctor Program)'] },
    {
      college: 'College of Arts and Sciences', departments: [
        'Department of English', 'Department of History', 'Department of Political Science',
        'Department of Psychology', 'Department of Sociology', 'Department of Mathematics', 'Department of Biology'
      ]
    },
    {
      college: 'College of Business and Accountancy', departments: [
        'Department of Accountancy', 'Department of Business Administration',
        'Department of Hospitality Management', 'Department of Marketing'
      ]
    },
    {
      college: 'College of Education', departments: [
        'Department of Elementary Education', 'Department of Secondary Education',
        'Department of Special Education', 'Department of Graduate Studies'
      ]
    },
    { college: 'College of Nursing', departments: ['Department of Nursing'] },
    { college: 'College of Criminal Justice Education', departments: ['Department of Criminology'] },
    {
      college: 'College of Computer Studies', departments: [
        'Department of Information Technology', 'Department of Computer Science', 'Department of Digital Arts'
      ]
    },
    {
      college: 'College of Allied Health Sciences', departments: [
        'Department of Pharmacy', 'Department of Physical Therapy', 'Department of Radiologic Technology'
      ]
    },
    {
      college: 'College of Engineering and Technology', departments: [
        'Department of Industrial Engineering', 'Department of Information Systems'
      ]
    }
  ];

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    universityId: ['', Validators.required],
    email: ['', [Validators.required, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@liceo\.edu\.ph$/)]],
    department: [''],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  ngOnInit(): void {
    // Check for Google pre-fill query params (redirected from login page)
    this.route.queryParams.subscribe(params => {
      if (params['googleEmail']) {
        this.isGoogleSignUp.set(true);
        this.form.patchValue({
          firstName: params['googleFirstName'] || '',
          lastName: params['googleLastName'] || '',
          email: params['googleEmail']
        });
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    this.auth.register({
      universityId: v.universityId!,
      email: v.email!,
      password: v.password || undefined,
      firstName: v.firstName!,
      lastName: v.lastName!,
      role: 'student',
      department: v.department || undefined,
      googleSignUp: this.isGoogleSignUp() || undefined
    } as any).subscribe({
      next: () => {
        this.toast.success('Account created! Please sign in to continue. 🎉');
        this.router.navigate(['/login'], { queryParams: { email: v.email } });
      },
      error: (err) => this.toast.error(this.toast.extractError(err))
    });
  }
}
