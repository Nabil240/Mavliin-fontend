import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { Banner } from '../../../core/models/api.models';

@Component({
  selector: 'app-admin-banners',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="banners-page">
      <div class="page-head">
        <div>
          <span class="head-kicker">HOMEPAGE MERCHANDISING</span>
          <h1 class="section-heading">HERO CAROUSEL SLIDES</h1>
          <p class="section-subtitle">
            Add, customize, reorder, and manage homepage hero slides and seasonal editorial lookbooks as per your wish.
          </p>
        </div>
        <button type="button" class="btn btn-primary" (click)="openCreateModal()" data-testid="add-banner-btn">
          + Add New Slide
        </button>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading hero slides...</p>
        </div>
      } @else if (banners().length === 0) {
        <div class="empty-state">
          <p>No hero slides configured yet.</p>
          <button type="button" class="btn btn-outline" (click)="openCreateModal()">
            Create Your First Slide
          </button>
        </div>
      } @else {
        <div class="slides-grid">
          @for (banner of banners(); track banner.id; let idx = $index) {
            <div class="slide-card" [class.inactive]="!banner.is_active" [attr.data-testid]="'banner-card-' + banner.id">
              <div class="slide-preview">
                <img
                  [src]="banner.image_url || '/uploads/products/banner-hero-1.svg'"
                  [alt]="banner.title"
                  class="preview-img"
                  (error)="handleImageError($event)"
                />
                <div class="preview-overlay">
                  @if (banner.badge_text) {
                    <span class="preview-badge">{{ banner.badge_text }}</span>
                  }
                  <h3 class="preview-title">{{ banner.title }}</h3>
                  @if (banner.subtitle) {
                    <p class="preview-subtitle">{{ banner.subtitle }}</p>
                  }
                  <div class="preview-cta">
                    <span class="btn-preview">{{ banner.cta_text || 'Explore Collection' }} &rarr;</span>
                    <span class="preview-link">{{ banner.cta_link || '/catalog' }}</span>
                  </div>
                </div>
                <div class="slide-order-tag">Order: #{{ banner.sort_order }}</div>
                <div class="slide-status-tag" [class.active-tag]="banner.is_active">
                  {{ banner.is_active ? 'Active on Storefront' : 'Inactive (Hidden)' }}
                </div>
              </div>

              <div class="slide-details">
                <div class="slide-meta">
                  <strong>{{ banner.title }}</strong>
                  <span class="meta-link">Target: <code>{{ banner.cta_link }}</code></span>
                </div>

                <div class="slide-actions">
                  <button
                    type="button"
                    class="btn btn-xs"
                    [class.btn-outline]="banner.is_active"
                    [class.btn-primary]="!banner.is_active"
                    (click)="toggleActive(banner)"
                    [disabled]="saving()"
                    [attr.data-testid]="'toggle-banner-' + banner.id"
                  >
                    {{ banner.is_active ? 'Hide Slide' : 'Activate' }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs btn-outline"
                    (click)="openEditModal(banner)"
                    [attr.data-testid]="'edit-banner-' + banner.id"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs btn-danger"
                    (click)="deleteBanner(banner)"
                    [attr.data-testid]="'delete-banner-' + banner.id"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Create / Edit Slide Modal -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal-card" (click)="$event.stopPropagation()" data-testid="banner-modal">
            <div class="modal-header">
              <h2>{{ isEditing() ? 'Edit Hero Slide' : 'Add New Hero Slide' }}</h2>
              <button type="button" class="close-btn" (click)="closeModal()" aria-label="Close modal">&times;</button>
            </div>

            <form (ngSubmit)="saveBanner()" class="modal-form">
              <div class="form-group">
                <label class="form-label" for="bannerTitle">Slide Headline / Title *</label>
                <input
                  id="bannerTitle"
                  type="text"
                  name="title"
                  class="form-control"
                  [(ngModel)]="formData.title"
                  placeholder="e.g. AUTUMN / FESTIVE EDIT 2026"
                  required
                  data-testid="banner-title-input"
                />
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label" for="bannerBadge">Badge Text (Optional)</label>
                  <input
                    id="bannerBadge"
                    type="text"
                    name="badge_text"
                    class="form-control"
                    [(ngModel)]="formData.badge_text"
                    placeholder="e.g. NEW SEASON DROP, LIMITED EDITION"
                    data-testid="banner-badge-input"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label" for="bannerOrder">Display Order</label>
                  <input
                    id="bannerOrder"
                    type="number"
                    step="1"
                    name="sort_order"
                    class="form-control"
                    [(ngModel)]="formData.sort_order"
                    placeholder="0"
                    data-testid="banner-order-input"
                  />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="bannerSubtitle">Subtitle / Description</label>
                <textarea
                  id="bannerSubtitle"
                  name="subtitle"
                  rows="2"
                  class="form-control"
                  [(ngModel)]="formData.subtitle"
                  placeholder="e.g. Architectural tailoring meets sustainable organic textiles crafted for modern living."
                  data-testid="banner-subtitle-input"
                ></textarea>
              </div>

              <div class="form-group">
                <label class="form-label" for="bannerImage">Background Image URL *</label>
                <input
                  id="bannerImage"
                  type="text"
                  name="image_url"
                  class="form-control"
                  [(ngModel)]="formData.image_url"
                  placeholder="/uploads/products/banner-hero-1.svg or https://example.com/banner.jpg"
                  required
                  data-testid="banner-image-input"
                />
                <div class="quick-presets">
                  <span>Quick Atelier Presets:</span>
                  <button type="button" class="preset-btn" (click)="formData.image_url = '/uploads/products/banner-hero-1.svg'">Hero 1</button>
                  <button type="button" class="preset-btn" (click)="formData.image_url = '/uploads/products/banner-hero-2.svg'">Hero 2</button>
                  <button type="button" class="preset-btn" (click)="formData.image_url = '/uploads/products/banner-hero-3.svg'">Hero 3</button>
                </div>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label" for="bannerCtaText">Button Text (CTA)</label>
                  <input
                    id="bannerCtaText"
                    type="text"
                    name="cta_text"
                    class="form-control"
                    [(ngModel)]="formData.cta_text"
                    placeholder="e.g. Shop New Arrivals"
                    data-testid="banner-cta-text-input"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label" for="bannerCtaLink">Button Link (Target Route)</label>
                  <input
                    id="bannerCtaLink"
                    type="text"
                    name="cta_link"
                    class="form-control"
                    [(ngModel)]="formData.cta_link"
                    placeholder="e.g. /catalog?sort=newest or /category/heritage-panjabi"
                    data-testid="banner-cta-link-input"
                  />
                </div>
              </div>

              <div class="form-group">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    name="is_active"
                    [(ngModel)]="formData.is_active"
                    data-testid="banner-active-checkbox"
                  />
                  <span>Display slide actively on the storefront carousel</span>
                </label>
              </div>

              <!-- Live Preview inside modal -->
              <div class="modal-preview-box">
                <span class="preview-label">Live Carousel Card Preview:</span>
                <div class="preview-mini-hero">
                  <img
                    [src]="formData.image_url || '/uploads/products/banner-hero-1.svg'"
                    alt="Preview"
                    (error)="handleImageError($event)"
                  />
                  <div class="mini-hero-content">
                    @if (formData.badge_text) {
                      <span class="mini-badge">{{ formData.badge_text }}</span>
                    }
                    <h4>{{ formData.title || 'Slide Headline' }}</h4>
                    @if (formData.subtitle) {
                      <p>{{ formData.subtitle }}</p>
                    }
                    <span class="mini-btn">{{ formData.cta_text || 'Explore Collection' }} &rarr;</span>
                  </div>
                </div>
              </div>

              <div class="modal-actions">
                <button type="submit" class="btn btn-primary" [disabled]="saving()" data-testid="save-banner-submit-btn">
                  {{ saving() ? 'Saving Slide...' : isEditing() ? 'Update Slide' : 'Publish Slide' }}
                </button>
                <button type="button" class="btn btn-outline" (click)="closeModal()">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .banners-page {
      padding: 0;
    }
    .page-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .head-kicker {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--color-emerald, #059669);
      margin-bottom: 0.4rem;
      display: inline-block;
    }
    .loading-state, .empty-state {
      background: var(--color-white, #fff);
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: var(--radius-sm, 4px);
      padding: 3rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--color-border, #e2e8f0);
      border-top-color: var(--color-onyx, #18181b);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .slides-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
      @media (min-width: 768px) {
        grid-template-columns: repeat(2, 1fr);
      }
      @media (min-width: 1200px) {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    .slide-card {
      background: var(--color-white, #fff);
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: var(--radius-sm, 4px);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: box-shadow 0.2s ease, transform 0.2s ease;
      &:hover {
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
      }
      &.inactive {
        opacity: 0.72;
        border-style: dashed;
      }
    }
    .slide-preview {
      position: relative;
      height: 200px;
      background: var(--color-onyx, #18181b);
      overflow: hidden;
    }
    .preview-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.45;
    }
    .preview-overlay {
      position: absolute;
      inset: 0;
      padding: 1.25rem;
      color: #fff;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      z-index: 2;
    }
    .preview-badge {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      background: rgba(255, 255, 255, 0.2);
      padding: 0.2rem 0.5rem;
      border-radius: 2px;
      align-self: flex-start;
      margin-bottom: 0.4rem;
    }
    .preview-title {
      font-size: 1.05rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      line-height: 1.2;
      margin: 0 0 0.35rem;
      color: #fff;
    }
    .preview-subtitle {
      font-size: 0.76rem;
      opacity: 0.88;
      line-height: 1.4;
      margin: 0 0 0.5rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .preview-cta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.72rem;
    }
    .btn-preview {
      font-weight: 700;
      color: #fff;
      text-decoration: underline;
    }
    .preview-link {
      opacity: 0.75;
      font-family: monospace;
    }
    .slide-order-tag {
      position: absolute;
      top: 0.75rem;
      left: 0.75rem;
      background: rgba(0, 0, 0, 0.75);
      color: #fff;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 2px;
      z-index: 3;
    }
    .slide-status-tag {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      background: #64748b;
      color: #fff;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 2px;
      z-index: 3;
      &.active-tag {
        background: var(--color-emerald, #059669);
      }
    }
    .slide-details {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      flex: 1;
      justify-content: space-between;
    }
    .slide-meta strong {
      display: block;
      font-size: 0.92rem;
      color: var(--color-onyx, #18181b);
      margin-bottom: 0.2rem;
    }
    .meta-link {
      font-size: 0.78rem;
      color: var(--color-text-muted, #64748b);
      code {
        background: var(--color-alabaster, #f1f5f9);
        padding: 0.1rem 0.35rem;
        border-radius: 2px;
        color: var(--color-onyx, #18181b);
      }
    }
    .slide-actions {
      display: flex;
      gap: 0.5rem;
      border-top: 1px solid var(--color-border, #e2e8f0);
      padding-top: 0.85rem;
    }
    .btn-xs {
      padding: 0.35rem 0.65rem;
      font-size: 0.75rem;
    }
    .btn-danger {
      background: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fecaca;
      border-radius: var(--radius-sm, 4px);
      cursor: pointer;
      font-weight: 600;
      &:hover {
        background: #b91c1c;
        color: #fff;
      }
    }

    /* Modal Styling */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .modal-card {
      background: var(--color-white, #fff);
      border-radius: var(--radius-sm, 4px);
      width: 100%;
      max-width: 620px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .modal-header {
      padding: 1.25rem 1.75rem;
      border-bottom: 1px solid var(--color-border, #e2e8f0);
      display: flex;
      justify-content: space-between;
      align-items: center;
      h2 {
        font-size: 1.15rem;
        margin: 0;
      }
    }
    .close-btn {
      background: transparent;
      border: none;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      color: var(--color-text-muted, #64748b);
      &:hover { color: var(--color-onyx, #18181b); }
    }
    .modal-form {
      padding: 1.75rem;
    }
    .form-group {
      margin-bottom: 1.25rem;
    }
    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .quick-presets {
      margin-top: 0.4rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      color: var(--color-text-muted, #64748b);
    }
    .preset-btn {
      background: var(--color-alabaster, #f1f5f9);
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 2px;
      padding: 0.15rem 0.45rem;
      font-size: 0.72rem;
      cursor: pointer;
      &:hover {
        background: var(--color-onyx, #18181b);
        color: #fff;
      }
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .modal-preview-box {
      margin: 1.5rem 0;
      padding: 1rem;
      background: var(--color-alabaster, #f1f5f9);
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: var(--radius-sm, 4px);
    }
    .preview-label {
      display: block;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--color-text-muted, #64748b);
      margin-bottom: 0.5rem;
    }
    .preview-mini-hero {
      position: relative;
      height: 150px;
      background: var(--color-onyx, #18181b);
      border-radius: 2px;
      overflow: hidden;
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0.45;
      }
    }
    .mini-hero-content {
      position: absolute;
      inset: 0;
      padding: 1rem;
      color: #fff;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      h4 {
        margin: 0.2rem 0;
        font-size: 0.95rem;
        color: #fff;
      }
      p {
        margin: 0 0 0.4rem;
        font-size: 0.72rem;
        opacity: 0.85;
      }
    }
    .mini-badge {
      font-size: 0.6rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      background: rgba(255, 255, 255, 0.25);
      padding: 0.15rem 0.4rem;
      border-radius: 2px;
      align-self: flex-start;
    }
    .mini-btn {
      font-size: 0.68rem;
      font-weight: 700;
      text-decoration: underline;
    }
    .modal-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--color-border, #e2e8f0);
    }
  `],
})
export class AdminBannersComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  readonly banners = signal<Banner[]>([]);
  readonly loading = signal<boolean>(true);
  readonly saving = signal<boolean>(false);
  readonly showModal = signal<boolean>(false);
  readonly isEditing = signal<boolean>(false);

  currentEditingId: number | null = null;

  formData = {
    title: '',
    subtitle: '',
    badge_text: '',
    cta_text: 'Explore Collection',
    cta_link: '/catalog',
    image_url: '/uploads/products/banner-hero-1.svg',
    sort_order: 0,
    is_active: true,
  };

  ngOnInit(): void {
    this.loadBanners();
  }

  loadBanners(): void {
    this.loading.set(true);
    this.adminService.getBanners().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && Array.isArray(res.data)) {
          this.banners.set(res.data);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message || 'Failed to load hero slides');
      },
    });
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.currentEditingId = null;
    this.formData = {
      title: '',
      subtitle: '',
      badge_text: '',
      cta_text: 'Explore Collection',
      cta_link: '/catalog',
      image_url: '/uploads/products/banner-hero-1.svg',
      sort_order: this.banners().length,
      is_active: true,
    };
    this.showModal.set(true);
  }

  openEditModal(banner: Banner): void {
    this.isEditing.set(true);
    this.currentEditingId = banner.id;
    this.formData = {
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      badge_text: banner.badge_text || '',
      cta_text: banner.cta_text || 'Explore Collection',
      cta_link: banner.cta_link || '/catalog',
      image_url: banner.image_url || '/uploads/products/banner-hero-1.svg',
      sort_order: banner.sort_order ?? 0,
      is_active: Boolean(banner.is_active),
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.currentEditingId = null;
  }

  saveBanner(): void {
    if (!this.formData.title.trim()) {
      this.toast.error('Slide title is required.');
      return;
    }

    this.saving.set(true);
    const payload = {
      title: this.formData.title.trim(),
      subtitle: this.formData.subtitle?.trim() || null,
      badge_text: this.formData.badge_text?.trim() || null,
      cta_text: this.formData.cta_text?.trim() || 'Explore Collection',
      cta_link: this.formData.cta_link?.trim() || '/catalog',
      image_url: this.formData.image_url?.trim() || '/uploads/products/banner-hero-1.svg',
      sort_order: Number(this.formData.sort_order) || 0,
      is_active: this.formData.is_active ? 1 : 0,
    };

    if (this.isEditing() && this.currentEditingId) {
      this.adminService.updateBanner(this.currentEditingId, payload as Partial<Banner>).subscribe({
        next: (res) => {
          this.saving.set(false);
          this.toast.success('Hero slide updated successfully.');
          this.closeModal();
          this.loadBanners();
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(err?.error?.message || 'Failed to update hero slide.');
        },
      });
    } else {
      this.adminService.createBanner(payload as Partial<Banner>).subscribe({
        next: (res) => {
          this.saving.set(false);
          this.toast.success('New hero slide published successfully.');
          this.closeModal();
          this.loadBanners();
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(err?.error?.message || 'Failed to create hero slide.');
        },
      });
    }
  }

  toggleActive(banner: Banner): void {
    const nextState = !banner.is_active;
    this.adminService.updateBanner(banner.id, { is_active: nextState }).subscribe({
      next: () => {
        this.toast.success(`Slide ${nextState ? 'activated' : 'hidden'} successfully.`);
        this.loadBanners();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to update slide status.');
      },
    });
  }

  deleteBanner(banner: Banner): void {
    if (!confirm(`Are you sure you want to delete the hero slide "${banner.title}"?`)) {
      return;
    }
    this.adminService.deleteBanner(banner.id).subscribe({
      next: () => {
        this.toast.success('Hero slide deleted successfully.');
        this.loadBanners();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to delete hero slide.');
      },
    });
  }

  handleImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = '/uploads/products/banner-hero-1.svg';
  }
}
