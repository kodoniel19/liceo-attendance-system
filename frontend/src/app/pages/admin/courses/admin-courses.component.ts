import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { Course } from '../../../core/models';

@Component({
  selector: 'app-admin-courses',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    MatButtonModule, 
    MatIconModule,
    MatFormFieldModule, 
    MatInputModule, 
    MatSelectModule, 
    MatProgressSpinnerModule
  ],
  template: `
    <div class="admin-page animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1>Course Management</h1>
          <p>System-wide subject and course mapping control</p>
        </div>
        <div class="header-actions">
           <!-- View Toggle Pill -->
           <div class="pill-toggle">
             <button class="pill-btn" [class.active]="viewFilter() === 'active'" (click)="viewFilter.set('active')">
                Active Subjects
             </button>
             <button class="pill-btn" [class.active]="viewFilter() === 'archived'" (click)="viewFilter.set('archived')">
                Recycle Bin
             </button>
           </div>
           
           <button mat-raised-button class="btn-admin" (click)="openCreate()">
             <mat-icon>add</mat-icon> Create New
           </button>
        </div>
      </div>

      <div *ngIf="loading()" class="loading-spinner"><mat-spinner diameter="36"></mat-spinner></div>

      <div class="courses-grid" *ngIf="!loading()">
        <div class="course-card" *ngFor="let c of filteredCourses()" 
             [class.archived-card]="!(c.isActive ?? c.is_active)">
          
          <div class="course-card__top">
            <div class="course-code">{{ c.courseCode || c.course_code }}</div>
            <span class="units-badge" [class.archived-badge]="!(c.isActive ?? c.is_active)">
              {{ c.units }} Units
            </span>
          </div>

          <div class="course-name">{{ c.courseName || c.course_name }}</div>
          
          <div class="course-dept" *ngIf="c.department">
            <mat-icon style="font-size:16px; width:16px; height:16px; margin-right:4px">business</mat-icon>
            {{ c.department }}
          </div>

          <div class="course-desc">{{ c.description || 'No description provided.' }}</div>
          
          <div class="course-actions">
            <!-- Active State -->
            <ng-container *ngIf="c.isActive ?? c.is_active">
              <button mat-stroked-button class="action-btn" (click)="editCourse(c)">
                <mat-icon>edit</mat-icon> Edit
              </button>
              <button class="archive-btn" (click)="deleteCourse(c)" title="Archive">
                <mat-icon>archive</mat-icon>
              </button>
            </ng-container>

            <!-- Archived State -->
            <ng-container *ngIf="!(c.isActive ?? c.is_active)">
              <button mat-raised-button color="primary" class="btn-restore" (click)="restoreCourse(c)">
                <mat-icon>restore_from_trash</mat-icon> Restore to Active
              </button>
            </ng-container>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="!filteredCourses().length">
          <mat-icon class="empty-icon">inventory_2</mat-icon>
          <h3>Nothing to display</h3>
          <p>{{ viewFilter() === 'active' ? 'You have no active courses currently.' : 'Your recycle bin is clean.' }}</p>
        </div>
      </div>
    </div>

    <!-- CREATE / EDIT MODAL -->
    <div class="modal-overlay" *ngIf="showModal()" (click)="closeModal()">
      <div class="course-modal animate-fade-in-up" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h3>{{ editingCourse() ? 'Update Course' : 'Create Subject' }}</h3>
            <p>{{ editingCourse() ? 'Modify existing course details' : 'Add a new academic subject' }}</p>
          </div>
          <button mat-icon-button (click)="closeModal()"><mat-icon>close</mat-icon></button>
        </div>

        <form [formGroup]="courseForm" class="modal-body">
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Course Code</mat-label>
              <input matInput formControlName="courseCode" placeholder="CS101" autocomplete="off" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Units</mat-label>
              <mat-select formControlName="units">
                <mat-option [value]="1">1 unit</mat-option>
                <mat-option [value]="2">2 units</mat-option>
                <mat-option [value]="3">3 units</mat-option>
                <mat-option [value]="4">4 units</mat-option>
                <mat-option [value]="5">5 units</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-w">
            <mat-label>Course Name</mat-label>
            <input matInput formControlName="courseName" placeholder="Introduction to Computer Science" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-w">
            <mat-label>Department</mat-label>
            <input matInput formControlName="department" placeholder="College of Information Technology" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-w">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="3"></textarea>
          </mat-form-field>
        </form>

        <div class="modal-footer">
          <button mat-button class="btn-delete-modal" *ngIf="editingCourse()" (click)="handlePermanentDelete()">
            <mat-icon>delete_forever</mat-icon> Delete Subject
          </button>
          <button mat-button (click)="closeModal()">Cancel</button>
          <button mat-raised-button class="btn-primary-admin" (click)="saveCourse()" [disabled]="courseForm.invalid || saving()">
            {{ saving() ? 'Saving...' : (editingCourse() ? 'Update Course' : 'Create Course') }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { padding: 8px; }
    .admin-page h1 { font-size: 1.6rem; font-weight: 800; color: #1a1a2e; margin: 0; }
    .admin-page p  { color: #64748b; font-size: 0.9rem; margin: 2px 0 0; }
    
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; flex-wrap: wrap; gap: 20px; }
    .header-actions { display: flex; align-items: center; gap: 20px; }

    /* Pill Toggle */
    .pill-toggle { 
      display: flex; background: #e2e8f0; padding: 4px; border-radius: 14px;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
    }
    .pill-btn {
      border: none; background: transparent; padding: 8px 18px; border-radius: 11px;
      font-size: 0.85rem; font-weight: 700; color: #64748b; cursor: pointer;
      transition: all 0.2s;
    }
    .pill-btn.active {
      background: white; color: #8B1A1A; box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }

    .btn-admin { background: #8B1A1A !important; color: white !important; border-radius: 12px !important; padding: 0 24px !important; height: 46px !important; font-weight: 700 !important; }
    .btn-primary-admin { background: #8B1A1A !important; color: white !important; }
    
    .courses-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
    @media (max-width: 480px) { .courses-grid { grid-template-columns: 1fr; } }
    
    .course-card {
      background: white; border-radius: 20px; padding: 24px; position: relative;
      box-shadow: 0 4px 20px rgba(0,0,0,0.04); border: 1px solid #f1f5f9;
      display: flex; flex-direction: column; gap: 10px; transition: transform 0.2s;
    }
    .course-card:hover { transform: translateY(-4px); box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
    .archived-card { opacity: 0.75; background: #f8fafc; border-style: dashed; }
    
    .course-card__top { display: flex; justify-content: space-between; align-items: center; }
    .course-code { font-size: 0.75rem; font-weight: 800; color: #8B1A1A; letter-spacing: 0.05em; text-transform: uppercase; }
    .units-badge { font-size: 0.7rem; font-weight: 800; background: #fee2e2; color: #991b1b; padding: 3px 12px; border-radius: 20px; }
    .archived-badge { background: #e2e8f0; color: #475569; }

    .course-name { font-size: 1.1rem; font-weight: 800; color: #1e293b; margin-top: 4px; }
    .course-dept { display: flex; align-items: center; font-size: 0.8rem; color: #64748b; font-weight: 600; }
    .course-desc { font-size: 0.85rem; color: #64748b; line-height: 1.6; flex: 1; margin-top: 4px; }
    
    .course-actions { 
      display: flex; justify-content: flex-end; align-items: center; gap: 12px; 
      margin-top: 16px; padding-top: 16px; border-top: 1px solid #f1f5f9; 
    }
    .action-btn { 
      height: 40px !important; border-radius: 10px !important; 
      display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 700 !important;
      background: rgba(139, 26, 26, 0.08) !important;
      color: #8B1A1A !important;
      border: none !important;
      transition: all 0.2s ease !important;
    }
    .action-btn:hover {
      background: #8B1A1A !important;
      color: white !important;
    }
    
    .archive-btn {
      width: 40px; height: 40px; background: #ef4444; color: white; border: none; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;
    }
    .archive-btn:hover { background: #dc2626; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2); }
    .archive-btn mat-icon { font-size: 20px; width: 20px; height: 20px; margin: 0 !important; }
    
    .btn-restore { width: 100%; font-weight: 700 !important; border-radius: 10px !important; }
    
    .btn-delete-modal { color: #ef4444 !important; font-weight: 700 !important; margin-right: auto; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .course-modal { background: white; border-radius: 24px; width: 100%; max-width: 520px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
    .modal-header { padding: 24px 32px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: flex-start; }
    .modal-header h3 { margin: 0; font-size: 1.25rem; font-weight: 800; color: #8B1A1A; }
    .modal-body { padding: 32px; display: flex; flex-direction: column; gap: 16px; }
    .modal-footer { padding: 20px 32px; background: #f8fafc; display: flex; justify-content: flex-end; gap: 12px; }
    
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .full-w { width: 100%; }

    .empty-state { grid-column: 1 / -1; text-align: center; padding: 80px 20px; color: #94a3b8; }
    .empty-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 16px; opacity: 0.5; }
    .empty-state h3 { color: #475569; margin-bottom: 8px; }

    .loading-spinner { display: flex; justify-content: center; padding: 100px; }
  `]
})
export class AdminCoursesComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  courses = signal<Course[]>([]);
  loading = signal(true);
  showModal = signal(false);
  editingCourse = signal<Course | null>(null);
  saving = signal(false);
  viewFilter = signal<'active' | 'archived'>('active');
  
  courseForm!: FormGroup;

  filteredCourses = computed(() => {
    const showActive = this.viewFilter() === 'active';
    return this.courses().filter(c => {
      const activeStatus = c.isActive ?? c.is_active ?? true;
      return showActive ? activeStatus : !activeStatus;
    });
  });

  ngOnInit(): void {
    this.initForm();
    // Listen to global refreshes (cross-tab and cross-component)
    this.api.refresh$.subscribe(() => {
      this.load();
    });
  }

  private initForm(): void {
    this.courseForm = this.fb.group({
      courseCode: ['', Validators.required],
      courseName: ['', Validators.required],
      units: [3, Validators.required],
      department: [''],
      description: ['']
    });
  }

  load(): void {
    this.loading.set(true);
    this.api.getCourses({ all: 'true' }).subscribe({
      next: r => { 
        this.courses.set(r.data || []); 
        this.loading.set(false); 
      },
      error: () => {
        this.toast.error('Failed to load courses.');
        this.loading.set(false);
      }
    });
  }

  openCreate(): void {
    this.editingCourse.set(null);
    this.courseForm.reset({ units: 3 });
    this.showModal.set(true);
  }

  editCourse(c: Course): void {
    this.editingCourse.set(c);
    this.courseForm.patchValue({
      courseCode: c.courseCode || c.course_code,
      courseName: c.courseName || c.course_name,
      units: c.units,
      department: c.department || '',
      description: c.description || ''
    });
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  saveCourse(): void {
    if (this.courseForm.invalid) { 
      this.courseForm.markAllAsTouched(); 
      return; 
    }
    
    this.saving.set(true);
    const val = this.courseForm.value;
    const existing = this.editingCourse();
    
    const obs = existing 
      ? this.api.updateCourse(existing.id, val) 
      : this.api.createCourse(val);

    obs.subscribe({
      next: () => {
        this.toast.success(existing ? 'Subject updated' : 'New subject created');
        this.api.triggerRefresh('courses');
        this.saving.set(false);
        this.closeModal();
        this.load();
      },
      error: e => {
        this.toast.error(e?.error?.message || 'Error occurred while saving.');
        this.saving.set(false);
      }
    });
  }

  deleteCourse(c: Course): void {
    if (!confirm(`Archive "${c.courseName || c.course_name}"? It can be restored later.`)) return;
    
    this.api.deleteCourse(c.id).subscribe({
      next: () => { 
        this.toast.success('Moved to Recycle Bin'); 
        this.api.triggerRefresh('courses');
        this.load(); 
      },
      error: e => this.toast.error(e?.error?.message || 'Delete operation failed.')
    });
  }

  handlePermanentDelete(): void {
    const c = this.editingCourse();
    if (!c) return;
    if (!confirm(`PERMANENTLY DELETE "${c.courseName || c.course_name}"?\n\nThis action is irreversible.`)) return;
    
    this.api.hardDeleteCourse(c.id).subscribe({
      next: () => {
        this.toast.success('Subject permanently deleted');
        this.api.triggerRefresh('courses');
        this.closeModal();
        this.load();
      },
      error: e => this.toast.error(e?.error?.message || 'Permanent deletion failed.')
    });
  }

  restoreCourse(c: Course): void {
    this.api.restoreCourse(c.id).subscribe({
      next: () => { 
        this.toast.success('Course restored successfully!'); 
        this.api.triggerRefresh('courses');
        this.load(); 
      },
      error: e => this.toast.error(e?.error?.message || 'Restoration failed.')
    });
  }
}
