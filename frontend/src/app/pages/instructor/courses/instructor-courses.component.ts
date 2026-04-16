import { Component, OnInit, signal, inject } from '@angular/core';
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
  selector: 'app-instructor-courses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      <div class="page-header animate-fade-in-up">
        <div class="page-header__title">
          <h1>My Courses</h1>
          <p>Manage and create course subjects for your classes</p>
        </div>
        <button mat-raised-button class="btn-primary" (click)="openCreate()">
          <mat-icon>add</mat-icon> New Course
        </button>
      </div>

      <div *ngIf="loading()" class="loading-spinner"><mat-spinner diameter="36"></mat-spinner></div>

      <div class="content-grid animate-fade-in-up" *ngIf="!loading()">
        <div class="course-card" *ngFor="let c of courses()">
          <div class="course-card__header">
            <div class="course-card__icon">📘</div>
            <div class="course-card__info">
              <div class="course-card__top-line">
                <div class="course-card__code">{{ c.courseCode || c.course_code }}</div>
                <div class="course-card__units">{{ c.units }} Units</div>
              </div>
              <div class="course-card__name">{{ c.courseName || c.course_name }}</div>
            </div>
            <div class="course-card__btns">
              <button mat-icon-button class="btn-edit" (click)="editCourse(c)" title="Edit Course">
                <mat-icon>edit</mat-icon>
              </button>
            </div>
          </div>

          <div class="course-card__meta">
            <div class="course-meta-item" *ngIf="c.department">
              <span class="material-icons">business</span>
              <span>{{ c.department }}</span>
            </div>
            <div class="course-meta-item">
              <span class="material-icons">description</span>
              <span class="course-desc">{{ c.description || 'No description provided.' }}</span>
            </div>
          </div>

        </div>
      </div>

      <div class="empty-state animate-fade-in" *ngIf="!loading() && !courses().length">
        <span class="material-icons">menu_book</span>
        <h3>No Courses Yet</h3>
        <p>Click "New Course" to add your first subject mapping.</p>
        <button mat-raised-button class="btn-primary" (click)="openCreate()" style="margin-top:16px">
          <mat-icon>add</mat-icon> Create Course
        </button>
      </div>

      <!-- ══════════ CREATE / EDIT COURSE MODAL ══════════ -->
      <div class="modal-overlay" *ngIf="showModal()" (click)="closeModal()">
        <div class="standard-modal animate-fade-in-up" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3>{{ editingCourse() ? 'Edit Course' : 'Create New Course' }}</h3>
              <p>{{ editingCourse() ? 'Update course specifications' : 'Set up a new subject in the system' }}</p>
            </div>
            <button mat-icon-button (click)="closeModal()"><mat-icon>close</mat-icon></button>
          </div>

          <form [formGroup]="courseForm" class="modal-body">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Course Code</mat-label>
                <input matInput formControlName="courseCode" placeholder="e.g. CS101" autocomplete="off" />
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

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Course Name</mat-label>
              <input matInput formControlName="courseName" placeholder="e.g. Data Structures" autocomplete="off" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Department (optional)</mat-label>
              <input matInput formControlName="department" placeholder="e.g. Engineering" autocomplete="off" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description (optional)</mat-label>
              <textarea matInput formControlName="description" rows="3" placeholder="Brief subject summary..."></textarea>
            </mat-form-field>
          </form>

          <div class="modal-footer" style="justify-content: space-between;">
            <button mat-raised-button 
              *ngIf="editingCourse()" 
              (click)="confirmDelete(editingCourse()!)" 
              [disabled]="saving()"
              style="background-color: #ef4444 !important; color: white !important; font-weight: bold !important;">
              <mat-icon>delete</mat-icon> Delete Course
            </button>
            <div class="footer-right" style="display: flex; gap: 12px; align-items: center;">
              <button mat-button (click)="closeModal()">Cancel</button>
              <button mat-raised-button class="btn-primary" (click)="saveCourse()" [disabled]="courseForm.invalid || saving()">
                <mat-spinner *ngIf="saving()" diameter="16" style="display:inline-block;margin-right:8px"></mat-spinner>
                {{ saving() ? 'Saving...' : (editingCourse() ? 'Update Course' : 'Create Course') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════ DELETE CONFIRM MODAL ══════════ -->
    <div class="modal-overlay" *ngIf="showDeleteConfirm()" (click)="cancelDelete()">
      <div class="confirm-modal animate-fade-in-up" (click)="$event.stopPropagation()">
        <div class="confirm-modal__icon">⚠️</div>
        <h3>Confirm Deletion</h3>
        <p>Are you sure you want to delete <strong>{{ courseToDelete()?.courseName || courseToDelete()?.course_code }}</strong>? This action cannot be undone if there are no sections attached.</p>
        
        <div class="confirm-modal__footer">
          <button mat-button (click)="cancelDelete()">Cancel</button>
          <button mat-raised-button color="warn" (click)="executeDeleteCourse()" [disabled]="saving()">
            <mat-spinner *ngIf="saving()" diameter="16" style="display:inline-block;margin-right:8px"></mat-spinner>
            Delete Course
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 32px 28px; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; }
    .page-header__title h1 { font-size:1.75rem; font-weight:800; color:var(--color-primary); margin:0; }
    .page-header__title p { color:var(--color-text-muted); font-size:0.875rem; margin:4px 0 0; }
    .btn-primary { background:var(--color-primary) !important; color:white !important; border-radius:10px !important; font-weight:600 !important; }

    .content-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:20px; }

    .course-card {
      background:white; border-radius:var(--radius-lg); padding:22px;
      box-shadow:var(--shadow-md); border:1px solid var(--color-border);
      transition:transform 0.2s, box-shadow 0.2s;
      &:hover { transform:translateY(-2px); box-shadow:var(--shadow-lg); }
    }
    .course-card__header { display:flex; align-items:flex-start; gap:14px; margin-bottom:16px; }
    .course-card__icon { font-size:28px; width:48px; height:48px; background:rgba(139,26,26,0.08); border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .course-card__info { flex:1; }
    .course-card__top-line { display:flex; justify-content:space-between; align-items:center; width:100%; }
    .course-card__code { font-size:0.72rem; font-weight:700; color:var(--color-primary); text-transform:uppercase; letter-spacing:0.08em; }
    .course-card__units { font-size:0.7rem; font-weight:700; color:var(--color-primary); background:rgba(139,26,26,0.1); padding:2px 8px; border-radius:12px; }
    .course-card__name { font-size:1rem; font-weight:700; color:var(--color-text); margin-top:3px; }
    .course-card__btns { display:flex; gap:4px; }
    
    .btn-edit { color:var(--color-primary) !important; }
    .btn-delete { color:#ef4444 !important; }
    .btn-delete-modal { color:#ef4444 !important; font-weight:600 !important; margin-right: auto; }
    
    .course-card__meta { display:flex; flex-direction:column; gap:8px; }
    .course-meta-item { display:flex; align-items:flex-start; gap:8px; font-size:0.8rem; color:var(--color-text-muted); }
    .course-meta-item .material-icons { font-size:16px; color:var(--color-primary); margin-top:2px; }
    .course-desc { line-height:1.4; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }

    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000; padding:16px; }
    .standard-modal {
      background:white; border-radius:20px; width:100%; max-width:500px;
      max-height:92vh; display:flex; flex-direction:column;
      box-shadow:0 20px 60px rgba(0,0,0,0.2); overflow:hidden;
    }
    .modal-header { display:flex; justify-content:space-between; align-items:flex-start; padding:20px 24px; border-bottom:1px solid var(--color-border); h3 { color:var(--color-primary); margin:0 0 4px; font-size:1.1rem; } p { margin:0; font-size:0.8rem; color:var(--color-text-muted); } }
    .modal-body { padding:24px; overflow-y:auto; display:flex; flex-direction:column; gap:8px; }
    .modal-footer { display:flex; justify-content:flex-end; gap:12px; padding:16px 24px; border-top:1px solid var(--color-border); flex-shrink:0; }
    .form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .full-width { width:100%; }

    .empty-state { text-align:center; padding:60px 20px; }
    .empty-state .material-icons { font-size:56px; color:var(--color-border); }
    .empty-state h3 { color:var(--color-text); margin:12px 0 4px; }
    .empty-state p { color:var(--color-text-muted); font-size:0.875rem; }
    .confirm-modal {
      background:white; border-radius:20px; width:100%; max-width:400px;
      padding:32px 24px; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.2);
      h3 { margin:16px 0 8px; color:var(--color-primary); font-size:1.2rem; font-weight:800; }
      p { color:var(--color-text-muted); font-size:0.9rem; line-height:1.5; margin-bottom:24px; }
    }
    .confirm-modal__icon { font-size:48px; }
    .confirm-modal__footer { display:flex; justify-content:center; gap:12px; }

    .loading-spinner { display:flex; justify-content:center; padding:60px; }
  `]
})
export class InstructorCoursesComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  courses = signal<Course[]>([]);
  loading = signal(true);
  showModal = signal(false);
  editingCourse = signal<Course | null>(null);
  saving = signal(false);
  courseForm!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    this.load();
    this.api.refresh$.subscribe(() => this.load());
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
    this.api.getCourses().subscribe({
      next: r => { this.courses.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openCreate(): void {
    this.editingCourse.set(null);
    this.courseForm.reset({ units: 3 });
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  editCourse(c: Course): void {
    this.editingCourse.set(c);
    this.courseForm.patchValue({
      courseCode: c.courseCode || (c as any).course_code,
      courseName: c.courseName || (c as any).course_name,
      units: c.units || 3,
      department: c.department || '',
      description: c.description || ''
    });
    this.showModal.set(true);
  }

  saveCourse(): void {
    if (this.courseForm.invalid) { this.courseForm.markAllAsTouched(); return; }
    this.saving.set(true);
    const v = this.courseForm.value;
    const c = this.editingCourse();
    const obs = c ? this.api.updateCourse(c.id, v) : this.api.createCourse(v);

    obs.subscribe({
      next: () => {
        this.toast.success(c ? 'Course updated!' : 'Course created!');
        this.api.triggerRefresh('courses');
        this.saving.set(false);
        this.closeModal();
        this.load();
      },
      error: e => {
        this.toast.error(e?.error?.message || 'Failed to save course.');
        this.saving.set(false);
      }
    });
  }

  showDeleteConfirm = signal(false);
  courseToDelete = signal<Course | null>(null);

  confirmDelete(c: Course): void {
    this.courseToDelete.set(c);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.courseToDelete.set(null);
  }

  executeDeleteCourse(): void {
    const c = this.courseToDelete();
    if (!c) return;

    this.saving.set(true);
    this.api.deleteCourse(c.id).subscribe({
      next: () => {
        this.toast.success('Course deleted!');
        this.api.triggerRefresh('courses');
        this.cancelDelete();
        this.closeModal();
        this.load();
        this.saving.set(false);
      },
      error: e => {
        this.toast.error(e?.error?.message || 'Failed to delete course. It may be in use.');
        this.saving.set(false);
      }
    });
  }
}
