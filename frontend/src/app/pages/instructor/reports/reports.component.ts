import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { ClassSection } from '../../../core/models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatProgressSpinnerModule, MatProgressBarModule],
  template: `
    <div class="page-container">
      <div class="page-header animate-fade-in-up">
        <div class="page-header__title">
          <h1>Attendance Reports</h1>
          <p>View and export attendance data across your classes</p>
        </div>
        <div class="page-header__actions">
          <button mat-raised-button (click)="exportExcel()">
            <mat-icon>table_chart</mat-icon> Export Excel
          </button>
          <button mat-raised-button color="primary" (click)="exportPDF()">
            <mat-icon>picture_as_pdf</mat-icon> Export PDF
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filter-panel animate-fade-in-up">
        <form [formGroup]="filterForm" class="filter-form">
          <mat-form-field>
            <mat-label>Class Section</mat-label>
            <mat-select formControlName="sectionId">
              <mat-option [value]="null">All Sections</mat-option>
              <mat-option *ngFor="let s of sections()" [value]="s.id">
                {{ s.courseCode }} — {{ s.sectionName }}
              </mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Start Date</mat-label>
            <input matInput type="date" formControlName="startDate">
          </mat-form-field>
          <mat-form-field>
            <mat-label>End Date</mat-label>
            <input matInput type="date" formControlName="endDate">
          </mat-form-field>
          <button mat-raised-button color="primary" type="button" (click)="loadReport()">
            <mat-icon>search</mat-icon> Load Report
          </button>
        </form>
      </div>

      <!-- Student Stats Table -->
      <div class="mt-3" *ngIf="sectionStats().length">
        <h3 style="color:var(--color-primary);margin-bottom:16px">Student Attendance Rates</h3>
        <div class="data-table-container animate-fade-in-up">
          <table mat-table [dataSource]="sectionStats()">
            <ng-container matColumnDef="student">
              <th mat-header-cell *matHeaderCellDef>Student</th>
              <td mat-cell *matCellDef="let s">
                <div style="display:flex;align-items:center;gap:10px;padding:4px 0">
                  <div class="student-avatar">{{ s.firstName?.[0] }}{{ s.lastName?.[0] }}</div>
                  <div>
                    <div style="font-weight:600;font-size:0.875rem">{{ s.lastName }}, {{ s.firstName }}</div>
                    <div style="font-size:0.75rem;color:var(--color-text-muted)">{{ s.universityId }}</div>
                  </div>
                </div>
              </td>
            </ng-container>
            <ng-container matColumnDef="present">
              <th mat-header-cell *matHeaderCellDef>Present</th>
              <td mat-cell *matCellDef="let s"><span style="color:var(--color-success);font-weight:700">{{ s.presentCount }}</span></td>
            </ng-container>
            <ng-container matColumnDef="late">
              <th mat-header-cell *matHeaderCellDef>Late</th>
              <td mat-cell *matCellDef="let s"><span style="color:var(--color-warning);font-weight:700">{{ s.lateCount }}</span></td>
            </ng-container>
            <ng-container matColumnDef="absent">
              <th mat-header-cell *matHeaderCellDef>Absent</th>
              <td mat-cell *matCellDef="let s"><span style="color:var(--color-error);font-weight:700">{{ s.absentCount }}</span></td>
            </ng-container>
            <ng-container matColumnDef="excused">
              <th mat-header-cell *matHeaderCellDef>Excused</th>
              <td mat-cell *matCellDef="let s"><span style="color:var(--color-primary);font-weight:700">{{ s.excusedCount }}</span></td>
            </ng-container>
            <ng-container matColumnDef="rate">
              <th mat-header-cell *matHeaderCellDef>Rate</th>
              <td mat-cell *matCellDef="let s">
                <div style="display:flex;align-items:center;gap:10px">
                  <mat-progress-bar mode="determinate" [value]="s.attendanceRate" style="flex:1;border-radius:4px"
                    [color]="s.attendanceRate >= 75 ? 'primary' : 'warn'"></mat-progress-bar>
                  <span style="min-width:42px;font-weight:700;font-size:0.875rem"
                    [style.color]="s.attendanceRate >= 75 ? 'var(--color-success)' : 'var(--color-error)'">
                    {{ s.attendanceRate }}%
                  </span>
                </div>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="statColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: statColumns;"></tr>
          </table>
        </div>
      </div>

      <div *ngIf="loading()" class="loading-spinner mt-3"><mat-spinner diameter="36"></mat-spinner></div>

      <div class="empty-state animate-fade-in mt-3" *ngIf="!loading() && !sectionStats().length">
        <span class="material-icons">bar_chart</span>
        <h3>No Report Data</h3>
        <p>Select a section and click "Load Report" to view attendance statistics.</p>
      </div>
    </div>
  `,
  styles: [`
    .filter-panel { background: white; border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px; box-shadow: var(--shadow-md); border: 1px solid var(--color-border); }
    .filter-form { display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 16px; align-items: center;
      @media (max-width: 768px) { grid-template-columns: 1fr; } }
    .student-avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; font-weight: 700; flex-shrink: 0;
    }
  `]
})
export class ReportsComponent implements OnInit {
  api = inject(ApiService);
  toast = inject(ToastService);
  private fb = inject(FormBuilder);

  sections = signal<ClassSection[]>([]);
  sectionStats = signal<any[]>([]);
  loading = signal(false);

  statColumns = ['student', 'present', 'late', 'absent', 'excused', 'rate'];

  filterForm = this.fb.group({
    sectionId: [null],
    startDate: [''],
    endDate: ['']
  });

  ngOnInit(): void {
    this.api.getSections().subscribe({ next: r => this.sections.set(r.data || []) });
  }

  loadReport(): void {
    const v = this.filterForm.value;
    if (!v.sectionId) { this.toast.info('Please select a section.'); return; }
    this.loading.set(true);
    this.api.getSectionAttendanceStats(v.sectionId as number).subscribe({
      next: r => { this.sectionStats.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  exportExcel(): void {
    const v = this.filterForm.value;
    this.api.exportExcel({ sectionId: v.sectionId, startDate: v.startDate, endDate: v.endDate });
  }
  exportPDF(): void {
    const v = this.filterForm.value;
    this.api.exportPDF({ sectionId: v.sectionId, startDate: v.startDate, endDate: v.endDate });
  }
}
