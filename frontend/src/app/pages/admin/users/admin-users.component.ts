import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { User } from '../../../core/models';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule],
  template: `
    <div class="admin-page animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1>User Management</h1>
          <p>Manage all users — instructors, students, and admins</p>
        </div>
        <button mat-raised-button class="btn-admin" (click)="openAddUser()">
          <mat-icon>person_add</mat-icon> Add User
        </button>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search users...</mat-label>
          <input matInput [formControl]="searchCtrl" placeholder="Name, email, ID...">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        <div class="role-filters">
          <div class="filter-pill" [class.active]="roleFilter() === ''" (click)="roleFilter.set('')">All Roles</div>
          <div class="filter-pill" [class.active]="roleFilter() === 'student'" (click)="roleFilter.set('student')">Students</div>
          <div class="filter-pill" [class.active]="roleFilter() === 'instructor'" (click)="roleFilter.set('instructor')">Instructors</div>
          <div class="filter-pill" [class.active]="roleFilter() === 'admin'" (click)="roleFilter.set('admin')">Admins</div>
          
          <div class="filter-divider"></div>
          
          <div class="filter-pill" [class.active]="statusFilter() === ''" (click)="statusFilter.set('')">Any Status</div>
          <div class="filter-pill" [class.active]="statusFilter() === 'active'" (click)="statusFilter.set('active')">Active</div>
          <div class="filter-pill" [class.active]="statusFilter() === 'inactive'" (click)="statusFilter.set('inactive')">Inactive</div>
        </div>
      </div>

      <div *ngIf="loading()" class="loading-spinner"><mat-spinner diameter="36"></mat-spinner></div>

      <!-- Users Table -->
      <div class="table-card" *ngIf="!loading()">
        <div class="table-container">
          <table class="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>University ID</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of filteredUsers()" [id]="'user-' + (u.universityId || u.university_id)">
                <td>
                  <div class="user-cell">
                    <div class="user-av" [class.inactive]="!u.is_active && !u.isActive">
                      {{ (u.firstName || u.first_name || '?')[0] }}{{ (u.lastName || u.last_name || '')[0] || '' }}
                    </div>
                    <div>
                      <div class="user-name">{{ u.lastName || u.last_name }}, {{ u.firstName || u.first_name }}</div>
                      <div class="user-email">{{ u.email }}</div>
                    </div>
                  </div>
                </td>
                <td><code class="uid">{{ u.universityId || u.university_id }}</code></td>
                <td><span class="role-badge" [class]="'role--' + u.role">{{ u.role }}</span></td>
                <td class="dept-cell">{{ u.department || '—' }}</td>
                <td>
                  <span class="status-badge" [class.status--active]="u.is_active || u.isActive"
                    [class.status--inactive]="!u.is_active && !u.isActive">
                    {{ (u.is_active || u.isActive) ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td>
                  <div class="row-actions">
                    <button mat-icon-button title="Edit user" (click)="openEdit(u)">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button [title]="(u.is_active || u.isActive) ? 'Deactivate' : 'Reactivate'"
                      [style.color]="(u.is_active || u.isActive) ? '#ef4444' : '#10b981'"
                      (click)="toggleActive(u)">
                      <mat-icon>{{ (u.is_active || u.isActive) ? 'block' : 'check_circle' }}</mat-icon>
                    </button>
                    <button mat-icon-button title="Delete permanently" color="warn" (click)="deleteUser(u)">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="empty-state" *ngIf="!filteredUsers().length">
          <span class="material-icons">people_outline</span>
          <h3>No users found</h3>
          <p>Try adjusting your search or filter.</p>
        </div>
      </div>
    </div>

    <!-- MODAL -->
    <div class="modal-overlay" *ngIf="showModal()" (click)="closeModal()">
      <div class="user-modal animate-fade-in-up" (click)="$event.stopPropagation()">
        <div class="modal-header">
            <div>
              <h3>{{ editingUser() ? 'Edit User' : 'Add New User' }}</h3>
              <p>{{ editingUser() ? 'Update user details' : 'Create a new user account' }}</p>
            </div>
            <button mat-icon-button (click)="closeModal()"><mat-icon>close</mat-icon></button>
          </div>

          <form [formGroup]="userForm" class="modal-body">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>First Name</mat-label>
                <input matInput formControlName="firstName" autocomplete="off" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Last Name</mat-label>
                <input matInput formControlName="lastName" autocomplete="off" />
              </mat-form-field>
            </div>
            <mat-form-field appearance="outline" class="full-w">
              <mat-label>University ID</mat-label>
              <input matInput formControlName="universityId" autocomplete="off" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-w">
              <mat-label>Email Address</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="off" placeholder="example@liceo.edu.ph" />
              <mat-error *ngIf="userForm.get('email')?.hasError('required')">Email is required</mat-error>
              <mat-error *ngIf="userForm.get('email')?.hasError('email')">Invalid email format</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-w">
              <mat-label>{{ editingUser() ? 'New Password (Optional)' : 'Password' }}</mat-label>
              <input matInput [type]="showPwd() ? 'text' : 'password'" formControlName="password" autocomplete="new-password" />
              <button mat-icon-button matSuffix type="button" (click)="showPwd.set(!showPwd())">
                <mat-icon>{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Role</mat-label>
                <mat-select formControlName="role">
                  <mat-option value="student">Student</mat-option>
                  <mat-option value="instructor">Instructor</mat-option>
                  <mat-option value="admin">Admin</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Department</mat-label>
                <input matInput formControlName="department" autocomplete="off" />
              </mat-form-field>
            </div>
          </form>

          <div class="modal-footer">
            <button mat-button (click)="closeModal()">Cancel</button>
            <button mat-raised-button class="btn-primary-admin" (click)="saveUser()" [disabled]="saving()">
              {{ saving() ? 'Saving...' : (editingUser() ? 'Update User' : 'Create User') }}
            </button>
          </div>
      </div>
    </div>
  `,
  styles: [`
    /* Using same styles as before */
    .admin-page { padding: 8px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .btn-admin { background: #8B1A1A !important; color: white !important; }
    .filter-bar { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; margin-bottom: 20px; }
    .search-field { min-width: 260px; flex: 1; max-width: 380px; }
    .role-filters { display: flex; gap: 8px; flex-wrap: wrap; }
    .filter-pill { padding: 6px 16px; border-radius: 20px; border: 1.5px solid #e2e8f0; background: white; cursor: pointer; font-size: 0.82rem; font-weight: 600; color: #64748b; transition: all 0.15s; }
    .filter-pill.active { background: #8B1A1A; color: white; border-color: #8B1A1A; }
    .filter-divider { width: 1px; background: #cbd5e1; height: 20px; }
    .table-container { overflow-x: auto; background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .users-table { width: 100%; border-collapse: collapse; }
    .users-table th { background: #f8fafc; padding: 12px 16px; text-align: left; font-size: 0.75rem; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    .users-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }
    .user-cell { display: flex; align-items: center; gap: 12px; }
    .user-av { width: 36px; height: 36px; border-radius: 50%; background: #8B1A1A; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; }
    .user-name { font-weight: 700; font-size: 0.9rem; color: #1e293b; }
    .user-email { font-size: 0.75rem; color: #94a3b8; }
    .role-badge { padding: 4px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
    .role--student { background: #dbeafe; color: #1e40af; }
    .role--instructor { background: #dcfce7; color: #166534; }
    .role--admin { background: #fee2e2; color: #991b1b; }
    .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; }
    .status--active { background: #dcfce7; color: #166534; }
    .status--inactive { background: #fee2e2; color: #991b1b; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .user-modal { background: white; border-radius: 20px; width: 100%; max-width: 500px; padding: 24px; }
    .modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .full-w { width: 100%; }
    .btn-primary-admin { background: #8B1A1A !important; color: white !important; }
  `]
})
export class AdminUsersComponent implements OnInit {
  api = inject(ApiService);
  toast = inject(ToastService);
  fb = inject(FormBuilder);
  route = inject(ActivatedRoute);

