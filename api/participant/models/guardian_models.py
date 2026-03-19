from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


class Guardian(BaseModel):
    first_name = models.CharField(max_length=256)
    last_name = models.CharField(max_length=256)
    phone_number = models.CharField(max_length=15)
    email = models.EmailField(max_length=256, blank=True, null=True)

    address = models.TextField(blank=True, null=True)
    relationship = models.CharField(max_length=256)


    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.relationship})"

    class Meta:
        verbose_name = _('Guardian')
        verbose_name_plural = _('Guardians')
        db_table = 'guardian'