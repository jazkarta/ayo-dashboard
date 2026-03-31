from django.contrib import admin
from participant.models import ParticipantProfile,Invitation

# Register your models here.
admin.site.register(ParticipantProfile)
admin.site.register(Invitation)