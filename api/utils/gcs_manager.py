import datetime
import io
import logging
import uuid

from google.cloud import storage
from django.conf import settings

logger = logging.getLogger(__name__)


class GCSManager:
    """
    Thin wrapper around google-cloud-storage for the chat export pipeline.

    Authentication is handled automatically via Application Default Credentials:
    - In production: GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account JSON
    - In GCP: Workload Identity / metadata server
    """

    @classmethod
    def _client(cls):
        return storage.Client()

    @classmethod
    def _bucket(cls):
        return cls._client().bucket(settings.GCS_BUCKET_NAME)

    @classmethod
    def upload_file(cls, file_obj: io.IOBase, blob_name: str, content_type: str) -> str:
        """
        Upload a binary file-like object to GCS.

        Args:
            file_obj: An open binary file-like object (BytesIO, SpooledTemporaryFile, ...).
            blob_name: The destination path within the bucket (e.g. 'exports/job-123.zip').
            content_type: MIME type stored on the blob (e.g. 'application/zip').

        Returns:
            The blob_name that was used (for later reference / signed URL generation).
        """
        bucket = cls._bucket()
        blob = bucket.blob(blob_name)
        blob.upload_from_file(file_obj, content_type=content_type, rewind=True)
        logger.info("Uploaded %s to gs://%s/%s", content_type, settings.GCS_BUCKET_NAME, blob_name)
        return blob_name

    @classmethod
    def generate_signed_url(cls, blob_name: str) -> str:
        """
        Generate a time-limited signed URL for downloading a blob.

        Args:
            blob_name: The blob path within the bucket.

        Returns:
            A signed HTTPS URL valid for GCS_EXPORT_SIGNED_URL_EXPIRY_HOURS hours.
        """
        bucket = cls._bucket()
        blob = bucket.blob(blob_name)
        expiry = datetime.timedelta(hours=settings.GCS_EXPORT_SIGNED_URL_EXPIRY_HOURS)
        url = blob.generate_signed_url(
            expiration=expiry,
            method='GET',
            version='v4',
        )
        logger.info(
            "Generated signed URL for gs://%s/%s (expires in %sh)",
            settings.GCS_BUCKET_NAME,
            blob_name,
            settings.GCS_EXPORT_SIGNED_URL_EXPIRY_HOURS,
        )
        return url
