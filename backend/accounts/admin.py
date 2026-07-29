from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Profile, WebsiteContent, Room, TimeSlot, Schedule, DashboardPreferences
from .models import FCMToken


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = 'Profile'


class UserAdmin(BaseUserAdmin):
    inlines = (ProfileInline,)
    list_display = ('email', 'username', 'role', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')
    fieldsets = (
        (None, {'fields': ('email', 'username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'role')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'role', 'password1', 'password2'),
        }),
    )


admin.site.register(User, UserAdmin)
admin.site.register(Profile)


@admin.register(WebsiteContent)
class WebsiteContentAdmin(admin.ModelAdmin):
    list_display = ('section_display', 'category', 'content_preview', 'updated_at', 'updated_by')
    list_filter = ('category', 'updated_at')
    search_fields = ('section', 'content')
    readonly_fields = ('updated_at', 'updated_by')
    list_per_page = 25
    
    def section_display(self, obj):
        return obj.get_section_display()
    section_display.short_description = 'Section'

    def content_preview(self, obj):
        return obj.content[:100] + '...' if len(obj.content) > 100 else obj.content
    content_preview.short_description = 'Content Preview'
    
    def save_model(self, request, obj, form, change):
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('name', 'building', 'room_type', 'capacity', 'is_active')
    list_filter = ('room_type', 'is_active')
    search_fields = ('name', 'building')


@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    list_display = ('day', 'start_time', 'end_time', 'label')
    list_filter = ('day',)
    ordering = ('day', 'start_time')


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ('classroom', 'subject', 'teacher', 'room', 'time_slot', 'academic_year', 'is_active')
    list_filter = ('is_active', 'academic_year', 'time_slot__day')
    search_fields = ('classroom__name', 'subject__name', 'teacher__first_name', 'teacher__last_name')
    raw_id_fields = ('classroom', 'subject', 'teacher', 'room', 'time_slot', 'academic_year', 'semester')


@admin.register(DashboardPreferences)
class DashboardPreferencesAdmin(admin.ModelAdmin):
    list_display = ('user', 'theme', 'updated_at', 'created_at')
    list_filter = ('theme', 'updated_at')
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name')
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('user',)
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Preferences', {
            'fields': ('theme', 'layout')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(FCMToken)
class FCMTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'device_type', 'is_active', 'created_at')
    list_filter = ('is_active', 'device_type')
    search_fields = ('user__email', 'token')