  allUsers = signal<User[]>([]);
  loading = signal(true);
  showModal = signal(false);
  editingUser = signal<User | null>(null);
  saving = signal(false);
  showPwd = signal(false);
  roleFilter = signal('');
  statusFilter = signal('');
  searchCtrl = new FormControl('');
  searchVal = toSignal(this.searchCtrl.valueChanges, { initialValue: '' });
  userForm!: FormGroup;

  filteredUsers = computed(() => {
    const q = (this.searchVal() || '').toLowerCase();
    const role = this.roleFilter();
    const status = this.statusFilter();

    return this.allUsers().filter(u => {
      const name = `${u.firstName || (u as any).first_name} ${u.lastName || (u as any).last_name} ${u.email} ${u.universityId || (u as any).university_id}`.toLowerCase();
      const isActive = u.isActive ?? (u as any).is_active ?? 1;
      const statusMatch = !status || (status === 'active' && !!isActive) || (status === 'inactive' && !isActive);
      return name.includes(q) && (!role || u.role === role) && statusMatch;
    });
  });

  ngOnInit(): void {
    this.initForm();
    this.load();
  }

  private initForm(): void {
    this.userForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      universityId: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(8)]],
      role: ['student', Validators.required],
      department: ['']
    });
  }

  load(silent = false): void {
    if (!silent) this.loading.set(true);
    this.api.getUsers().subscribe({
      next: r => { this.allUsers.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openAddUser(): void {
    this.editingUser.set(null);
    this.userForm.reset({ role: 'student' });
    this.showModal.set(true);
  }

  openEdit(u: User): void {
    this.editingUser.set(u);
    this.userForm.patchValue({
      firstName: u.firstName || (u as any).first_name,
      lastName: u.lastName || (u as any).last_name,
      universityId: u.universityId || (u as any).university_id,
      email: u.email,
      role: u.role,
      department: u.department || ''
    });
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  saveUser(): void {
    if (this.userForm.invalid) { this.userForm.markAllAsTouched(); return; }
    this.saving.set(true);
    const v = this.userForm.value;
    const editing = this.editingUser();
    const obs = editing ? this.api.updateUser(editing.id, v) : this.api.createUser(v);
    obs.subscribe({
      next: (r) => {
        this.toast.success('User saved!');
        
        // Optimistic refresh
        this.load(true);
        
        this.saving.set(false);
        this.closeModal();
      },
      error: e => {
        this.toast.error(e?.error?.message || 'Error saving user.');
        this.saving.set(false);
      }
    });
  }

  toggleActive(u: User): void {
    this.api.toggleUserActive(u.id).subscribe({
      next: () => {
        // Optimistic toggle
        this.allUsers.update(list => 
          list.map(x => x.id === u.id ? { ...x, is_active: !(x.is_active ?? (x as any).isActive) } : x)
        );
      },
      error: e => this.toast.error('Error toggling status.')
    });
  }

  deleteUser(u: User): void {
    if (!confirm(`Are you sure you want to PERMANENTLY delete user ${(u.firstName || (u as any).first_name)} ${(u.lastName || (u as any).last_name)}?\nThis is irreversible!`)) return;
    this.api.deleteUser(u.id).subscribe({
      next: () => {
        this.toast.success('User permanently deleted.');
        // Optimistic delete
        this.allUsers.update(list => list.filter(x => x.id !== u.id));
      },
      error: e => this.toast.error(e?.error?.message || 'Error deleting user.')
    });
  }
}
