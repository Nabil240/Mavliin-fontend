import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Address, CouponValidationResult } from '../../../core/models/api.models';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { BdtCurrencyPipe } from '../../../shared/pipes/bdt.pipe';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BdtCurrencyPipe],
  template: `
    <div class="checkout-page container">
      <header class="checkout-header">
        <h1 class="section-heading">CHECKOUT &amp; DELIVERY</h1>
        <p class="section-subtitle">Complete your order with Cash on Delivery (COD) or Mobile Financial Services (bKash, Nagad, Rocket, Upay)</p>
      </header>

      @if (cart.items().length === 0) {
        <div class="empty-checkout">
          <h2>Your shopping bag is empty</h2>
          <p>Add garments to your bag before proceeding to checkout.</p>
          <a routerLink="/catalog" class="btn btn-primary">Explore Collection</a>
        </div>
      } @else {
        <form class="checkout-grid" (ngSubmit)="placeOrder()">
          <!-- Left Column: Customer, Shipping Address & Payment Method -->
          <div class="checkout-form-col">
            @if (!auth.isAuthenticated()) {
              <div class="guest-banner">
                <div>
                  <strong>Checking out as a Guest</strong>
                  <p>Sign in or register to unlock promo discounts, access saved addresses, and checkout faster.</p>
                </div>
                <div class="guest-banner-actions">
                  <a [routerLink]="['/auth/login']" [queryParams]="{ returnUrl: '/checkout' }" class="btn btn-outline btn-sm">
                    Sign In
                  </a>
                  <a [routerLink]="['/auth/register']" [queryParams]="{ returnUrl: '/checkout' }" class="btn btn-primary btn-sm">
                    Register
                  </a>
                </div>
              </div>
            }

            <!-- Saved Addresses Picker (Signed-in Customer) -->
            @if (auth.isAuthenticated() && savedAddresses().length > 0) {
              <section class="checkout-card">
                <h3>1. Saved Delivery Addresses</h3>
                <div class="saved-addresses-grid">
                  @for (addr of savedAddresses(); track addr.id) {
                    <div
                      class="saved-addr-card"
                      [class.selected]="selectedAddressId() === addr.id"
                      (click)="selectSavedAddress(addr)"
                    >
                      <div class="addr-top">
                        <strong>{{ addr.label || 'Saved Address' }}</strong>
                        @if (addr.is_default) {
                          <span class="badge badge-stock">Default</span>
                        }
                      </div>
                      <div class="addr-recipient">{{ addr.recipient_name }} &bull; {{ addr.phone }}</div>
                      <div class="addr-lines">
                        {{ addr.street_address }}@if (addr.area) {, {{ addr.area }}}, {{ addr.city }} {{ addr.postal_code }}
                      </div>
                    </div>
                  }
                </div>
              </section>
            }

            <!-- Delivery Details Form -->
            <section class="checkout-card">
              <h3>{{ auth.isAuthenticated() && savedAddresses().length > 0 ? '2. Delivery Recipient & Address' : '1. Delivery Recipient & Address' }}</h3>

              @if (!auth.isAuthenticated()) {
                <div class="form-group">
                  <label class="form-label" for="guestEmail">Email Address (for Order Receipt &amp; Tracking)</label>
                  <input
                    id="guestEmail"
                    type="email"
                    name="guestEmail"
                    class="form-control"
                    [(ngModel)]="guestEmail"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              }

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label" for="recipientName">Recipient Full Name *</label>
                  <input
                    id="recipientName"
                    type="text"
                    name="recipientName"
                    class="form-control"
                    [(ngModel)]="recipientName"
                    placeholder="e.g. Tariqul Islam"
                    required
                  />
                </div>
                <div class="form-group">
                  <label class="form-label" for="phone">Mobile Number *</label>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    class="form-control"
                    [(ngModel)]="phone"
                    placeholder="+880 1711-000000"
                    required
                  />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="streetAddress">Street Address / House &amp; Road *</label>
                <input
                  id="streetAddress"
                  type="text"
                  name="streetAddress"
                  class="form-control"
                  [(ngModel)]="streetAddress"
                  placeholder="House 48, Road 11, Block F"
                  required
                />
              </div>

              <div class="form-row-3">
                <div class="form-group">
                  <label class="form-label" for="area">Area / Thana</label>
                  <input
                    id="area"
                    type="text"
                    name="area"
                    class="form-control"
                    [(ngModel)]="area"
                    placeholder="Banani / Dhanmondi / Uttara"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label" for="citySelect">District / Region (All 64 Districts) *</label>
                  <select
                    id="citySelect"
                    name="city"
                    class="form-control"
                    [ngModel]="city()"
                    (ngModelChange)="city.set($event)"
                    required
                  >
                    @for (group of bdDistricts; track group.division) {
                      <optgroup [label]="group.division">
                        @for (d of group.districts; track d) {
                          <option [value]="d">
                            {{ d }} ({{ d === 'Dhaka' ? 'Inside Dhaka — ' + (insideDhakaFee() | bdt) : 'Outside Dhaka — ' + (outsideDhakaFee() | bdt) }})
                          </option>
                        }
                      </optgroup>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" for="postalCode">Postal Code *</label>
                  <input
                    id="postalCode"
                    type="text"
                    name="postalCode"
                    class="form-control"
                    [(ngModel)]="postalCode"
                    placeholder="1213"
                    required
                  />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="orderNotes">Delivery Instructions (Optional)</label>
                <textarea
                  id="orderNotes"
                  name="notes"
                  rows="2"
                  class="form-control"
                  [(ngModel)]="notes"
                  placeholder="Gate code, preferred delivery time, or landmarks..."
                ></textarea>
              </div>
            </section>

            <!-- Payment Method Card: COD + Manual Bank Transfer + bKash, Nagad, Rocket, Upay -->
            <section class="checkout-card">
              <h3>{{ auth.isAuthenticated() && savedAddresses().length > 0 ? '3. Payment Method' : '2. Payment Method' }}</h3>

              @if (requiredAdvanceAmount() > 0) {
                <div class="advance-requirement-alert">
                  <div class="adv-alert-title">
                    ⚠️ Advance Payment Required ({{ requiredAdvanceAmount() | bdt }})
                  </div>
                  <p class="adv-alert-desc">
                    One or more garments in your bag require an advance payment. Full Cash on Delivery without advance is disabled. Please select Bank Transfer or an MFS gateway and provide your transaction reference below.
                  </p>
                </div>
              }

              <div class="payment-methods-grid">
                @for (pm of paymentMethods; track pm.id) {
                  <div
                    class="payment-option-card"
                    [class.selected]="paymentProvider() === pm.id"
                    (click)="selectPaymentMethod(pm.id)"
                  >
                    <div class="pm-radio-header">
                      <div class="radio-circle">
                        @if (paymentProvider() === pm.id) {
                          <div class="radio-dot"></div>
                        }
                      </div>
                      <div class="pm-title-wrap">
                        <strong>{{ pm.name }}</strong>
                        <span class="pm-badge" [class]="'pm-badge-' + pm.id">{{ pm.badge }}</span>
                      </div>
                    </div>
                    <p class="pm-desc">{{ pm.description }}</p>
                  </div>
                }
              </div>

              @if (paymentProvider() !== 'cod') {
                <div class="mfs-verification-box anim-fade-up">
                  @if (paymentProvider() === 'manual') {
                    <div class="mfs-instructions">
                      <div class="mfs-step-header">
                        <span class="pm-badge pm-badge-manual">The City Bank PLC — Corporate Account</span>
                        <span class="mfs-amount tabular-price">
                          {{ requiredAdvanceAmount() > 0 ? 'Minimum Advance to Transfer: ' : 'Total to Transfer: ' }}
                          <strong>{{ (requiredAdvanceAmount() > 0 ? requiredAdvanceAmount() : grandTotal()) | bdt }}</strong>
                        </span>
                      </div>
                      <div class="bank-details-card">
                        <div class="bank-row"><span>Bank Name:</span> <strong>The City Bank PLC</strong></div>
                        <div class="bank-row"><span>Account Name:</span> <strong>MAVLLIN APPARELS LTD</strong></div>
                        <div class="bank-row"><span>Account Number:</span> <strong class="tabular-price">1102938475001</strong></div>
                        <div class="bank-row"><span>Branch:</span> <strong>Gulshan-2 Corporate Branch, Dhaka</strong></div>
                        <div class="bank-row"><span>Routing Number:</span> <strong class="tabular-price">225272345</strong></div>
                      </div>
                      <ol class="mfs-steps">
                        <li>Transfer via CityTouch App, NPSB / BEFTN from any Bangladeshi bank, or deposit at any City Bank branch.</li>
                        <li>Enter your <strong>Sender Account / Mobile Number</strong> and the <strong>Bank Reference / Transaction ID (TrxID)</strong> below. Our finance team will verify the deposit and confirm your order.</li>
                      </ol>
                    </div>
                  } @else {
                    <div class="mfs-instructions">
                      <div class="mfs-step-header">
                        <span class="pm-badge" [class]="'pm-badge-' + paymentProvider()">{{ selectedMethodLabel() }} Payment Verification</span>
                        <span class="mfs-amount tabular-price">
                          {{ requiredAdvanceAmount() > 0 ? 'Minimum Advance to Send: ' : 'Amount to Send: ' }}
                          <strong>{{ (requiredAdvanceAmount() > 0 ? requiredAdvanceAmount() : grandTotal()) | bdt }}</strong>
                        </span>
                      </div>
                      <ol class="mfs-steps">
                        <li>Open your <strong>{{ selectedMethodLabel() }}</strong> app or dial USSD menu and choose <strong>Send Money / Payment</strong>.</li>
                        <li>Send <strong class="tabular-price">{{ (requiredAdvanceAmount() > 0 ? requiredAdvanceAmount() : grandTotal()) | bdt }}</strong> to our official {{ selectedMethodLabel() }} number: <code class="merchant-num">01711-000000</code></li>
                        <li>Enter your <strong>Sender Mobile Number</strong> and the <strong>Transaction ID (TrxID)</strong> below. Our team will cross-check your transaction and confirm your order as <strong>Paid</strong>.</li>
                      </ol>
                    </div>
                  }

                  <div class="form-row-2 mfs-inputs">
                    <div class="form-group">
                      <label class="form-label" for="senderPhone">{{ paymentProvider() === 'manual' ? 'Sender Account / Phone Number *' : selectedMethodLabel() + ' Sender Number *' }}</label>
                      <input
                        id="senderPhone"
                        type="tel"
                        name="paymentSenderPhone"
                        class="form-control"
                        maxlength="30"
                        [(ngModel)]="paymentSenderPhone"
                        placeholder="e.g. 01711000000"
                      />
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="trxIdInput">{{ paymentProvider() === 'manual' ? 'Bank Reference / TrxID *' : selectedMethodLabel() + ' Transaction ID (TrxID) *' }}</label>
                      <input
                        id="trxIdInput"
                        type="text"
                        name="paymentTransactionId"
                        class="form-control trx-input"
                        maxlength="120"
                        [(ngModel)]="paymentTransactionId"
                        placeholder="e.g. BKS9823471X / CTB72819384"
                      />
                    </div>
                  </div>
                </div>
              }
            </section>
          </div>

          <!-- Right Column: Order Summary & Promo Code -->
          <aside class="checkout-summary-col">
            <div class="summary-card">
              <h3>YOUR ORDER ({{ cart.totalItems() }} ITEMS)</h3>

              <ul class="summary-items">
                @for (item of cart.items(); track item.variant_id || item.id) {
                  <li>
                    <img
                      [src]="item.thumbnail_url || '/uploads/products/prod-overshirt-1.svg'"
                      [alt]="item.product_name"
                    />
                    <div class="sum-info">
                      <div class="sum-name">{{ item.product_name }}</div>
                      <div class="sum-variant">
                        @if (item.size) { Size: {{ item.size }} }
                        @if (item.color) { &bull; {{ item.color }} }
                        &bull; Qty: {{ item.quantity }}
                      </div>
                    </div>
                    <div class="sum-price tabular-price">
                      {{ (item.effective_price * item.quantity) | bdt }}
                    </div>
                  </li>
                }
              </ul>

              <!-- Coupon Code Validation -->
              <div class="promo-section">
                <label class="form-label" for="checkoutCoupon">Promo / Discount Code</label>

                @if (!auth.isAuthenticated()) {
                  <div class="guest-promo-banner" data-testid="guest-coupon-banner">
                    <div class="banner-content">
                      <div class="banner-title">
                        <svg class="lock-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        <strong>Member Exclusive Discounts</strong>
                      </div>
                      <p>
                        Log in or create a MAVLLIN account to unlock and apply promo coupons.
                        @if (!guestUniversalUnlocked()) {
                          <button type="button" class="universal-unlock-link" (click)="unlockUniversalCoupon()">Have a universal code?</button>
                        }
                      </p>
                    </div>
                    <div class="banner-actions">
                      <a [routerLink]="['/auth/login']" [queryParams]="{ returnUrl: '/checkout' }" class="btn btn-xs btn-outline">
                        Sign In
                      </a>
                      <a [routerLink]="['/auth/register']" [queryParams]="{ returnUrl: '/checkout' }" class="btn btn-xs btn-primary">
                        Register
                      </a>
                    </div>
                  </div>
                }

                <div class="promo-row">
                  <input
                    id="checkoutCoupon"
                    type="text"
                    name="couponInput"
                    class="form-control"
                    [placeholder]="!auth.isAuthenticated() && !guestUniversalUnlocked() ? 'Log in to apply promo codes' : 'WELCOME10, FASHION20, FREESHIP15'"
                    [(ngModel)]="couponInput"
                    [disabled]="!auth.isAuthenticated() && !guestUniversalUnlocked()"
                    [attr.disabled]="!auth.isAuthenticated() && !guestUniversalUnlocked() ? '' : null"
                  />
                  <button
                    type="button"
                    class="btn btn-outline btn-sm"
                    (click)="validateCoupon()"
                    [disabled]="(!auth.isAuthenticated() && !guestUniversalUnlocked()) || !couponInput.trim() || submitting()"
                  >
                    Apply
                  </button>
                </div>
                <div class="promo-hints" [class.disabled-hints]="!auth.isAuthenticated() && !guestUniversalUnlocked()">
                  <span>Available codes:</span>
                  <button type="button" [disabled]="!auth.isAuthenticated() && !guestUniversalUnlocked()" (click)="quickApplyCoupon('WELCOME10')">WELCOME10</button>
                  <button type="button" [disabled]="!auth.isAuthenticated() && !guestUniversalUnlocked()" (click)="quickApplyCoupon('FASHION20')">FASHION20</button>
                  <button type="button" [disabled]="!auth.isAuthenticated() && !guestUniversalUnlocked()" (click)="quickApplyCoupon('FREESHIP15')">FREESHIP15</button>
                </div>
                @if (appliedCoupon()) {
                  <div class="promo-success">
                    <span>Applied <strong>{{ appliedCoupon()!.code }}</strong> (-{{ appliedCoupon()!.discount_amount | bdt }})</span>
                    <button type="button" (click)="appliedCoupon.set(null); couponInput = ''">Remove</button>
                  </div>
                }
              </div>

              <div class="totals-breakdown tabular-price">
                <div class="t-row">
                  <span>Subtotal</span>
                  <span>{{ cart.subtotal() | bdt }}</span>
                </div>
                @if (discountAmount() > 0) {
                  <div class="t-row discount">
                    <span>Promo Discount ({{ appliedCoupon()!.code }})</span>
                    <span>-{{ discountAmount() | bdt }}</span>
                  </div>
                }
                <div class="t-row">
                  <span>Shipping ({{ city() === 'Dhaka' ? 'Inside Dhaka' : 'Outside Dhaka' }})</span>
                  <span>{{ shippingFee() === 0 ? 'FREE' : (shippingFee() | bdt) }}</span>
                </div>
                <div class="t-row grand-total">
                  <span>{{ paymentProvider() === 'cod' ? 'Total Payable on Delivery' : 'Total via ' + selectedMethodLabel() }}</span>
                  <span>{{ grandTotal() | bdt }}</span>
                </div>
                @if (requiredAdvanceAmount() > 0) {
                  <div class="t-row advance-highlight">
                    <span>Required Advance Payment</span>
                    <span class="text-emerald font-bold">{{ requiredAdvanceAmount() | bdt }}</span>
                  </div>
                  <div class="t-row due-highlight">
                    <span>Balance Due on Delivery</span>
                    <span class="font-bold">{{ dueOnDeliveryAmount() | bdt }}</span>
                  </div>
                }
              </div>

              <div class="consent-box">
                <label class="consent-label">
                  <input type="checkbox" name="agreeTerms" [(ngModel)]="agreeTerms" required />
                  <span>
                    I agree to the <a routerLink="/terms" target="_blank">Terms &amp; Conditions</a> and <a routerLink="/return-policy" target="_blank">Return &amp; Refund Policy</a> of MAVLLIN in accordance with Bangladesh Consumer Rights Protection regulations. *
                  </span>
                </label>
              </div>

              <button
                type="submit"
                class="btn btn-primary btn-block btn-lg btn-shimmer"
                [disabled]="submitting() || !agreeTerms"
              >
                {{ submitting() ? 'Placing Order...' : 'Complete Order — ' + selectedMethodLabel() + ' (' + (grandTotal() | bdt) + ')' }}
              </button>
            </div>
          </aside>
        </form>
      }
    </div>
  `,
  styles: [`
    .checkout-page {
      padding-top: 2.5rem;
      padding-bottom: 4rem;
    }
    .checkout-header {
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 1.25rem;
      margin-bottom: 2rem;
    }
    .empty-checkout {
      text-align: center;
      padding: 4rem 1rem;
      background: var(--color-alabaster);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    .checkout-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2.5rem;
      @media (min-width: 992px) {
        grid-template-columns: 1.2fr 0.8fr;
      }
    }
    .checkout-form-col {
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }
    .guest-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: var(--color-alabaster);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      p { font-size: 0.82rem; color: var(--color-text-muted); }
      .guest-banner-actions {
        display: flex;
        gap: 0.5rem;
      }
    }
    .checkout-card {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 1.5rem;
      background: var(--color-white);

      h3 {
        font-size: 0.95rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 1.25rem;
        padding-bottom: 0.65rem;
        border-bottom: 1px solid var(--color-border);
      }
    }
    .saved-addresses-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.85rem;
      @media (min-width: 640px) {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    .saved-addr-card {
      padding: 1rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition);

      &.selected {
        border: 2px solid var(--color-onyx);
        background: var(--color-alabaster);
      }
      .addr-top {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.35rem;
        font-size: 0.85rem;
      }
      .addr-recipient {
        font-size: 0.82rem;
        font-weight: 600;
      }
      .addr-lines {
        font-size: 0.78rem;
        color: var(--color-text-muted);
        margin-top: 0.2rem;
      }
    }
    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      @media (min-width: 640px) {
        grid-template-columns: 1fr 1fr;
      }
    }
    .form-row-3 {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      @media (min-width: 640px) {
        grid-template-columns: 1fr 1.2fr 0.8fr;
      }
    }

    /* Payment Methods Grid & MFS Box */
    .payment-methods-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.75rem;
      @media (min-width: 640px) {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    .payment-option-card {
      padding: 1rem 1.15rem;
      border: 1px solid var(--color-border);
      background: var(--color-white);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition);

      &:hover {
        border-color: var(--color-beige-deep);
        background: var(--color-alabaster);
      }
      &.selected {
        border: 2px solid var(--color-onyx);
        background: var(--color-alabaster);
      }
    }
    .pm-radio-header {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      margin-bottom: 0.35rem;
    }
    .radio-circle {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      border-radius: 50%;
      border: 2px solid var(--color-onyx);
      display: flex;
      align-items: center;
      justify-content: center;
      .radio-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: var(--color-onyx);
      }
    }
    .pm-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      font-size: 0.9rem;
    }
    .pm-desc {
      font-size: 0.78rem;
      color: var(--color-text-muted);
      padding-left: 1.75rem;
    }
    .pm-badge {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: 3px;
    }
    .pm-badge-cod { background: var(--color-emerald-bg); color: var(--color-emerald); }
    .pm-badge-manual { background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; }
    .pm-badge-bkash { background: #fce7f3; color: #be185d; border: 1px solid #f9a8d4; }
    .pm-badge-nagad { background: #ffedd5; color: #c2410c; border: 1px solid #fdba74; }
    .pm-badge-rocket { background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; }
    .pm-badge-upay { background: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd; }

    .advance-requirement-alert {
      background: var(--color-gold-bg, #fffbeb);
      border: 1px solid var(--color-gold, #d97706);
      border-radius: var(--radius-sm);
      padding: 0.85rem 1rem;
      margin-bottom: 1.25rem;
      .adv-alert-title {
        font-weight: 700;
        font-size: 0.85rem;
        color: var(--color-gold, #d97706);
        margin-bottom: 0.25rem;
      }
      .adv-alert-desc {
        font-size: 0.8rem;
        color: var(--color-text);
        margin: 0;
      }
    }

    .bank-details-card {
      background: var(--color-white);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 0.85rem 1rem;
      margin-bottom: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.82rem;
      .bank-row {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
        span { color: var(--color-text-muted); }
      }
    }

    .mfs-verification-box {
      margin-top: 1.25rem;
      padding: 1.25rem;
      background: var(--color-alabaster);
      border: 1px solid var(--color-border-dark);
      border-radius: var(--radius-sm);
    }
    .mfs-step-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      padding-bottom: 0.6rem;
      border-bottom: 1px solid var(--color-border);
    }
    .mfs-amount {
      font-size: 0.9rem;
      color: var(--color-onyx);
    }
    .mfs-steps {
      margin: 0 0 1.1rem 1.2rem;
      font-size: 0.82rem;
      color: var(--color-text);
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .merchant-num {
      background: var(--color-white);
      padding: 0.15rem 0.5rem;
      border: 1px solid var(--color-border-dark);
      border-radius: 3px;
      font-weight: 700;
      color: var(--color-onyx);
    }
    .trx-input {
      font-family: monospace;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    /* Summary Card */
    .summary-card {
      background: var(--color-alabaster);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      position: sticky;
      top: 130px;

      h3 {
        font-size: 0.95rem;
        letter-spacing: 0.08em;
        border-bottom: 1px solid var(--color-border);
        padding-bottom: 0.75rem;
      }
    }
    .summary-items {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      max-height: 280px;
      overflow-y: auto;

      li {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 0.84rem;
      }
      img {
        width: 48px;
        height: 62px;
        object-fit: cover;
        border-radius: 3px;
        border: 1px solid var(--color-border);
      }
      .sum-info { flex: 1; }
      .sum-name { font-weight: 600; color: var(--color-onyx); }
      .sum-variant { font-size: 0.75rem; color: var(--color-text-muted); }
      .sum-price { font-weight: 700; }
    }
    .promo-section {
      border-top: 1px solid var(--color-border);
      padding-top: 1rem;
    }
    .guest-promo-banner {
      background: var(--color-gold-bg);
      border: 1px solid var(--color-gold);
      border-radius: var(--radius-sm);
      padding: 0.75rem 0.85rem;
      margin-bottom: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;

      .banner-content {
        .banner-title {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: var(--color-onyx);
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.02em;

          .lock-icon {
            color: var(--color-gold);
            flex-shrink: 0;
          }
        }
        p {
          margin-top: 0.25rem;
          font-size: 0.75rem;
          color: var(--color-text-muted);
          line-height: 1.35;
        }

        .universal-unlock-link {
          display: inline;
          background: none;
          border: none;
          padding: 0;
          margin-left: 0.35rem;
          font-size: 0.72rem;
          font-weight: 700;
          color: #2563eb;
          text-decoration: underline;
          cursor: pointer;
          &:hover {
            color: #1d4ed8;
          }
        }
      }

      .banner-actions {
        display: flex;
        gap: 0.5rem;

        .btn-xs {
          padding: 0.25rem 0.65rem;
          font-size: 0.72rem;
          font-weight: 600;
          border-radius: var(--radius-sm);
          text-decoration: none;
          display: inline-block;
        }
        .btn-outline {
          background: var(--color-white);
          border: 1px solid var(--color-border);
          color: var(--color-onyx);
          &:hover {
            border-color: var(--color-onyx);
          }
        }
        .btn-primary {
          background: var(--color-onyx);
          color: var(--color-white);
          &:hover {
            background: var(--color-onyx-light);
          }
        }
      }
    }
    .promo-row {
      display: flex;
      gap: 0.5rem;

      input:disabled {
        background-color: var(--color-alabaster);
        cursor: not-allowed;
        color: var(--color-text-light);
      }
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
    .promo-hints {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
      margin-top: 0.45rem;
      font-size: 0.72rem;
      color: var(--color-text-muted);

      &.disabled-hints {
        opacity: 0.6;
      }

      button {
        padding: 0.15rem 0.45rem;
        background: var(--color-white);
        border: 1px solid var(--color-border);
        border-radius: 3px;
        font-size: 0.7rem;
        font-weight: 700;
        &:hover:not(:disabled) { border-color: var(--color-onyx); }
        &:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }
      }
    }
    .promo-success {
      display: flex;
      justify-content: space-between;
      margin-top: 0.5rem;
      font-size: 0.78rem;
      color: var(--color-emerald);
      button { color: var(--color-berry); text-decoration: underline; font-size: 0.75rem; }
    }
    .totals-breakdown {
      border-top: 1px solid var(--color-border);
      padding-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      font-size: 0.9rem;

      .t-row {
        display: flex;
        justify-content: space-between;
      }
      .discount { color: var(--color-emerald); font-weight: 600; }
      .grand-total {
        border-top: 1px solid var(--color-border);
        padding-top: 0.75rem;
        font-size: 1.1rem;
        font-weight: 700;
      }
      .advance-highlight {
        color: var(--color-emerald);
        background: var(--color-emerald-bg);
        padding: 0.35rem 0.5rem;
        border-radius: 3px;
      }
      .due-highlight {
        font-weight: 600;
        padding: 0.35rem 0.5rem;
      }
      .text-emerald { color: var(--color-emerald); }
    }
    .consent-box {
      margin-top: 1rem;
      padding: 0.75rem 1rem;
      background: var(--color-alabaster);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
    }
    .consent-label {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      font-size: 0.8rem;
      color: var(--color-text-muted);
      cursor: pointer;
      input { margin-top: 0.2rem; cursor: pointer; }
      a { color: var(--color-onyx); text-decoration: underline; font-weight: 600; }
    }
  `],
})
export class CheckoutComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly cart = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly bdDistricts = BD_DIVISIONS_DISTRICTS;
  readonly insideDhakaFee = signal<number>(70);
  readonly outsideDhakaFee = signal<number>(130);
  readonly freeShippingThreshold = signal<number>(2500);

  readonly savedAddresses = signal<Address[]>([]);
  readonly selectedAddressId = signal<number | null>(null);
  readonly city = signal<string>('Dhaka');
  readonly appliedCoupon = signal<CouponValidationResult | null>(null);
  readonly guestUniversalUnlocked = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  readonly paymentProvider = signal<'cod' | 'bkash' | 'nagad' | 'rocket' | 'upay' | 'manual'>('cod');

  readonly paymentMethods: Array<{
    id: 'cod' | 'bkash' | 'nagad' | 'rocket' | 'upay' | 'manual';
    name: string;
    badge: string;
    description: string;
  }> = [
    {
      id: 'cod',
      name: 'Cash on Delivery (COD)',
      badge: 'Pay at Doorstep',
      description: 'Pay in cash directly to our courier when your parcel arrives.',
    },
    {
      id: 'manual',
      name: 'Bank Transfer / Manual Gateway',
      badge: 'City Bank / Direct',
      description: 'Direct transfer to City Bank PLC account or branch deposit with TrxID verification.',
    },
    {
      id: 'bkash',
      name: 'bKash',
      badge: 'Mobile Banking',
      description: 'Send Money / Payment in BDT and submit your bKash TrxID for verification.',
    },
    {
      id: 'nagad',
      name: 'Nagad',
      badge: 'Mobile Banking',
      description: 'Send Money / Payment in BDT and submit your Nagad TrxID for verification.',
    },
    {
      id: 'rocket',
      name: 'Rocket',
      badge: 'DBBL Mobile',
      description: 'Send Money via Dutch-Bangla Rocket and submit your TrxID for verification.',
    },
    {
      id: 'upay',
      name: 'Upay',
      badge: 'Mobile Wallet',
      description: 'Send Money via Upay in BDT and submit your TrxID for verification.',
    },
  ];

  readonly selectedMethodLabel = computed(() => {
    const found = this.paymentMethods.find((m) => m.id === this.paymentProvider());
    return found ? found.name : 'Cash on Delivery';
  });

  guestEmail = '';
  recipientName = '';
  phone = '';
  streetAddress = '';
  area = 'Banani';
  postalCode = '1213';
  notes = '';
  couponInput = '';
  agreeTerms = false;
  paymentSenderPhone = '';
  paymentTransactionId = '';

  readonly discountAmount = computed(() => Number(this.appliedCoupon()?.discount_amount || 0));

  readonly shippingFee = computed(() => {
    if (this.cart.subtotal() >= this.freeShippingThreshold()) return 0;
    return this.city() === 'Dhaka' ? this.insideDhakaFee() : this.outsideDhakaFee();
  });

  readonly grandTotal = computed(() =>
    Math.max(0, Number((this.cart.subtotal() - this.discountAmount() + this.shippingFee()).toFixed(2)))
  );

  readonly requiredAdvanceAmount = computed(() => {
    let adv = 0;
    const ship = this.shippingFee();
    for (const item of this.cart.items()) {
      const type = (item as any).advance_payment_type;
      const lineTot = item.effective_price * item.quantity;
      if (type === 'thirty_percent' || type === 'percent_30') {
        adv += lineTot * 0.30;
      } else if (type === 'fifty_percent' || type === 'percent_50') {
        adv += lineTot * 0.50;
      } else if (type === 'full' || type === 'percent_100') {
        adv += lineTot;
      } else if (type === 'delivery_charge') {
        adv += ship;
      }
    }
    return Math.min(this.grandTotal(), Math.round(adv * 100) / 100);
  });

  readonly dueOnDeliveryAmount = computed(() => {
    const adv = this.requiredAdvanceAmount();
    if (adv > 0) {
      return Math.max(0, Number((this.grandTotal() - adv).toFixed(2)));
    }
    return this.grandTotal();
  });

  ngOnInit(): void {
    // Dynamic delivery fees fetch
    this.orderService.getDeliveryCharges().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.insideDhakaFee.set(Number(res.data.inside_dhaka_fee));
          this.outsideDhakaFee.set(Number(res.data.outside_dhaka_fee));
          this.freeShippingThreshold.set(Number(res.data.free_shipping_threshold));
        }
      },
      error: () => {
        // Fallback defaults preserved (70 / 130 / 2500)
      },
    });

    const user = this.auth.user();
    if (this.auth.isAuthenticated() && user) {
      this.recipientName = user.full_name || '';
      this.phone = user.phone || '';
      this.orderService.getAddresses().subscribe({
        next: (res) => {
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            this.savedAddresses.set(res.data);
            const def = res.data.find((a) => a.is_default) || res.data[0];
            this.selectSavedAddress(def);
          }
        },
      });
    } else {
      this.appliedCoupon.set(null);
      this.couponInput = '';
    }
  }

  selectSavedAddress(addr: Address): void {
    this.selectedAddressId.set(addr.id);
    this.recipientName = addr.recipient_name;
    this.phone = addr.phone;
    this.streetAddress = addr.street_address;
    this.area = addr.area || '';
    this.city.set(addr.city || 'Dhaka');
    this.postalCode = addr.postal_code;
  }

  selectPaymentMethod(id: 'cod' | 'bkash' | 'nagad' | 'rocket' | 'upay' | 'manual'): void {
    this.paymentProvider.set(id);
    if (id !== 'cod' && !this.paymentSenderPhone && this.phone) {
      this.paymentSenderPhone = this.phone;
    }
  }

  unlockUniversalCoupon(): void {
    this.guestUniversalUnlocked.set(true);
    this.toast.info('You can now enter your universal promo code below.');
  }

  quickApplyCoupon(code: string): void {
    if (!this.auth.isAuthenticated() && !this.guestUniversalUnlocked()) {
      this.toast.error('Please log in or create an account to unlock and apply coupon discounts.');
      return;
    }
    this.couponInput = code;
    this.validateCoupon();
  }

  validateCoupon(): void {
    if (!this.auth.isAuthenticated() && !this.guestUniversalUnlocked()) {
      this.toast.error('Please log in or create an account to unlock and apply coupon discounts.');
      return;
    }
    const code = this.couponInput.trim();
    if (!code) return;
    this.orderService.validateCoupon(code, this.cart.subtotal()).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          if (!this.auth.isAuthenticated() && !res.data.is_universal) {
            this.appliedCoupon.set(null);
            this.toast.error('This coupon is exclusive to registered members. Please sign in or register to unlock it.');
            return;
          }
          this.appliedCoupon.set(res.data);
          this.toast.success(`Promo code ${res.data.code} applied!`);
        }
      },
      error: (err) => {
        this.appliedCoupon.set(null);
        this.toast.error(err?.error?.message || 'Coupon is not valid for this order.');
      },
    });
  }

  placeOrder(): void {
    if (!this.agreeTerms) {
      this.toast.error('Please accept the Terms & Conditions and Return Policy before placing your order.');
      return;
    }

    if (!this.recipientName.trim() || !this.phone.trim() || !this.streetAddress.trim() || !this.postalCode.trim()) {
      this.toast.error('Please complete all required delivery address fields.');
      return;
    }

    const rawPhone = this.phone.trim().replace(/[\s-]/g, '');
    const bdPhonePattern = /^(?:\+?880|0)?1[3-9]\d{8}$/;
    if (!bdPhonePattern.test(rawPhone)) {
      this.toast.error('Please enter a valid 11-digit Bangladeshi mobile number (e.g. 01711000000).');
      return;
    }

    const provider = this.paymentProvider();
    const trxId = this.paymentTransactionId.trim();
    const senderNum = (this.paymentSenderPhone.trim() || rawPhone).replace(/[\s-]/g, '');

    if (this.requiredAdvanceAmount() > 0 && provider === 'cod') {
      this.toast.error(`An advance payment of ৳${this.requiredAdvanceAmount()} is required for items in your bag. Please select Bank Transfer or MFS payment.`);
      return;
    }

    if (provider !== 'cod' && !trxId) {
      this.toast.error(`Please enter your ${this.selectedMethodLabel()} Transaction ID (TrxID) so we can verify your payment.`);
      return;
    }

    const shipping_address = {
      recipient_name: this.recipientName.trim(),
      full_name: this.recipientName.trim(),
      phone: rawPhone,
      street_address: this.streetAddress.trim(),
      area: this.area.trim(),
      city: this.city(),
      postal_code: this.postalCode.trim(),
      country: 'Bangladesh',
    };

    // Ensure unauthenticated guests have zero coupon deductions unless universal coupon
    if (!this.auth.isAuthenticated() && !this.appliedCoupon()?.is_universal) {
      this.appliedCoupon.set(null);
    }

    const coupon_code = this.auth.isAuthenticated()
      ? (this.appliedCoupon()?.code || null)
      : (this.appliedCoupon()?.is_universal ? this.appliedCoupon()!.code : null);
    this.submitting.set(true);

    const paymentFields = provider === 'cod'
      ? {
          payment_provider: 'cod' as const,
          advance_amount: 0,
          due_amount: this.grandTotal(),
        }
      : {
          payment_provider: provider,
          payment_method: provider,
          transaction_id: trxId,
          sender_phone: senderNum,
          advance_amount: this.requiredAdvanceAmount() > 0 ? this.requiredAdvanceAmount() : this.grandTotal(),
          due_amount: this.dueOnDeliveryAmount(),
        };

    if (this.auth.isAuthenticated()) {
      this.orderService
        .placeOrder({
          shipping_address,
          ...paymentFields,
          coupon_code,
          notes: this.notes.trim() || null,
        })
        .subscribe({
          next: (res) => {
            this.submitting.set(false);
            if (res.success && res.data) {
              this.cart.clearCart(true);
              this.toast.success(`Order ${res.data.order_number} placed!`);
              this.router.navigate(['/order-confirmation', res.data.order_number]);
            }
          },
          error: (err) => {
            this.submitting.set(false);
            this.toast.error(err?.error?.message || 'Unable to place order. Please review your bag.');
          },
        });
    } else {
      const items = this.cart.items().map((i) => ({
        variant_id: i.variant_id,
        product_id: i.product_id,
        quantity: i.quantity,
      }));
      this.orderService
        .placeGuestOrder({
          guest_email: this.guestEmail.trim() || 'guest@mavllin.com',
          guest_phone: rawPhone,
          shipping_address,
          ...paymentFields,
          coupon_code,
          notes: this.notes.trim() || null,
          items,
        })
        .subscribe({
          next: (res) => {
            this.submitting.set(false);
            if (res.success && res.data) {
              this.cart.clearCart(true);
              this.toast.success(`Order ${res.data.order_number} confirmed!`);
              this.router.navigate(['/order-confirmation', res.data.order_number]);
            }
          },
          error: (err) => {
            this.submitting.set(false);
            this.toast.error(err?.error?.message || 'Unable to place guest order.');
          },
        });
    }
  }
}

