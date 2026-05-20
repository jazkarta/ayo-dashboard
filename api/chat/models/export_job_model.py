import uuid

from django.db import models


class ExportJob(models.Model):

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        RUNNING = 'running', 'Running'
        DONE = 'done', 'Done'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    # Filter params captured at enqueue time
    cohort_id = models.UUIDField(null=True, blank=True)
    date_from = models.DateField(null=True, blank=True)
    date_to = models.DateField(null=True, blank=True)

    # Set on success
    gcs_blob_name = models.CharField(max_length=512, null=True, blank=True)
    download_url = models.TextField(null=True, blank=True)

    # Set on failure
    error_message = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'chat_export_job'
        ordering = ['-created_at']

    def __str__(self):
        return f'ExportJob({self.id}, {self.status})'
