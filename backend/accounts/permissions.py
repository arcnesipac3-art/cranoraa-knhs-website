from rest_framework import permissions
from .roles import Role


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.role == Role.ADMIN or getattr(request.user, 'is_admin', False)
        )


class IsStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == Role.STAFF


class IsStudent(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == Role.STUDENT


class IsParent(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == Role.PARENT


class IsAdminOrStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.role in (Role.ADMIN, Role.STAFF)
            or getattr(request.user, 'is_admin', False)
        )


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and (
            request.user.role == Role.ADMIN
            or getattr(request.user, 'is_admin', False)
        )


class IsGroupOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        from .models import ChatMember
        if obj.owner == request.user:
            return True
        return ChatMember.objects.filter(
            chat_room=obj, user=request.user, role__in=['owner', 'admin']
        ).exists()


class IsGroupMember(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        from .models import ChatMember
        return ChatMember.objects.filter(
            chat_room=obj, user=request.user
        ).exists() or obj.participants.filter(id=request.user.id).exists()
