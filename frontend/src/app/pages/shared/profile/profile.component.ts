import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatTabsModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <h1>Profile & Settings</h1>
        <p>Manage your personal information and account security</p>
      </div>

      <div class="profile-layout">
        <!-- Avatar card -->
        <div class="avatar-card">
          <div class="profile-avatar">
            {{ auth.user()?.firstName?.[0] }}{{ auth.user()?.lastName?.[0] }}
          </div>
          <div class="avatar-info-group">
            <div class="avatar-name">{{ auth.user()?.firstName }} {{ auth.user()?.lastName }}</div>
            <div class="avatar-role">{{ auth.user()?.role | titlecase }}</div>
            <div class="avatar-id">{{ auth.user()?.universityId }}</div>
            <div class="avatar-dept">{{ auth.user()?.department || 'No department set' }}</div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="profile-tabs-wrap">
          <mat-tab-group animationDuration="200ms" class="profile-tabs">
            <!-- Personal Info Tab -->
            <mat-tab label="Personal Info">
              <div class="tab-content">
                <h3>Personal Information</h3>
                <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
                  <div class="form-row">
                    <mat-form-field appearance="outline">
                      <mat-label>First Name</mat-label>
                      <input matInput formControlName="firstName" />
                      <mat-error>Required</mat-error>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Last Name</mat-label>
                      <input matInput formControlName="lastName" />
                      <mat-error>Required</mat-error>
                    </mat-form-field>
                  </div>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Middle Name (optional)</mat-label>
                    <input matInput formControlName="middleName" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>University ID</mat-label>
                    <input matInput formControlName="universityId" placeholder="e.g. STU-2024-001" />
                    <mat-icon matSuffix>badge</mat-icon>
                    <mat-error>Required</mat-error>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Department</mat-label>
                    <input matInput formControlName="department" placeholder="e.g. College of Engineering" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Email (read-only)</mat-label>
                    <input matInput [value]="auth.user()?.email || ''" readonly />
                    <mat-icon matSuffix>lock</mat-icon>
                  </mat-form-field>
                  <div class="form-actions">
                    <button mat-raised-button class="btn-primary" type="submit" [disabled]="profileForm.invalid || savingProfile()">
                      <mat-spinner *ngIf="savingProfile()" diameter="16" style="display:inline-block;margin-right:8px"></mat-spinner>
                      {{ savingProfile() ? 'Saving...' : 'Save Changes' }}
                    </button>
                  </div>
                </form>
              </div>
            </mat-tab>

            <!-- Security Tab -->
            <mat-tab label="Security">
              <div class="tab-content">
                <h3>Change Password</h3>
                <p class="tab-desc">Use a strong password with at least 8 characters including numbers and symbols.</p>
                <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
                  
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Current Password</mat-label>
                    <input matInput [type]="hideCurrent() ? 'password' : 'text'" formControlName="currentPassword" />
                    <button type="button" mat-icon-button matSuffix (click)="hideCurrent.set(!hideCurrent())" [attr.aria-label]="'Hide password'" [attr.aria-pressed]="hideCurrent()">
                      <mat-icon>{{hideCurrent() ? 'visibility_off' : 'visibility'}}</mat-icon>
                    </button>
                    <mat-error>Required</mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>New Password</mat-label>
                    <input matInput [type]="hideNew() ? 'password' : 'text'" formControlName="newPassword" />
                    <button type="button" mat-icon-button matSuffix (click)="hideNew.set(!hideNew())" [attr.aria-label]="'Hide password'" [attr.aria-pressed]="hideNew()">
                      <mat-icon>{{hideNew() ? 'visibility_off' : 'visibility'}}</mat-icon>
                    </button>
                    <mat-error *ngIf="passwordForm.get('newPassword')?.hasError('minlength')">At least 8 characters</mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Confirm New Password</mat-label>
                    <input matInput [type]="hideConfirm() ? 'password' : 'text'" formControlName="confirmPassword" />
                    <button type="button" mat-icon-button matSuffix (click)="hideConfirm.set(!hideConfirm())" [attr.aria-label]="'Hide password'" [attr.aria-pressed]="hideConfirm()">
                      <mat-icon>{{hideConfirm() ? 'visibility_off' : 'visibility'}}</mat-icon>
                    </button>
                    <mat-error *ngIf="passwordForm.get('confirmPassword')?.hasError('mismatch')">Passwords do not match</mat-error>
                  </mat-form-field>

                  <div class="form-actions">
                    <button mat-raised-button class="btn-primary" type="submit" [disabled]="passwordForm.invalid || savingPassword()">
                      <mat-icon *ngIf="!savingPassword()">lock_open</mat-icon>
                      {{ savingPassword() ? 'Updating...' : 'Update Password' }}
                    </button>
                  </div>
                </form>
              </div>
            </mat-tab>

            <!-- Account Tab -->
            <mat-tab label="Account Info">
              <div class="tab-content">
                <h3>Account Details</h3>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">University Email</span>
                    <span class="info-value">{{ auth.user()?.email }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Current Role</span>
                    <span class="info-value">{{ auth.user()?.role | titlecase }}</span>
                  </div>
                </div>

                <div class="danger-zone">
                  <h4>⚠️ Danger Zone</h4>
                  <p>Sign out of all devices if you suspect unauthorized access.</p>
                  <button mat-raised-button color="warn" (click)="auth.logout()">
                    <mat-icon>logout</mat-icon> Sign Out
                  </button>
                </div>
              </div>
            </mat-tab>
          </mat-tab-group>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-layout { 
      display: grid; 
      grid-template-columns: 280px 1fr; 
      gap: 32px; 
      align-items: start; 
      min-width: 0; 
      max-width: 100%;
    }

    @media (max-width: 1024px) {
      .profile-layout { gap: 24px; }
    }

    @media (max-width: 900px) { 
      .profile-layout { 
        grid-template-columns: 1fr; 
        gap: 20px;
      } 
    }

    .avatar-card {
      background: white; 
      border-radius: 20px; 
      padding: 40px 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.04); 
      text-align: center;
      border: 1px solid #f1f5f9;
      transition: all 0.3s ease;
    }

    @media (max-width: 900px) {
      .avatar-card {
        padding: 24px;
        display: flex;
        flex-direction: row;
        align-items: center;
        text-align: left;
        gap: 20px;
      }
      .profile-avatar { margin: 0 !important; width: 80px !important; height: 80px !important; font-size: 1.8rem !important; }
      .avatar-info-group { flex: 1; }
    }

    @media (max-width: 480px) {
      .avatar-card { flex-direction: column; text-align: center; }
      .profile-avatar { margin: 0 auto 16px !important; }
    }

    .profile-avatar {
      width: 100px; height: 100px; border-radius: 50%;
      background: #8B1A1A; color: white;
      display: flex; align-items: center; justify-content: center;
      font-size: 2.2rem; font-weight: 800; margin: 0 auto 20px;
      box-shadow: 0 8px 16px rgba(139,26,26,0.2);
    }
    .avatar-name { font-size: 1.25rem; font-weight: 800; color: #1a1a2e; }
    .avatar-role { font-size: 0.75rem; color: white; background: #8B1A1A; padding: 4px 14px; border-radius: 20px; display: inline-block; margin: 8px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .avatar-id   { font-size: 0.85rem; font-weight: 600; color: #94a3b8; font-family: 'JetBrains Mono', monospace; display: block; }
    .avatar-dept { font-size: 0.8rem; color: #64748b; margin-top: 6px; font-weight: 500; display: block; }

    .profile-tabs-wrap { 
      background: white; 
      border-radius: 20px; 
      box-shadow: 0 4px 20px rgba(0,0,0,0.04); 
      border: 1px solid #f1f5f9; 
      min-width: 0; 
      max-width: 100%; 
      overflow: hidden; 
    }
    
    ::ng-deep .mat-mdc-tab-group.profile-tabs .mat-mdc-tab-label-container { padding: 0 16px; border-bottom: 1px solid #f1f5f9; }
    ::ng-deep .mat-mdc-tab-group.profile-tabs .mdc-tab-indicator__content--underline { border-top-width: 3px !important; border-color: #8B1A1A !important; }
    ::ng-deep .mat-mdc-tab-group.profile-tabs .mdc-tab__text-label { font-weight: 700 !important; font-size: 0.9rem !important; }

    .tab-content { padding: 32px; }
    @media (max-width: 600px) { 
      .tab-content { padding: 24px 16px; } 
      .tab-content h3 { font-size: 1rem !important; }
    }

    .tab-content h3 { font-size: 1.1rem; font-weight: 800; color: #1a1a2e; margin: 0 0 20px; display: flex; align-items: center; gap: 8px; }
    .tab-desc { font-size: 0.9rem; color: #64748b; margin-bottom: 24px; line-height: 1.6; }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 8px; }
    @media (max-width: 600px) { .form-row { grid-template-columns: 1fr; gap: 0; } }
    
    .full-width { width: 100%; margin-bottom: 8px; }
    
    .form-actions { display: flex; justify-content: flex-end; margin-top: 16px; }
    @media (max-width: 600px) {
      .form-actions { justify-content: stretch; }
      .form-actions button { width: 100%; }
    }
    
    .btn-primary { 
      background: #1a1a2e !important; 
      color: white !important; 
      padding: 0 32px !important; 
      height: 48px !important; 
      border-radius: 12px !important; 
      font-weight: 700 !important; 
      transition: all 0.2s ease !important;
    }
    .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(26,26,46,0.2); }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 40px; }
    @media (max-width: 600px) { .info-grid { grid-template-columns: 1fr; gap: 12px; } }

    .info-item { 
      display: flex; 
      flex-direction: column; 
      gap: 6px; 
      padding: 18px; 
      background: #f8fafc; 
      border-radius: 14px; 
      border: 1px solid #f1f5f9; 
    }
    .info-label { font-size: 0.72rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; }
    .info-value { font-size: 1rem; font-weight: 700; color: #1e293b; word-break: break-all; }

    .danger-zone { border: 1px solid #fee2e2; border-radius: 18px; padding: 24px; background: #fffafb; }
    .danger-zone h4 { margin: 0 0 10px; color: #ef4444; font-size: 1rem; font-weight: 800; display: flex; align-items: center; gap: 8px; }
    .danger-zone p  { font-size: 0.85rem; color: #7f8c8d; margin: 0 0 20px; }
    @media (max-width: 600px) {
      .danger-zone button { width: 100%; }
    }
  `]
})
export class ProfileComponent implements OnInit {
  api  = inject(ApiService);
  toast = inject(ToastService);
  auth = inject(AuthService);
  fb   = inject(FormBuilder);

  savingProfile  = signal(false);
  savingPassword = signal(false);
  
  hideCurrent = signal(true);
  hideNew = signal(true);
  hideConfirm = signal(true);

  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      firstName:    [this.auth.user()?.firstName || '', Validators.required],
      lastName:     [this.auth.user()?.lastName  || '', Validators.required],
      middleName:   [''],
      universityId: [this.auth.user()?.universityId || '', Validators.required],
      department:   [this.auth.user()?.department || '']
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword:     ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    // Load fresh profile
    this.api.getProfile().subscribe({
      next: r => {
        const u = r.data as any;
        this.profileForm.patchValue({
          firstName:    u.first_name || u.firstName || '',
          lastName:     u.last_name  || u.lastName  || '',
          middleName:   u.middle_name || u.middleName || '',
          universityId: u.university_id || u.universityId || '',
          department:   u.department || ''
        });
      }
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    this.savingProfile.set(true);
    this.api.updateProfile(this.profileForm.value).subscribe({
      next: () => {
        this.toast.success('Profile updated successfully!');
        this.savingProfile.set(false);
      },
      error: e => {
        this.toast.error(e?.error?.message || 'Update failed.');
        this.savingProfile.set(false);
      }
    });
  }

  changePassword(): void {
    const { newPassword, confirmPassword } = this.passwordForm.value;
    if (newPassword !== confirmPassword) {
      this.passwordForm.get('confirmPassword')?.setErrors({ mismatch: true });
      return;
    }
    this.savingPassword.set(true);
    this.api.changePassword(this.passwordForm.value.currentPassword, newPassword).subscribe({
      next: () => {
        this.toast.success('Password changed successfully!');
        this.passwordForm.reset();
        this.savingPassword.set(false);
      },
      error: e => {
        this.toast.error(e?.error?.message || 'Failed to change password.');
        this.savingPassword.set(false);
      }
    });
  }

  passwordMatchValidator(g: FormGroup) {
    const p = g.get('newPassword')?.value;
    const c = g.get('confirmPassword')?.value;
    if (p !== c) {
      g.get('confirmPassword')?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    return null;
  }
}
