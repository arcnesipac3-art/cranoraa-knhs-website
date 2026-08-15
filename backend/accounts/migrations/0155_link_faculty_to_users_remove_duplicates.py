# Generated manually
from django.db import migrations


def link_faculty_to_users(apps, schema_editor):
    """Link existing FacultyMember records to User accounts and remove duplicates"""
    FacultyMember = apps.get_model('accounts', 'FacultyMember')
    User = apps.get_model('accounts', 'User')
    
    # First, try to link existing faculty members to users
    for faculty in FacultyMember.objects.all():
        if faculty.user_id:
            continue  # Already linked
            
        # Try to find matching user by name
        name_parts = faculty.name.strip().split()
        if len(name_parts) >= 2:
            first_name = name_parts[0]
            last_name = ' '.join(name_parts[1:])
            
            # Try to find user
            user = User.objects.filter(
                first_name__iexact=first_name,
                last_name__iexact=last_name,
                role__in=['staff', 'admin'],
                is_active=True
            ).first()
            
            if user:
                # Check if this user already has a faculty member
                if FacultyMember.objects.filter(user=user).exists():
                    # Duplicate - delete this one
                    faculty.delete()
                    continue
                
                # Link to user
                faculty.user = user
                faculty.save(update_fields=['user'])
    
    # Now remove any remaining duplicates by user
    seen_users = set()
    for faculty in FacultyMember.objects.filter(user__isnull=False).order_by('created_at'):
        if faculty.user_id in seen_users:
            faculty.delete()
        else:
            seen_users.add(faculty.user_id)


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0154_add_user_to_faculty_member'),
    ]

    operations = [
        migrations.RunPython(link_faculty_to_users, migrations.RunPython.noop),
    ]
