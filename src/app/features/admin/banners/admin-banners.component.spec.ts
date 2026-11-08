import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { AdminBannersComponent } from './admin-banners.component';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { Banner } from '../../../core/models/api.models';

describe('AdminBannersComponent', () => {
  let fixture: any;
  let component: AdminBannersComponent;
  let adminService: AdminService;
  let toastService: ToastService;

  const mockBanners: Banner[] = [
    {
      id: 1,
      title: 'AUTUMN / FESTIVE EDIT 2026',
      subtitle: 'Architectural tailoring meets sustainable organic textiles.',
      badge_text: 'NEW SEASON DROP',
      cta_text: 'Shop New Arrivals',
      cta_link: '/catalog?sort=newest',
      image_url: '/uploads/products/banner-hero-1.svg',
      sort_order: 0,
      is_active: 1,
    },
    {
      id: 2,
      title: 'ARTISANAL HERITAGE PANJABI',
      subtitle: 'Hand-finished jacquard and breathable slub cotton.',
      badge_text: 'LIMITED EDITION',
      cta_text: 'Explore Panjabi',
      cta_link: '/catalog?categorySlug=mens-panjabi',
      image_url: '/uploads/products/banner-hero-2.svg',
      sort_order: 1,
      is_active: 0,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminBannersComponent],
      providers: [provideHttpClient()],
    }).compileComponents();

    adminService = TestBed.inject(AdminService);
    toastService = TestBed.inject(ToastService);

    vi.spyOn(adminService, 'getBanners').mockReturnValue(
      of({ success: true, message: 'Banners loaded', data: mockBanners })
    );

    fixture = TestBed.createComponent(AdminBannersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and load existing hero slides', () => {
    expect(component.banners().length).toBe(2);
    expect(component.banners()[0].title).toBe('AUTUMN / FESTIVE EDIT 2026');
    expect(component.loading()).toBe(false);
  });

  it('should open create modal with default values', () => {
    component.openCreateModal();
    expect(component.showModal()).toBe(true);
    expect(component.isEditing()).toBe(false);
    expect(component.formData.title).toBe('');
    expect(component.formData.cta_text).toBe('Explore Collection');
    expect(component.formData.is_active).toBe(true);
  });

  it('should open edit modal with banner data', () => {
    component.openEditModal(mockBanners[0]);
    expect(component.showModal()).toBe(true);
    expect(component.isEditing()).toBe(true);
    expect(component.currentEditingId).toBe(1);
    expect(component.formData.title).toBe('AUTUMN / FESTIVE EDIT 2026');
    expect(component.formData.badge_text).toBe('NEW SEASON DROP');
  });

  it('should validate title before saving', () => {
    const errorSpy = vi.spyOn(toastService, 'error');
    component.openCreateModal();
    component.formData.title = '   ';
    component.saveBanner();
    expect(errorSpy).toHaveBeenCalledWith('Slide title is required.');
  });

  it('should call createBanner when saving a new slide', () => {
    const createSpy = vi.spyOn(adminService, 'createBanner').mockReturnValue(
      of({
        success: true,
        message: 'Banner created',
        data: {
          id: 3,
          title: 'SUMMER LINEN EDIT',
          subtitle: 'Pure organic linen silhouettes',
          badge_text: 'HOT DROP',
          cta_text: 'Shop Now',
          cta_link: '/catalog',
          image_url: '/uploads/products/banner-hero-3.svg',
          sort_order: 2,
          is_active: 1,
        },
      })
    );
    const successSpy = vi.spyOn(toastService, 'success');

    component.openCreateModal();
    component.formData.title = 'SUMMER LINEN EDIT';
    component.formData.badge_text = 'HOT DROP';
    component.saveBanner();

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'SUMMER LINEN EDIT',
        badge_text: 'HOT DROP',
      })
    );
    expect(successSpy).toHaveBeenCalledWith('New hero slide published successfully.');
    expect(component.showModal()).toBe(false);
  });

  it('should call updateBanner when editing an existing slide', () => {
    const updateSpy = vi.spyOn(adminService, 'updateBanner').mockReturnValue(
      of({
        success: true,
        message: 'Banner updated',
        data: { ...mockBanners[0], title: 'UPDATED TITLE' },
      })
    );
    const successSpy = vi.spyOn(toastService, 'success');

    component.openEditModal(mockBanners[0]);
    component.formData.title = 'UPDATED TITLE';
    component.saveBanner();

    expect(updateSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ title: 'UPDATED TITLE' })
    );
    expect(successSpy).toHaveBeenCalledWith('Hero slide updated successfully.');
  });

  it('should toggle active status of a banner', () => {
    const updateSpy = vi.spyOn(adminService, 'updateBanner').mockReturnValue(
      of({ success: true, message: 'Status updated', data: { ...mockBanners[0], is_active: 0 } })
    );
    const successSpy = vi.spyOn(toastService, 'success');

    component.toggleActive(mockBanners[0]);
    expect(updateSpy).toHaveBeenCalledWith(1, { is_active: false });
    expect(successSpy).toHaveBeenCalledWith('Slide hidden successfully.');
  });

  it('should delete a banner when confirmed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const deleteSpy = vi.spyOn(adminService, 'deleteBanner').mockReturnValue(
      of({ success: true, message: 'Banner deleted', data: null })
    );
    const successSpy = vi.spyOn(toastService, 'success');

    component.deleteBanner(mockBanners[0]);
    expect(deleteSpy).toHaveBeenCalledWith(1);
    expect(successSpy).toHaveBeenCalledWith('Hero slide deleted successfully.');
  });
});
