import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { ProductFormComponent } from './product-form.component';
import { AdminService } from '../../../../core/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Product } from '../../../../core/models/api.models';

describe('ProductFormComponent', () => {
  let fixture: any;
  let component: ProductFormComponent;
  let adminService: AdminService;
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
    router = TestBed.inject(Router);
    vi.spyOn(adminService, 'getCategories').mockReturnValue(
      of({ success: true, message: 'OK', data: [] })
    );

    fixture = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize with 1 default variant row', () => {
    expect(component.isEditMode()).toBe(false);
    expect(component.variants.length).toBe(1);
    expect(component.variants[0].size).toBe('M');
  });

  it('should auto-derive slug and default SKU on name change', () => {
    component.onNameChange('Formal Twill Shirt');
    expect(component.form.slug).toBe('formal-twill-shirt');
    expect(component.variants[0].sku).toContain('ECO-FORMAL-TWI');
  });

  it('should add and remove variant rows', () => {
    component.form.slug = 'test-shirt';
    component.addVariantRow();
    expect(component.variants.length).toBe(2);

    component.removeVariantRow(1);
    expect(component.variants.length).toBe(1);
  });

  it('should generate matrix combinations from sizes and colors', () => {
    component.form.slug = 'linen-shirt';
    component.genSizes = 'M, L';
    component.genColors = 'Black, White';
    component.genDefaultStock = 12;

    component.generateMatrix();
    // 2 sizes * 2 colors = 4 variants
    expect(component.variants.length).toBe(4);
    expect(component.variants[0].stock_quantity).toBe(12);
  });

  it('should prevent submission when SKUs are duplicated', () => {
    const toast = TestBed.inject(ToastService);
    const toastSpy = vi.spyOn(toast, 'error');
    const createSpy = vi.spyOn(adminService, 'createProduct');

    component.form.name = 'Test Garment';
    component.form.slug = 'test-garment';
    component.variants = [
      {
        sku: 'DUPLICATE-SKU',
        size: 'M',
        color: 'Black',
        price: 80,
        stock_quantity: 10,
        is_active: true,
      },
      {
        sku: 'DUPLICATE-SKU',
        size: 'L',
        color: 'Black',
        price: 80,
        stock_quantity: 10,
        is_active: true,
      },
    ];

    component.saveProduct();
    expect(toastSpy).toHaveBeenCalledWith('Duplicate SKU detected: DUPLICATE-SKU');
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('should successfully submit valid product and navigate to /admin/products', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const createSpy = vi.spyOn(adminService, 'createProduct').mockReturnValue(
      of({
        success: true,
        message: 'Product created',
        data: {} as Product,
      })
    );

    component.form.name = 'Unique Garment';
    component.form.slug = 'unique-garment';
    component.variants = [
      {
        sku: 'ECO-UNIQ-M',
        size: 'M',
        color: 'Navy',
        price: 95,
        stock_quantity: 30,
        is_active: true,
      },
    ];

    component.saveProduct();
    expect(createSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/products']);
  });

  it('should accurately compute calculatedDiscountPrice for percentage and fixed discounts', () => {
    component.form.base_price = 1000;
    component.form.discount_type = 'percentage';
    component.form.discount_value = 20;
    expect(component.calculatedDiscountPrice).toBe(800);

    component.form.discount_type = 'fixed';
    component.form.discount_value = 150;
    expect(component.calculatedDiscountPrice).toBe(850);

    component.form.discount_type = 'none';
    expect(component.calculatedDiscountPrice).toBe(1000);
  });

  it('should validate percentage discount range and block submission if invalid', () => {
    const toast = TestBed.inject(ToastService);
    const toastSpy = vi.spyOn(toast, 'error');
    const createSpy = vi.spyOn(adminService, 'createProduct');

    component.form.name = 'Discounted Garment';
    component.form.slug = 'discounted-garment';
    component.form.base_price = 500;
    component.form.discount_type = 'percentage';
    component.form.discount_value = 120; // >100% invalid
    component.variants = [
      {
        sku: 'ECO-DISC-M',
        size: 'M',
        color: 'Navy',
        price: 500,
        stock_quantity: 10,
        is_active: true,
      },
    ];

    component.saveProduct();
    expect(toastSpy).toHaveBeenCalledWith('Percentage discount must be between 0% and 100%.');
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('should include discount_type, discount_value, and advance_payment_type in payload', () => {
    const createSpy = vi.spyOn(adminService, 'createProduct').mockReturnValue(
      of({ success: true, message: 'Created', data: {} as Product })
    );

    component.form.name = 'Advance Linen Shirt';
    component.form.slug = 'advance-linen-shirt';
    component.form.base_price = 2000;
    component.form.discount_type = 'percentage';
    component.form.discount_value = 10;
    component.form.advance_payment_type = 'thirty_percent';
    component.variants = [
      {
        sku: 'ECO-ADV-M',
        size: 'M',
        color: 'White',
        price: 2000,
        stock_quantity: 15,
        is_active: true,
      },
    ];

    component.saveProduct();
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        discount_type: 'percentage',
        discount_value: 10,
        discount_price: 1800,
        advance_payment_type: 'thirty_percent',
      })
    );
  });

  describe('R1: Optimal Price Calculation (Cost-Plus Margin)', () => {
    it('should initialize with default profit margin of 25% and null base cost', () => {
      expect(component.form.profit_margin_percentage).toBe(25);
      expect(component.profitMarginPercent).toBe(25);
      expect(component.form.base_cost).toBeNull();
      expect(component.calculatedOptimalPrice).toBe(0);
      expect(component.optimalPrice).toBe(0);
    });

    it('should compute and display optimal price using cost-plus formula', () => {
      component.form.base_cost = 800;
      component.form.profit_margin_percentage = 25;
      expect(component.calculatedOptimalPrice).toBe(1000);
      expect(component.optimalPrice).toBe(1000);

      fixture.detectChanges();
      const optimalPriceEl = fixture.nativeElement.querySelector('#calcOptimalPriceVal');
      expect(optimalPriceEl).toBeTruthy();
      expect(optimalPriceEl.textContent).toContain('1,000.00');
    });

    it('should dynamically recalculate optimal price when base cost or profit margin changes', () => {
      component.form.base_cost = 1000;
      component.form.profit_margin_percentage = 20;
      expect(component.calculatedOptimalPrice).toBe(1200);

      // Dynamically update base cost
      component.form.base_cost = 1200;
      expect(component.calculatedOptimalPrice).toBe(1440);

      // Dynamically update margin percentage
      component.form.profit_margin_percentage = 50;
      expect(component.calculatedOptimalPrice).toBe(1800);

      fixture.detectChanges();
      const optimalPriceEl = fixture.nativeElement.querySelector('#calcOptimalPriceVal');
      expect(optimalPriceEl.textContent).toContain('1,800.00');
    });

    it('should update form.base_price and default variant price when applyOptimalPrice is clicked', () => {
      const toast = TestBed.inject(ToastService);
      const toastSpy = vi.spyOn(toast, 'success');

      component.form.base_cost = 800;
      component.form.profit_margin_percentage = 25;
      expect(component.calculatedOptimalPrice).toBe(1000);

      component.applyOptimalPrice();
      expect(component.form.base_price).toBe(1000);
      expect(component.variants[0].price).toBe(1000);
      expect(toastSpy).toHaveBeenCalledWith(expect.stringContaining('1000.00'));
    });

    it('should handle boundary conditions: zero cost, negative cost, zero margin, negative margin', () => {
      // Zero base cost
      component.form.base_cost = 0;
      component.form.profit_margin_percentage = 40;
      expect(component.calculatedOptimalPrice).toBe(0);

      // Negative base cost
      component.form.base_cost = -250;
      component.form.profit_margin_percentage = 25;
      expect(component.calculatedOptimalPrice).toBe(0);

      // Zero margin
      component.form.base_cost = 1500;
      component.form.profit_margin_percentage = 0;
      expect(component.calculatedOptimalPrice).toBe(1500);

      // Negative margin (clamped to 0)
      component.form.base_cost = 500;
      component.form.profit_margin_percentage = -15;
      expect(component.calculatedOptimalPrice).toBe(500);
    });

    it('should calculate decimal precision rounding accurately for fractional inputs', () => {
      component.form.base_cost = 149.95;
      component.form.profit_margin_percentage = 17.5;
      // 149.95 * 1.175 = 176.19125 -> 176.19
      expect(component.calculatedOptimalPrice).toBe(176.19);
    });

    it('should populate base_cost and profit_margin_percentage in edit mode', () => {
      vi.spyOn(adminService, 'getProducts').mockReturnValue(
        of({
          success: true,
          message: 'OK',
          data: [
            {
              id: 99,
              name: 'Signature Panjabi',
              slug: 'signature-panjabi',
              base_price: 1500,
              price: 1500,
              base_cost: 1000,
              profit_margin_percentage: 50,
              discount_type: 'none',
              discount_value: 0,
              variants: [],
            } as any,
          ],
        })
      );

      component.loadProductForEdit(99);
      expect(component.form.base_cost).toBe(1000);
      expect(component.form.profit_margin_percentage).toBe(50);
      expect(component.calculatedOptimalPrice).toBe(1500);
    });
  });

  describe('R2: Selling Price & Discount Overview', () => {
    it('should display persistent overview for standard pricing with discount_type "none"', () => {
      component.form.base_price = 1500;
      component.form.discount_type = 'none';
      component.form.discount_value = 0;

      expect(component.appliedDiscountAmount).toBe(0);
      expect(component.finalSalePrice).toBe(1500);

      fixture.detectChanges();
      const overviewCard = fixture.nativeElement.querySelector('.pricing-overview-card');
      expect(overviewCard).toBeTruthy();

      const basePriceEl = fixture.nativeElement.querySelector('#overviewBasePrice');
      expect(basePriceEl.textContent).toContain('1,500.00');

      const discountEl = fixture.nativeElement.querySelector('#overviewDiscount');
      expect(discountEl.textContent).toContain('None');

      const finalPriceEl = fixture.nativeElement.querySelector('#overviewFinalPrice');
      expect(finalPriceEl.textContent).toContain('1,500.00');
    });

    it('should accurately calculate and display percentage discount overview', () => {
      component.form.base_price = 2000;
      component.form.discount_type = 'percentage';
      component.form.discount_value = 15;

      expect(component.appliedDiscountAmount).toBe(300);
      expect(component.finalSalePrice).toBe(1700);

      fixture.detectChanges();
      const basePriceEl = fixture.nativeElement.querySelector('#overviewBasePrice');
      expect(basePriceEl.textContent).toContain('2,000.00');

      const discountEl = fixture.nativeElement.querySelector('#overviewDiscount');
      expect(discountEl.textContent).toContain('-15%');
      expect(discountEl.textContent).toContain('300.00');

      const finalPriceEl = fixture.nativeElement.querySelector('#overviewFinalPrice');
      expect(finalPriceEl.textContent).toContain('1,700.00');
    });

    it('should accurately calculate and display fixed amount discount overview', () => {
      component.form.base_price = 2000;
      component.form.discount_type = 'fixed';
      component.form.discount_value = 400;

      expect(component.appliedDiscountAmount).toBe(400);
      expect(component.finalSalePrice).toBe(1600);

      fixture.detectChanges();
      const basePriceEl = fixture.nativeElement.querySelector('#overviewBasePrice');
      expect(basePriceEl.textContent).toContain('2,000.00');

      const discountEl = fixture.nativeElement.querySelector('#overviewDiscount');
      expect(discountEl.textContent).toContain('400.00');

      const finalPriceEl = fixture.nativeElement.querySelector('#overviewFinalPrice');
      expect(finalPriceEl.textContent).toContain('1,600.00');
    });

    it('should dynamically update final sale price when base price or discount changes', () => {
      component.form.base_price = 1000;
      component.form.discount_type = 'percentage';
      component.form.discount_value = 10;
      expect(component.finalSalePrice).toBe(900);

      // Change selling price
      component.form.base_price = 2500;
      expect(component.appliedDiscountAmount).toBe(250);
      expect(component.finalSalePrice).toBe(2250);

      // Change discount value
      component.form.discount_value = 20;
      expect(component.appliedDiscountAmount).toBe(500);
      expect(component.finalSalePrice).toBe(2000);

      fixture.detectChanges();
      const finalPriceEl = fixture.nativeElement.querySelector('#overviewFinalPrice');
      expect(finalPriceEl.textContent).toContain('2,000.00');
    });

    it('should handle boundary conditions: fixed discount > selling price clamps final sale price to 0 and invalidates', () => {
      component.form.base_price = 500;
      component.form.discount_type = 'fixed';
      component.form.discount_value = 700;

      expect(component.appliedDiscountAmount).toBe(500); // Clamped to base
      expect(component.finalSalePrice).toBe(0); // Clamped to 0
      expect(component.isPricingValid).toBe(false);
      expect(component.pricingErrorMessage).toContain('Fixed discount amount cannot exceed base price');

      fixture.detectChanges();
      const warningEl = fixture.nativeElement.querySelector('.overview-warning-bar');
      expect(warningEl).toBeTruthy();
      expect(warningEl.textContent).toContain('Fixed discount amount cannot exceed base price');
    });

    it('should handle boundary conditions: percentage discount at 0% and 100%', () => {
      component.form.base_price = 1800;
      component.form.discount_type = 'percentage';
      component.form.discount_value = 0;
      expect(component.appliedDiscountAmount).toBe(0);
      expect(component.finalSalePrice).toBe(1800);
      expect(component.isPricingValid).toBe(true);

      component.form.discount_value = 100;
      expect(component.appliedDiscountAmount).toBe(1800);
      expect(component.finalSalePrice).toBe(0);
      expect(component.isPricingValid).toBe(true);
    });

    it('should format decimal fractional prices accurately in the overview', () => {
      component.form.base_price = 999.5;
      component.form.discount_type = 'percentage';
      component.form.discount_value = 10;
      // 999.50 * 0.10 = 99.95; final = 899.55
      expect(component.appliedDiscountAmount).toBe(99.95);
      expect(component.finalSalePrice).toBe(899.55);

      fixture.detectChanges();
      const finalPriceEl = fixture.nativeElement.querySelector('#overviewFinalPrice');
      expect(finalPriceEl.textContent).toContain('899.55');
    });

    it('should include base_cost and profit_margin_percentage in payload when submitting', () => {
      const createSpy = vi.spyOn(adminService, 'createProduct').mockReturnValue(
        of({ success: true, message: 'Created', data: {} as Product })
      );

      component.form.name = 'Cost-Plus Garment';
      component.form.slug = 'cost-plus-garment';
      component.form.base_cost = 800;
      component.form.profit_margin_percentage = 25;
      component.form.base_price = 1000;
      component.form.discount_type = 'percentage';
      component.form.discount_value = 10;
      component.variants = [
        {
          sku: 'ECO-CP-M',
          size: 'M',
          color: 'Navy',
          price: 1000,
          stock_quantity: 20,
          is_active: true,
        },
      ];

      component.saveProduct();
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          base_cost: 800,
          profit_margin_percentage: 25,
          base_price: 1000,
          discount_type: 'percentage',
          discount_value: 10,
          discount_price: 900,
        })
      );
    });
  });
});
