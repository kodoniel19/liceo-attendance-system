// Rebuild trigger: Units and Unified Design Update
import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators, FormGroup, FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { ClassSection, Course } from '../../../core/models';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

@Component({
  selector: 'app-sections',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule,
    MatProgressSpinnerModule, MatProgressBarModule, MatTabsModule],
  template: `
    <div class="page-container">
      <div class="page-header animate-fade-in-up">
        <div class="page-header__title" [class.admin-header-title]="auth.user()?.role === 'admin'">
          <h1>{{ viewFilter() === 'active' ? (auth.user()?.role === 'admin' ? 'All Classes' : 'My Classes') : 'Recycle Bin' }}</h1>
          <p>{{ viewFilter() === 'active' ? (auth.user()?.role === 'admin' ? 'Manage all the class sections' : 'Manage your class sections and student enrollments') : 'Restore or permanently remove archived sections' }}</p>
        </div>
        <div class="header-actions">
          <div class="pill-toggle" *ngIf="auth.user()?.role === 'admin'">
            <button class="pill-btn" [class.active]="viewFilter() === 'active'" (click)="viewFilter.set('active')">
              Active
            </button>
            <button class="pill-btn" [class.active]="viewFilter() === 'archived'" (click)="viewFilter.set('archived')">
              Archived
            </button>
          </div>
          <button mat-raised-button class="btn-primary" (click)="openCreateModal()" *ngIf="viewFilter() === 'active'">
            <mat-icon>add</mat-icon> New Section
          </button>
        </div>
      </div>

      <div *ngIf="loading()" class="loading-spinner"><mat-spinner diameter="36"></mat-spinner></div>

      <div class="content-grid animate-fade-in-up" *ngIf="!loading()">
        <div class="section-card" *ngFor="let s of sections()" [class.archived-card]="viewFilter() === 'archived'">
          <div class="section-card__header">
            <div class="section-card__icon">{{ viewFilter() === 'active' ? '📚' : '🗑️' }}</div>
            <div class="section-card__info">
              <div class="section-card__top-line">
                <div class="section-card__course">{{ s.courseCode }}</div>
                <div class="section-card__units">{{ s.units }} Units</div>
              </div>
              <div class="section-card__name">{{ s.courseName }}</div>
            </div>
            <!-- Card action buttons -->
            <div class="section-card__btns" *ngIf="viewFilter() === 'active'">
              <button mat-icon-button class="btn-announcement" title="Post Announcement" (click)="openAnnouncementsModal(s)">
                <mat-icon>campaign</mat-icon>
              </button>
              <button mat-icon-button class="btn-edit" title="Edit section" (click)="openEditModal(s)">
                <mat-icon>edit</mat-icon>
              </button>
            </div>
          </div>

          <div class="section-card__meta">
            <div class="section-meta-item">
              <span class="material-icons">label</span>
              <span>{{ s.sectionName }}</span>
            </div>
            <div class="section-meta-item schedule-block">
              <span class="material-icons">calendar_today</span>
              <div class="schedule-lines">
                <div *ngFor="let line of getFormattedSchedule(s)">{{ line }}</div>
              </div>
            </div>
            <div class="section-meta-item">
              <span class="material-icons">room</span>
              <span>{{ s.room || 'No room assigned' }}</span>
            </div>
            <div class="section-meta-item" *ngIf="s.instructorFirst">
              <span class="material-icons">person</span>
              <span>Instructor: {{ s.instructorFirst }} {{ s.instructorLast }}</span>
            </div>
            <div class="section-meta-item">
              <span class="material-icons">people</span>
              <span>{{ s.enrolledCount || 0 }} / {{ s.maxStudents }} students</span>
            </div>
          </div>

          <mat-progress-bar mode="determinate" [value]="getEnrollmentRate(s)"
            color="primary" style="margin:12px 0; border-radius:4px;"></mat-progress-bar>

          <div class="section-card__footer">
            <span class="badge" [class.badge--active]="viewFilter() === 'active'" [class.badge--ended]="viewFilter() === 'archived'">
              {{ s.semester }} · {{ s.academicYear }}
            </span>
            <div class="footer-actions">
              <ng-container *ngIf="viewFilter() === 'active'">
                <button mat-flat-button class="btn-manage-students" (click)="openStudentsModal(s)">
                  <mat-icon>group</mat-icon> Manage Students
                </button>
              </ng-container>
              
              <ng-container *ngIf="viewFilter() === 'archived'">
                <button mat-button color="primary" (click)="restoreSection(s)">
                  <mat-icon>restore</mat-icon> Restore
                </button>
                <button mat-button color="warn" (click)="handlePermanentDelete(s)">
                  <mat-icon>delete_forever</mat-icon> Purge
                </button>
              </ng-container>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state animate-fade-in" *ngIf="!loading() && !sections().length">
        <span class="material-icons">{{ viewFilter() === 'active' ? 'class' : 'delete_sweep' }}</span>
        <h3>{{ viewFilter() === 'active' ? 'No Classes Yet' : 'Recycle Bin is Empty' }}</h3>
        <p>{{ viewFilter() === 'active' ? 'Click "New Section" to create your first class.' : 'Archived sections will appear here.' }}</p>
        <button mat-raised-button class="btn-primary" (click)="openCreateModal()" *ngIf="viewFilter() === 'active'" style="margin-top:16px">
          <mat-icon>add</mat-icon> Create Section
        </button>
      </div>

      <!-- ══════════ CREATE / EDIT SECTION MODAL ══════════ -->
      <div class="modal-overlay" *ngIf="showFormModal()" (click)="closeFormModal()">
        <div class="big-modal animate-fade-in-up" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3>{{ editingSection() ? 'Edit Section' : 'Create New Section' }}</h3>
              <p>{{ editingSection() ? 'Update section details' : 'Set up a new class section' }}</p>
            </div>
            <button mat-icon-button (click)="closeFormModal()"><mat-icon>close</mat-icon></button>
          </div>

          <div class="modal-tabs-body">
            <mat-tab-group animationDuration="150ms">

              <!-- ── TAB 1: Details ── -->
              <mat-tab label="📋 Section Details">
                <div class="tab-pad">
                  <form [formGroup]="sectionForm">
                    <!-- Course -->
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Course</mat-label>
                      <mat-select formControlName="courseId">
                        <mat-option *ngFor="let c of courses()" [value]="c.id">
                          {{ c.courseCode || c.course_code }} — {{ c.courseName || c.course_name }}
                        </mat-option>
                      </mat-select>
                      <mat-hint *ngIf="!courses().length" style="color:#e94560">
                        No courses found. Ask your admin to add courses first.
                      </mat-hint>
                      <mat-error>Course is required</mat-error>
                    </mat-form-field>

                    <!-- Section Name -->
                    <div class="form-row">
                      <mat-form-field appearance="outline">
                        <mat-label>Section Name</mat-label>
                        <input matInput formControlName="sectionName"
                          placeholder="e.g. BSCS-2A" autocomplete="off" />
                        <mat-error>Required</mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Academic Year</mat-label>
                        <input matInput formControlName="academicYear"
                          placeholder="e.g. 2024-2025" autocomplete="off" />
                        <mat-error>Required</mat-error>
                      </mat-form-field>
                    </div>

                    <!-- Semester -->
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Semester</mat-label>
                      <mat-select formControlName="semester">
                        <mat-option value="1st">1st Semester</mat-option>
                        <mat-option value="2nd">2nd Semester</mat-option>
                        <mat-option value="Summer">Summer</mat-option>
                      </mat-select>
                    </mat-form-field>

                    <!-- Day Checkboxes -->
                    <div class="field-group">
                      <div class="field-label">Schedule Days <span class="field-hint">(select all that apply)</span></div>
                      <div class="day-checkboxes">
                        <label class="day-chip" *ngFor="let day of allDays"
                          [class.selected]="isDaySelected(day)"
                          (click)="toggleDay(day)">
                          <span>{{ day.slice(0,3) }}</span>
                        </label>
                      </div>
                      
                      <!-- Per-Day Time Inputs -->
                      <div class="day-times-container" *ngIf="selectedDays().length">
                        <div class="day-time-row" *ngFor="let day of selectedDays()">
                          <div class="day-time-label">{{ day }}</div>
                          <mat-form-field appearance="outline" class="small-time-field">
                            <mat-label>Start Time</mat-label>
                            <input matInput type="time" [ngModel]="getDayTimeStart(day)" (ngModelChange)="setDayTimeStart(day, $event)" [ngModelOptions]="{standalone: true}" />
                          </mat-form-field>
                          <mat-form-field appearance="outline" class="small-time-field">
                            <mat-label>End Time</mat-label>
                            <input matInput type="time" [ngModel]="getDayTimeEnd(day)" (ngModelChange)="setDayTimeEnd(day, $event)" [ngModelOptions]="{standalone: true}" />
                          </mat-form-field>
                        </div>
                      </div>
                    </div>

                    <!-- Room & Max -->
                    <div class="form-row">
                      <mat-form-field appearance="outline">
                        <mat-label>Room (optional)</mat-label>
                        <input matInput formControlName="room" placeholder="e.g. Room 201" autocomplete="off" />
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Max Students</mat-label>
                        <input matInput type="number" formControlName="maxStudents" min="1" max="200" />
                      </mat-form-field>
                    </div>
                  </form>
                </div>
              </mat-tab>

              <!-- ── TAB 2: Add Students (only on create) ── -->
              <mat-tab *ngIf="!editingSection()" label="👥 Add Students">
                <div class="tab-pad">
                  <p class="tab-desc">Search and pre-enroll students into this section.</p>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Search students by name or ID</mat-label>
                    <input matInput [formControl]="studentSearchCtrl" placeholder="Type to search..." />
                    <mat-icon matSuffix>search</mat-icon>
                  </mat-form-field>

                  <div *ngIf="searchingStudents()" class="loading-spinner" style="padding:12px">
                    <mat-spinner diameter="24"></mat-spinner>
                  </div>

                  <div class="search-results" *ngIf="searchResults().length">
                    <div class="search-row" *ngFor="let s of searchResults()"
                      (click)="togglePreEnroll(s)"
                      [class.enrolled]="isPreEnrolled(s.id)">
                      <div class="student-av">{{ (s.first_name||s.firstName||'')[0] }}{{ (s.last_name||s.lastName||'')[0] }}</div>
                      <div class="flex1">
                        <div class="s-name">{{ s.last_name || s.lastName }}, {{ s.first_name || s.firstName }}</div>
                        <div class="s-id">{{ s.university_id || s.universityId }}</div>
                      </div>
                      <mat-icon [style.color]="isPreEnrolled(s.id) ? 'var(--color-primary)' : '#ddd'">
                        {{ isPreEnrolled(s.id) ? 'check_circle' : 'radio_button_unchecked' }}
                      </mat-icon>
                    </div>
                  </div>

                  <div class="no-results" *ngIf="studentSearchCtrl.value && !searchResults().length && !searchingStudents()">
                    No students found for "{{ studentSearchCtrl.value }}"
                  </div>

                  <!-- Pre-enrolled list -->
                  <div class="pre-enrolled-list" *ngIf="preEnrolled().length">
                    <div class="list-header">Selected to enroll ({{ preEnrolled().length }})</div>
                    <div class="enrolled-chip" *ngFor="let s of preEnrolled()">
                      <span>{{ s.last_name || s.lastName }}, {{ s.first_name || s.firstName }}</span>
                      <button mat-icon-button style="width:24px;height:24px;line-height:24px" (click)="removePreEnroll(s.id)">
                        <mat-icon style="font-size:14px">close</mat-icon>
                      </button>
                    </div>
                  </div>
                </div>
              </mat-tab>

            </mat-tab-group>
          </div>

          <div class="modal-footer" style="justify-content: space-between;">
            <button mat-raised-button 
              *ngIf="editingSection()" 
              (click)="confirmDeleteSection(editingSection()!)"
              [disabled]="creating()"
              style="background-color: #ef4444 !important; color: white !important; font-weight: bold !important;">
              <mat-icon>delete</mat-icon> Delete Section
            </button>
            <div class="footer-right" style="display: flex; gap: 12px; align-items: center;">
              <button mat-button (click)="closeFormModal()">Cancel</button>
              <button mat-raised-button class="btn-primary" (click)="saveSection()" [disabled]="sectionForm.invalid || creating()">
                <mat-spinner *ngIf="creating()" diameter="16" style="display:inline-block;margin-right:8px"></mat-spinner>
                {{ creating() ? 'Saving...' : (editingSection() ? 'Update Section' : 'Create Section') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════ MANAGE STUDENTS MODAL ══════════ -->
      <div class="modal-overlay" *ngIf="showStudentsModal()" (click)="closeStudentsModal()">
        <div class="big-modal animate-fade-in-up" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3>{{ selectedSection()?.courseCode }} — {{ selectedSection()?.sectionName }}</h3>
              <p>Manage enrolled students</p>
            </div>
            <button mat-icon-button (click)="closeStudentsModal()"><mat-icon>close</mat-icon></button>
          </div>

          <div class="students-body">
            <!-- Search to add -->
            <div class="add-student-bar">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Search & add student by name or ID</mat-label>
                <input matInput [formControl]="addStudentCtrl" placeholder="Type to search..." />
                <mat-icon matSuffix>person_search</mat-icon>
              </mat-form-field>

              <div class="add-results" *ngIf="addSearchResults().length">
                <div class="search-row" *ngFor="let s of addSearchResults()" (click)="enrollStudent(s)">
                  <div class="student-av">{{ (s.first_name||s.firstName||'')[0] }}{{ (s.last_name||s.lastName||'')[0] }}</div>
                  <div class="flex1">
                    <div class="s-name">{{ s.last_name || s.lastName }}, {{ s.first_name || s.firstName }}</div>
                    <div class="s-id">{{ s.university_id || s.universityId }} · {{ s.email }}</div>
                  </div>
                  <button mat-stroked-button color="primary" style="flex-shrink:0">
                    <mat-icon>person_add</mat-icon> Add
                  </button>
                </div>
              </div>
            </div>

            <!-- Enrolled list -->
            <div class="enrolled-header">
              <span>Enrolled Students ({{ enrolledStudents().length }})</span>
            </div>

            <div *ngIf="studentsLoading()" class="loading-spinner" style="padding:24px">
              <mat-spinner diameter="28"></mat-spinner>
            </div>

            <div class="enrolled-table" *ngIf="!studentsLoading()">
              <div class="enrolled-row" *ngFor="let s of enrolledStudents(); let i = index">
                <div class="enrolled-rank">{{ i + 1 }}</div>
                <div class="student-av">{{ (s.first_name||s.firstName||'')[0] }}{{ (s.last_name||s.lastName||'')[0] }}</div>
                <div class="flex1">
                  <div class="s-name">{{ s.last_name || s.lastName }}, {{ s.first_name || s.firstName }}</div>
                  <div class="s-id">{{ s.university_id || s.universityId }} · {{ s.email }}</div>
                </div>
                <!-- Status Badge -->
                <div [class]="'status-pill ' + s.status" style="margin-right:12px">
                  {{ s.status === 'active' ? 'Confirmed' : 'Pending' }}
                </div>
                <ng-container *ngIf="confirmRemoveId() !== s.id">
                  <button mat-icon-button color="warn" title="Remove" (click)="confirmRemoveId.set(s.id)">
                    <mat-icon>person_remove</mat-icon>
                  </button>
                </ng-container>
                <ng-container *ngIf="confirmRemoveId() === s.id">
                    <div class="confirm-remove">
                      <span class="confirm-text" style="display:none;">Remove?</span>
                      <button mat-stroked-button style="min-width:auto;padding:0 8px;height:28px;font-size:0.7rem;margin-right:4px" (click)="confirmRemoveId.set(null)">Cancel</button>
                      <button mat-raised-button color="warn" style="min-width:auto;padding:0 8px;height:28px;font-size:0.7rem" (click)="removeStudent(s)">Remove</button>
                    </div>
                </ng-container>
              </div>
              <div class="empty-state" *ngIf="!enrolledStudents().length" style="padding:24px">
                <span class="material-icons">people_outline</span>
                <h3>No students enrolled</h3>
                <p>Search above to add students.</p>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button mat-raised-button class="btn-primary" (click)="closeStudentsModal()">Done</button>
          </div>
        </div>
      </div>

      <!-- ══════════ ANNOUNCEMENTS MODAL ══════════ -->
      <div class="modal-overlay" *ngIf="showAnnouncementsModal()" (click)="closeAnnouncementsModal()">
        <div class="big-modal animate-fade-in-up" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3>Announcements: {{ selectedSection()?.courseCode }}</h3>
              <p>Post updates for students in {{ selectedSection()?.sectionName }}</p>
            </div>
            <button mat-icon-button (click)="closeAnnouncementsModal()"><mat-icon>close</mat-icon></button>
          </div>

          <div class="modal-tabs-body">
             <div class="tab-pad" style="flex: none; border-bottom: 1px solid var(--color-border); padding-bottom: 16px;">
                <h4 style="margin: 0 0 12px; font-size: 0.9rem; color: var(--color-primary)">New Announcement</h4>
                <div class="announcement-form">
                   <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Title</mat-label>
                      <input matInput [formControl]="announcementTitle" placeholder="e.g. Room Change" />
                   </mat-form-field>
                   <mat-form-field appearance="outline" class="full-width" style="margin-top: -10px">
                      <mat-label>Content</mat-label>
                      <textarea matInput [formControl]="announcementContent" rows="3" placeholder="Type your message here..."></textarea>
                   </mat-form-field>
                   <div style="display: flex; justify-content: flex-end; margin-top: -10px">
                      <button mat-raised-button class="btn-primary" [disabled]="!announcementTitle.value || !announcementContent.value || creatingAnnouncement()" (click)="postAnnouncement()" style="height: 36px; padding: 0 16px;">
                         <mat-icon style="font-size: 18px">send</mat-icon> Post
                      </button>
                   </div>
                </div>
             </div>

             <div class="enrolled-header">Previous announcements</div>
             <div class="tab-pad" style="overflow-y: auto; flex: 1">
                <div *ngIf="announcementsLoading()" class="loading-spinner"><mat-spinner diameter="24"></mat-spinner></div>
                <div class="announcement-card-mini" *ngFor="let a of announcements()">
                   <div class="ann-mini-header">
                      <span class="ann-mini-title">{{ a.title }}</span>
                      <span class="ann-mini-date">{{ a.created_at | date:'short' }}</span>
                   </div>
                   <p class="ann-mini-content">{{ a.content }}</p>
                </div>
                <div class="empty-state" *ngIf="!announcementsLoading() && !announcements().length">
                   <mat-icon>campaign</mat-icon>
                   <p>No announcements yet.</p>
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
          <p>Are you sure you want to delete section <strong>"{{ sectionToDelete()?.sectionName }}"</strong>? All enrollments will be removed. This cannot be undone if sessions exist.</p>
          
          <div class="confirm-modal__footer">
            <button mat-button (click)="cancelDelete()">Cancel</button>
            <button mat-raised-button color="warn" (click)="executeDeleteSection()" [disabled]="creating()">
              <mat-spinner *ngIf="creating()" diameter="16" style="display:inline-block;margin-right:8px"></mat-spinner>
              Delete Section
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .confirm-modal {
      background:white; border-radius:20px; width:100%; max-width:400px;
      padding:32px 24px; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.2);
      h3 { margin:16px 0 8px; color:var(--color-primary); font-size:1.2rem; font-weight:800; }
      p { color:var(--color-text-muted); font-size:0.9rem; line-height:1.5; margin-bottom:24px; }
    }
    .confirm-modal__icon { font-size:48px; }
    .confirm-modal__footer { display:flex; justify-content:center; gap:12px; }

    .page-header { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom: 24px; }
    .page-header__title h1 { font-size: 1.6rem; font-weight: 800; color: #8B1A1A; margin: 0 0 2px; }
    .page-header__title p { color: #64748b; font-size: 0.9rem; margin: 0; }
    
    .admin-header-title h1 { color: #1a1a2e !important; }
    
    .header-actions { display: flex; align-items: center; gap: 16px; }

    /* Pill Toggle */
    .pill-toggle { 
      display: flex; background: #e2e8f0; padding: 4px; border-radius: 14px;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
    }
    .pill-btn {
      border: none; background: transparent; padding: 6px 16px; border-radius: 11px;
      font-size: 0.85rem; font-weight: 700; color: #64748b; cursor: pointer;
      transition: all 0.2s;
    }
    .pill-btn.active {
      background: white; color: #8B1A1A; box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }

    /* Section cards */
    .section-card {
      background:white; border-radius:var(--radius-lg); padding:22px;
      box-shadow:var(--shadow-md); border:1px solid var(--color-border);
      transition:transform 0.2s, box-shadow 0.2s;
      &:hover { transform:translateY(-2px); box-shadow:var(--shadow-lg); }
    }
    .archived-card { opacity: 0.8; background: #f8fafc; border-style: dashed; }
    .section-card__header { display:flex; align-items:flex-start; gap:14px; margin-bottom:16px; }
    .section-card__icon { font-size:28px; width:48px; height:48px; background:rgba(139,26,26,0.08); border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .section-card__info { flex:1; }
    .section-card__btns { display:flex; gap:4px; }
    .btn-edit { color:var(--color-primary) !important; }
    .btn-delete { color:#ef4444 !important; }
    .btn-announcement { color: var(--color-accent) !important; }
    .btn-delete-modal { color:#ef4444 !important; font-weight:600 !important; }
    .section-card__course { font-size:0.72rem; font-weight:700; color:var(--color-primary); text-transform:uppercase; letter-spacing:0.08em; }
    .section-card__top-line { display:flex; justify-content:space-between; align-items:center; width:100%; }
    .section-card__units { font-size:0.75rem; font-weight:800; color:white; background:var(--color-primary); padding:2px 10px; border-radius:12px; }
    .section-card__name { font-size:1rem; font-weight:700; color:var(--color-text); margin-top:3px; }
    .section-card__meta { display:flex; flex-direction:column; gap:6px; }
    .section-meta-item { display:flex; align-items:center; gap:8px; font-size:0.8rem; color:var(--color-text-muted); .material-icons { font-size:16px; color:var(--color-primary); } }
    .schedule-block { align-items:flex-start; }
    .schedule-lines { display:flex; flex-direction:column; gap:2px; }
    .section-card__footer { display:flex; justify-content:space-between; align-items:center; }
    .footer-actions { display:flex; gap:8px; }
    .btn-manage-students {
      background: rgba(139, 26, 26, 0.08) !important;
      color: var(--color-primary) !important;
      border-radius: 8px !important;
      font-weight: 700 !important;
      font-size: 0.8rem !important;
      padding: 0 16px !important;
      transition: all 0.2s ease !important;
    }
    .btn-manage-students:hover {
      background: var(--color-primary) !important;
      color: white !important;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(139, 26, 26, 0.2) !important;
    }

    /* Modals */
    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000; padding:16px; }
    .big-modal {
      background:white; border-radius:20px; width:100%; max-width:580px;
      max-height:92vh; display:flex; flex-direction:column;
      box-shadow:0 20px 60px rgba(0,0,0,0.2); overflow:hidden;
    }
    .modal-header { display:flex; justify-content:space-between; align-items:flex-start; padding:20px 24px; border-bottom:1px solid var(--color-border); h3 { color:var(--color-primary); margin:0 0 4px; font-size:1.1rem; } p { margin:0; font-size:0.8rem; color:var(--color-text-muted); } }
    .modal-footer { display:flex; justify-content:flex-end; gap:12px; padding:16px 24px; border-top:1px solid var(--color-border); flex-shrink:0; }
    .modal-tabs-body { flex:1; overflow:hidden; display:flex; flex-direction:column; }
    .tab-pad { padding:20px 24px; overflow-y:auto; max-height:calc(92vh - 180px); display:flex; flex-direction:column; gap:8px; }
    .tab-desc { font-size:0.8rem; color:var(--color-text-muted); margin:0 0 12px; }

    /* Form helpers */
    .form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .full-width { width:100%; }
    .field-group { margin:4px 0 12px; }
    .field-label { font-size:0.78rem; font-weight:700; color:#555; margin-bottom:10px; }
    .field-hint { font-weight:400; color:#999; }

    /* Day checkboxes & Times */
    .day-checkboxes { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
    .day-chip {
      display:inline-flex; align-items:center; justify-content:center;
      width:44px; height:44px; border-radius:10px; cursor:pointer;
      border:2px solid var(--color-border); font-size:0.78rem; font-weight:700;
      color:var(--color-text-muted); transition:all 0.18s; user-select:none;
      &:hover { border-color:var(--color-primary); color:var(--color-primary); background:rgba(139,26,26,0.06); }
      &.selected { background:var(--color-primary); color:white; border-color:var(--color-primary); }
    }
    
    .day-times-container { display:flex; flex-direction:column; gap:8px; margin-top:8px; padding-top:8px; border-top:1px dashed var(--color-border); }
    .day-time-row { display:flex; align-items:center; gap:12px; }
    .day-time-label { width:80px; font-weight:700; color:var(--color-primary); font-size:0.85rem; }
    .small-time-field { flex:1; margin-bottom:-1em; }

    /* Student search */
    .search-results, .add-results { display:flex; flex-direction:column; gap:4px; max-height:200px; overflow-y:auto; border:1px solid var(--color-border); border-radius:10px; padding:8px; margin-bottom:8px; }
    .search-row {
      display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:8px; cursor:pointer; transition:background 0.15s;
      &:hover { background:rgba(139,26,26,0.05); }
      &.enrolled { background:rgba(139,26,26,0.08); }
    }
    .student-av { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg, var(--color-primary), var(--color-accent)); color:white; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:700; flex-shrink:0; }
    .s-name { font-size:0.875rem; font-weight:600; }
    .s-id   { font-size:0.72rem; color:var(--color-text-muted); }
    .flex1  { flex:1; }
    .no-results { text-align:center; color:var(--color-text-muted); font-size:0.82rem; padding:12px; }

    /* Pre-enrolled chips */
    .pre-enrolled-list { display:flex; flex-direction:column; gap:4px; margin-top:12px; }
    .list-header { font-size:0.75rem; font-weight:700; color:var(--color-primary); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px; }
    .enrolled-chip { display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:rgba(139,26,26,0.08); border-radius:8px; font-size:0.82rem; font-weight:600; }

    /* Students modal bottom body */
    .students-body { flex:1; overflow-y:auto; display:flex; flex-direction:column; }
    .add-student-bar { padding:16px 24px; border-bottom:1px solid var(--color-border); }
    .enrolled-header { padding:12px 24px 8px; font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--color-text-muted); background:var(--color-bg); }
    .enrolled-table { flex:1; padding:8px 16px; }
    .enrolled-row { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:8px; transition:background 0.15s; &:hover { background:rgba(139,26,26,0.04); } }
    .enrolled-rank { width:20px; font-size:0.72rem; color:#ccc; font-weight:700; text-align:center; flex-shrink:0; }
    .confirm-remove { display:flex; align-items:center; gap:6px; flex-shrink:0; }
    .confirm-text { font-size:0.75rem; color:#e53e3e; font-weight:700; white-space:nowrap; }

    .announcement-card-mini {
       padding: 12px; border-radius: 12px; background: #f8fafc; border-left: 4px solid var(--color-primary); margin-bottom: 12px;
    }
    .ann-mini-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .ann-mini-title { font-weight: 700; font-size: 0.85rem; color: var(--color-primary); }
    .ann-mini-date { font-size: 0.7rem; color: var(--color-text-muted); }
    .ann-mini-content { font-size: 0.82rem; color: var(--color-text); margin: 0; line-height: 1.4; }

    .status-pill {
       padding: 4px 12px; border-radius: 12px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;
    }
    .status-pill.active { background: #dcfce7; color: #166534; }
    .status-pill.pending { background: #fef3c7; color: #92400e; }

    @media (max-width:480px) { .form-row { grid-template-columns:1fr; } }
  `]
})
export class SectionsComponent implements OnInit {
  api = inject(ApiService);
  toast = inject(ToastService);
  auth = inject(AuthService);
  fb = inject(FormBuilder);

