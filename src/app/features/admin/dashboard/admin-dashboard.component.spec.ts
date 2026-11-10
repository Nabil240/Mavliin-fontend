import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AdminService } from '../../../core/services/admin.service';
import { DashboardData } from '../../../core/models/api.models';

describe('AdminDashboardComponent', () => {
  let fixture: any;
  let component: AdminDashboardComponent;
  let adminService: AdminService;

  const mockData: DashboardData = {
    stats: {
      total_revenue: 12500.5,
      total_orders: 85,
      pending_orders: 12,
      total_products: 42,
      low_stock_count: 4,
      total_customers: 65,
      total_investment: 350000,
      realized_profit: 45000,
      investment_amount: 350000,
      profit: 45000,
    },
    recent_orders: [
      {
        id: 1,
        order_number: 'ORD-2026-1001',
        total_amount: 140,
        subtotal: 135,
        discount_amount: 0,
        shipping_fee: 5,
        status: 'pending',
        payment_status: 'unpaid',
        customer_name: 'Tanvir Hossain',
        created_at: '2026-11-03T09:00:00Z',
        shipping_address: {
          recipient_name: 'Tanvir Hossain',
          phone: '+8801711223344',
          street_address: 'Banani',
          city: 'Dhaka',
          postal_code: '1213',
        },
      },
    ],
    low_stock_products: [
      {
        id: 10,
        variant_id: 10,
        sku: 'ECO-OVR-BLK-M',
        size: 'M',
        color: 'Black',
        price: 90,
        stock_quantity: 2,
        name: 'Overshirt',
      },
    ],
    top_products: [],
    monthly_revenue: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    adminService = TestBed.inject(AdminService);
    vi.spyOn(adminService, 'getDashboard').mockReturnValue(
      of({ success: true, message: 'OK', data: mockData })
    );

    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load dashboard KPI metrics and recent orders on init', () => {
    expect(component.data()).toEqual(mockData);
    expect(component.data()?.stats.total_revenue).toBe(12500.5);
    expect(component.data()?.stats.total_investment).toBe(350000);
    expect(component.data()?.stats.realized_profit).toBe(45000);
    expect(component.data()?.stats.pending_orders).toBe(12);
    expect(component.data()?.recent_orders.length).toBe(1);
    expect(component.data()?.low_stock_products.length).toBe(1);
  });

  it('should render Total Investment card with formatted BDT inventory cost', () => {
    const el = fixture.nativeElement as HTMLElement;
    const investCard = el.querySelector('[data-testid="kpi-total-investment"]');
    expect(investCard).toBeTruthy();

    const label = investCard?.querySelector('.kpi-label')?.textContent?.trim();
    expect(label).toBe('Total Investment');

    const sub = investCard?.querySelector('.kpi-sub')?.textContent?.trim();
    expect(sub).toBe('Inventory base cost');

    const valueEl = investCard?.querySelector('.kpi-value');
    expect(valueEl).toBeTruthy();
    expect(valueEl?.textContent).toContain('350,000');
  });

  it('should render Realized Profit card with text-emerald for positive profit', () => {
    const el = fixture.nativeElement as HTMLElement;
    const profitCard = el.querySelector('[data-testid="kpi-realized-profit"]');
    expect(profitCard).toBeTruthy();

    const label = profitCard?.querySelector('.kpi-label')?.textContent?.trim();
    expect(label).toBe('Realized Profit');

    const sub = profitCard?.querySelector('.kpi-sub')?.textContent?.trim();
    expect(sub).toBe('Net profit from completed sales');

    const valueEl = profitCard?.querySelector('.kpi-value');
    expect(valueEl).toBeTruthy();
    expect(valueEl?.textContent).toContain('45,000');
    expect(valueEl?.classList.contains('text-emerald')).toBe(true);
    expect(valueEl?.classList.contains('text-berry')).toBe(false);
  });

  it('should render Realized Profit card with text-berry for negative profit', () => {
    const negativeData: DashboardData = {
      ...mockData,
      stats: {
        ...mockData.stats,
        total_investment: 200000,
        realized_profit: -5000,
        profit: -5000,
      },
    };

    component.data.set(negativeData);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const profitCard = el.querySelector('[data-testid="kpi-realized-profit"]');
    const valueEl = profitCard?.querySelector('.kpi-value');

    expect(valueEl).toBeTruthy();
    expect(valueEl?.classList.contains('text-berry')).toBe(true);
    expect(valueEl?.classList.contains('text-emerald')).toBe(false);
  });

  it('should default missing or zero metrics to ৳0 without crashing', () => {
    const zeroData: DashboardData = {
      ...mockData,
      stats: {
        total_orders: 0,
        total_revenue: 0,
        total_products: 0,
        total_customers: 0,
        low_stock_count: 0,
        pending_orders: 0,
        total_investment: undefined,
        realized_profit: undefined,
        investment_amount: undefined,
        profit: undefined,
      },
    };

    component.data.set(zeroData);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const investCard = el.querySelector('[data-testid="kpi-total-investment"]');
    const profitCard = el.querySelector('[data-testid="kpi-realized-profit"]');

    expect(investCard?.querySelector('.kpi-value')?.textContent).toContain('0');
    expect(profitCard?.querySelector('.kpi-value')?.textContent).toContain('0');
  });
});
