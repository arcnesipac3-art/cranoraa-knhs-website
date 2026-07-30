from rest_framework import permissions
from accounts.roles import Role


class SchoolFormsPermission(permissions.BasePermission):
    """
    Permissions for School Forms module:
    - Admin: Full access
    - Principal: Full access
    - Registrar: Generate all forms
    - Teacher: Only students from assigned sections
    - Student: View own SF9 only
    - Parent: View child's SF9 only
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        user = request.user

        # Admin and Principal have full access
        if user.role in [Role.ADMIN, Role.PRINCIPAL]:
            return True

        # Registrar can generate all forms
        if user.role == Role.REGISTRAR:
            return True

        # Teacher can access forms for their sections
        if user.role == Role.STAFF:
            return True

        # Students and parents can only view SF9
        if user.role in [Role.STUDENT, Role.PARENT]:
            return view.action in ['sf9', 'sf9_student']

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user

        if user.role in [Role.ADMIN, Role.PRINCIPAL, Role.REGISTRAR]:
            return True

        if user.role == Role.STAFF:
            # Teacher can access if they teach the student's classroom
            if hasattr(obj, 'classroom'):
                return obj.classroom.teacher_id == user.id
            if hasattr(obj, 'student'):
                # Check if teacher teaches any subject in student's classroom
                from accounts.models import ClassroomSubject
                return ClassroomSubject.objects.filter(
                    classroom=obj.student.classroom,
                    teacher=user
                ).exists()
            return False

        if user.role == Role.STUDENT:
            # Student can only view their own SF9
            if hasattr(obj, 'student'):
                return obj.student.user_id == user.id
            if hasattr(obj, 'user'):
                return obj.user_id == user.id
            return False

        if user.role == Role.PARENT:
            # Parent can only view their child's SF9
            from accounts.models import ParentLink
            if hasattr(obj, 'student'):
                return ParentLink.objects.filter(
                    parent__user=user,
                    student=obj.student
                ).exists()
            return False

        return False


class CanGenerateForm(permissions.BasePermission):
    """Permission for generating forms (not just viewing)"""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        user = request.user
        return user.role in [Role.ADMIN, Role.PRINCIPAL, Role.REGISTRAR, Role.STAFF]


class CanExportForm(permissions.BasePermission):
    """Permission for exporting forms (PDF/Excel)"""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        user = request.user
        return user.role in [Role.ADMIN, Role.PRINCIPAL, Role.REGISTRAR, Role.STAFF]


class IsOwnerOrAdmin(permissions.BasePermission):
    """Object-level permission for student/parent to view own records"""

    def has_object_permission(self, request, view, obj):
        user = request.user

        if user.role in [Role.ADMIN, Role.PRINCIPAL, Role.REGISTRAR]:
            return True

        if user.role == Role.STAFF:
            # Check if teacher teaches this student
            from accounts.models import ClassroomSubject
            if hasattr(obj, 'student'):
                return ClassroomSubject.objects.filter(
                    classroom=obj.student.classroom,
                    teacher=user
                ).exists()
            return False

        if user.role == Role.STUDENT:
            if hasattr(obj, 'student'):
                return obj.student.user_id == user.id
            return False

        if user.role == Role.PARENT:
            from accounts.models import ParentLink
            if hasattr(obj, 'student'):
                return ParentLink.objects.filter(
                    parent__user=user,
                    student=obj.student
                ).exists()
            return False

        return False