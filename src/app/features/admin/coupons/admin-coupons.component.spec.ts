import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AdminCouponsComponent } from './admin-coupons.component';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { Coupon, CouponAnalytics, CouponMemberUsageItem } from '../../../core/models/api.models';
import { CouponMember } from '../../../core/models/coupon.model';

describe('AdminCouponsComponent - Member Tracking & Usage Analytics', () => {
  let fixture: any;
  let component: AdminCouponsComponent;
  let adminService: AdminService;
  let toastService: ToastService;

  const mockCoupons: Coupon[] = [
    {
      id: 1,
      code: 'WELCOME10',
      discount_type: 'percentage',
      discount_value: 10,
      min_order_amount: 1000,
      usage_limit: 100,
      used_count: 5,
      is_active: 1,
    },
    {
      id: 2,
      code: 'FREESHIP15',
      discount_type: 'fixed',
      discount_value: 150,
      min_order_amount: 500,
      usage_limit: 50,
      used_count: 2,
      is_active: 1,
    },
  ];

  const mockAnalytics: CouponAnalytics = {
    overview: {
      total_redemptions: 7,
      unique_members_count: 3,
      unique_coupons_count: 2,
      total_discount_granted: 1250,
      total_order_volume: 18500,
    },
    coupons: [
      {
        coupon_id: 1,
        code: 'WELCOME10',
        discount_type: 'percentage',
        discount_value: 10,
        min_order_amount: 1000,
        usage_limit: 100,
        recorded_used_count: 5,
        is_active: 1,
        actual_usage_count: 5,
        unique_members_count: 3,
        total_discount_amount: 950,
        total_order_sales: 14500,
      },
      {
        coupon_id: 2,
        code: 'FREESHIP15',
        discount_type: 'fixed',
        discount_value: 150,
        min_order_amount: 500,
        usage_limit: 50,
        recorded_used_count: 2,
        is_active: 1,
        actual_usage_count: 2,
        unique_members_count: 2,
        total_discount_amount: 300,
        total_order_sales: 4000,
      },
    ],
    members: [
      {
        user_id: 10,
        customer_name: 'Sadia Rahman',
        customer_email: 'sadia@example.com',
        customer_phone: '+8801711223344',
        total_orders_with_coupons: 3,
        distinct_coupons_count: 2,
        coupon_codes_used: 'WELCOME10, FREESHIP15',
        total_discount_saved: 450,
        last_used_at: '2026-11-08T14:30:00Z',
      },
      {
        user_id: 11,
        customer_name: 'Tanvir Hossain',
        customer_email: 'tanvir@example.com',
        customer_phone: '+8801811998877',
        total_orders_with_coupons: 1,
        distinct_coupons_count: 1,
        coupon_codes_used: 'WELCOME10',
        total_discount_saved: 200,
        last_used_at: '2026-11-07T10:15:00Z',
      },
    ],
  };

  const mockLedger: CouponMemberUsageItem[] = [
    {
      order_id: 101,
      order_number: 'ORD-2026-101',
      user_id: 10,
      customer_name: 'Sadia Rahman',
      customer_email: 'sadia@example.com',
      customer_phone: '+8801711223344',
      coupon_id: 1,
      coupon_code: 'WELCOME10',
      discount_type: 'percentage',
      discount_value: 10,
      subtotal: 2500,
      discount_amount: 250,
      shipping_fee: 120,
      total_amount: 2370,
      order_status: 'delivered',
      payment_status: 'paid',
      redeemed_at: '2026-11-08T14:30:00Z',
    },
    {
      order_id: 102,
      order_number: 'ORD-2026-102',
      user_id: 10,
      customer_name: 'Sadia Rahman',
      customer_email: 'sadia@example.com',
      customer_phone: '+8801711223344',
      coupon_id: 2,
      coupon_code: 'FREESHIP15',
      discount_type: 'fixed',
      discount_value: 150,
      subtotal: 1800,
      discount_amount: 150,
      shipping_fee: 120,
      total_amount: 1770,
      order_status: 'confirmed',
      payment_status: 'paid',
      redeemed_at: '2026-11-06T12:00:00Z',
    },
  ];

  const mockMembers: CouponMember[] = [
    {
      id: 1,
      coupon_id: 1,
      user_id: 10,
      customer_name: 'Sadia Rahman',
      customer_email: 'sadia@example.com',
      customer_phone: '+8801711223344',
      usage_limit: 3,
      used_count: 2,
      remaining_uses: 1,
    },
    {
      id: 2,
      coupon_id: 1,
      user_id: 11,
      customer_name: 'Tanvir Hossain',
      customer_email: 'tanvir@example.com',
      customer_phone: '+8801811998877',
      usage_limit: 1,
      used_count: 1,
      remaining_uses: 0,
    },
  ];

  beforeEach(async () => {
    mockCoupons[0].is_universal = 0;
    mockCoupons[1].is_universal = 0;

    await TestBed.configureTestingModule({
      imports: [AdminCouponsComponent],
      providers: [provideHttpClient()],
    }).compileComponents();

    adminService = TestBed.inject(AdminService);
    toastService = TestBed.inject(ToastService);

    vi.spyOn(adminService, 'getCoupons').mockReturnValue(
      of({ success: true, message: 'Coupons loaded', data: mockCoupons })
    );

    vi.spyOn(adminService, 'getCouponAnalytics').mockReturnValue(
      of({ success: true, message: 'Analytics loaded', data: mockAnalytics })
    );

    vi.spyOn(adminService, 'getCouponMemberUsage').mockReturnValue(
      of({ success: true, message: 'Ledger loaded', data: mockLedger })
    );

    vi.spyOn(adminService, 'getCouponMembers').mockReturnValue(
      of({ success: true, message: 'Members loaded', data: mockMembers })
    );

    vi.spyOn(adminService, 'addCouponMember').mockReturnValue(
      of({ success: true, message: 'Member added', data: mockMembers[0] })
    );

    vi.spyOn(adminService, 'updateCouponMemberLimit').mockReturnValue(
      of({ success: true, message: 'Limit updated', data: mockMembers[0] })
    );

    vi.spyOn(adminService, 'removeCouponMember').mockReturnValue(
      of({ success: true, message: 'Member removed', data: undefined as any })
    );

    vi.spyOn(adminService, 'getCustomers').mockReturnValue(
      of({ success: true, message: 'Customers loaded', data: [] })
    );

    fixture = TestBed.createComponent(AdminCouponsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and load coupon analytics, members, and coupons', () => {
    expect(component.coupons().length).toBe(2);
    expect(component.analytics()?.overview.total_redemptions).toBe(7);
    expect(component.analytics()?.overview.unique_members_count).toBe(3);
    expect(component.analytics()?.members.length).toBe(2);
    expect(component.ledgerItems().length).toBe(2);
  });

  it('should render KPI overview cards correctly', () => {
    const el = fixture.nativeElement as HTMLElement;
    const redemptionsEl = el.querySelector('[data-testid="kpi-total-redemptions"] .kpi-value');
    const membersEl = el.querySelector('[data-testid="kpi-unique-members"] .kpi-value');

    expect(redemptionsEl?.textContent?.trim()).toBe('7');
    expect(membersEl?.textContent?.trim()).toBe('3');
  });

  it('should filter members by customer name or email', () => {
    component.memberSearch.set('sadia');
    expect(component.filteredMembers().length).toBe(1);
    expect(component.filteredMembers()[0].customer_name).toBe('Sadia Rahman');

    component.memberSearch.set('FREESHIP15');
    expect(component.filteredMembers().length).toBe(1);
    expect(component.filteredMembers()[0].customer_name).toBe('Sadia Rahman');

    component.memberSearch.set('nonexistent');
    expect(component.filteredMembers().length).toBe(0);
  });

  it('should parse comma-separated promo codes correctly', () => {
    const codes = component.splitCodes('WELCOME10, FREESHIP15, SUMMER25');
    expect(codes).toEqual(['WELCOME10', 'FREESHIP15', 'SUMMER25']);
    expect(component.splitCodes(undefined)).toEqual([]);
  });

  it('should switch tabs properly', () => {
    expect(component.activeTab()).toBe('frequency');

    component.setTab('ledger');
    expect(component.activeTab()).toBe('ledger');

    component.setTab('performance');
    expect(component.activeTab()).toBe('performance');

    component.setTab('manage');
    expect(component.activeTab()).toBe('manage');
  });

  it('should drill down to member ledger from frequency table', () => {
    component.drillDownMember('sadia@example.com');
    expect(component.activeTab()).toBe('ledger');
    expect(component.ledgerSearch()).toBe('sadia@example.com');
  });

  it('should create a new coupon and refresh analytics', () => {
    const createSpy = vi.spyOn(adminService, 'createCoupon').mockReturnValue(
      of({
        success: true,
        message: 'Coupon created',
        data: {
          id: 3,
          code: 'FESTIVE20',
          discount_type: 'percentage',
          discount_value: 20,
          min_order_amount: 1500,
          usage_limit: 200,
          used_count: 0,
          is_active: 1,
        },
      })
    );

    component.form.code = 'festive20';
    component.form.discount_value = 20;
    component.form.min_order_amount = 1500;
    component.createCoupon();

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'FESTIVE20',
        discount_value: 20,
      })
    );
    expect(component.form.code).toBe('');
  });

  it('should toggle universal permission on an existing coupon', () => {
    const updateSpy = vi.spyOn(adminService, 'updateCoupon').mockReturnValue(
      of({
        success: true,
        message: 'Coupon updated',
        data: {
          ...mockCoupons[0],
          is_universal: 1,
        },
      })
    );

    component.toggleUniversalPermission(mockCoupons[0]);

    expect(updateSpy).toHaveBeenCalledWith(1, { is_universal: 1 });
  });

  it('should support creating coupon with universal permission flag', () => {
    const createSpy = vi.spyOn(adminService, 'createCoupon').mockReturnValue(
      of({
        success: true,
        message: 'Coupon created',
        data: {
          id: 4,
          code: 'UNIVERSAL50',
          discount_type: 'fixed',
          discount_value: 50,
          min_order_amount: 500,
          usage_limit: 100,
          used_count: 0,
          is_active: 1,
          is_universal: 1,
        },
      })
    );

    component.form.code = 'universal50';
    component.form.discount_type = 'fixed';
    component.form.discount_value = 50;
    component.form.is_universal = 1;
    component.createCoupon();

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'UNIVERSAL50',
        is_universal: 1,
      })
    );
  });

  describe('Milestone M6-B: Coupon Whitelist Management & Member Access Control', () => {
    it('should open whitelist modal for a selected coupon and fetch members', () => {
      const getMembersSpy = vi.spyOn(adminService, 'getCouponMembers').mockReturnValue(
        of({ success: true, message: 'Members loaded', data: mockMembers })
      );

      component.openWhitelistModal(mockCoupons[0]);
      fixture.detectChanges();

      expect(component.whitelistModalOpen()).toBe(true);
      expect(component.selectedCoupon()?.id).toBe(1);
      expect(getMembersSpy).toHaveBeenCalledWith(1);
      expect(component.whitelistMembers().length).toBe(2);
      expect(component.editingLimits[10]).toBe(3);

      const el = fixture.nativeElement as HTMLElement;
      const modal = el.querySelector('[data-testid="whitelist-modal"]');
      expect(modal).toBeTruthy();

      const memberCountBadge = el.querySelector('[data-testid="modal-member-count"]');
      expect(memberCountBadge?.textContent).toContain('2 Members Assigned');
    });

    it('should display assigned members, their usage counts, custom limits, and remaining status', () => {
      component.openWhitelistModal(mockCoupons[0]);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const firstRow = el.querySelector('[data-testid="whitelist-row-10"]');
      expect(firstRow).toBeTruthy();
      expect(firstRow?.textContent).toContain('Sadia Rahman');
      expect(firstRow?.textContent).toContain('sadia@example.com');
      expect(firstRow?.textContent).toContain('#10');
      expect(firstRow?.textContent).toContain('2 uses');

      const remainingPill = firstRow?.querySelector('[data-testid="member-remaining-badge"]');
      expect(remainingPill?.textContent?.trim()).toBe('1 left');

      const secondRow = el.querySelector('[data-testid="whitelist-row-11"]');
      expect(secondRow).toBeTruthy();
      const exhaustedPill = secondRow?.querySelector('[data-testid="member-remaining-badge"]');
      expect(exhaustedPill?.textContent?.trim()).toBe('Exhausted');
    });

    it('should assign a new member by user ID with custom usage limit', () => {
      const newMember: CouponMember = {
        id: 3,
        coupon_id: 1,
        user_id: 12,
        customer_name: 'Farhan Ali',
        customer_email: 'farhan@example.com',
        usage_limit: 5,
        used_count: 0,
        remaining_uses: 5,
      };

      const addSpy = vi.spyOn(adminService, 'addCouponMember').mockReturnValue(
        of({ success: true, message: 'Member assigned to whitelist successfully.', data: newMember })
      );
      const getMembersSpy = vi.spyOn(adminService, 'getCouponMembers').mockReturnValue(
        of({ success: true, message: 'Members loaded', data: [...mockMembers, newMember] })
      );
      const toastSuccessSpy = vi.spyOn(toastService, 'success');

      component.openWhitelistModal(mockCoupons[0]);
      component.memberIdentifier = '12';
      component.memberUsageLimit = 5;

      component.assignMember();

      expect(addSpy).toHaveBeenCalledWith(1, { user_id: 12, usage_limit: 5 });
      expect(toastSuccessSpy).toHaveBeenCalledWith('Member assigned to whitelist successfully.');
      expect(component.memberIdentifier).toBe('');
      expect(component.memberUsageLimit).toBe(1);
      expect(getMembersSpy).toHaveBeenCalledTimes(2);
    });

    it('should assign a new member by email address with custom usage limit', () => {
      const addSpy = vi.spyOn(adminService, 'addCouponMember').mockReturnValue(
        of({ success: true, message: 'Member assigned by email', data: { ...mockMembers[0], id: 4, user_id: 15 } })
      );

      component.openWhitelistModal(mockCoupons[0]);
      component.memberIdentifier = 'farhan@example.com';
      component.memberUsageLimit = 3;

      component.assignMember();

      expect(addSpy).toHaveBeenCalledWith(1, { email: 'farhan@example.com', usage_limit: 3 });
    });

    it('should update an existing member custom usage limit', () => {
      const updateLimitSpy = vi.spyOn(adminService, 'updateCouponMemberLimit').mockReturnValue(
        of({
          success: true,
          message: 'Custom usage limit updated successfully.',
          data: { ...mockMembers[0], usage_limit: 8 },
        })
      );
      const toastSuccessSpy = vi.spyOn(toastService, 'success');

      component.openWhitelistModal(mockCoupons[0]);
      component.editingLimits[10] = 8;
      component.saveMemberLimit(component.whitelistMembers()[0]);

      expect(updateLimitSpy).toHaveBeenCalledWith(1, 10, 8);
      expect(toastSuccessSpy).toHaveBeenCalledWith('Custom usage limit updated successfully.');
      expect(component.whitelistMembers()[0].usage_limit).toBe(8);
      expect(component.whitelistMembers()[0].remaining_uses).toBe(6);
    });

    it('should remove a member from the whitelist', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const removeSpy = vi.spyOn(adminService, 'removeCouponMember').mockReturnValue(
        of({ success: true, message: 'Member removed from whitelist successfully.', data: undefined as any })
      );
      const toastSuccessSpy = vi.spyOn(toastService, 'success');

      component.openWhitelistModal(mockCoupons[0]);
      expect(component.whitelistMembers().length).toBe(2);

      component.removeMember(component.whitelistMembers()[0]);

      expect(removeSpy).toHaveBeenCalledWith(1, 10);
      expect(toastSuccessSpy).toHaveBeenCalledWith('Member removed from whitelist successfully.');
      expect(component.whitelistMembers().length).toBe(1);
      expect(component.whitelistMembers()[0].user_id).toBe(11);
    });

    it('should handle duplicate member error (409 conflict)', () => {
      vi.spyOn(adminService, 'addCouponMember').mockReturnValue(
        throwError(() => ({
          status: 409,
          error: { message: 'Member is already whitelisted for this coupon.' },
        }))
      );
      const toastErrorSpy = vi.spyOn(toastService, 'error');

      component.openWhitelistModal(mockCoupons[0]);
      component.memberIdentifier = 'sadia@example.com';
      component.assignMember();

      expect(toastErrorSpy).toHaveBeenCalledWith('Member is already whitelisted for this coupon.');
      expect(component.assigningMember()).toBe(false);
    });

    it('should handle non-existent user error (404 not found)', () => {
      vi.spyOn(adminService, 'addCouponMember').mockReturnValue(
        throwError(() => ({
          status: 404,
          error: { message: 'User not found. Please verify the User ID or Email.' },
        }))
      );
      const toastErrorSpy = vi.spyOn(toastService, 'error');

      component.openWhitelistModal(mockCoupons[0]);
      component.memberIdentifier = '99999';
      component.assignMember();

      expect(toastErrorSpy).toHaveBeenCalledWith('User not found. Please verify the User ID or Email.');
      expect(component.assigningMember()).toBe(false);
    });

    it('should close modal and clean up state', () => {
      component.openWhitelistModal(mockCoupons[0]);
      expect(component.whitelistModalOpen()).toBe(true);

      component.closeWhitelistModal();

      expect(component.whitelistModalOpen()).toBe(false);
      expect(component.selectedCoupon()).toBeNull();
      expect(component.whitelistMembers().length).toBe(0);
    });

    it('should select a customer from autocomplete and populate memberIdentifier', () => {
      const mockCustomer = {
        id: 42,
        full_name: 'Mahmudul Hasan',
        email: 'mahmud@example.com',
        role: 'customer',
      };

      component.openWhitelistModal(mockCoupons[0]);
      component.selectCustomer(mockCustomer as any);

      expect(component.memberIdentifier).toBe('mahmud@example.com');
      expect(component.showCustomerDropdown()).toBe(false);
    });

    it('should sync access permission when toggled from modal', () => {
      const updateSpy = vi.spyOn(adminService, 'updateCoupon').mockReturnValue(
        of({
          success: true,
          message: 'Coupon updated',
          data: {
            ...mockCoupons[0],
            is_universal: 1,
          },
        })
      );

      const testCoupon: Coupon = { ...mockCoupons[0], is_universal: 0 };
      component.openWhitelistModal(testCoupon);
      component.toggleUniversalPermission(component.selectedCoupon()!);

      expect(updateSpy).toHaveBeenCalledWith(1, { is_universal: 1 });
      expect(component.selectedCoupon()?.is_universal).toBe(1);
    });
  });
});
