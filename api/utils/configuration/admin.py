from django.contrib import admin

from .models import EmailConfiguration


@admin.register(EmailConfiguration)
class EmailConfigurationAdmin(admin.ModelAdmin):
    list_display = ('name', 'email_host', 'email_port', 'is_active', 'updated_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'email_host')
