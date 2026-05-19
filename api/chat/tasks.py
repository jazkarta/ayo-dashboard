import csv
import io
import logging
from celery import shared_task
from chat.models.export_job_model import ExportJob
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
        # Initial dummy CSV generation as requested
        csv_buffer = io.StringIO()
        writer = csv.writer(csv_buffer)

        # Write dummy headers matching bulk export schema
        writer.writerow([
            'conversation_title', 'conversation_id', 'model_name',
            'participant_name', 'family_id', 'cohort_id',
            'prompts', 'responses', 'attachment_urls'
        ])
        # Write one dummy data row
        writer.writerow([
            'Dummy Conversation',
            'dummy-conv-123',
            'dummy-model',
            'John Doe',
            'fam-123',
            str(job.cohort_id) if job.cohort_id else 'all',
            'Hello | How are you?',
            'Hi! | I am doing well, thank you.',
            'https://example.com/attachment.png'
        ])

        blob_name = f"exports/chat-export-{job_id}.csv"

        # Upload using GCSManager
        GCSManager.upload_csv(csv_buffer, blob_name)

        # Generate signed URL
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
