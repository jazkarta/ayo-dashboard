import logging
import tempfile

from celery import shared_task
from django.db.models import Count, Prefetch

from chat.managers import export_zip_chunks
from chat.models.chat_models import Chat, ChatMedia
from chat.models.conversation_models import ConversationModel
from chat.models.export_job_model import ExportJob
from utils.gcs_manager import GCSManager

logger = logging.getLogger(__name__)

# Conversations fetched per batch while exporting; each batch prefetches all of
# its chats and media, so keep this small enough to bound memory on long chats.
EXPORT_CHUNK_SIZE = 20

# Keep the assembled archive in memory up to this size, then spill to disk.
EXPORT_SPOOL_MAX_BYTES = 32 * 1024 * 1024


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
                Prefetch(
                    'chats',
                    queryset=Chat.objects.only(
                        'id', 'conversation', 'prompt', 'response', 'metadata', 'created_at'
                    ).order_by('created_at'),
                ),
                Prefetch('chats__media', queryset=ChatMedia.objects.only('id', 'chat', 'url')),
            )
            .annotate(
                number_of_turns=Count('chats')
            )
        )
        if job.cohort_id:
            queryset = queryset.filter(cohort_id=job.cohort_id)
        if job.date_from:
            queryset = queryset.filter(created_at__date__gte=job.date_from)
        if job.date_to:
            queryset = queryset.filter(created_at__date__lte=job.date_to)

        blob_name = f"exports/chat-export-{job_id}.zip"
        with tempfile.SpooledTemporaryFile(max_size=EXPORT_SPOOL_MAX_BYTES) as archive_file:
            for chunk in export_zip_chunks(queryset.iterator(chunk_size=EXPORT_CHUNK_SIZE)):
                archive_file.write(chunk)
            GCSManager.upload_file(archive_file, blob_name, 'application/zip')
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
