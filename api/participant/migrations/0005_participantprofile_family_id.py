from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('participant', '0004_invitation_parent_email'),
    ]

    operations = [
        migrations.AddField(
            model_name='participantprofile',
            name='family_id',
            field=models.CharField(default='', max_length=255, verbose_name='family id'),
            preserve_default=False,
        ),
    ]
