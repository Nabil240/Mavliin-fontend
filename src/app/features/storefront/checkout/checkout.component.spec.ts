import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CheckoutComponent } from './checkout.component';
import { OrderService } from '../../../core/services/order.service';
import { CartService } from '../../../core/services/cart.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

describe('CheckoutComponent', () => {
  let fixture: any;
  let component: CheckoutComponent;
  let orderService: OrderService;
  let cartService: CartService;
  let toastService: ToastService;
  let authService: AuthService;

  // Helper to populate cart items so template renders .checkout-grid
  const mockCartWithItem = () => {
    cartService.items.set([
      {
        product_id: 1,
        variant_id: 10,
        product_name: 'Luxury Linen Kurta',
        product_slug: 'luxury-linen-kurta',
        price: 2500,
        effective_price: 2500,
        quantity: 1,
        line_total: 2500,
        stock_quantity: 10,
      } as any,
    ]);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckoutComponent],
      providers: [
        provideHttpClient(),
        provideRouter([{ path: 'order-confirmation/:orderNumber', component: CheckoutComponent }]),
      ],
    }).compileComponents();

    orderService = TestBed.inject(OrderService);
    cartService = TestBed.inject(CartService);
    toastService = TestBed.inject(ToastService);
    authService = TestBed.inject(AuthService);
    localStorage.clear();
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

  it('should initialize and load dynamic regional delivery charges from backend', () => {
    expect(component).toBeTruthy();
    expect(component.insideDhakaFee()).toBe(70);
    expect(component.outsideDhakaFee()).toBe(130);
    expect(component.freeShippingThreshold()).toBe(2500);
  });

  it('should contain all 64 districts across 8 Bangladesh divisions', () => {
    const totalDistricts = component.bdDistricts.reduce(
      (sum, group) => sum + group.districts.length,
      0
    );
    expect(totalDistricts).toBe(64);
    expect(component.bdDistricts.length).toBe(8);
  });

  it('should calculate Inside Dhaka delivery fee as ৳70 when subtotal < ৳2,500', () => {
    // subtotal = 0 < 2500
    component.city.set('Dhaka');
    expect(component.shippingFee()).toBe(70);
  });

  it('should calculate Outside Dhaka delivery fee as ৳130 when subtotal < ৳2,500', () => {
    component.city.set('Chattogram');
    expect(component.shippingFee()).toBe(130);
  });

  it('should calculate Free Shipping (৳0) when subtotal reaches or exceeds ৳2,500', () => {
    // Simulate cart subtotal >= 2500
    vi.spyOn(cartService, 'subtotal').mockReturnValue(2850);
    component.city.set('Sylhet');
    expect(component.shippingFee()).toBe(0);
  });

  it('should block order placement if Terms & Conditions checkbox is unchecked', () => {
    const errorSpy = vi.spyOn(toastService, 'error');
    component.agreeTerms = false;
    component.recipientName = 'Tariqul Islam';
    component.phone = '01711000000';
    component.streetAddress = 'House 48, Road 11';
    component.postalCode = '1213';

    component.placeOrder();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Terms & Conditions')
    );
  });

  it('should validate 11-digit Bangladeshi mobile format', () => {
    const errorSpy = vi.spyOn(toastService, 'error');
    component.agreeTerms = true;
    component.recipientName = 'Tariqul Islam';
    component.phone = '12345'; // Invalid
    component.streetAddress = 'House 48, Road 11';
    component.postalCode = '1213';

    component.placeOrder();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('11-digit Bangladeshi mobile number')
    );
  });

  it('should accept valid Bangladeshi mobile number (e.g. 01711000000 or +8801711000000)', () => {
    const placeGuestSpy = vi.spyOn(orderService, 'placeGuestOrder').mockReturnValue(
      of({
        success: true,
        message: 'Order created',
        data: {
          id: 99,
          order_number: 'MAV-2026-9099',
          subtotal: 1380,
          discount_amount: 0,
          shipping_fee: 70,
          total_amount: 1450,
          status: 'pending',
          payment_status: 'unpaid',
          created_at: '2026-11-04T00:00:00Z',
          shipping_address: {
            recipient_name: 'Tariqul Islam',
            phone: '01711000000',
            street_address: 'House 48, Road 11, Banani',
            city: 'Dhaka',
            postal_code: '1213',
          },
        },
      })
    );

    component.agreeTerms = true;
    component.recipientName = 'Tariqul Islam';
    component.phone = '01711000000';
    component.streetAddress = 'House 48, Road 11, Banani';
    component.postalCode = '1213';

    component.placeOrder();
    expect(placeGuestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        guest_phone: '01711000000',
        payment_provider: 'cod',
      })
    );
  });

  it('should allow selecting manual payment gateway and require valid TrxID', () => {
    const errorSpy = vi.spyOn(toastService, 'error');
    component.selectPaymentMethod('manual');
    expect(component.paymentProvider()).toBe('manual');
    expect(component.selectedMethodLabel()).toContain('Manual Gateway');

    component.agreeTerms = true;
    component.recipientName = 'Tariqul Islam';
    component.phone = '01711000000';
    component.streetAddress = 'House 48, Road 11';
    component.postalCode = '1213';
    component.paymentTransactionId = ''; // missing TrxID

    component.placeOrder();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Transaction ID (TrxID)')
    );
  });

  it('should block unbacked Cash on Delivery when cart items require advance payment', () => {
    const errorSpy = vi.spyOn(toastService, 'error');
    // Mock cart items with advance_payment_type = 'fifty_percent'
    vi.spyOn(cartService, 'items').mockReturnValue([
      {
        product_id: 1,
        variant_id: 10,
        product_name: 'Custom Tailored Suit',
        product_slug: 'custom-suit',
        price: 5000,
        effective_price: 5000,
        quantity: 1,
        line_total: 5000,
        stock_quantity: 5,
        advance_payment_type: 'fifty_percent',
      } as any,
    ]);
    vi.spyOn(cartService, 'subtotal').mockReturnValue(5000);

    // Required advance should be 50% of 5000 = 2500
    expect(component.requiredAdvanceAmount()).toBe(2500);

    component.selectPaymentMethod('cod');
    component.agreeTerms = true;
    component.recipientName = 'Tariqul Islam';
    component.phone = '01711000000';
    component.streetAddress = 'House 48, Road 11';
    component.postalCode = '1213';

    component.placeOrder();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('advance payment of ৳2500 is required')
    );
  });

  it('should pass advance_amount and due_amount when placing order with manual gateway', () => {
    const placeGuestSpy = vi.spyOn(orderService, 'placeGuestOrder').mockReturnValue(
      of({
        success: true,
        message: 'Order created',
        data: { id: 101, order_number: 'MAV-2026-ADV-1' } as any,
      })
    );

    vi.spyOn(cartService, 'items').mockReturnValue([
      {
        product_id: 2,
        variant_id: 20,
        product_name: 'Made to Order Panjabi',
        product_slug: 'made-to-order-panjabi',
        price: 3000,
        effective_price: 3000,
        quantity: 1,
        line_total: 3000,
        stock_quantity: 10,
        advance_payment_type: 'thirty_percent',
      } as any,
    ]);
    vi.spyOn(cartService, 'subtotal').mockReturnValue(3000);

    // 30% of 3000 = 900
    expect(component.requiredAdvanceAmount()).toBe(900);

    component.selectPaymentMethod('manual');
    component.paymentTransactionId = 'CTB9928381X';
    component.agreeTerms = true;
    component.recipientName = 'Tariqul Islam';
    component.phone = '01711000000';
    component.streetAddress = 'House 48, Road 11';
    component.postalCode = '1213';

    component.placeOrder();
    expect(placeGuestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_provider: 'manual',
        transaction_id: 'CTB9928381X',
        advance_amount: 900,
        due_amount: expect.any(Number),
      })
    );
  });

  it('should display guest promo banner with sign-in and register CTAs when customer is unauthenticated', () => {
    mockCartWithItem();
    expect(authService.isAuthenticated()).toBe(false);
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.guest-promo-banner');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Member Exclusive Discounts');
    expect(banner.textContent).toContain('Log in or create a MAVLLIN account to unlock and apply promo coupons.');

    const links = banner.querySelectorAll('a');
    expect(links.length).toBe(2);
    expect(links[0].textContent).toContain('Sign In');
    expect(links[1].textContent).toContain('Register');
  });

  it('should disable coupon input and apply button for unauthenticated guests', () => {
    mockCartWithItem();
    expect(authService.isAuthenticated()).toBe(false);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#checkoutCoupon') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.disabled).toBe(true);
    expect(input.placeholder).toBe('Log in to apply promo codes');

    const applyBtn = fixture.nativeElement.querySelector('.promo-row button') as HTMLButtonElement;
    expect(applyBtn).toBeTruthy();
    expect(applyBtn.disabled).toBe(true);
  });

  it('should guard validateCoupon() and show toast error for unauthenticated guests', () => {
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

  it('should guard quickApplyCoupon() and show toast error for unauthenticated guests', () => {
    const errorSpy = vi.spyOn(toastService, 'error');
    const validateSpy = vi.spyOn(orderService, 'validateCoupon');

    component.quickApplyCoupon('WELCOME10');

    expect(errorSpy).toHaveBeenCalledWith(
      'Please log in or create an account to unlock and apply coupon discounts.'
    );
    expect(validateSpy).not.toHaveBeenCalled();
    expect(component.appliedCoupon()).toBeNull();
  });

  it('should ensure placeGuestOrder receives coupon_code: null and resets appliedCoupon', () => {
    const placeGuestSpy = vi.spyOn(orderService, 'placeGuestOrder').mockReturnValue(
      of({
        success: true,
        message: 'Order created',
        data: { id: 99, order_number: 'MAV-GUEST-COUPON-0' } as any,
      })
    );

    // Simulate tampering with appliedCoupon in guest mode
    component.appliedCoupon.set({
      code: 'UNAUTH10',
      discount_amount: 250,
      discount_type: 'percentage',
      discount_value: 10,
      coupon_id: 999,
    });

    component.agreeTerms = true;
    component.recipientName = 'Tariqul Islam';
    component.phone = '01711000000';
    component.streetAddress = 'House 48, Road 11';
    component.postalCode = '1213';

    component.placeOrder();

    expect(placeGuestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        coupon_code: null,
      })
    );
    expect(component.appliedCoupon()).toBeNull();
  });

  it('should allow authenticated users to validate and apply coupons successfully', () => {
    authService.token.set('valid-auth-token');
    authService.user.set({ id: 5, full_name: 'Sadia Khan', email: 'sadia@mavllin.com', role: 'customer' } as any);
    expect(authService.isAuthenticated()).toBe(true);

    mockCartWithItem();
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.guest-promo-banner');
    expect(banner).toBeNull();

    const input = fixture.nativeElement.querySelector('#checkoutCoupon') as HTMLInputElement;
    expect(input.disabled).toBe(false);
    expect(input.placeholder).toBe('WELCOME10, FASHION20, FREESHIP15');

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
      expect.objectContaining({ code: 'WELCOME10', discount_amount: 250 })
    );
    expect(successSpy).toHaveBeenCalledWith('Promo code WELCOME10 applied!');
  });

  it('should submit applied coupon_code when placing authenticated order', () => {
    authService.token.set('valid-auth-token');
    authService.user.set({ id: 5, full_name: 'Sadia Khan', email: 'sadia@mavllin.com', role: 'customer' } as any);

    const placeOrderSpy = vi.spyOn(orderService, 'placeOrder').mockReturnValue(
      of({
        success: true,
        message: 'Order created',
        data: { id: 100, order_number: 'MAV-AUTH-COUPON-1' } as any,
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
    component.recipientName = 'Sadia Khan';
    component.phone = '01711000000';
    component.streetAddress = 'House 12, Road 4, Dhanmondi';
    component.postalCode = '1209';

    component.placeOrder();

    expect(placeOrderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        coupon_code: 'WELCOME10',
      })
    );
  });
});
