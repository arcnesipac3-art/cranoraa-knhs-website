from django.db import migrations


def seed_faculty(apps, schema_editor):
    FacultyMember = apps.get_model('accounts', 'FacultyMember')

    administration = [
        ('Sanny O. Delfin', 'School Principal I', 'administration', 1),
        ('Jaylen S. Navato', 'School Guidance Designate', 'administration', 2),
        ('Michelyn B. Biera', 'Administrative Officer I', 'administration', 3),
        ('Cherry B. Sagrado', 'Administrative Assistant III', 'administration', 4),
    ]

    faculty = [
        ('Beverly S. Perez', 'Master Teacher I', 'faculty', 1),
        ('Jessica B. Actub', 'Special Science Teacher I', 'faculty', 2),
        ('Rusty D. Bartolata', 'Teacher VI', 'faculty', 3),
        ('Rosemarie M. Baclayo', 'Teacher VI', 'faculty', 4),
        ('Cristina T. Fernandez', 'Teacher VI', 'faculty', 5),
        ('Evangeline L. Velez', 'Teacher VI', 'faculty', 6),
        ('Lilibeth P. Veutacion', 'Teacher VI', 'faculty', 7),
        ('Eduard O. Comendador', 'Teacher V', 'faculty', 8),
        ('Rochelle G. Cabalan', 'Teacher V', 'faculty', 9),
        ('Mary Ann P. Omictin', 'Teacher IV', 'faculty', 10),
        ('Maricar T. Casidsid', 'Teacher IV', 'faculty', 11),
        ('Ailyn B. Ocol', 'Teacher IV', 'faculty', 12),
        ('Ma. Theresa V. Pacatang', 'Teacher IV', 'faculty', 13),
        ('Melody P. Basquez', 'Teacher IV', 'faculty', 14),
        ('Janice N. Bontilao', 'Teacher III', 'faculty', 15),
        ('Rechell P. Andamon', 'Teacher III', 'faculty', 16),
        ('Charlene P. Bacante', 'Teacher III', 'faculty', 17),
        ('Marvin R. Sabijon', 'Teacher III', 'faculty', 18),
        ('Rica Marie P. Pajaron', 'Teacher II', 'faculty', 19),
        ('Aljhon T. Bacolod', 'Teacher II', 'faculty', 20),
        ('Shaira May L. Bacus', 'Teacher II', 'faculty', 21),
        ('Daryl A. Suan', 'Teacher I', 'faculty', 22),
        ('Reymart D. Genon', 'ALS Teacher', 'faculty', 23),
    ]

    for name, position, category, order in administration:
        FacultyMember.objects.get_or_create(
            name=name, category=category,
            defaults={'position': position, 'display_order': order}
        )

    for name, position, category, order in faculty:
        FacultyMember.objects.get_or_create(
            name=name, category=category,
            defaults={'position': position, 'display_order': order}
        )


def reverse_seed(apps, schema_editor):
    FacultyMember = apps.get_model('accounts', 'FacultyMember')
    FacultyMember.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0152_facultymember_alter_friendship_unique_together_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_faculty, reverse_seed),
    ]
