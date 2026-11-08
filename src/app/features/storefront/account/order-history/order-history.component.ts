import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Order } from '../../../../core/models/api.models';
import { OrderService } from '../../../../core/services/order.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { BdtCurrencyPipe } from '../../../../shared/pipes/bdt.pipe';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BdtCurrencyPipe],
  template: `
    <div class="orders-page container">
      <!-- Breadcrumb & Header -->
      <header class="page-head">
        <div class="head-meta">
          <nav class="breadcrumb">
            <a routerLink="/">Home</a>
            <span class="sep">/</span>
            <a routerLink="/account/profile">Account</a>
            <span class="sep">/</span>
            <span class="current">Order History</span>
          </nav>
          <span class="kicker">CLIENT ATELIER ORDERS</span>
          <h1 class="section-heading">MY PLACED ORDERS</h1>
          <p class="section-subtitle">
            Review your order history, delivery progression, Cash on Delivery status, and garment variant details.
          </p>
        </div>

        <div class="nav-pills">
          <a routerLink="/account/orders" class="pill active">Orders ({{ orders().length }})</a>
          <a routerLink="/account/profile" class="pill">Profile &amp; Addresses</a>
          <a routerLink="/account/wishlist" class="pill">Wishlist</a>
          <button type="button" class="pill pill-logout" (click)="auth.logout()">Sign Out</button>
        </div>
      </header>

      <!-- Loading State -->
      @if (loading()) {
        <div class="state-card loading-box">
          <div class="spinner"></div>
          <p>Fetching your order records from atelier vault...</p>
        </div>
      } @else if (orders().length === 0) {
        <!-- Empty State -->
        <div class="state-card empty-box">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <h3>No Orders Placed Yet</h3>
          <p>You have not placed any atelier orders with your account yet.</p>
          <a routerLink="/products" class="btn btn-primary btn-sm">Explore Seasonal Collection</a>
        </div>
      } @else {
        <!-- Orders List -->
        <div class="orders-list">
          @for (ord of orders(); track ord.id) {
            <article class="order-card" [class.expanded]="expandedOrderId() === ord.id">
              <div class="order-summary-row">
                <div class="col-meta">
                  <span class="label-kicker">ORDER NUMBER</span>
                  <strong class="order-number">{{ ord.order_number }}</strong>
                  <span class="order-date">{{ ord.created_at | date:'mediumDate' }}</span>
                </div>

                <div class="col-status">
                  <span class="label-kicker">FULFILLMENT</span>
                  <span class="badge" [class]="'badge-' + ord.status">{{ ord.status | uppercase }}</span>
                </div>

                <div class="col-payment">
                  <span class="label-kicker">PAYMENT (COD)</span>
                  <span class="badge" [class]="'badge-' + ord.payment_status">
                    {{ ord.payment_status === 'paid' ? 'PAID (COLLECTED)' : 'UNPAID (DUE ON DELIVERY)' }}
                  </span>
                </div>

                <div class="col-total">
                  <span class="label-kicker">TOTAL AMOUNT</span>
                  <strong class="tabular-price">{{ Number(ord.total_amount) | bdt }}</strong>
                  <span class="sub-fee">(Incl. {{ Number(ord.shipping_fee || 0) | bdt }} shipping)</span>
                </div>

                <div class="col-actions">
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    (click)="toggleDetails(ord.id)"
                  >
                    {{ expandedOrderId() === ord.id ? 'Hide Details' : 'View Details' }}
                  </button>
                  <a
                    [routerLink]="['/track-order']"
                    [queryParams]="{ orderNumber: ord.order_number }"
                    class="btn btn-outline btn-sm"
                  >
                    Track
                  </a>
                  @if (ord.status === 'pending' || ord.status === 'confirmed') {
                    <button
                      type="button"
                      class="btn btn-danger-outline btn-sm"
                      (click)="openCancelModal(ord)"
                    >
                      Cancel
                    </button>
                  }
                </div>
              </div>

              <!-- Expanded Order Details & Variant Line Items -->
              @if (expandedOrderId() === ord.id) {
                <div class="order-details-drawer">
                  <div class="drawer-grid">
                    <!-- Delivery & Shipping Snapshot -->
                    <div class="info-block">
                      <h4>Delivery Address &amp; Courier</h4>
                      <p class="recipient-name">
                        <strong>{{ ord.shipping_address?.recipient_name || ord.shipping_address?.full_name || auth.user()?.full_name }}</strong>
                      </p>
                      <p class="addr-line">{{ ord.shipping_address?.street_address }}</p>
                      <p class="addr-line">
                        {{ ord.shipping_address?.city }}
                        @if (ord.shipping_address?.postal_code) {
                          — {{ ord.shipping_address?.postal_code }}
                        }
                      </p>
                      <p class="addr-phone">Phone: {{ ord.shipping_address?.phone }}</p>

                      @if (ord.courier_name) {
                        <div class="courier-badge">
                          <span>Courier: <strong>{{ ord.courier_name }}</strong></span>
                          @if (ord.tracking_number) {
                            <span>Tracking: <code>{{ ord.tracking_number }}</code></span>
                          }
                        </div>
                      }

                      @if (ord.notes) {
                        <div class="order-notes">
                          <span class="notes-kicker">Delivery Instructions:</span>
                          <p>{{ ord.notes }}</p>
                        </div>
                      }
                    </div>

                    <!-- Payment Summary -->
                    <div class="info-block financial-summary">
                      <h4>Financial Breakdown</h4>
                      <div class="summary-line">
                        <span>Items Subtotal:</span>
                        <span>{{ ord.subtotal | bdt }}</span>
                      </div>
                      @if (Number(ord.discount_amount) > 0) {
                        <div class="summary-line discount">
                          <span>Promo Discount:</span>
                          <span>-{{ ord.discount_amount | bdt }}</span>
                        </div>
                      }
                      <div class="summary-line">
                        <span>Delivery Fee (Cash on Delivery):</span>
                        <span>{{ (ord.shipping_fee || 0) | bdt }}</span>
                      </div>
                      <div class="summary-line grand-total">
                        <strong>Grand Total Due:</strong>
                        <strong class="tabular-price">{{ ord.total_amount | bdt }}</strong>
                      </div>
                    </div>
                  </div>

                  <!-- Variant Line Items Table -->
                  <div class="line-items-wrapper">
                    <h4>Ordered Garments &amp; Variant Specifications</h4>
                    @if (!ord.items || ord.items.length === 0) {
                      <p class="muted-note">Loading line item specifications...</p>
                    } @else {
                      <div class="items-table-responsive">
                        <table class="items-table">
                          <thead>
                            <tr>
                              <th>Garment</th>
                              <th>Variant SKU</th>
                              <th>Size</th>
                              <th>Color</th>
                              <th>Unit Price</th>
                              <th>Quantity</th>
                              <th>Line Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (item of ord.items; track item.id) {
                              <tr>
                                <td class="product-cell">
                                  @if (item.thumbnail_url) {
                                    <img [src]="item.thumbnail_url" [alt]="item.product_name" class="item-thumb" />
                                  }
                                  <div>
                                    <strong class="product-title">{{ item.product_name }}</strong>
                                    @if (item.product_slug) {
                                      <a [routerLink]="['/products', item.product_slug]" class="view-item-link">View Garment &rarr;</a>
                                    }
                                  </div>
                                </td>
                                <td>
                                  <code class="sku-tag">{{ item.variant_sku || 'N/A' }}</code>
                                </td>
                                <td>
                                  <span class="size-pill">{{ item.variant_size || 'Standard' }}</span>
                                </td>
                                <td>
                                  <span class="color-badge">{{ item.variant_color || 'Standard' }}</span>
                                </td>
                                <td class="tabular-price">{{ item.unit_price | bdt }}</td>
                                <td class="qty-cell">{{ item.quantity }}</td>
                                <td class="tabular-price font-bold">{{ item.line_total | bdt }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    }
                  </div>
                </div>
              }
            </article>
          }
        </div>
      }
    </div>

    <!-- Cancellation Confirmation Modal -->
    @if (cancellingOrder()) {
      <div class="modal-backdrop" (click)="cancellingOrder.set(null)">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>CANCEL ORDER {{ cancellingOrder()!.order_number }}</h3>
            <button type="button" class="close-btn" (click)="cancellingOrder.set(null)">&times;</button>
          </div>
          <div class="modal-body">
            <p>
              Are you sure you wish to cancel this order? Variant stock will be immediately restored to the atelier inventory.
            </p>
            <div class="form-group">
              <label class="form-label" for="cancelReasonInput">Reason for cancellation *</label>
              <textarea
                id="cancelReasonInput"
                class="form-control"
                rows="3"
                [(ngModel)]="cancelReason"
                placeholder="e.g., Ordered incorrect size, changed mind, duplicate order"
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary btn-sm" (click)="cancellingOrder.set(null)">Keep Order</button>
            <button
              type="button"
              class="btn btn-danger btn-sm"
              [disabled]="!cancelReason.trim() || submittingCancel()"
              (click)="confirmCancel()"
            >
              {{ submittingCancel() ? 'Cancelling...' : 'Confirm Cancellation' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .orders-page {
      padding-top: 2.5rem;
      padding-bottom: 5rem;
    }

    .page-head {
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;

      @media (min-width: 768px) {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-end;
      }
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 0.75rem;
      color: var(--color-text-muted);

      a {
        color: var(--color-text-muted);
        text-decoration: none;
        &:hover { color: var(--color-onyx); }
      }
      .current {
        color: var(--color-onyx);
        font-weight: 600;
      }
    }

    .kicker {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.16em;
      color: var(--color-gold, #d97706);
      display: block;
      margin-bottom: 0.25rem;
    }

    .nav-pills {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;

      .pill {
        padding: 0.5rem 1rem;
        border-radius: var(--radius-sm, 2px);
        font-size: 0.8rem;
        font-weight: 600;
        text-decoration: none;
        background: var(--color-alabaster, #f1f5f9);
        border: 1px solid var(--color-border, #e2e8f0);
        color: var(--color-text, #0f172a);
        transition: all 0.2s ease;

        &.active, &:hover {
          background: var(--color-onyx, #18181b);
          color: var(--color-white, #ffffff);
          border-color: var(--color-onyx, #18181b);
        }

        &.pill-logout {
          color: var(--color-berry, #e11d48);
          border-color: rgba(225, 29, 72, 0.3);
          background: var(--color-berry-bg, #fff1f2);
          cursor: pointer;

          &:hover {
            background: var(--color-berry, #e11d48);
            color: var(--color-white, #ffffff);
            border-color: var(--color-berry, #e11d48);
          }
        }
      }
    }

    .state-card {
      padding: 3.5rem 1.5rem;
      text-align: center;
      background: var(--color-alabaster, #f1f5f9);
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: var(--radius-sm, 2px);

      &.empty-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
      }
      .empty-icon {
        color: var(--color-text-muted, #64748b);
        margin-bottom: 0.5rem;
      }
    }

    .orders-list {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .order-card {
      background: var(--color-white, #ffffff);
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: var(--radius-sm, 2px);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;

      &.expanded {
        border-color: var(--color-onyx, #18181b);
        box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
      }
    }

    .order-summary-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      align-items: center;

      @media (min-width: 768px) {
        grid-template-columns: 2fr 1.2fr 1.5fr 1.5fr auto;
      }
    }

    .label-kicker {
      display: block;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-muted, #64748b);
      margin-bottom: 0.2rem;
    }

    .order-number {
      font-size: 0.95rem;
      letter-spacing: 0.04em;
    }

    .order-date {
      display: block;
      font-size: 0.75rem;
      color: var(--color-text-muted, #64748b);
    }

    .sub-fee {
      display: block;
      font-size: 0.72rem;
      color: var(--color-text-muted, #64748b);
    }

    .col-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .badge {
      display: inline-block;
      padding: 0.3rem 0.65rem;
      border-radius: 2px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;

      &.badge-pending { background: var(--color-gold-bg, #fffbeb); color: var(--color-gold, #d97706); }
      &.badge-confirmed { background: var(--color-blue-bg, #eff6ff); color: var(--color-blue, #2563eb); }
      &.badge-shipped { background: var(--color-blue-bg, #eff6ff); color: var(--color-blue, #2563eb); }
      &.badge-delivered { background: var(--color-emerald-bg, #ecfdf5); color: var(--color-emerald, #059669); }
      &.badge-cancelled { background: var(--color-berry-bg, #fff1f2); color: var(--color-berry, #e11d48); }
      &.badge-unpaid { background: var(--color-gold-bg, #fffbeb); color: var(--color-gold, #d97706); }
      &.badge-paid { background: var(--color-emerald-bg, #ecfdf5); color: var(--color-emerald, #059669); }
    }

    .order-details-drawer {
      border-top: 1px solid var(--color-border, #e2e8f0);
      background: var(--color-alabaster, #f1f5f9);
      padding: 1.5rem;
    }

    .drawer-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;

      @media (min-width: 768px) {
        grid-template-columns: 1fr 1fr;
      }
    }

    .info-block {
      background: var(--color-white, #ffffff);
      border: 1px solid var(--color-border, #e2e8f0);
      padding: 1.25rem;
      border-radius: 2px;

      h4 {
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 0.75rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--color-border, #e2e8f0);
      }
      p { margin: 0 0 0.35rem 0; font-size: 0.85rem; }
    }

    .courier-badge {
      margin-top: 0.75rem;
      padding: 0.5rem 0.75rem;
      background: var(--color-blue-bg, #eff6ff);
      border: 1px solid rgba(37, 99, 235, 0.25);
      border-radius: 2px;
      font-size: 0.78rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .financial-summary {
      .summary-line {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        margin-bottom: 0.4rem;

        &.discount { color: var(--color-berry, #e11d48); }
        &.grand-total {
          border-top: 1px solid var(--color-border, #e2e8f0);
          padding-top: 0.5rem;
          margin-top: 0.5rem;
          font-size: 0.95rem;
        }
      }
    }

    .line-items-wrapper {
      background: var(--color-white, #ffffff);
      border: 1px solid var(--color-border, #e2e8f0);
      padding: 1.25rem;
      border-radius: 2px;

      h4 {
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 1rem;
      }
    }

    .items-table-responsive {
      overflow-x: auto;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;

      th {
        text-align: left;
        padding: 0.6rem 0.75rem;
        border-bottom: 1px solid var(--color-border, #e2e8f0);
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--color-text-muted, #64748b);
      }

      td {
        padding: 0.75rem;
        border-bottom: 1px solid var(--color-border, #e2e8f0);
        vertical-align: middle;
      }

      .product-cell {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .item-thumb {
        width: 44px;
        height: 56px;
        object-fit: cover;
        border-radius: 2px;
        border: 1px solid var(--color-border, #e2e8f0);
      }

      .product-title {
        display: block;
        font-weight: 600;
      }

      .view-item-link {
        font-size: 0.72rem;
        color: var(--color-text-muted, #64748b);
        text-decoration: underline;
      }

      .size-pill, .color-badge {
        display: inline-block;
        padding: 0.15rem 0.45rem;
        background: var(--color-alabaster, #f1f5f9);
        border-radius: 2px;
        font-weight: 600;
        font-size: 0.75rem;
      }

      .sku-tag {
        font-size: 0.75rem;
        background: var(--color-alabaster, #f1f5f9);
        padding: 0.15rem 0.35rem;
        border-radius: 2px;
      }
    }

    .btn-danger-outline {
      background: transparent;
      border: 1px solid var(--color-berry, #e11d48);
      color: var(--color-berry, #e11d48);
      &:hover { background: var(--color-berry, #e11d48); color: var(--color-white, #ffffff); }
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(24, 24, 27, 0.55);
      z-index: 1050;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .modal-card {
      background: var(--color-white, #ffffff);
      width: 100%;
      max-width: 480px;
      border-radius: 2px;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
      overflow: hidden;
    }

    .modal-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--color-border, #e2e8f0);

      h3 { font-size: 0.9rem; margin: 0; letter-spacing: 0.06em; }
      .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        line-height: 1;
      }
    }

    .modal-body {
      padding: 1.25rem;
      p { font-size: 0.85rem; margin-bottom: 1rem; color: var(--color-text-muted, #64748b); }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      border-top: 1px solid var(--color-border, #e2e8f0);
      background: var(--color-alabaster, #f1f5f9);
    }
  `],
})
export class OrderHistoryComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly orders = signal<Order[]>([]);
  readonly loading = signal<boolean>(true);
  readonly expandedOrderId = signal<number | null>(null);

  // Cancellation
  readonly cancellingOrder = signal<Order | null>(null);
  readonly submittingCancel = signal<boolean>(false);
  cancelReason = '';

  readonly Number = Number;

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.orderService.getMyOrders(1, 25).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.orders.set(res.data);
          // If orders exist and first order has items, expand it for great UX
          if (res.data.length > 0 && !this.expandedOrderId()) {
            this.expandedOrderId.set(res.data[0].id);
          }
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message || 'Failed to load order history.');
      },
    });
  }

  toggleDetails(orderId: number): void {
    if (this.expandedOrderId() === orderId) {
      this.expandedOrderId.set(null);
    } else {
      this.expandedOrderId.set(orderId);
      // Fetch full order with items if not already populated
      const target = this.orders().find((o) => o.id === orderId);
      if (target && (!target.items || target.items.length === 0)) {
        this.orderService.getOrderById(orderId).subscribe({
          next: (res) => {
            if (res.success && res.data) {
              this.orders.update((list) =>
                list.map((o) => (o.id === orderId ? { ...o, items: res.data.items } : o))
              );
            }
          },
        });
      }
    }
  }

  openCancelModal(order: Order): void {
    this.cancellingOrder.set(order);
    this.cancelReason = '';
  }

  confirmCancel(): void {
    const ord = this.cancellingOrder();
    if (!ord || !this.cancelReason.trim()) return;

    this.submittingCancel.set(true);
    this.orderService.cancelOrder(ord.id, this.cancelReason.trim()).subscribe({
      next: (res) => {
        this.submittingCancel.set(false);
        this.cancellingOrder.set(null);
        if (res.success) {
          this.toast.success(`Order ${ord.order_number} has been cancelled.`);
          this.loadOrders();
        }
      },
      error: (err) => {
        this.submittingCancel.set(false);
        this.toast.error(err?.error?.message || 'Unable to cancel order.');
      },
    });
  }
}
