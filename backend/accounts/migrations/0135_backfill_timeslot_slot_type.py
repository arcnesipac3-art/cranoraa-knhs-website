"""
Data migration: backfill slot_type for existing TimeSlot records
whose label indicates they are break periods (recess, lunch, etc.)
but were saved before slot_type was introduced (defaulted to 'class').
"""
from django.db import migrations
import re

LABEL_TO_TYPE = {
    'recess': 'recess',
    'lunch': 'lunch',
    'lunch break': 'lunch',
    'break': 'lunch',
    'vacant': 'vacant',
    'assembly': 'assembly',
    'pe': 'pe',
    'pe / sports': 'pe',
    'sports': 'pe',
    'sport': 'pe',
}


def backfill_slot_types(apps, schema_editor):
    TimeSlot = apps.get_model('accounts', 'TimeSlot')
    updated = 0
    for slot in TimeSlot.objects.filter(slot_type='class').exclude(label=None).exclude(label=''):
        label_lower = (slot.label or '').strip().lower()
        new_type = LABEL_TO_TYPE.get(label_lower)
        if new_type:
            slot.slot_type = new_type
            slot.save(update_fields=['slot_type'])
            updated += 1
    print(f'Backfilled {updated} TimeSlot records with correct slot_type.')


def reverse_backfill(apps, schema_editor):
    # Non-destructive reverse: reset break types back to 'class'
    TimeSlot = apps.get_model('accounts', 'TimeSlot')
    break_types = ['recess', 'lunch', 'vacant', 'assembly', 'pe']
    TimeSlot.objects.filter(slot_type__in=break_types).update(slot_type='class')


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0134_add_timeslot_slot_type_v2'),
    ]

    operations = [
        migrations.RunPython(backfill_slot_types, reverse_backfill),
    ]
