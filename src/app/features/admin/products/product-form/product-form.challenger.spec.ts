import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductFormComponent } from './product-form.component';
import { AdminService } from '../../../../core/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Product } from '../../../../core/models/api.models';

describe('Empirical Challenger: Admin UI Product Form Pricing & Flow Stress Tests', () => {
  let fixture: any;
  let component: ProductFormComponent;
  let adminService: AdminService;
  let toastService: ToastService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductFormComponent],
      providers: [
        provideHttpClient(),
        provideRouter([{ path: 'admin/products', component: class {} }]),
      ],
    }).compileComponents();

    adminService = TestBed.inject(AdminService);
    toastService = TestBed.inject(ToastService);
    router = TestBed.inject(Router);

    vi.spyOn(adminService, 'getCategories').mockReturnValue(
      of({ success: true, message: 'OK', data: [] })
    );

    fixture = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('1. Dynamic Updating of Optimal Price', () => {
    it('CHAL-R1-01: modifying base cost immediately reflects in calculated optimal price and DOM', () => {
      component.form.profit_margin_percentage = 25;

      // Simulate UI input: user enters 400
      const costInput = fixture.nativeElement.querySelector('#calcBaseCost');
      costInput.value = '400';
      costInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.form.base_cost).toBe(400);
      expect(component.calculatedOptimalPrice).toBe(500);
      let priceEl = fixture.nativeElement.querySelector('#calcOptimalPriceVal');
      expect(priceEl.textContent).toContain('500.00');

      // User updates base cost to 1200 -> 1200 * 1.25 = 1500
      costInput.value = '1200';
      costInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.form.base_cost).toBe(1200);
      expect(component.calculatedOptimalPrice).toBe(1500);
      priceEl = fixture.nativeElement.querySelector('#calcOptimalPriceVal');
      expect(priceEl.textContent).toContain('1,500.00');
    });

    it('CHAL-R1-02: modifying profit margin immediately reflects in calculated optimal price and DOM', () => {
      const costInput = fixture.nativeElement.querySelector('#calcBaseCost');
      costInput.value = '1000';
      costInput.dispatchEvent(new Event('input'));

      const marginInput = fixture.nativeElement.querySelector('#calcProfitMargin');
      marginInput.value = '10';
      marginInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.calculatedOptimalPrice).toBe(1100);
      let priceEl = fixture.nativeElement.querySelector('#calcOptimalPriceVal');
      expect(priceEl.textContent).toContain('1,100.00');

      // User updates margin to 40% -> 1400
      marginInput.value = '40';
      marginInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.calculatedOptimalPrice).toBe(1400);
      priceEl = fixture.nativeElement.querySelector('#calcOptimalPriceVal');
      expect(priceEl.textContent).toContain('1,400.00');
    });

    it('CHAL-R1-03: handles edge cases (0 cost, negative cost, negative margin, fractional precision)', () => {
      // 0 cost -> 0
      component.form.base_cost = 0;
      component.form.profit_margin_percentage = 30;
      expect(component.calculatedOptimalPrice).toBe(0);

      // Negative cost -> 0
      component.form.base_cost = -100;
      component.form.profit_margin_percentage = 30;
      expect(component.calculatedOptimalPrice).toBe(0);

      // Negative margin is clamped to 0 markup -> optimal price equals base cost
      component.form.base_cost = 750;
      component.form.profit_margin_percentage = -20;
      expect(component.calculatedOptimalPrice).toBe(750);

      // Fractional values: 333.33 cost with 15.5% margin -> 333.33 * 1.155 = 384.99615 -> rounded 385.00
      component.form.base_cost = 333.33;
      component.form.profit_margin_percentage = 15.5;
      expect(component.calculatedOptimalPrice).toBe(385);
    });
  });

  describe('2. Apply to Selling Price Interaction', () => {
    it('CHAL-R1-04: applyOptimalPrice properly updates base_price and default variant price', () => {
      const toastSuccessSpy = vi.spyOn(toastService, 'success');

      component.form.base_cost = 600;
      component.form.profit_margin_percentage = 50; // optimal = 900
      expect(component.calculatedOptimalPrice).toBe(900);

      component.applyOptimalPrice();

      expect(component.form.base_price).toBe(900);
      expect(component.variants[0].price).toBe(900);
      expect(toastSuccessSpy).toHaveBeenCalledWith(expect.stringContaining('900.00'));

      fixture.detectChanges();
      const basePriceEl = fixture.nativeElement.querySelector('#overviewBasePrice');
      expect(basePriceEl.textContent).toContain('900.00');
    });

    it('CHAL-R1-05: apply button is disabled when calculatedOptimalPrice <= 0', () => {
      const costInput = fixture.nativeElement.querySelector('#calcBaseCost');
      costInput.value = '0';
      costInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const btn = fixture.debugElement.query(By.css('#btnApplyOptimalPrice'));
      expect(btn.nativeElement.disabled).toBe(true);

      // When cost is entered > 0, button becomes enabled
      costInput.value = '500';
      costInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(btn.nativeElement.disabled).toBe(false);
    });
  });

  describe('3. Selling Price Real-Time Cascade', () => {
    it('CHAL-R2-01: changing selling price immediately cascades to the real-time overview', () => {
      const priceInput = fixture.nativeElement.querySelector('#prodBasePrice');
      priceInput.value = '1200';
      priceInput.dispatchEvent(new Event('input'));
      component.onSellingPriceChange();
      fixture.detectChanges();

      let overviewBase = fixture.nativeElement.querySelector('#overviewBasePrice');
      let overviewFinal = fixture.nativeElement.querySelector('#overviewFinalPrice');
      expect(overviewBase.textContent).toContain('1,200.00');
      expect(overviewFinal.textContent).toContain('1,200.00');

      // Update selling price to 3500
      priceInput.value = '3500';
      priceInput.dispatchEvent(new Event('input'));
      component.onSellingPriceChange();
      fixture.detectChanges();

      overviewBase = fixture.nativeElement.querySelector('#overviewBasePrice');
      overviewFinal = fixture.nativeElement.querySelector('#overviewFinalPrice');
      expect(overviewBase.textContent).toContain('3,500.00');
      expect(overviewFinal.textContent).toContain('3,500.00');
    });

    it('CHAL-R2-02: changing selling price syncs single variant price in create mode', () => {
      expect(component.isEditMode()).toBe(false);
      expect(component.variants.length).toBe(1);

      component.form.base_price = 2200;
      component.onSellingPriceChange();
      expect(component.variants[0].price).toBe(2200);
    });
  });

  describe('4. Discount Type Switching & Computation', () => {
    it('CHAL-R2-03: switching discount type between none, percentage, and fixed computes correct final sale price', () => {
      const basePriceInput = fixture.nativeElement.querySelector('#prodBasePrice');
      basePriceInput.value = '2000';
      basePriceInput.dispatchEvent(new Event('input'));

      const discountTypeSelect = fixture.nativeElement.querySelector('#prodDiscountType');

      // 1. None
      discountTypeSelect.value = 'none';
      discountTypeSelect.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(component.appliedDiscountAmount).toBe(0);
      expect(component.finalSalePrice).toBe(2000);
      let finalPriceEl = fixture.nativeElement.querySelector('#overviewFinalPrice');
      expect(finalPriceEl.textContent).toContain('2,000.00');

      // 2. Percentage: 25% of 2000 = 500 discount -> 1500 final
      discountTypeSelect.value = 'percentage';
      discountTypeSelect.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      const discountValInput = fixture.nativeElement.querySelector('#prodDiscountVal');
      expect(discountValInput).toBeTruthy();
      discountValInput.value = '25';
      discountValInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.appliedDiscountAmount).toBe(500);
      expect(component.finalSalePrice).toBe(1500);
      finalPriceEl = fixture.nativeElement.querySelector('#overviewFinalPrice');
      expect(finalPriceEl.textContent).toContain('1,500.00');

      // 3. Fixed: 350 BDT discount -> 1650 final
      discountTypeSelect.value = 'fixed';
      discountTypeSelect.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      const fixedValInput = fixture.nativeElement.querySelector('#prodDiscountVal');
      fixedValInput.value = '350';
      fixedValInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.appliedDiscountAmount).toBe(350);
      expect(component.finalSalePrice).toBe(1650);
      finalPriceEl = fixture.nativeElement.querySelector('#overviewFinalPrice');
      expect(finalPriceEl.textContent).toContain('1,650.00');

      // 4. Switch back to None -> returns immediately to base price
      discountTypeSelect.value = 'none';
      discountTypeSelect.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(component.appliedDiscountAmount).toBe(0);
      expect(component.finalSalePrice).toBe(2000);
    });
  });

  describe('5. Fixed Discount Exceeding Selling Price (Clamping & Error Handling)', () => {
    it('CHAL-R2-04: fixed discount > selling price clamps final sale price to 0 and does NOT render negative values', () => {
      component.form.base_price = 1000;
      component.form.discount_type = 'fixed';
      component.form.discount_value = 1500; // Exceeds 1000 base

      // appliedDiscountAmount is clamped to base (1000)
      expect(component.appliedDiscountAmount).toBe(1000);
      // finalSalePrice is strictly non-negative (clamped to 0)
      expect(component.finalSalePrice).toBe(0);
      // Validation error exists
      expect(component.isPricingValid).toBe(false);
      expect(component.pricingErrorMessage).toBe('Fixed discount amount cannot exceed base price.');

      fixture.detectChanges();
      const finalPriceEl = fixture.nativeElement.querySelector('#overviewFinalPrice');
      expect(finalPriceEl.textContent).toContain('0.00');
      expect(finalPriceEl.textContent).not.toContain('-');

      const warningEl = fixture.nativeElement.querySelector('.overview-warning-bar');
      expect(warningEl).toBeTruthy();
      expect(warningEl.textContent).toContain('Fixed discount amount cannot exceed base price.');
    });

    it('CHAL-R2-05: fixed discount > selling price blocks submission and displays error toast', () => {
      const toastErrorSpy = vi.spyOn(toastService, 'error');
      const createSpy = vi.spyOn(adminService, 'createProduct');

      component.form.name = 'Excessive Discount Garment';
      component.form.slug = 'excessive-discount-garment';
      component.form.base_price = 500;
      component.form.discount_type = 'fixed';
      component.form.discount_value = 600;
      component.variants = [
        {
          sku: 'ECO-EXCESS-M',
          size: 'M',
          color: 'Black',
          price: 500,
          stock_quantity: 10,
          is_active: true,
        },
      ];

      component.saveProduct();

      expect(toastErrorSpy).toHaveBeenCalledWith('Fixed discount amount cannot exceed base price.');
      expect(createSpy).not.toHaveBeenCalled();

      // Submit button is disabled in UI
      fixture.detectChanges();
      const submitBtn = fixture.debugElement.query(By.css('button.btn-primary'));
      expect(submitBtn.nativeElement.disabled).toBe(true);
    });
  });

  describe('6. Percentage Discount > 100% (Validation & Submission Block)', () => {
    it('CHAL-R2-06: percentage discount > 100% triggers validation warnings and prevents submission', () => {
      const toastErrorSpy = vi.spyOn(toastService, 'error');
      const createSpy = vi.spyOn(adminService, 'createProduct');

      component.form.name = 'Over 100 Percent Garment';
      component.form.slug = 'over-100-percent-garment';
      component.form.base_price = 1000;
      component.form.discount_type = 'percentage';
      component.form.discount_value = 125; // Invalid: > 100%
      component.variants = [
        {
          sku: 'ECO-OVER100-M',
          size: 'M',
          color: 'Navy',
          price: 1000,
          stock_quantity: 10,
          is_active: true,
        },
      ];

      // Clamped applied discount so calculation does not corrupt
      expect(component.appliedDiscountAmount).toBe(1000);
      expect(component.finalSalePrice).toBe(0);

      // Validation flags
      expect(component.isPricingValid).toBe(false);
      expect(component.pricingErrorMessage).toBe('Percentage discount must be between 0% and 100%.');

      fixture.detectChanges();
      const warningEl = fixture.nativeElement.querySelector('.overview-warning-bar');
      expect(warningEl).toBeTruthy();
      expect(warningEl.textContent).toContain('Percentage discount must be between 0% and 100%.');

      // Submit button is disabled in UI
      const submitBtn = fixture.debugElement.query(By.css('button.btn-primary'));
      expect(submitBtn.nativeElement.disabled).toBe(true);

      // Attempted submission is blocked
      component.saveProduct();
      expect(toastErrorSpy).toHaveBeenCalledWith('Percentage discount must be between 0% and 100%.');
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('CHAL-R2-07: percentage discount < 0% triggers validation warnings and prevents submission', () => {
      const toastErrorSpy = vi.spyOn(toastService, 'error');
      const createSpy = vi.spyOn(adminService, 'createProduct');

      component.form.name = 'Negative Percent Garment';
      component.form.slug = 'negative-percent-garment';
      component.form.base_price = 1000;
      component.form.discount_type = 'percentage';
      component.form.discount_value = -10;
      component.variants = [
        {
          sku: 'ECO-NEG-M',
          size: 'M',
          color: 'White',
          price: 1000,
          stock_quantity: 5,
          is_active: true,
        },
      ];

      expect(component.isPricingValid).toBe(false);
      expect(component.pricingErrorMessage).toBe('Percentage discount must be between 0% and 100%.');

      component.saveProduct();
      expect(toastErrorSpy).toHaveBeenCalledWith('Percentage discount must be between 0% and 100%.');
      expect(createSpy).not.toHaveBeenCalled();
    });
  });

  describe('7. End-to-End Payload Integrity with Cost-Plus and Discount Overview', () => {
    it('CHAL-E2E-01: sends clean payload with base_cost, profit_margin_percentage, and final discount_price', () => {
      const createSpy = vi.spyOn(adminService, 'createProduct').mockReturnValue(
        of({ success: true, message: 'Created', data: {} as Product })
      );
      const navigateSpy = vi.spyOn(router, 'navigate');

      component.form.name = 'Panjabi Royal Silk';
      component.form.slug = 'panjabi-royal-silk';
      component.form.base_cost = 1500;
      component.form.profit_margin_percentage = 30; // Optimal = 1950
      component.applyOptimalPrice(); // Sets base_price to 1950

      component.form.discount_type = 'percentage';
      component.form.discount_value = 10; // Final sale price = 1950 - 195 = 1755

      expect(component.finalSalePrice).toBe(1755);
      expect(component.isPricingValid).toBe(true);

      component.variants = [
        {
          sku: 'PANJABI-ROYAL-L',
          size: 'L',
          color: 'Champagne',
          price: 1950,
          stock_quantity: 15,
          is_active: true,
        },
      ];

      component.saveProduct();

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Panjabi Royal Silk',
          slug: 'panjabi-royal-silk',
          base_cost: 1500,
          profit_margin_percentage: 30,
          base_price: 1950,
          price: 1950,
          discount_type: 'percentage',
          discount_value: 10,
          discount_price: 1755,
        })
      );
      expect(navigateSpy).toHaveBeenCalledWith(['/admin/products']);
    });
  });
});