  private rawSections = signal<ClassSection[]>([]);
  courses = signal<Course[]>([]);
  loading = signal(true);
  viewFilter = signal<'active' | 'archived'>('active');

  sections = computed(() => {
    const showActive = this.viewFilter() === 'active';
    return this.rawSections().filter(s => {
      const activeStatus = s.isActive ?? (s as any).is_active ?? true;
      return showActive ? activeStatus : !activeStatus;
    });
  });

  // Form modal (create/edit)
  showFormModal = signal(false);
  editingSection = signal<ClassSection | null>(null);
  creating = signal(false);
  sectionForm!: FormGroup;

  // Day selection & Times
  allDays = DAYS;
  selectedDays = signal<string[]>([]);
  dayTimes = signal<Record<string, {start: string, end: string}>>({});


  // Pre-enroll during create
  studentSearchCtrl = new FormControl('');
  searchResults = signal<any[]>([]);
  searchingStudents = signal(false);
  preEnrolled = signal<any[]>([]);

  // Manage students modal
  showStudentsModal = signal(false);
  selectedSection = signal<ClassSection | null>(null);
  enrolledStudents = signal<any[]>([]);
  studentsLoading = signal(false);
  addStudentCtrl = new FormControl('');
  addSearchResults = signal<any[]>([]);
  confirmRemoveId = signal<number | null>(null);