export interface DistrictGroup {
  division: string;
  districts: string[];
}

export const BD_DIVISIONS_DISTRICTS: DistrictGroup[] = [
  {
    division: 'Dhaka Division',
    districts: ['Dhaka', 'Gazipur', 'Narayanganj', 'Tangail', 'Faridpur', 'Manikganj', 'Munshiganj', 'Narsingdi', 'Gopalganj', 'Madaripur', 'Rajbari', 'Shariatpur', 'Kishoreganj'],
  },
  {
    division: 'Chattogram Division',
    districts: ['Chattogram', 'Cox\'s Bazar', 'Cumilla', 'Feni', 'Brahmanbaria', 'Chandpur', 'Noakhali', 'Lakshmipur', 'Khagrachhari', 'Rangamati', 'Bandarban'],
  },
  {
    division: 'Rajshahi Division',
    districts: ['Rajshahi', 'Bogura', 'Pabna', 'Sirajganj', 'Naogaon', 'Natore', 'Chapai Nawabganj', 'Joypurhat'],
  },
  {
    division: 'Khulna Division',
    districts: ['Khulna', 'Jashore', 'Kushtia', 'Satkhira', 'Jhenaidah', 'Chuadanga', 'Bagerhat', 'Magura', 'Meherpur', 'Narail'],
  },
  {
    division: 'Barishal Division',
    districts: ['Barishal', 'Patuakhali', 'Bhola', 'Pirojpur', 'Barguna', 'Jhalokati'],
  },
  {
    division: 'Sylhet Division',
    districts: ['Sylhet', 'Moulvibazar', 'Habiganj', 'Sunamganj'],
  },
  {
    division: 'Rangpur Division',
    districts: ['Rangpur', 'Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Thakurgaon'],
  },
  {
    division: 'Mymensingh Division',
    districts: ['Mymensingh', 'Jamalpur', 'Netrokona', 'Sherpur'],
  },
];
