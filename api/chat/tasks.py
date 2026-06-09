import logging

from celery import shared_task
from django.db.models import Prefetch

from chat.managers import ConversationBulkExportManager, ConversationExportManager
from chat.models.chat_models import Chat
from chat.models.conversation_models import ConversationModel
from chat.models.export_job_model import ExportJob
from utils.csv_export_manager import BaseCSVExportManager
from utils.gcs_manager import GCSManager

logger = logging.getLogger(__name__)


@shared_task
def export_conversations_to_gcs(job_id):
    try:
        job = ExportJob.objects.get(id=job_id)
    except ExportJob.DoesNotExist:
        logger.error("ExportJob with id %s does not exist.", job_id)
        return

    job.status = ExportJob.Status.RUNNING
    job.save()

    try:
        queryset = (
            ConversationModel.objects
            .select_related('user', 'user__participant_profile')
            .prefetch_related(
                Prefetch('chats', queryset=Chat.objects.only('id', 'prompt', 'response', 'created_at').order_by('created_at')),
                'chats__media',
            )
        )
        if job.cohort_id:
            queryset = queryset.filter(cohort_id=job.cohort_id)
        if job.date_from:
            queryset = queryset.filter(created_at__date__gte=job.date_from)
        if job.date_to:
            queryset = queryset.filter(created_at__date__lte=job.date_to)

        csv_buffer = BaseCSVExportManager.combined_to_buffer([
            ('Table: conversations', ConversationBulkExportManager, queryset),
            ('Table: turns', ConversationExportManager, queryset),
        ])

        blob_name = f"exports/chat-export-{job_id}.csv"
        GCSManager.upload_csv(csv_buffer, blob_name)
        download_url = GCSManager.generate_signed_url(blob_name)

        job.status = ExportJob.Status.DONE
        job.gcs_blob_name = blob_name
        job.download_url = download_url
        job.save()
        logger.info("ExportJob %s completed successfully.", job_id)

    except Exception as e:
        logger.exception("ExportJob %s failed with exception.", job_id)
        job.status = ExportJob.Status.FAILED
        job.error_message = str(e)
        job.save()