  // Announcements
  showAnnouncementsModal = signal(false);
  announcements = signal<any[]>([]);
  announcementsLoading = signal(false);
  creatingAnnouncement = signal(false);
  announcementTitle = new FormControl('');
  announcementContent = new FormControl('');

  private searchDebounce: any;
  private addDebounce: any;

  ngOnInit(): void {
    this.initForm();
    this.loadSections();
    this.loadCourses();

    // Student search in Create modal
    this.studentSearchCtrl.valueChanges.subscribe(v => {
      clearTimeout(this.searchDebounce);
      this.searchDebounce = setTimeout(() => this.searchAvailableStudents(v || '', null), 400);
    });

    // Student search in Manage Students modal
    this.addStudentCtrl.valueChanges.subscribe(v => {
      clearTimeout(this.addDebounce);
      this.addDebounce = setTimeout(() => {
        const sec = this.selectedSection();
        if (sec) this.searchAvailableStudents(v || '', sec.id, true);
      }, 300);
    });

    // Listen to global refreshes (cross-tab and cross-component)
    this.api.refresh$.subscribe(() => {
      this.loadSections();
    });
  }

  private initForm(): void {
    const y = new Date().getFullYear();
    this.sectionForm = this.fb.group({
      courseId: [null, Validators.required],
      sectionName: ['', Validators.required],
      academicYear: [`${y}-${y + 1}`, Validators.required],
      semester: ['1st', Validators.required],
      room: [''],
      maxStudents: [40]
    });
  }

