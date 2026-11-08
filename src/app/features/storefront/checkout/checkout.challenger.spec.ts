import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, RouterLink } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CheckoutComponent } from './checkout.component';
import { OrderService } from '../../../core/services/order.service';
import { CartService } from '../../../core/services/cart.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

const GUEST_CART_KEY = 'mavllin_guest_cart_v1';

describe('Empirical Challenger: Frontend Checkout Coupon Gate & Adversarial UI Spec', () => {
  let fixture: any;
  let component: CheckoutComponent;
  let orderService: OrderService;
  let cartService: CartService;
  let toastService: ToastService;
  let authService: AuthService;

  const mockCartItem = {
    product_id: 1,
    variant_id: 10,
    product_name: 'Luxury Linen Kurta',
    product_slug: 'luxury-linen-kurta',
    price: 2500,
    effective_price: 2500,
    quantity: 1,
    line_total: 2500,
    stock_quantity: 10,
  };

  const mockCartWithItem = () => {
    cartService.items.set([mockCartItem as any]);
  };

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify([mockCartItem]));

    await TestBed.configureTestingModule({
      imports: [CheckoutComponent],
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'order-confirmation/:orderNumber', component: CheckoutComponent },
          { path: 'auth/login', component: CheckoutComponent },
          { path: 'auth/register', component: CheckoutComponent },
        ]),
      ],
    }).compileComponents();

    orderService = TestBed.inject(OrderService);
    cartService = TestBed.inject(CartService);
    toastService = TestBed.inject(ToastService);
    authService = TestBed.inject(AuthService);

    authService.token.set(null);
    authService.user.set(null);

    vi.spyOn(cartService, 'syncOnSignIn').mockImplementation(() => {});
    vi.spyOn(cartService, 'loadServerCart').mockImplementation(() => {});
    vi.spyOn(cartService, 'clearCart').mockImplementation(() => {});

    vi.spyOn(orderService, 'getDeliveryCharges').mockReturnValue(
      of({
        success: true,
        message: 'Delivery charges loaded',
        data: {
          currency: 'BDT',
          currency_symbol: '৳',
          inside_dhaka_fee: 70,
          outside_dhaka_fee: 130,
          free_shipping_threshold: 2500,
        },
      })
    );

    fixture = TestBed.createComponent(CheckoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('1. Unauthenticated DOM Elements & UI State', () => {
    it('CHAL-FE-01: reliably renders .guest-promo-banner with lock icon, copy, and returnUrl links', () => {
      mockCartWithItem();
      expect(authService.isAuthenticated()).toBe(false);
      fixture.detectChanges();

      const banner = fixture.nativeElement.querySelector('.guest-promo-banner');
      expect(banner).toBeTruthy();
      expect(banner.getAttribute('data-testid')).toBe('guest-coupon-banner');

      const lockIcon = banner.querySelector('svg.lock-icon');
      expect(lockIcon).toBeTruthy();
      expect(lockIcon.getAttribute('viewBox')).toBe('0 0 24 24');

      expect(banner.textContent).toContain('Member Exclusive Discounts');
      expect(banner.textContent).toContain('Log in or create a MAVLLIN account to unlock and apply promo coupons.');

      const bannerDebugEl = fixture.debugElement.query(By.css('.guest-promo-banner'));
      const routerLinkDes = bannerDebugEl.queryAll(By.directive(RouterLink));
      expect(routerLinkDes.length).toBe(2);

      const loginDir = routerLinkDes[0].injector.get(RouterLink);
      expect(loginDir.queryParams).toEqual({ returnUrl: '/checkout' });
      expect(loginDir.urlTree ? loginDir.urlTree.toString() : loginDir.href).toContain('/auth/login');
      expect(loginDir.urlTree ? loginDir.urlTree.toString() : loginDir.href).toContain('returnUrl');

      const registerDir = routerLinkDes[1].injector.get(RouterLink);
      expect(registerDir.queryParams).toEqual({ returnUrl: '/checkout' });
      expect(registerDir.urlTree ? registerDir.urlTree.toString() : registerDir.href).toContain('/auth/register');
      expect(registerDir.urlTree ? registerDir.urlTree.toString() : registerDir.href).toContain('returnUrl');
    });

    it('CHAL-FE-02: left-column guest-banner also prompts sign-in/register with returnUrl', () => {
      mockCartWithItem();
      expect(authService.isAuthenticated()).toBe(false);
      fixture.detectChanges();

      const guestBanner = fixture.nativeElement.querySelector('.guest-banner');
      expect(guestBanner).toBeTruthy();
      expect(guestBanner.textContent).toContain('Checking out as a Guest');
      expect(guestBanner.textContent).toContain('Sign in or register to unlock promo discounts');

      const guestBannerDebugEl = fixture.debugElement.query(By.css('.guest-banner'));
      const guestLinkDes = guestBannerDebugEl.queryAll(By.directive(RouterLink));
      expect(guestLinkDes.length).toBe(2);

      const loginDir = guestLinkDes[0].injector.get(RouterLink);
      expect(loginDir.queryParams).toEqual({ returnUrl: '/checkout' });
      expect(loginDir.urlTree ? loginDir.urlTree.toString() : loginDir.href).toContain('/auth/login');

      const registerDir = guestLinkDes[1].injector.get(RouterLink);
      expect(registerDir.queryParams).toEqual({ returnUrl: '/checkout' });
      expect(registerDir.urlTree ? registerDir.urlTree.toString() : registerDir.href).toContain('/auth/register');
    });

    it('CHAL-FE-03: disables #checkoutCoupon input with lock placeholder', () => {
      mockCartWithItem();
      expect(authService.isAuthenticated()).toBe(false);
      fixture.detectChanges();

      const input = fixture.nativeElement.querySelector('#checkoutCoupon') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.disabled).toBe(true);
      expect(input.hasAttribute('disabled')).toBe(true);
      expect(input.placeholder).toBe('Log in to apply promo codes');
    });

    it('CHAL-FE-04: disables the Apply button in guest mode', () => {
      mockCartWithItem();
      expect(authService.isAuthenticated()).toBe(false);
      fixture.detectChanges();

      const applyBtn = fixture.nativeElement.querySelector('.promo-row button') as HTMLButtonElement;
      expect(applyBtn).toBeTruthy();
      expect(applyBtn.disabled).toBe(true);
    });

    it('CHAL-FE-05: disables all quick-apply code buttons and adds .disabled-hints class', () => {
      mockCartWithItem();
      expect(authService.isAuthenticated()).toBe(false);
      fixture.detectChanges();

      const promoHints = fixture.nativeElement.querySelector('.promo-hints');
      expect(promoHints).toBeTruthy();
      expect(promoHints.classList.contains('disabled-hints')).toBe(true);

      const hintButtons: HTMLButtonElement[] = Array.from(promoHints.querySelectorAll('button'));
      expect(hintButtons.length).toBe(3);
      for (const btn of hintButtons) {
        expect(btn.disabled).toBe(true);
      }
    });
  });

  describe('2. Component Guard & Method Defense-in-Depth', () => {
    it('CHAL-FE-06: calling validateCoupon() unauthenticated rejects with error toast and ZERO HTTP calls', () => {
      const errorSpy = vi.spyOn(toastService, 'error');
      const validateSpy = vi.spyOn(orderService, 'validateCoupon');

      component.couponInput = 'WELCOME10';
      component.validateCoupon();

      expect(errorSpy).toHaveBeenCalledWith(
        'Please log in or create an account to unlock and apply coupon discounts.'
      );
      expect(validateSpy).not.toHaveBeenCalled();
      expect(component.appliedCoupon()).toBeNull();
    });

    it('CHAL-FE-07: calling quickApplyCoupon() unauthenticated rejects with error toast and ZERO HTTP calls', () => {
      const errorSpy = vi.spyOn(toastService, 'error');
      const validateSpy = vi.spyOn(orderService, 'validateCoupon');

      component.quickApplyCoupon('FASHION20');

      expect(errorSpy).toHaveBeenCalledWith(
        'Please log in or create an account to unlock and apply coupon discounts.'
      );
      expect(validateSpy).not.toHaveBeenCalled();
      expect(component.appliedCoupon()).toBeNull();
    });

    it('CHAL-FE-08: calling quickApplyCoupon() with empty, null, or malformed strings when unauthenticated still rejects cleanly', () => {
      const errorSpy = vi.spyOn(toastService, 'error');
      const validateSpy = vi.spyOn(orderService, 'validateCoupon');

      component.quickApplyCoupon('');
      component.quickApplyCoupon(null as any);
      component.quickApplyCoupon('   ');

      expect(errorSpy).toHaveBeenCalledTimes(3);
      expect(validateSpy).not.toHaveBeenCalled();
    });
  });

  describe('3. Order Placement & Tampering Defense', () => {
    it('CHAL-FE-09: placeGuestOrder strictly transmits coupon_code: null even if appliedCoupon was tampered in memory', () => {
      const placeGuestSpy = vi.spyOn(orderService, 'placeGuestOrder').mockReturnValue(
        of({
          success: true,
          message: 'Order created',
          data: { id: 888, order_number: 'MAV-GUEST-TAMPER-001' } as any,
        })
      );

      // Memory tampering simulation
      component.appliedCoupon.set({
        code: 'HACKED99',
        discount_amount: 1000,
        discount_type: 'fixed',
        discount_value: 1000,
        coupon_id: 42,
      });
      component.couponInput = 'HACKED99';

      component.agreeTerms = true;
      component.recipientName = 'Adversarial Guest';
      component.phone = '01811223344';
      component.streetAddress = 'Road 1, Block A';
      component.postalCode = '1212';

      component.placeOrder();

      expect(placeGuestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          coupon_code: null,
        })
      );
      expect(component.appliedCoupon()).toBeNull();
    });

    it('CHAL-FE-10: unauthenticated order total calculates with 0 discount in grandTotal when placing order', () => {
      mockCartWithItem();
      component.city.set('Dhaka');

      // Tamper appliedCoupon
      component.appliedCoupon.set({
        code: 'CHEAT500',
        discount_amount: 500,
        discount_type: 'fixed',
        discount_value: 500,
        coupon_id: 11,
      });

      const placeGuestSpy = vi.spyOn(orderService, 'placeGuestOrder').mockReturnValue(
        of({
          success: true,
          message: 'Order created',
          data: { id: 889, order_number: 'MAV-GUEST-ZERO-DISCOUNT' } as any,
        })
      );

      component.agreeTerms = true;
      component.recipientName = 'Guest User';
      component.phone = '01711223344';
      component.streetAddress = 'Sector 4, Uttara';
      component.postalCode = '1230';

      component.placeOrder();

      expect(placeGuestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_provider: 'cod',
          advance_amount: 0,
          due_amount: 2500, // Full subtotal without the 500 discount!
          coupon_code: null,
        })
      );
      expect(component.appliedCoupon()).toBeNull();
    });
  });

  describe('4. Authenticated Coupon Validation & Order Submission', () => {
    beforeEach(() => {
      authService.token.set('valid-auth-jwt');
      authService.user.set({
        id: 77,
        full_name: 'Member Customer',
        email: 'member@mavllin.com',
        role: 'customer',
      } as any);
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('CHAL-FE-11: hides guest promo banner and enables coupon input & hints when authenticated', () => {
      mockCartWithItem();
      fixture.detectChanges();

      const banner = fixture.nativeElement.querySelector('.guest-promo-banner');
      expect(banner).toBeNull();

      const input = fixture.nativeElement.querySelector('#checkoutCoupon') as HTMLInputElement;
      expect(input.disabled).toBe(false);
      expect(input.hasAttribute('disabled')).toBe(false);
      expect(input.placeholder).toBe('WELCOME10, FASHION20, FREESHIP15');

      const promoHints = fixture.nativeElement.querySelector('.promo-hints');
      expect(promoHints.classList.contains('disabled-hints')).toBe(false);

      const hintButtons: HTMLButtonElement[] = Array.from(promoHints.querySelectorAll('button'));
      for (const btn of hintButtons) {
        expect(btn.disabled).toBe(false);
      }
    });

    it('CHAL-FE-12: allows authenticated customer to validate coupon and updates reactive totals', () => {
      mockCartWithItem();
      fixture.detectChanges();

      const successSpy = vi.spyOn(toastService, 'success');
      vi.spyOn(orderService, 'validateCoupon').mockReturnValue(
        of({
          success: true,
          message: 'Coupon is valid',
          data: {
            code: 'WELCOME10',
            discount_type: 'percentage',
            discount_value: 10,
            discount_amount: 250,
            coupon_id: 1,
          },
        })
      );

      component.couponInput = 'WELCOME10';
      component.validateCoupon();

      expect(component.appliedCoupon()).toEqual(
        expect.objectContaining({
          code: 'WELCOME10',
          discount_amount: 250,
        })
      );
      expect(component.discountAmount()).toBe(250);
      expect(successSpy).toHaveBeenCalledWith('Promo code WELCOME10 applied!');

      fixture.detectChanges();

      const promoSuccess = fixture.nativeElement.querySelector('.promo-success');
      expect(promoSuccess).toBeTruthy();
      expect(promoSuccess.textContent).toContain('WELCOME10');
      expect(promoSuccess.textContent).toContain('250');
    });

    it('CHAL-FE-13: submits applied coupon_code when placing authenticated order', () => {
      const placeOrderSpy = vi.spyOn(orderService, 'placeOrder').mockReturnValue(
        of({
          success: true,
          message: 'Order created',
          data: { id: 777, order_number: 'MAV-AUTH-001' } as any,
        })
      );

      component.appliedCoupon.set({
        code: 'WELCOME10',
        discount_amount: 250,
        discount_type: 'percentage',
        discount_value: 10,
        coupon_id: 1,
      });

      component.agreeTerms = true;
      component.recipientName = 'Member Customer';
      component.phone = '01711223344';
      component.streetAddress = 'Gulshan 2';
      component.postalCode = '1212';

      component.placeOrder();

      expect(placeOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          coupon_code: 'WELCOME10',
        })
      );
    });
  });

  describe('5. Auth State Lifecycle & Transitions', () => {
    it('CHAL-FE-14: unauthenticated ngOnInit resets appliedCoupon and couponInput', () => {
      // Simulate state carry-over
      component.appliedCoupon.set({
        code: 'STALE10',
        discount_amount: 200,
        discount_type: 'fixed',
        discount_value: 200,
        coupon_id: 99,
      });
      component.couponInput = 'STALE10';

      authService.token.set(null);
      authService.user.set(null);
      expect(authService.isAuthenticated()).toBe(false);

      component.ngOnInit();

      expect(component.appliedCoupon()).toBeNull();
      expect(component.couponInput).toBe('');
    });

    it('CHAL-FE-15: auth state transition from logged-in to logged-out immediately activates guest UI barriers', () => {
      // 1. Start authenticated
      authService.token.set('valid-auth-jwt');
      authService.user.set({ id: 5, full_name: 'Sadia', role: 'customer' } as any);
      mockCartWithItem();
      fixture.detectChanges();

      let banner = fixture.nativeElement.querySelector('.guest-promo-banner');
      expect(banner).toBeNull();
      let input = fixture.nativeElement.querySelector('#checkoutCoupon') as HTMLInputElement;
      expect(input.disabled).toBe(false);

      // 2. User logs out / session cleared
      // Ensure guest cart in localStorage has items so effect populates cart items on logout
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify([mockCartItem]));
      authService.token.set(null);
      authService.user.set(null);
      mockCartWithItem();
      fixture.detectChanges();

      // Banner must appear immediately due to reactive signal
      banner = fixture.nativeElement.querySelector('.guest-promo-banner');
      expect(banner).toBeTruthy();

      // Input must be disabled immediately
      input = fixture.nativeElement.querySelector('#checkoutCoupon') as HTMLInputElement;
      expect(input.disabled).toBe(true);
      expect(input.placeholder).toBe('Log in to apply promo codes');

      // 3. Trying to place order as guest now purges any lingering coupon
      component.appliedCoupon.set({ code: 'LINGERING', discount_amount: 100 } as any);
      const placeGuestSpy = vi.spyOn(orderService, 'placeGuestOrder').mockReturnValue(of({ success: true } as any));
      component.agreeTerms = true;
      component.recipientName = 'Guest';
      component.phone = '01711223344';
      component.streetAddress = 'Dhanmondi';
      component.postalCode = '1205';

      component.placeOrder();

      expect(placeGuestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          coupon_code: null,
        })
      );
      expect(component.appliedCoupon()).toBeNull();
    });
  });
});
