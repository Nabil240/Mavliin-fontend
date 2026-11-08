import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Category, Product } from '../../../../core/models/api.models';
import { AdminService } from '../../../../core/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { BdtCurrencyPipe } from '../../../../shared/pipes/bdt.pipe';

@Component({
  selector: 'app-product-manage-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BdtCurrencyPipe],
  template: `
    <div class="product-manage-list">
      <div class="page-head">
        <div>
          <span class="head-kicker">CATALOG INVENTORY</span>
          <h1 class="section-heading">PRODUCTS &amp; MULTI-VARIANT SKUs</h1>
          <p class="section-subtitle">Manage atelier garments, multi-variant matrices (sizes, colors, SKUs), and pricing</p>
        </div>
        <div class="head-actions">
          <a routerLink="/admin/products/new" class="btn btn-primary btn-sm">
            + Add New Product
          </a>
        </div>
      </div>

      <!-- Filters Toolbar -->
      <div class="filter-bar">
        <div class="search-box">
          <input
            type="search"
            class="form-control"
            placeholder="Search garment title or SKU..."
            [(ngModel)]="searchTerm"
            (keyup.enter)="loadProducts()"
          />
        </div>

        <div class="filter-selects">
          <select class="form-control" [(ngModel)]="selectedCategoryId" (change)="loadProducts()">
            <option value="">All Categories</option>
            @for (c of categories(); track c.id) {
              <option [value]="c.id">{{ c.name }}</option>
            }
          </select>

          <select class="form-control" [(ngModel)]="activeFilter" (change)="loadProducts()">
            <option value="">All Visibility</option>
            <option value="1">Active Only</option>
            <option value="0">Hidden Only</option>
          </select>

          <button type="button" class="btn btn-secondary btn-sm" (click)="loadProducts()">
            Apply Filters
          </button>
        </div>
      </div>

      <!-- Products Table -->
      @if (loading()) {
        <div class="state-card loading-box">
          <p>Loading catalog products and variant data...</p>
        </div>
      } @else if (products().length === 0) {
        <div class="state-card empty-box">
          <p>No products match your current filters.</p>
          <a routerLink="/admin/products/new" class="btn btn-primary btn-sm">+ Create First Product</a>
        </div>
      } @else {
        <div class="table-card">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Garment</th>
                <th>Department</th>
                <th>Base Price</th>
                <th>Variants (Size / Color / SKU)</th>
                <th>Total Stock</th>
                <th>Featured</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (p of products(); track p.id) {
                <tr>
                  <td class="product-cell">
                    @if (p.thumbnail_url) {
                      <img [src]="p.thumbnail_url" [alt]="p.name" class="p-thumb" />
                    }
                    <div>
                      <strong class="p-name">{{ p.name }}</strong>
                      <span class="p-slug"><code>/{{ p.slug }}</code></span>
                    </div>
                  </td>
                  <td>
                    <span class="cat-pill">{{ p.category_name || 'Unassigned' }}</span>
                  </td>
                  <td class="tabular-price">
                    <strong>{{ Number(p.base_price || p.price) | bdt }}</strong>
                    @if (p.compare_at_price) {
                      <span class="comp-price">{{ Number(p.compare_at_price) | bdt }}</span>
                    }
                  </td>
                  <td>
                    @if (p.variants && p.variants.length > 0) {
                      <div class="variant-tags">
                        @for (v of p.variants.slice(0, 3); track v.id) {
                          <span class="variant-chip" title="Stock: {{ v.stock_quantity }}">
                            {{ v.size }} &bull; {{ v.color }} ({{ v.sku }})
                          </span>
                        }
                        @if (p.variants.length > 3) {
                          <span class="variant-chip more">+{{ p.variants.length - 3 }} more</span>
                        }
                      </div>
                    } @else {
                      <span class="text-muted">No variants configured</span>
                    }
                  </td>
                  <td>
                    @let stock = computeTotalStock(p);
                    <span
                      class="badge"
                      [class]="stock === 0 ? 'badge-danger' : (stock <= 5 ? 'badge-warning' : 'badge-stock')"
                    >
                      {{ stock }} units
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      class="btn-icon"
                      [class.active]="Boolean(p.is_featured)"
                      (click)="toggleFeatured(p)"
                      title="Toggle featured showcase"
                    >
                      ★
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      class="badge-btn"
                      [class.badge-stock]="Boolean(p.is_active)"
                      [class.badge-danger]="!Boolean(p.is_active)"
                      (click)="toggleActive(p)"
                    >
                      {{ Boolean(p.is_active) ? 'Active' : 'Hidden' }}
                    </button>
                  </td>
                  <td>
                    <div class="row-actions">
                      <a [routerLink]="['/admin/products', p.id, 'edit']" class="btn btn-secondary btn-xs">
                        Edit
                      </a>
                      <a [routerLink]="['/products', p.slug]" target="_blank" class="btn btn-outline btn-xs">
                        View
                      </a>
                      <button type="button" class="btn btn-danger-xs" (click)="deleteProduct(p)">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .product-manage-list {
      padding: 1.5rem 0;
    }

    .page-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--color-border, #e2e8f0);
      padding-bottom: 1.25rem;
    }

    .head-kicker {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      color: var(--color-gold, #d97706);
      text-transform: uppercase;
      display: block;
      margin-bottom: 0.25rem;
    }

    .filter-bar {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1.5rem;
      background: var(--color-white, #ffffff);
      padding: 1rem;
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 2px;

      .search-box {
        flex: 1;
        min-width: 240px;
      }
      .filter-selects {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .form-control {
        padding: 0.5rem 0.75rem;
        font-size: 0.85rem;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 2px;
      }
    }

    .table-card {
      background: var(--color-white, #ffffff);
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 2px;
      overflow-x: auto;
    }

    .admin-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;

      th {
        text-align: left;
        padding: 0.75rem 1rem;
        background: var(--color-alabaster, #f1f5f9);
        border-bottom: 1px solid var(--color-border, #e2e8f0);
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--color-text-muted, #64748b);
      }

      td {
        padding: 0.85rem 1rem;
        border-bottom: 1px solid var(--color-border, #e2e8f0);
        vertical-align: middle;
      }
    }

    .product-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;

      .p-thumb {
        width: 44px;
        height: 56px;
        object-fit: cover;
        border-radius: 2px;
        border: 1px solid var(--color-border, #e2e8f0);
      }
      .p-name { display: block; font-size: 0.9rem; }
      .p-slug { font-size: 0.72rem; color: var(--color-text-light, #94a3b8); }
    }

    .cat-pill {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      background: var(--color-alabaster, #f1f5f9);
      border-radius: 2px;
      font-size: 0.75rem;
      color: var(--color-text, #0f172a);
    }

    .comp-price {
      display: block;
      font-size: 0.72rem;
      color: var(--color-text-light, #94a3b8);
      text-decoration: line-through;
    }

    .variant-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;

      .variant-chip {
        font-size: 0.7rem;
        background: var(--color-alabaster, #f1f5f9);
        padding: 0.15rem 0.35rem;
        border-radius: 2px;
        color: var(--color-text, #0f172a);

        &.more { background: var(--color-beige, #e2e8f0); font-weight: 600; }
      }
    }

    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 2px;
      font-size: 0.72rem;
      font-weight: 700;

      &.badge-stock { background: var(--color-emerald-bg, #ecfdf5); color: var(--color-emerald, #059669); }
      &.badge-warning { background: var(--color-gold-bg, #fffbeb); color: var(--color-gold, #d97706); }
      &.badge-danger { background: var(--color-berry-bg, #fff1f2); color: var(--color-berry, #e11d48); }
    }

    .badge-btn {
      border: none;
      padding: 0.25rem 0.55rem;
      border-radius: 2px;
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
      text-transform: uppercase;

      &.badge-stock { background: var(--color-emerald-bg, #ecfdf5); color: var(--color-emerald, #059669); }
      &.badge-danger { background: var(--color-berry-bg, #fff1f2); color: var(--color-berry, #e11d48); }
    }

    .btn-icon {
      background: none;
      border: none;
      font-size: 1.25rem;
      color: var(--color-border-dark, #cbd5e1);
      cursor: pointer;
      line-height: 1;

      &.active { color: var(--color-gold, #d97706); }
    }

    .row-actions {
      display: flex;
      gap: 0.35rem;
    }

    .btn-xs {
      padding: 0.2rem 0.45rem;
      font-size: 0.72rem;
      border-radius: 2px;
      text-decoration: none;
    }

    .btn-danger-xs {
      background: var(--color-berry-bg, #fff1f2);
      border: 1px solid rgba(225, 29, 72, 0.25);
      color: var(--color-berry, #e11d48);
      padding: 0.2rem 0.45rem;
      font-size: 0.72rem;
      border-radius: 2px;
      cursor: pointer;
      &:hover { background: var(--color-berry, #e11d48); color: var(--color-white, #ffffff); }
    }

    .state-card {
      text-align: center;
      padding: 3rem;
      background: var(--color-white, #ffffff);
      border: 1px solid var(--color-border, #e2e8f0);
    }
  `],
})
export class ProductManageListComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly products = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly loading = signal<boolean>(true);

  searchTerm = '';
  selectedCategoryId = '';
  activeFilter = '';

  readonly Number = Number;
  readonly Boolean = Boolean;

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  loadCategories(): void {
    this.adminService.getCategories().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.categories.set(res.data);
        }
      },
    });
  }

  loadProducts(): void {
    this.loading.set(true);
    const params: Record<string, string | number | boolean | undefined> = {};
    if (this.searchTerm.trim()) params['search'] = this.searchTerm.trim();
    if (this.selectedCategoryId) params['categoryId'] = Number(this.selectedCategoryId);
    if (this.activeFilter !== '') params['isActive'] = this.activeFilter === '1';

    this.adminService.getProducts(params).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.products.set(res.data);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message || 'Failed to load products.');
      },
    });
  }

  computeTotalStock(p: Product): number {
    if (p.variants && p.variants.length > 0) {
      return p.variants.reduce((sum, v) => sum + (Number(v.stock_quantity) || 0), 0);
    }
    return Number(p.total_stock || p.stock_quantity || 0);
  }

  toggleFeatured(p: Product): void {
    const nextVal = !Boolean(p.is_featured);
    this.adminService.updateProduct(p.id, { is_featured: nextVal ? 1 : 0 }).subscribe({
      next: (res) => {
        if (res.success) {
          this.products.update((list) =>
            list.map((item) => (item.id === p.id ? { ...item, is_featured: nextVal } : item))
          );
          this.toast.success(`Featured status updated for ${p.name}.`);
        }
      },
      error: () => this.toast.error('Failed to update featured flag.'),
    });
  }

  toggleActive(p: Product): void {
    const nextVal = !Boolean(p.is_active);
    this.adminService.updateProduct(p.id, { is_active: nextVal ? 1 : 0 }).subscribe({
      next: (res) => {
        if (res.success) {
          this.products.update((list) =>
            list.map((item) => (item.id === p.id ? { ...item, is_active: nextVal } : item))
          );
          this.toast.success(`${p.name} visibility set to ${nextVal ? 'Active' : 'Hidden'}.`);
        }
      },
      error: () => this.toast.error('Failed to update active status.'),
    });
  }

  deleteProduct(p: Product): void {
    if (!confirm(`Are you sure you want to delete "${p.name}" and its variants?`)) return;

    this.adminService.deleteProduct(p.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success(`Product ${p.name} deleted.`);
          this.products.update((list) => list.filter((item) => item.id !== p.id));
        }
      },
      error: (err) => this.toast.error(err?.error?.message || 'Unable to delete product.'),
    });
  }
}