  loadSections(): void {
    this.loading.set(true);
    // Fetch all sections (including inactive ones) so computed can filter them
    this.api.getSections({ all: 'true' }).subscribe({
      next: r => { this.rawSections.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  loadCourses(): void {
    this.api.getCourses().subscribe({
      next: r => this.courses.set(r.data || []),
      error: () => { }
    });
  }

  // ── Day checkboxes & Times ──────────────────────────────
  toggleDay(day: string): void {
    const curr = this.selectedDays();
    if (curr.includes(day)) {
      this.selectedDays.set(curr.filter(d => d !== day));
    } else {
      this.selectedDays.set([...curr, day]);
      // Initialize default times when a day is selected
      if (!this.dayTimes()[day]) {
        this.dayTimes.update(dt => ({ ...dt, [day]: { start: '08:00', end: '09:00' } }));
      }
    }
  }
  isDaySelected(day: string): boolean { return this.selectedDays().includes(day); }

  getDayTimeStart(day: string): string { return this.dayTimes()[day]?.start || '08:00'; }
  setDayTimeStart(day: string, time: string): void { this.dayTimes.update(dt => ({ ...dt, [day]: { ...dt[day], start: time } })); }

  getDayTimeEnd(day: string): string { return this.dayTimes()[day]?.end || '09:00'; }
  setDayTimeEnd(day: string, time: string): void { this.dayTimes.update(dt => ({ ...dt, [day]: { ...dt[day], end: time } })); }

  // ── Create / Edit modal ───────────────────────────────────
  openCreateModal(): void {
    this.editingSection.set(null);
    this.selectedDays.set(['Monday', 'Wednesday', 'Friday']);
    this.dayTimes.set({
      'Monday': { start: '08:00', end: '09:00' },
      'Wednesday': { start: '08:00', end: '09:00' },
      'Friday': { start: '08:00', end: '09:00' }
    });
    this.preEnrolled.set([]);
    this.searchResults.set([]);
    this.studentSearchCtrl.setValue('');
    const y = new Date().getFullYear();
    this.sectionForm.reset({
      academicYear: `${y}-${y + 1}`,
      semester: '1st',
      maxStudents: 40
    });
    this.showFormModal.set(true);
    // Load all students immediately for the Add Students tab
    this.searchAvailableStudents('', null);
  }

  openEditModal(s: ClassSection): void {
    this.editingSection.set(s);
    // Parse existing days from JSON or string
    let parsedDays: string[] = [];
    let parsedTimes: Record<string, {start: string, end: string}> = {};

    try {
      const scheduleData = JSON.parse(s.scheduleDay || '[]');
      if (Array.isArray(scheduleData)) {
        scheduleData.forEach((item: any) => {
          if (item.day) {
            parsedDays.push(item.day);
            parsedTimes[item.day] = { start: item.start || '08:00', end: item.end || '09:00' };
          }
        });
      }
    } catch {
      // Fallback for old comma-separated string
      parsedDays = (s.scheduleDay || '').split(',').map(d => d.trim()).filter(d => DAYS.includes(d));
      parsedDays.forEach(d => {
        parsedTimes[d] = { 
          start: (s.scheduleTimeStart || '08:00').slice(0, 5), 
          end: (s.scheduleTimeEnd || '09:00').slice(0, 5) 
        };
      });
    }

    this.selectedDays.set(parsedDays);
    this.dayTimes.set(parsedTimes);

    this.preEnrolled.set([]);
    this.searchResults.set([]);
    this.studentSearchCtrl.setValue('');
    this.sectionForm.patchValue({
      courseId: s.courseId || (s as any).course_id,
      sectionName: s.sectionName,
      academicYear: s.academicYear,
      semester: s.semester,
      room: s.room || '',
      maxStudents: s.maxStudents || 40
    });
    this.showFormModal.set(true);
    // Load available students immediately for the Add Students tab
    this.searchAvailableStudents('', s.id);
  }

  closeFormModal(): void { this.showFormModal.set(false); }

  saveSection(): void {
    if (this.sectionForm.invalid) { this.sectionForm.markAllAsTouched(); return; }
    if (!this.selectedDays().length) {
      this.toast.error('Please select at least one schedule day.');
      return;
    }
    this.creating.set(true);
    const v = this.sectionForm.value;
    
    // Serialize per-day times to JSON for scheduleDay column
    const scheduleArray = this.selectedDays().map(day => ({
      day,
      start: this.dayTimes()[day]?.start || '08:00',
      end: this.dayTimes()[day]?.end || '09:00'
    }));

    const payload = {
      courseId: v.courseId,
      sectionName: v.sectionName,
      academicYear: v.academicYear,
      semester: v.semester,
      scheduleDay: JSON.stringify(scheduleArray),
      // Set to the first day's times as fallback for the NOT NULL columns
      scheduleTimeStart: (scheduleArray[0]?.start || '08:00') + ':00',
      scheduleTimeEnd: (scheduleArray[0]?.end || '09:00') + ':00',
      room: v.room || null,
      maxStudents: v.maxStudents || 40
    };

    const editing = this.editingSection();
    const obs = editing
      ? this.api.updateSection(editing.id, payload)
      : this.api.createSection(payload);

    obs.subscribe({
      next: (r: any) => {
        const newSectionId = r.data?.id || editing?.id;
        this.toast.success(editing ? 'Section updated!' : 'Section created!');

        // Enroll pre-selected students
        const toEnroll = this.preEnrolled();
        if (toEnroll.length && newSectionId) {
          Promise.all(
            toEnroll.map(st =>
              this.api.enrollStudent(newSectionId, st.id).toPromise().catch(() => { })
            )
          ).then(() => {
            this.toast.success(`${toEnroll.length} student(s) enrolled!`);
            this.finalizeSave();
          });
        } else {
          this.finalizeSave();
        }
      },
      error: (e: any) => {
        this.toast.error(e?.error?.message || 'Failed to save section.');
        this.creating.set(false);
      }
    });
  }

  private finalizeSave(): void {
    this.creating.set(false);
    this.closeFormModal();
    this.loadSections();
    this.api.triggerRefresh('sections');
  }

  // ── Pre-enroll during create ──────────────────────────────
  searchAvailableStudents(query: string, sectionId: number | null, forAddModal = false): void {
    if (forAddModal) { /* will use sectionId from selectedSection */ }
    const sid = sectionId ?? 0;

    if (sid === 0 && !forAddModal) {
      // During create, search all students
      this.searchingStudents.set(true);
      this.api.getUsers({ role: 'student', search: query }).subscribe({
        next: r => { this.searchResults.set(r.data || []); this.searchingStudents.set(false); },
        error: () => this.searchingStudents.set(false)
      });
    } else {
      const targetSid = sid || this.selectedSection()?.id || 0;
      if (!targetSid) return;
      this.api.getAvailableStudents(targetSid, query).subscribe({
        next: r => {
          const results = r.data || [];
          this.addSearchResults.set(results);
          this.searchResults.set(results);
        }
      });
    }
  }

  togglePreEnroll(s: any): void {
    const curr = this.preEnrolled();
    if (curr.find(x => x.id === s.id)) {
      this.preEnrolled.set(curr.filter(x => x.id !== s.id));
    } else {
      this.preEnrolled.set([...curr, s]);
    }
  }
  isPreEnrolled(id: number): boolean { return !!this.preEnrolled().find(x => x.id === id); }
  removePreEnroll(id: number): void { this.preEnrolled.update(arr => arr.filter(x => x.id !== id)); }

  // ── Manage Students modal ─────────────────────────────────
  openStudentsModal(s: ClassSection): void {
    this.selectedSection.set(s);
    this.addStudentCtrl.setValue('');
    this.addSearchResults.set([]);
    this.showStudentsModal.set(true);
    this.loadEnrolled(s.id);
    // Load all available students immediately
    this.searchAvailableStudents('', s.id, true);
  }

  closeStudentsModal(): void {
    this.showStudentsModal.set(false);
    this.selectedSection.set(null);
    this.confirmRemoveId.set(null);
    this.addStudentCtrl.setValue('');
    this.addSearchResults.set([]);
  }

  loadEnrolled(sectionId: number): void {
    this.studentsLoading.set(true);
    this.api.getSectionStudents(sectionId).subscribe({
      next: r => { this.enrolledStudents.set(r.data || []); this.studentsLoading.set(false); },
      error: () => this.studentsLoading.set(false)
    });
  }

  enrollStudent(s: any): void {
    const sec = this.selectedSection();
    if (!sec) return;
    
    // Optimistic UI update
    this.enrolledStudents.update(list => [...list, { ...s, status: 'pending' }]);
    
    this.api.enrollStudent(sec.id, s.id).subscribe({
      next: () => {
        this.toast.success(`${s.first_name || s.firstName} enrolled!`);
        this.loadEnrolled(sec.id);
        
        // Seamlessly update background count
        this.rawSections.update(list => 
          list.map(x => x.id === sec.id ? { ...x, enrolledCount: (x.enrolledCount || 0) + 1 } : x)
        );

        this.searchAvailableStudents(this.addStudentCtrl.value || '', sec.id, true);
      },
      error: e => {
        this.toast.error(e?.error?.message || 'Failed to enroll student.');
        this.loadEnrolled(sec.id); // Revert on error
      }
    });
  }

  removeStudent(s: any): void {
    const sec = this.selectedSection();
    if (!sec) return;
    this.confirmRemoveId.set(null);
    
    // Optimistic UI update
    const studentName = (s.first_name || s.firstName) + ' ' + (s.last_name || s.lastName);
    this.enrolledStudents.update(list => list.filter(x => x.id !== s.id));

    this.api.unenrollStudent(sec.id, s.id).subscribe({
      next: () => {
        this.toast.success(`${studentName} removed.`);
        this.loadEnrolled(sec.id);
        
        // Seamlessly update background count
        this.rawSections.update(list => 
          list.map(x => x.id === sec.id ? { ...x, enrolledCount: Math.max(0, (x.enrolledCount || 0) - 1) } : x)
        );

        this.searchAvailableStudents(this.addStudentCtrl.value || '', sec.id, true);
      },
      error: e => {
        this.toast.error(e?.error?.message || 'Failed to remove student.');
        this.loadEnrolled(sec.id); // Revert on error
      }
    });
  }

  getEnrollmentRate(s: ClassSection): number {
    return Math.round(((s.enrolledCount || 0) / (s.maxStudents || 1)) * 100);
  }

  // ── Announcements ───────────────────────────────────────────
  openAnnouncementsModal(s: ClassSection): void {
    this.selectedSection.set(s);
    this.announcementTitle.setValue('');
    this.announcementContent.setValue('');
    this.showAnnouncementsModal.set(true);
    this.loadAnnouncements(s.id);
  }

  closeAnnouncementsModal(): void {
    this.showAnnouncementsModal.set(false);
    this.selectedSection.set(null);
  }

  loadAnnouncements(sectionId: number): void {
    this.announcementsLoading.set(true);
    this.api.getSectionAnnouncements(sectionId).subscribe({
      next: r => { this.announcements.set(r.data || []); this.announcementsLoading.set(false); },
      error: () => this.announcementsLoading.set(false)
    });
  }

  postAnnouncement(): void {
    const sec = this.selectedSection();
    const title = this.announcementTitle.value;
    const content = this.announcementContent.value;
    if (!sec || !title || !content) return;

    this.creatingAnnouncement.set(true);
    this.api.postAnnouncement(sec.id, title, content).subscribe({
      next: () => {
        this.toast.success('Announcement posted!');
        this.creatingAnnouncement.set(false);
        this.announcementTitle.setValue('');
        this.announcementContent.setValue('');
        this.loadAnnouncements(sec.id);
      },
      error: e => {
        this.toast.error(e?.error?.message || 'Failed to post announcement.');
        this.creatingAnnouncement.set(false);
      }
    });
  }

  getFormattedSchedule(s: ClassSection): string[] {
    try {
      const parsed = JSON.parse(s.scheduleDay || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(item => {
          // Attempt to format time 08:00 -> 8:00 AM
          const formatTime = (t: string) => {
            if (!t) return '';
            const [h, m] = t.split(':');
            let hour = parseInt(h, 10);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            hour = hour % 12 || 12;
            return `${hour}:${m} ${ampm}`;
          };
          return `${item.day.slice(0,3)} ${formatTime(item.start)} - ${formatTime(item.end)}`;
        });
      }
    } catch {
      // Fallback for old records
    }
    
    // Legacy fallback
    const days = s.scheduleDay || 'TBA';
    const start = (s.scheduleTimeStart || '').slice(0,5);
    const end = (s.scheduleTimeEnd || '').slice(0,5);
    return [`${days} ${start}-${end}`];
  }

  showDeleteConfirm = signal(false);
  sectionToDelete = signal<ClassSection | null>(null);

  confirmDeleteSection(s: ClassSection): void {
    this.sectionToDelete.set(s);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.sectionToDelete.set(null);
  }

  executeDeleteSection(): void {
    const s = this.sectionToDelete();
    if (!s) return;
    
    this.creating.set(true);
    this.api.deleteSection(s.id).subscribe({
      next: () => {
        this.toast.success('Section moved to Recycle Bin');
        this.api.triggerRefresh('sections');
        this.cancelDelete();
        this.closeFormModal();
        this.loadSections();
        this.creating.set(false);
      },
      error: e => {
        this.toast.error(e?.error?.message || 'Failed to archive section.');
        this.creating.set(false);
      }
    });
  }

  restoreSection(s: ClassSection): void {
    this.api.restoreSection(s.id).subscribe({
      next: () => {
        this.toast.success('Section restored successfully!');
        this.api.triggerRefresh('sections');
        this.loadSections();
      },
      error: e => this.toast.error(e?.error?.message || 'Failed to restore section.')
    });
  }

  handlePermanentDelete(s: ClassSection): void {
    if (!confirm(`PERMANENTLY DELETE "${s.courseCode} - ${s.sectionName}"?\n\nThis action is irreversible and will remove all student history for this specific class section.`)) return;
    
    this.creating.set(true);
    this.api.hardDeleteSection(s.id).subscribe({
      next: () => {
        this.toast.success('Section permanently removed');
        this.api.triggerRefresh('sections');
        this.loadSections();
        this.creating.set(false);
      },
      error: e => {
        this.toast.error(e?.error?.message || 'Permanent deletion failed.');
        this.creating.set(false);
      }
    });
  }
}
