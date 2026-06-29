from django.contrib import admin

from .models import EmailConfiguration, GlobalConfiguration


@admin.register(EmailConfiguration)
class EmailConfigurationAdmin(admin.ModelAdmin):
    list_display = ('name', 'email_host', 'email_port', 'is_active', 'updated_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'email_host')


@admin.register(GlobalConfiguration)
class GlobalConfigurationAdmin(admin.ModelAdmin):
    list_display = ('web_search', 'updated_by', 'updated_at')

    def has_add_permission(self, request):
        return not GlobalConfiguration.objects.exists()
