from django.db import migrations


def reseed_faculty(apps, schema_editor):
    FacultyMember = apps.get_model('accounts', 'FacultyMember')

    # Clear all existing data and start fresh from yearbook
    FacultyMember.objects.all().delete()

    members = [
        # Administration
        ('Sanny O. Delfin',             'School Principal I',           'administration', 1),
        ('Jaylen S. Navato',            'School Guidance Designate',    'administration', 2),
        ('Michelyn B. Biera',           'Administrative Officer I',     'administration', 3),
        ('Cherry B. Sagrado',           'Administrative Assistant III', 'administration', 4),

        # Faculty
        ('Beverly S. Perez',            'Master Teacher I',             'faculty', 1),
        ('Jessica B. Actub',            'Special Science Teacher I',    'faculty', 2),
        ('Rusty D. Bartolata',          'Teacher VI',                   'faculty', 3),
        ('Tahany A. Rangaig',           'Teacher VI',                   'faculty', 4),
        ('Jonathan B. Tatoy',           'Teacher VI',                   'faculty', 5),
        ('Ellen E. Gedaro',             'Teacher V',                    'faculty', 6),
        ('Mildred P. Gomez',            'Teacher V',                    'faculty', 7),
        ('Janice May E. Valdez',        'Teacher V',                    'faculty', 8),
        ('Kimberly B. Acaso',           'Teacher IV',                   'faculty', 9),
        ('Lucelle B. Catubig',          'Teacher IV',                   'faculty', 10),
        ('Clarence P. Pabillar',        'Teacher IV',                   'faculty', 11),
        ('Mark Ryan J. Bacus',          'Teacher III',                  'faculty', 12),
        ('Norhata B. Casana',           'Teacher III',                  'faculty', 13),
        ('Clarice C. Cena',             'Teacher III',                  'faculty', 14),
        ('Jellieta L. Clordealta',      'Teacher III',                  'faculty', 15),
        ('Hegenia C. Coca',             'Teacher III',                  'faculty', 16),
        ('Monalissa D. Dicol',          'Teacher III',                  'faculty', 17),
        ('Leo Ann S. Garma',            'Teacher III',                  'faculty', 18),
        ('Daisy M. Layos',              'Teacher III',                  'faculty', 19),
        ('Mary Jean M. Nuñez',          'Teacher III',                  'faculty', 20),
        ('Krystine Mae T. Pastidio',    'Teacher III',                  'faculty', 21),
        ('Maria Cristina F. Turtosa',   'Teacher II',                   'faculty', 22),
        ('Grace H. Macatol',            'Teacher II',                   'faculty', 23),
        ('Tasneemah S. Amer',           'Teacher I',                    'faculty', 24),
        ('Elizalde D. Cabual',          'Teacher I',                    'faculty', 25),
        ('Shane Phoebe Olive B. Cadiz', 'Teacher I',                    'faculty', 26),
        ('Annabel V. Cantila',          'Teacher I',                    'faculty', 27),
        ('Darwin A. Castillon',         'Teacher I',                    'faculty', 28),
        ('Julius Caesar R. Paler',      'Teacher I',                    'faculty', 29),
        ('Chozily G. Tatoy',            'Teacher I',                    'faculty', 30),
        ('Aldrin L. Maghinay',          'Teacher I',                    'faculty', 31),
        ('Hosnie M. Balimbing',         'ALS Teacher',                  'faculty', 32),
    ]

    for name, position, category, order in members:
        FacultyMember.objects.create(
            name=name,
            position=position,
            category=category,
            display_order=order,
            is_active=True,
        )


def reverse_reseed(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0155_link_faculty_to_users_remove_duplicates'),
    ]

    operations = [
        migrations.RunPython(reseed_faculty, reverse_reseed),
    ]
