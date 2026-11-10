import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Coupon,
  CouponAnalytics,
  CouponMemberUsageItem,
  CouponMemberSummary,
  CouponPerformanceSummary,
  User,
} from '../../../core/models/api.models';
import { CouponMember } from '../../../core/models/coupon.model';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { BdtCurrencyPipe } from '../../../shared/pipes/bdt.pipe';

@Component({
  selector: 'app-admin-coupons',
  standalone: true,
  imports: [CommonModule, FormsModule, BdtCurrencyPipe],
  template: `
    <div class="admin-coupons">
      <div class="page-head">
        <div>
          <span class="head-kicker">PROMOTIONS &amp; LOYALTY ANALYTICS</span>
          <h1 class="section-heading">COUPON REDEMPTION &amp; MEMBER TRACKING</h1>
          <p class="section-subtitle">
            Track member coupon usage frequency, analyze single vs. multi-coupon adoption, and manage active promotional discount codes.
          </p>
        </div>
        <div class="head-actions">
          <button type="button" class="btn btn-outline btn-sm" (click)="refreshAll()" [disabled]="loading()">
            <span class="icon-refresh" [class.spinning]="loading()">↻</span> Refresh Data
          </button>
        </div>
      </div>

      <!-- Overview KPI Cards -->
      @if (analytics()?.overview; as overview) {
        <div class="kpi-grid">
          <div class="kpi-card" data-testid="kpi-total-redemptions">
            <div class="kpi-icon redemptions-icon">🎟️</div>
            <div class="kpi-content">
              <span class="kpi-label">Total Redemptions</span>
              <strong class="kpi-value">{{ overview.total_redemptions }}</strong>
              <span class="kpi-sub">Across all discount codes</span>
            </div>
          </div>

          <div class="kpi-card" data-testid="kpi-unique-members">
            <div class="kpi-icon members-icon">👥</div>
            <div class="kpi-content">
              <span class="kpi-label">Unique Members</span>
              <strong class="kpi-value">{{ overview.unique_members_count }}</strong>
              <span class="kpi-sub">Registered customers</span>
            </div>
          </div>

          <div class="kpi-card" data-testid="kpi-total-discounts">
            <div class="kpi-icon discount-icon">৳</div>
            <div class="kpi-content">
              <span class="kpi-label">Total Discount Given</span>
              <strong class="kpi-value text-emerald">{{ overview.total_discount_granted | bdt }}</strong>
              <span class="kpi-sub">Customer savings</span>
            </div>
          </div>

          <div class="kpi-card" data-testid="kpi-attributed-sales">
            <div class="kpi-icon volume-icon">📈</div>
            <div class="kpi-content">
              <span class="kpi-label">Attributed Sales</span>
              <strong class="kpi-value">{{ overview.total_order_volume | bdt }}</strong>
              <span class="kpi-sub">Gross order volume</span>
            </div>
          </div>
        </div>
      }

      <!-- Navigation Tabs -->
      <div class="tabs-nav" role="tablist">
        <button
          type="button"
          role="tab"
          class="tab-btn"
          [class.active]="activeTab() === 'frequency'"
          (click)="setTab('frequency')"
          data-testid="tab-frequency"
        >
          <span class="tab-title">Member Frequency</span>
          <span class="tab-pill">{{ analytics()?.members?.length || 0 }}</span>
        </button>

        <button
          type="button"
          role="tab"
          class="tab-btn"
          [class.active]="activeTab() === 'ledger'"
          (click)="setTab('ledger')"
          data-testid="tab-ledger"
        >
          <span class="tab-title">Redemption Ledger</span>
          <span class="tab-pill">{{ ledgerItems().length }}</span>
        </button>

        <button
          type="button"
          role="tab"
          class="tab-btn"
          [class.active]="activeTab() === 'performance'"
          (click)="setTab('performance')"
          data-testid="tab-performance"
        >
          <span class="tab-title">Coupon Performance</span>
          <span class="tab-pill">{{ analytics()?.coupons?.length || 0 }}</span>
        </button>

        <button
          type="button"
          role="tab"
          class="tab-btn"
          [class.active]="activeTab() === 'manage'"
          (click)="setTab('manage')"
          data-testid="tab-manage"
        >
          <span class="tab-title">Manage Promo Codes</span>
          <span class="tab-pill">{{ coupons().length }}</span>
        </button>
      </div>

      <!-- TAB 1: Member Frequency & Multi-Coupon Usage -->
      @if (activeTab() === 'frequency') {
        <div class="tab-pane">
          <div class="pane-header">
            <div>
              <h2 class="pane-title">Member Coupon Usage Frequency</h2>
              <p class="pane-desc">
                Identify which members use the same coupon repeatedly or redeem multiple different promo codes.
              </p>
            </div>
            <div class="search-box">
              <input
                type="text"
                class="form-control form-control-sm"
                placeholder="Search member name, email, or code..."
                [ngModel]="memberSearch()"
                (ngModelChange)="memberSearch.set($event)"
              />
            </div>
          </div>

          @if (filteredMembers().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">👥</div>
              <p class="empty-text">No member coupon redemptions found matching your criteria.</p>
            </div>
          } @else {
            <div class="table-card">
              <div class="table-responsive">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Customer / Member</th>
                      <th>Contact Details</th>
                      <th class="text-center">Total Redemptions</th>
                      <th class="text-center">Distinct Coupons</th>
                      <th>Promo Codes Used</th>
                      <th class="text-right">Total Savings (BDT)</th>
                      <th>Last Used</th>
                      <th class="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (m of filteredMembers(); track m.user_id) {
                      <tr>
                        <td>
                          <div class="member-identity">
                            <span class="member-avatar">{{ (m.customer_name || 'U')[0].toUpperCase() }}</span>
                            <div>
                              <strong class="member-name">{{ m.customer_name }}</strong>
                              <span class="member-badge">Member #{{ m.user_id }}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div class="member-contact">
                            <a [href]="'mailto:' + m.customer_email" class="contact-email">{{ m.customer_email }}</a>
                            @if (m.customer_phone) {
                              <span class="contact-phone">{{ m.customer_phone }}</span>
                            }
                          </div>
                        </td>
                        <td class="text-center">
                          <span class="usage-count-badge" [class.high-frequency]="m.total_orders_with_coupons > 1">
                            {{ m.total_orders_with_coupons }} {{ m.total_orders_with_coupons === 1 ? 'time' : 'times' }}
                          </span>
                        </td>
                        <td class="text-center">
                          <span class="distinct-badge" [class.multi-coupon]="m.distinct_coupons_count > 1">
                            {{ m.distinct_coupons_count }} {{ m.distinct_coupons_count === 1 ? 'code' : 'distinct codes' }}
                          </span>
                        </td>
                        <td>
                          <div class="code-badges-wrap">
                            @for (code of splitCodes(m.coupon_codes_used); track code) {
                              <span class="coupon-tag">{{ code }}</span>
                            }
                          </div>
                        </td>
                        <td class="text-right tabular-price font-semibold text-emerald">
                          {{ m.total_discount_saved | bdt }}
                        </td>
                        <td class="text-muted text-xs">
                          {{ m.last_used_at | date:'mediumDate' }}
                        </td>
                        <td class="text-center">
                          <button
                            type="button"
                            class="btn btn-outline btn-xs"
                            (click)="drillDownMember(m.customer_email)"
                            title="Inspect all orders by this member"
                          >
                            Inspect &rarr;
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>
      }

      <!-- TAB 2: Line-by-Line Member Redemption Ledger -->
      @if (activeTab() === 'ledger') {
        <div class="tab-pane">
          <div class="pane-header">
            <div>
              <h2 class="pane-title">Real-Time Coupon Redemption Ledger</h2>
              <p class="pane-desc">
                Line-by-line log of every checkout redemption with customer identity, order number, and discount granted.
              </p>
            </div>
            <div class="filters-row">
              <input
                type="text"
                class="form-control form-control-sm"
                placeholder="Search member name, email, or order #..."
                [ngModel]="ledgerSearch()"
                (ngModelChange)="ledgerSearch.set($event); onLedgerFilterChange()"
              />
              <select
                class="form-control form-control-sm"
                [ngModel]="ledgerCouponFilter()"
                (ngModelChange)="ledgerCouponFilter.set($event); onLedgerFilterChange()"
              >
                <option value="">All Promo Codes</option>
                @for (c of coupons(); track c.id) {
                  <option [value]="c.code">{{ c.code }}</option>
                }
              </select>
              @if (ledgerSearch() || ledgerCouponFilter()) {
                <button type="button" class="btn btn-outline btn-xs" (click)="resetLedgerFilters()">
                  Clear Filter
                </button>
              }
            </div>
          </div>

          @if (ledgerLoading()) {
            <div class="loading-state">
              <div class="spinner"></div>
              <p>Loading redemption ledger...</p>
            </div>
          } @else if (ledgerItems().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">🎟️</div>
              <p class="empty-text">No coupon redemptions recorded for this selection.</p>
            </div>
          } @else {
            <div class="table-card">
              <div class="table-responsive">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Member / Customer</th>
                      <th>Coupon Code</th>
                      <th class="text-right">Order Subtotal</th>
                      <th class="text-right">Discount Granted</th>
                      <th class="text-right">Final Total</th>
                      <th>Order Status</th>
                      <th>Redeemed Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of ledgerItems(); track item.order_id) {
                      <tr>
                        <td>
                          <code class="order-code">{{ item.order_number }}</code>
                        </td>
                        <td>
                          <div class="customer-cell">
                            <strong>{{ item.customer_name }}</strong>
                            <span class="customer-email">{{ item.customer_email }}</span>
                          </div>
                        </td>
                        <td>
                          <span class="coupon-code-badge">
                            {{ item.coupon_code }}
                          </span>
                        </td>
                        <td class="text-right tabular-price">{{ item.subtotal | bdt }}</td>
                        <td class="text-right tabular-price font-semibold text-emerald">
                          -{{ item.discount_amount | bdt }}
                        </td>
                        <td class="text-right tabular-price font-semibold">{{ item.total_amount | bdt }}</td>
                        <td>
                          <span class="badge" [class]="'badge-' + item.order_status">
                            {{ item.order_status }}
                          </span>
                        </td>
                        <td class="text-muted text-xs">
                          {{ item.redeemed_at | date:'medium' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>
      }

      <!-- TAB 3: Coupon Performance Breakdown -->
      @if (activeTab() === 'performance') {
        <div class="tab-pane">
          <div class="pane-header">
            <div>
              <h2 class="pane-title">Coupon Performance &amp; Member Adoption</h2>
              <p class="pane-desc">
                Evaluate which coupons drive the most member redemptions, total sales, and repeat usage.
              </p>
            </div>
          </div>

          <div class="table-card">
            <div class="table-responsive">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Coupon Code</th>
                    <th>Discount Rate</th>
                    <th>Min Order</th>
                    <th>Access</th>
                    <th class="text-center">Total Redemptions</th>
                    <th class="text-center">Unique Members</th>
                    <th class="text-center">Avg Uses / Member</th>
                    <th class="text-right">Total Discount Given</th>
                    <th class="text-right">Attributed Sales</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (cp of analytics()?.coupons || []; track cp.coupon_id) {
                    <tr>
                      <td>
                        <strong class="code-title">{{ cp.code }}</strong>
                      </td>
                      <td>
                        <span class="rate-badge">
                          {{ cp.discount_type === 'percentage' ? cp.discount_value + '%' : (Number(cp.discount_value) | bdt) }}
                        </span>
                      </td>
                      <td class="tabular-price">{{ Number(cp.min_order_amount) | bdt }}</td>
                      <td>
                        <span class="badge" [class]="cp.is_universal ? 'badge-universal' : 'badge-member-only'">
                          {{ cp.is_universal ? '🌐 Universal' : '🔒 Members Only' }}
                        </span>
                      </td>
                      <td class="text-center font-semibold">
                        {{ cp.actual_usage_count }} / {{ cp.usage_limit || '∞' }}
                      </td>
                      <td class="text-center">
                        <span class="member-pill">
                          {{ cp.unique_members_count }} {{ cp.unique_members_count === 1 ? 'member' : 'members' }}
                        </span>
                      </td>
                      <td class="text-center text-muted font-medium">
                        {{ cp.unique_members_count > 0 ? (cp.actual_usage_count / cp.unique_members_count).toFixed(1) + 'x' : '0x' }}
                      </td>
                      <td class="text-right tabular-price font-semibold text-emerald">
                        {{ cp.total_discount_amount | bdt }}
                      </td>
                      <td class="text-right tabular-price font-semibold">
                        {{ cp.total_order_sales | bdt }}
                      </td>
                      <td>
                        <span class="badge" [class]="cp.is_active ? 'badge-stock' : 'badge-danger'">
                          {{ cp.is_active ? 'Active' : 'Inactive' }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- TAB 4: Manage Promo Codes & Create -->
      @if (activeTab() === 'manage') {
        <div class="tab-pane">
          <div class="pane-header">
            <div>
              <h2 class="pane-title">Manage Promo Codes</h2>
              <p class="pane-desc">
                Create new promotional codes, configure discount rates, minimum order thresholds, and redemption caps.
              </p>
            </div>
          </div>

          <div class="coupons-layout">
            <div class="table-card">
              <div class="table-responsive">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Type &amp; Value</th>
                      <th>Min Order</th>
                      <th>Used / Limit</th>
                      <th>Access Permission</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of coupons(); track c.id) {
                      <tr>
                        <td><code>{{ c.code }}</code></td>
                        <td class="tabular-price">
                          {{ c.discount_type === 'percentage' ? c.discount_value + '%' : (Number(c.discount_value) | bdt) }}
                        </td>
                        <td class="tabular-price">{{ Number(c.min_order_amount) | bdt }}</td>
                        <td class="tabular-price">{{ c.used_count }} / {{ c.usage_limit || '∞' }}</td>
                        <td>
                          <button
                            type="button"
                            class="badge-toggle-btn"
                            (click)="toggleUniversalPermission(c)"
                            [title]="c.is_universal ? 'Click to restrict to Whitelisted Members' : 'Click to give Universal Permission'"
                            data-testid="toggle-access-btn"
                          >
                            <span class="badge" [class]="c.is_universal ? 'badge-universal' : 'badge-member-only'">
                              {{ c.is_universal ? '🌐 Universal' : '🔒 Restricted (Whitelisted)' }}
                            </span>
                          </button>
                        </td>
                        <td>
                          <span class="badge" [class]="c.is_active ? 'badge-stock' : 'badge-danger'">
                            {{ c.is_active ? 'Active' : 'Inactive' }}
                          </span>
                        </td>
                        <td>
                          <div class="row-actions">
                            <button
                              type="button"
                              class="btn btn-outline btn-xs"
                              (click)="openWhitelistModal(c)"
                              data-testid="open-whitelist-btn"
                              title="Manage member whitelist"
                            >
                              👥 Whitelist
                            </button>
                            <button
                              type="button"
                              class="btn btn-danger btn-xs"
                              (click)="deleteCoupon(c)"
                              data-testid="delete-coupon-btn"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <form class="form-card" (ngSubmit)="createCoupon()" data-testid="create-coupon-form">
              <h3 class="form-title">Create Promo Code</h3>
              <div class="form-group">
                <label class="form-label">Coupon Code *</label>
                <input
                  type="text"
                  name="code"
                  class="form-control"
                  [(ngModel)]="form.code"
                  placeholder="e.g. SUMMER25"
                  required
                />
              </div>
              <div class="form-group">
                <label class="form-label">Discount Type</label>
                <select name="discount_type" class="form-control" [(ngModel)]="form.discount_type">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (৳)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Discount Value *</label>
                <input
                  type="number"
                  step="0.01"
                  name="discount_value"
                  class="form-control"
                  [(ngModel)]="form.discount_value"
                  required
                />
              </div>
              <div class="form-group">
                <label class="form-label">Minimum Order Subtotal (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  name="min_order_amount"
                  class="form-control"
                  [(ngModel)]="form.min_order_amount"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Usage Limit (Optional)</label>
                <input
                  type="number"
                  name="usage_limit"
                  class="form-control"
                  [(ngModel)]="form.usage_limit"
                  placeholder="e.g. 100"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Access Mode *</label>
                <div class="access-mode-selector">
                  <label class="radio-label">
                    <input
                      type="radio"
                      name="is_universal"
                      [value]="1"
                      [checked]="form.is_universal === 1"
                      (change)="form.is_universal = 1"
                      data-testid="access-mode-universal"
                    />
                    <span><strong>🌐 Universal</strong> (All Customers &amp; Guests)</span>
                  </label>
                  <label class="radio-label">
                    <input
                      type="radio"
                      name="is_universal"
                      [value]="0"
                      [checked]="form.is_universal === 0"
                      (change)="form.is_universal = 0"
                      data-testid="access-mode-restricted"
                    />
                    <span><strong>🔒 Member-Restricted</strong> (Whitelisted Members Only)</span>
                  </label>
                </div>
                <p class="form-hint">
                  Member-restricted coupons require assigning specific members and their custom limits via the Whitelist panel.
                </p>
              </div>
              <button type="submit" class="btn btn-primary btn-sm btn-block">
                Create Coupon
              </button>
            </form>
          </div>
        </div>
      }

      <!-- Coupon Whitelist & Member Access Modal -->
      @if (whitelistModalOpen() && selectedCoupon(); as coupon) {
        <div class="modal-backdrop" (click)="closeWhitelistModal()" data-testid="whitelist-modal-backdrop">
          <div class="modal-card wide-modal" (click)="$event.stopPropagation()" data-testid="whitelist-modal">
            <!-- Modal Header -->
            <div class="modal-header">
              <div class="modal-header-content">
                <div class="modal-title-row">
                  <h2 class="modal-title">
                    Coupon Whitelist &amp; Access: <code class="coupon-code-badge">{{ coupon.code }}</code>
                  </h2>
                  <span
                    class="badge"
                    [class]="coupon.is_universal ? 'badge-universal' : 'badge-member-only'"
                    data-testid="modal-access-badge"
                  >
                    {{ coupon.is_universal ? '🌐 Universal' : '🔒 Member-Restricted' }}
                  </span>
                  <span class="badge badge-neutral" data-testid="modal-member-count">
                    👥 {{ whitelistMembers().length }} Members Assigned
                  </span>
                </div>
                <p class="modal-subtitle">
                  Discount: <strong>{{ coupon.discount_type === 'percentage' ? coupon.discount_value + '%' : (Number(coupon.discount_value) | bdt) }}</strong>
                  &bull; Min Order: <strong>{{ Number(coupon.min_order_amount) | bdt }}</strong>
                  &bull; Overall Usage: <strong>{{ coupon.used_count }} / {{ coupon.usage_limit || '∞' }}</strong>
                </p>
              </div>
              <button
                type="button"
                class="close-btn"
                (click)="closeWhitelistModal()"
                aria-label="Close modal"
                data-testid="close-whitelist-modal-btn"
              >&times;</button>
            </div>

            <!-- Modal Body -->
            <div class="modal-body">
              <!-- Access Mode Toggle inside Modal -->
              <div class="modal-access-banner" [class.universal-mode]="coupon.is_universal">
                <div class="banner-info">
                  <span class="banner-icon">{{ coupon.is_universal ? '🌐' : '🔒' }}</span>
                  <div class="banner-text">
                    <strong>Access Mode: {{ coupon.is_universal ? 'Universal (All Customers)' : 'Restricted (Whitelisted Members Only)' }}</strong>
                    <p>
                      {{ coupon.is_universal
                        ? 'All authenticated customers can redeem this coupon. Switch to Restricted to enforce member whitelists and per-member custom limits.'
                        : 'Only specifically assigned members below can redeem this coupon. Each member is constrained by their individual custom usage limit.' }}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  class="btn btn-outline btn-xs"
                  (click)="toggleUniversalPermission(coupon)"
                  data-testid="modal-toggle-access-btn"
                >
                  Switch to {{ coupon.is_universal ? 'Member-Restricted' : 'Universal' }}
                </button>
              </div>

              <!-- Assign Member Form Card -->
              <div class="assign-member-card">
                <h3 class="card-subtitle">Assign Whitelisted Member</h3>
                <form (ngSubmit)="assignMember()" class="assign-form" data-testid="assign-member-form">
                  <div class="assign-grid">
                    <!-- Member User ID or Email with Autocomplete Typeahead -->
                    <div class="form-group member-input-group">
                      <label class="form-label" for="memberIdentifierInput">
                        Member User ID or Email *
                      </label>
                      <div class="autocomplete-wrapper">
                        <input
                          id="memberIdentifierInput"
                          type="text"
                          class="form-control"
                          [(ngModel)]="memberIdentifier"
                          name="memberIdentifier"
                          placeholder="Search customer name, email, or enter User ID..."
                          (input)="onCustomerSearchInput($event)"
                          (focus)="onCustomerInputFocus()"
                          autocomplete="off"
                          required
                          data-testid="member-identifier-input"
                        />
                        @if (customerSearching()) {
                          <span class="input-spinner">↻</span>
                        }
                        @if (showCustomerDropdown() && customerSearchResults().length > 0) {
                          <ul class="typeahead-dropdown" data-testid="customer-typeahead-dropdown">
                            @for (cust of customerSearchResults(); track cust.id) {
                              <li
                                class="typeahead-item"
                                (click)="selectCustomer(cust)"
                                data-testid="typeahead-item"
                              >
                                <span class="customer-avatar">👤</span>
                                <div class="customer-details">
                                  <strong class="customer-name">{{ cust.full_name || 'Customer' }}</strong>
                                  <span class="customer-email">{{ cust.email }}</span>
                                </div>
                                <span class="customer-id-pill">ID #{{ cust.id }}</span>
                              </li>
                            }
                          </ul>
                        }
                      </div>
                      <span class="field-hint">Search by typing customer name/email or enter numeric User ID or email directly.</span>
                    </div>

                    <!-- Custom Usage Limit Input -->
                    <div class="form-group limit-input-group">
                      <label class="form-label" for="memberLimitInput">
                        Custom Usage Limit *
                      </label>
                      <input
                        id="memberLimitInput"
                        type="number"
                        min="1"
                        step="1"
                        class="form-control"
                        [(ngModel)]="memberUsageLimit"
                        name="memberUsageLimit"
                        placeholder="1"
                        required
                        data-testid="member-limit-input"
                      />
                      <span class="field-hint">Max allowed redemptions for this member (default: 1).</span>
                    </div>

                    <!-- Assign Button -->
                    <div class="form-group action-group">
                      <button
                        type="submit"
                        class="btn btn-primary"
                        [disabled]="assigningMember() || !memberIdentifier.trim()"
                        data-testid="assign-member-btn"
                      >
                        {{ assigningMember() ? 'Assigning...' : '+ Assign Member' }}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              <!-- Whitelisted Members Table Card -->
              <div class="whitelist-table-card">
                <div class="whitelist-table-header">
                  <h3 class="card-subtitle">
                    Assigned Whitelist Members ({{ whitelistMembers().length }})
                  </h3>
                  @if (whitelistLoading()) {
                    <span class="loading-indicator">Loading members...</span>
                  }
                </div>

                @if (whitelistLoading()) {
                  <div class="skeleton-loader">
                    <div class="spinner"></div>
                    <p>Loading whitelisted members...</p>
                  </div>
                } @else if (whitelistMembers().length === 0) {
                  <div class="empty-whitelist-state" data-testid="empty-whitelist-message">
                    <span class="empty-icon">👥</span>
                    <h4>No Whitelisted Members Assigned</h4>
                    <p>
                      When set to Member-Restricted, redemptions will be blocked until members are assigned above.
                    </p>
                  </div>
                } @else {
                  <div class="table-responsive">
                    <table class="admin-table whitelist-table" data-testid="whitelist-members-table">
                      <thead>
                        <tr>
                          <th>Member</th>
                          <th>User ID</th>
                          <th>Usage Count</th>
                          <th>Custom Limit</th>
                          <th>Remaining Uses</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (m of whitelistMembers(); track m.user_id) {
                          <tr [attr.data-testid]="'whitelist-row-' + m.user_id">
                            <td>
                              <div class="member-identity">
                                <strong>{{ m.customer_name || 'Customer' }}</strong>
                                <span class="text-muted">{{ m.customer_email || 'No email' }}</span>
                              </div>
                            </td>
                            <td>
                              <span class="badge badge-id">#{{ m.user_id }}</span>
                            </td>
                            <td>
                              <span class="usage-count-badge" data-testid="member-used-count">
                                🎟️ {{ m.used_count }} {{ m.used_count === 1 ? 'use' : 'uses' }}
                              </span>
                            </td>
                            <td>
                              <div class="limit-edit-cell">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  class="form-control limit-input"
                                  [value]="editingLimits[m.user_id] ?? m.usage_limit"
                                  (input)="onLimitChange(m.user_id, $event)"
                                  [disabled]="savingLimitUserId() === m.user_id"
                                  data-testid="custom-limit-input"
                                />
                                <button
                                  type="button"
                                  class="btn btn-outline btn-xs"
                                  (click)="saveMemberLimit(m)"
                                  [disabled]="savingLimitUserId() === m.user_id || (editingLimits[m.user_id] !== undefined && editingLimits[m.user_id] === m.usage_limit)"
                                  data-testid="save-limit-btn"
                                  title="Save custom limit"
                                >
                                  {{ savingLimitUserId() === m.user_id ? '...' : '✓ Save' }}
                                </button>
                              </div>
                            </td>
                            <td>
                              @let remaining = m.remaining_uses !== undefined ? m.remaining_uses : ((m.usage_limit - m.used_count) > 0 ? (m.usage_limit - m.used_count) : 0);
                              <span
                                class="badge"
                                [class]="remaining > 0 ? 'badge-stock' : 'badge-danger'"
                                data-testid="member-remaining-badge"
                              >
                                {{ remaining > 0 ? (remaining + ' left') : 'Exhausted' }}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                class="btn btn-danger btn-xs"
                                (click)="removeMember(m)"
                                [disabled]="removingUserId() === m.user_id"
                                data-testid="remove-member-btn"
                                title="Remove member from whitelist"
                              >
                                {{ removingUserId() === m.user_id ? 'Removing...' : 'Remove' }}
                              </button>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                (click)="closeWhitelistModal()"
                data-testid="modal-done-btn"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-coupons {
      padding-bottom: 3rem;
    }

    .page-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .head-kicker {
      display: block;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 0.25rem;
    }

    .section-heading {
      font-size: 1.45rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin: 0 0 0.35rem 0;
    }

    .section-subtitle {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0;
      max-width: 650px;
    }

    .head-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .icon-refresh {
      display: inline-block;
      font-size: 1rem;
      transition: transform 0.3s ease;
      &.spinning {
        animation: spin 1s linear infinite;
      }
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 1.75rem;
    }

    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1.15rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }

    .kpi-icon {
      width: 44px;
      height: 44px;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      font-weight: 700;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      flex-shrink: 0;
    }

    .discount-icon {
      color: #059669;
      background: #ecfdf5;
      border-color: #a7f3d0;
    }

    .kpi-content {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .kpi-label {
      font-size: 0.725rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 0.15rem;
    }

    .kpi-value {
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
    }

    .kpi-sub {
      font-size: 0.725rem;
      color: #94a3b8;
      margin-top: 0.15rem;
    }

    .text-emerald {
      color: #059669 !important;
    }

    /* Tabs Navigation */
    .tabs-nav {
      display: flex;
      gap: 0.35rem;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 1.5rem;
      overflow-x: auto;
      padding-bottom: 1px;
    }

    .tab-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #64748b;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;

      &:hover {
        color: #0f172a;
      }

      &.active {
        color: #0f172a;
        border-bottom-color: #0f172a;
      }
    }

    .tab-pill {
      font-size: 0.6875rem;
      padding: 0.125rem 0.45rem;
      border-radius: 9999px;
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
    }

    .tab-btn.active .tab-pill {
      background: #0f172a;
      color: #ffffff;
    }

    /* Pane Header */
    .pane-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 1.15rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .pane-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.25rem 0;
    }

    .pane-desc {
      font-size: 0.8125rem;
      color: #64748b;
      margin: 0;
    }

    .search-box {
      width: 280px;
    }

    .filters-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    /* Table & Cards */
    .table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    }

    .table-responsive {
      overflow-x: auto;
      width: 100%;
    }

    .admin-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
      text-align: left;

      th, td {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid #f1f5f9;
      }

      th {
        background: #f8fafc;
        font-size: 0.6875rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #475569;
        white-space: nowrap;
      }

      tbody tr:hover {
        background: #fafafa;
      }
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-muted { color: #64748b; }
    .text-xs { font-size: 0.75rem; }
    .font-semibold { font-weight: 600; }
    .font-medium { font-weight: 500; }

    /* Member Details Cells */
    .member-identity {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .member-avatar {
      width: 32px;
      height: 32px;
      border-radius: 9999px;
      background: #e2e8f0;
      color: #1e293b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8125rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .member-name {
      display: block;
      color: #0f172a;
      font-size: 0.825rem;
    }

    .member-badge {
      display: block;
      font-size: 0.6875rem;
      color: #64748b;
    }

    .member-contact {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .contact-email {
      color: #2563eb;
      text-decoration: none;
      font-size: 0.8rem;
      &:hover { text-decoration: underline; }
    }

    .contact-phone {
      font-size: 0.75rem;
      color: #64748b;
    }

    .usage-count-badge {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: #f1f5f9;
      color: #334155;

      &.high-frequency {
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fde68a;
      }
    }

    .distinct-badge {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: #f1f5f9;
      color: #334155;

      &.multi-coupon {
        background: #ede9fe;
        color: #6d28d9;
        border: 1px solid #ddd6fe;
      }
    }

    .code-badges-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .coupon-tag {
      font-family: monospace;
      font-size: 0.725rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 0.25rem;
      color: #0f172a;
    }

    .order-code {
      font-family: monospace;
      font-weight: 600;
      font-size: 0.75rem;
      color: #0f172a;
    }

    .customer-cell {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .customer-email {
      font-size: 0.75rem;
      color: #64748b;
    }

    .coupon-code-badge {
      display: inline-block;
      font-family: monospace;
      font-weight: 700;
      font-size: 0.775rem;
      padding: 0.2rem 0.5rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1d4ed8;
      border-radius: 0.25rem;
    }

    .code-title {
      font-family: monospace;
      font-size: 0.85rem;
      color: #0f172a;
    }

    .rate-badge {
      display: inline-block;
      padding: 0.15rem 0.45rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 700;
      background: #f1f5f9;
      color: #334155;
    }

    .member-pill {
      font-size: 0.75rem;
      padding: 0.15rem 0.45rem;
      border-radius: 9999px;
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 600;
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .badge-stock { background: #dcfce7; color: #15803d; }
    .badge-danger { background: #fee2e2; color: #b91c1c; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .badge-confirmed, .badge-processing { background: #e0f2fe; color: #0369a1; }
    .badge-shipped, .badge-dispatched { background: #ede9fe; color: #6d28d9; }
    .badge-delivered { background: #dcfce7; color: #15803d; }
    .badge-cancelled { background: #fee2e2; color: #b91c1c; }
    .badge-universal { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
    .badge-member-only { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }

    .badge-toggle-btn {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      display: inline-flex;
      transition: transform 0.15s ease;
      &:hover { transform: scale(1.05); }
    }

    .checkbox-group {
      margin-top: 0.5rem;
      padding: 0.65rem 0.75rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: #0f172a;
      cursor: pointer;
    }

    .form-hint {
      font-size: 0.725rem;
      color: #64748b;
      margin: 0.35rem 0 0 1.45rem;
      line-height: 1.35;
    }

    /* Coupons Layout (Tab 4) */
    .coupons-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
      @media (min-width: 992px) {
        grid-template-columns: 1.4fr 0.6fr;
      }
    }

    .form-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1.25rem;
      height: fit-content;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    }

    .form-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 1rem 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .form-group {
      margin-bottom: 0.85rem;
    }

    .form-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.25rem;
    }

    .form-control {
      width: 100%;
      padding: 0.45rem 0.65rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      font-size: 0.8125rem;
      background: #ffffff;
      color: #0f172a;
      box-sizing: border-box;

      &:focus {
        outline: none;
        border-color: #0f172a;
      }
    }

    .form-control-sm {
      padding: 0.35rem 0.55rem;
      font-size: 0.775rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
      border: 1px solid transparent;
    }

    .btn-sm {
      padding: 0.4rem 0.75rem;
      font-size: 0.775rem;
    }

    .btn-xs {
      padding: 0.25rem 0.5rem;
      font-size: 0.7rem;
    }

    .btn-primary {
      background: #0f172a;
      color: #ffffff;
      &:hover { background: #1e293b; }
    }

    .btn-outline {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #334155;
      &:hover {
        background: #f8fafc;
        border-color: #94a3b8;
      }
    }

    .btn-danger {
      background: #fee2e2;
      color: #b91c1c;
      border-color: #fecaca;
      &:hover {
        background: #fca5a5;
        color: #7f1d1d;
      }
    }

    .btn-block {
      width: 100%;
    }

    /* States */
    .empty-state {
      padding: 3rem 1rem;
      text-align: center;
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 0.5rem;
    }

    .empty-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .empty-text {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0;
    }

    .loading-state {
      padding: 3rem 1rem;
      text-align: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
    }

    .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid #e2e8f0;
      border-top-color: #0f172a;
      border-radius: 50%;
      margin: 0 auto 0.75rem auto;
      animation: spin 0.8s linear infinite;
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
      background: #ffffff;
      border-radius: 6px;
      width: 100%;
      max-width: 640px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      border: 1px solid #e2e8f0;
      animation: modalFadeIn 0.2s ease-out;
    }

    .modal-card.wide-modal {
      max-width: 920px;
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: #fafafa;
    }

    .modal-header-content {
      flex: 1;
    }

    .modal-title-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.6rem;
    }

    .modal-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .coupon-code-badge {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 0.15rem 0.45rem;
      border-radius: 3px;
      font-size: 0.9em;
      font-family: monospace;
      font-weight: 700;
      color: #0f172a;
    }

    .badge-neutral {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
    }

    .badge-id {
      background: #e2e8f0;
      color: #334155;
      font-family: monospace;
      font-size: 0.75rem;
      padding: 0.15rem 0.4rem;
    }

    .modal-subtitle {
      font-size: 0.8rem;
      color: #64748b;
      margin: 0.35rem 0 0 0;
    }

    .close-btn {
      background: transparent;
      border: none;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      color: #64748b;
      padding: 0 0.25rem;
      &:hover { color: #0f172a; }
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      background: #fafafa;
    }

    .modal-access-banner {
      padding: 0.875rem 1rem;
      border-radius: 4px;
      background: #fef2f2;
      border: 1px solid #fee2e2;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .modal-access-banner.universal-mode {
      background: #eff6ff;
      border-color: #dbeafe;
    }

    .banner-info {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .banner-icon {
      font-size: 1.25rem;
      line-height: 1.2;
    }

    .banner-text {
      strong {
        font-size: 0.875rem;
        color: #0f172a;
        display: block;
        margin-bottom: 0.2rem;
      }
      p {
        font-size: 0.78rem;
        color: #475569;
        margin: 0;
        line-height: 1.4;
      }
    }

    .assign-member-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 1.15rem 1.25rem;
    }

    .card-subtitle {
      font-size: 0.9rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.85rem 0;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .assign-form {
      display: block;
    }

    .assign-grid {
      display: grid;
      grid-template-columns: 2fr 1fr auto;
      gap: 1rem;
      align-items: flex-start;
    }

    .member-input-group {
      margin-bottom: 0;
    }

    .limit-input-group {
      margin-bottom: 0;
    }

    .action-group {
      margin-bottom: 0;
      padding-top: 1.55rem;
    }

    .autocomplete-wrapper {
      position: relative;
    }

    .input-spinner {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.85rem;
      color: #64748b;
      animation: spin 0.8s linear infinite;
    }

    .typeahead-dropdown {
      position: absolute;
      top: calc(100% + 2px);
      left: 0;
      right: 0;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      max-height: 220px;
      overflow-y: auto;
      z-index: 1050;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .typeahead-item {
      padding: 0.6rem 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      cursor: pointer;
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.15s ease;
      &:last-child { border-bottom: none; }
      &:hover { background: #f8fafc; }
    }

    .customer-avatar {
      font-size: 1.1rem;
    }

    .customer-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .customer-name {
      font-size: 0.82rem;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .customer-email {
      font-size: 0.75rem;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .customer-id-pill {
      font-size: 0.72rem;
      font-family: monospace;
      background: #e2e8f0;
      color: #334155;
      padding: 0.15rem 0.4rem;
      border-radius: 3px;
    }

    .field-hint {
      display: block;
      font-size: 0.72rem;
      color: #64748b;
      margin-top: 0.35rem;
    }

    .whitelist-table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 1.15rem 1.25rem;
    }

    .whitelist-table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      .card-subtitle { margin-bottom: 0; }
    }

    .loading-indicator {
      font-size: 0.78rem;
      color: #64748b;
    }

    .whitelist-table {
      margin-top: 0.5rem;
      th { font-size: 0.75rem; }
      td { font-size: 0.82rem; vertical-align: middle; }
    }

    .member-identity {
      display: flex;
      flex-direction: column;
      strong { font-size: 0.85rem; color: #0f172a; }
      .text-muted { font-size: 0.75rem; color: #64748b; }
    }

    .usage-count-badge {
      font-size: 0.82rem;
      font-weight: 600;
      color: #0f172a;
    }

    .limit-edit-cell {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .limit-input {
      width: 70px;
      padding: 0.25rem 0.4rem;
      font-size: 0.82rem;
      height: 30px;
    }

    .empty-whitelist-state {
      padding: 2.5rem 1rem;
      text-align: center;
      background: #fafafa;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      .empty-icon { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
      h4 { font-size: 0.95rem; font-weight: 700; color: #0f172a; margin: 0 0 0.35rem 0; }
      p { font-size: 0.8rem; color: #64748b; margin: 0; max-width: 480px; margin: 0 auto; }
    }

    .skeleton-loader {
      padding: 2rem 1rem;
      text-align: center;
      color: #64748b;
      p { font-size: 0.85rem; margin: 0.5rem 0 0 0; }
    }

    .row-actions {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .access-mode-selector {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 0.35rem;
      padding: 0.75rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
    }

    .radio-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      cursor: pointer;
      color: #1e293b;
    }
  `],
})
export class AdminCouponsComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  readonly Number = Number;

  // Active Tab
  readonly activeTab = signal<'frequency' | 'ledger' | 'performance' | 'manage'>('frequency');

  // Loading States
  readonly loading = signal<boolean>(false);
  readonly ledgerLoading = signal<boolean>(false);

  // Data Signals
  readonly coupons = signal<Coupon[]>([]);
  readonly analytics = signal<CouponAnalytics | null>(null);
  readonly ledgerItems = signal<CouponMemberUsageItem[]>([]);

  // Search & Filter Signals
  readonly memberSearch = signal<string>('');
  readonly ledgerSearch = signal<string>('');
  readonly ledgerCouponFilter = signal<string>('');

  // Whitelist Modal State
  readonly whitelistModalOpen = signal<boolean>(false);
  readonly selectedCoupon = signal<Coupon | null>(null);
  readonly whitelistMembers = signal<CouponMember[]>([]);
  readonly whitelistLoading = signal<boolean>(false);
  readonly assigningMember = signal<boolean>(false);

  // Assign Member Form
  memberIdentifier = '';
  memberUsageLimit: number = 1;

  // Customer Autocomplete Typeahead
  readonly customerSearchResults = signal<User[]>([]);
  readonly customerSearching = signal<boolean>(false);
  readonly showCustomerDropdown = signal<boolean>(false);
  private customerSearchTimeout: any = null;

  // Inline Custom Limit Editing State
  readonly editingLimits: { [userId: number]: number } = {};
  readonly savingLimitUserId = signal<number | null>(null);
  readonly removingUserId = signal<number | null>(null);

  // Form for Coupon Creation
  form: {
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_order_amount: number;
    usage_limit: number | null;
    is_active: number;
    is_universal: number;
  } = {
    code: '',
    discount_type: 'percentage',
    discount_value: 15,
    min_order_amount: 50,
    usage_limit: 100,
    is_active: 1,
    is_universal: 0,
  };

  // Computed Filtered Members
  readonly filteredMembers = computed<CouponMemberSummary[]>(() => {
    const list = this.analytics()?.members || [];
    const query = this.memberSearch().trim().toLowerCase();
    if (!query) return list;

    return list.filter((m) => {
      const name = (m.customer_name || '').toLowerCase();
      const email = (m.customer_email || '').toLowerCase();
      const phone = (m.customer_phone || '').toLowerCase();
      const codes = (m.coupon_codes_used || '').toLowerCase();
      return name.includes(query) || email.includes(query) || phone.includes(query) || codes.includes(query);
    });
  });

  ngOnInit(): void {
    this.refreshAll();
  }

  setTab(tab: 'frequency' | 'ledger' | 'performance' | 'manage'): void {
    this.activeTab.set(tab);
    if (tab === 'ledger' && this.ledgerItems().length === 0) {
      this.loadLedger();
    }
  }

  refreshAll(): void {
    this.loading.set(true);
    this.loadCoupons();
    this.loadAnalytics();
    this.loadLedger();
  }

  loadCoupons(): void {
    this.adminService.getCoupons().subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.coupons.set(res.data);
        }
      },
    });
  }

  loadAnalytics(): void {
    this.adminService.getCouponAnalytics().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.analytics.set(res.data);
        }
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  loadLedger(): void {
    this.ledgerLoading.set(true);
    this.adminService
      .getCouponMemberUsage({
        search: this.ledgerSearch() || undefined,
        couponCode: this.ledgerCouponFilter() || undefined,
        limit: 100,
      })
      .subscribe({
        next: (res) => {
          this.ledgerLoading.set(false);
          if (res.success && Array.isArray(res.data)) {
            this.ledgerItems.set(res.data);
          }
        },
        error: () => {
          this.ledgerLoading.set(false);
        },
      });
  }

  onLedgerFilterChange(): void {
    this.loadLedger();
  }

  resetLedgerFilters(): void {
    this.ledgerSearch.set('');
    this.ledgerCouponFilter.set('');
    this.loadLedger();
  }

  drillDownMember(email: string): void {
    this.ledgerSearch.set(email);
    this.setTab('ledger');
    this.loadLedger();
  }

  splitCodes(codesStr?: string): string[] {
    if (!codesStr) return [];
    return codesStr.split(',').map((c) => c.trim()).filter(Boolean);
  }

  createCoupon(): void {
    if (!this.form.code.trim()) return;
    this.adminService
      .createCoupon({
        ...this.form,
        code: this.form.code.trim().toUpperCase(),
      })
      .subscribe({
        next: () => {
          this.toast.success('Coupon created successfully.');
          this.form.code = '';
          this.loadCoupons();
          this.loadAnalytics();
        },
        error: (err) => this.toast.error(err?.error?.message || 'Could not create coupon.'),
      });
  }

  deleteCoupon(c: Coupon): void {
    if (!confirm(`Are you sure you want to delete coupon "${c.code}"?`)) return;
    this.adminService.deleteCoupon(c.id).subscribe({
      next: () => {
        this.toast.info(`Deleted coupon ${c.code}.`);
        this.loadCoupons();
        this.loadAnalytics();
      },
      error: (err) => this.toast.error(err?.error?.message || 'Could not delete coupon.'),
    });
  }

  toggleUniversalPermission(c: Coupon): void {
    const nextVal = c.is_universal ? 0 : 1;
    this.adminService.updateCoupon(c.id, { is_universal: nextVal }).subscribe({
      next: () => {
        const label = nextVal === 1 ? 'Universal' : 'Restricted (Whitelisted)';
        this.toast.success(`Coupon "${c.code}" permission updated to ${label}.`);
        c.is_universal = nextVal;
        if (this.selectedCoupon()?.id === c.id) {
          this.selectedCoupon.set({ ...c, is_universal: nextVal });
        }
        this.loadCoupons();
        this.loadAnalytics();
      },
      error: (err) => this.toast.error(err?.error?.message || 'Could not update coupon permission.'),
    });
  }

  openWhitelistModal(c: Coupon): void {
    this.selectedCoupon.set(c);
    this.whitelistModalOpen.set(true);
    this.memberIdentifier = '';
    this.memberUsageLimit = 1;
    this.showCustomerDropdown.set(false);
    this.customerSearchResults.set([]);
    this.loadCouponMembers(c.id);
  }

  closeWhitelistModal(): void {
    this.whitelistModalOpen.set(false);
    this.selectedCoupon.set(null);
    this.whitelistMembers.set([]);
    this.showCustomerDropdown.set(false);
    this.customerSearchResults.set([]);
    if (this.customerSearchTimeout) {
      clearTimeout(this.customerSearchTimeout);
    }
  }

  loadCouponMembers(couponId: number): void {
    this.whitelistLoading.set(true);
    this.adminService.getCouponMembers(couponId).subscribe({
      next: (res) => {
        this.whitelistLoading.set(false);
        if (res.success && Array.isArray(res.data)) {
          this.whitelistMembers.set(res.data);
          res.data.forEach((m) => {
            this.editingLimits[m.user_id] = m.usage_limit;
          });
        }
      },
      error: () => {
        this.whitelistLoading.set(false);
        this.toast.error('Failed to load whitelisted members.');
      },
    });
  }

  onCustomerSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const query = (input?.value || '').trim();
    this.memberIdentifier = query;

    if (this.customerSearchTimeout) {
      clearTimeout(this.customerSearchTimeout);
    }

    if (query.length < 2) {
      this.showCustomerDropdown.set(false);
      this.customerSearchResults.set([]);
      return;
    }

    this.customerSearchTimeout = setTimeout(() => {
      this.customerSearching.set(true);
      this.adminService.getCustomers({ search: query, limit: 8 }).subscribe({
        next: (res) => {
          this.customerSearching.set(false);
          if (res.success && Array.isArray(res.data)) {
            this.customerSearchResults.set(res.data);
            this.showCustomerDropdown.set(res.data.length > 0);
          }
        },
        error: () => {
          this.customerSearching.set(false);
        },
      });
    }, 250);
  }

  onCustomerInputFocus(): void {
    if (this.customerSearchResults().length > 0) {
      this.showCustomerDropdown.set(true);
    }
  }

  selectCustomer(cust: User): void {
    this.memberIdentifier = cust.email || String(cust.id);
    this.showCustomerDropdown.set(false);
  }

  assignMember(): void {
    const coupon = this.selectedCoupon();
    if (!coupon) return;

    const raw = this.memberIdentifier.trim();
    if (!raw) {
      this.toast.info('Please enter a User ID or Email.');
      return;
    }

    const limit = Math.max(1, Math.floor(Number(this.memberUsageLimit) || 1));
    const isNumericId = /^\d+$/.test(raw);
    const payload = isNumericId
      ? { user_id: parseInt(raw, 10), usage_limit: limit }
      : { email: raw, usage_limit: limit };

    this.assigningMember.set(true);
    this.adminService.addCouponMember(coupon.id, payload).subscribe({
      next: (res) => {
        this.assigningMember.set(false);
        this.toast.success(res?.message || 'Member assigned to whitelist successfully.');
        this.memberIdentifier = '';
        this.memberUsageLimit = 1;
        this.showCustomerDropdown.set(false);
        this.loadCouponMembers(coupon.id);
      },
      error: (err) => {
        this.assigningMember.set(false);
        const status = err?.status;
        if (status === 409) {
          this.toast.error(err?.error?.message || 'Member is already whitelisted for this coupon.');
        } else if (status === 404) {
          this.toast.error(err?.error?.message || 'User not found. Please verify the User ID or Email.');
        } else {
          this.toast.error(err?.error?.message || 'Could not assign member to whitelist.');
        }
      },
    });
  }

  onLimitChange(userId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = Number(input?.value);
    if (!isNaN(val) && val >= 1) {
      this.editingLimits[userId] = val;
    }
  }

  saveMemberLimit(member: CouponMember): void {
    const coupon = this.selectedCoupon();
    if (!coupon) return;

    const rawVal = this.editingLimits[member.user_id] ?? member.usage_limit;
    const newLimit = Math.max(1, Math.floor(Number(rawVal) || 1));

    this.savingLimitUserId.set(member.user_id);
    this.adminService.updateCouponMemberLimit(coupon.id, member.user_id, newLimit).subscribe({
      next: () => {
        this.savingLimitUserId.set(null);
        this.toast.success('Custom usage limit updated successfully.');
        member.usage_limit = newLimit;
        member.remaining_uses = Math.max(0, newLimit - member.used_count);
        delete this.editingLimits[member.user_id];
        this.whitelistMembers.set([...this.whitelistMembers()]);
      },
      error: (err) => {
        this.savingLimitUserId.set(null);
        this.toast.error(err?.error?.message || 'Failed to update member usage limit.');
      },
    });
  }

  removeMember(member: CouponMember): void {
    const coupon = this.selectedCoupon();
    if (!coupon) return;

    if (!confirm(`Remove ${member.customer_name || 'member'} from ${coupon.code} whitelist?`)) {
      return;
    }

    this.removingUserId.set(member.user_id);
    this.adminService.removeCouponMember(coupon.id, member.user_id).subscribe({
      next: (res) => {
        this.removingUserId.set(null);
        this.toast.success(res?.message || 'Member removed from whitelist successfully.');
        this.whitelistMembers.set(this.whitelistMembers().filter((m) => m.user_id !== member.user_id));
      },
      error: (err) => {
        this.removingUserId.set(null);
        this.toast.error(err?.error?.message || 'Could not remove member from whitelist.');
      },
    });
  }
}
