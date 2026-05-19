from unittest.mock import patch
import pytest
from chat.models.export_job_model import ExportJob
from chat.tasks import export_conversations_to_gcs


@pytest.mark.django_db
class TestExportJobAPI:

    @patch("chat.views.export_conversations_to_gcs.delay")
    def test_create_export_job(self, mock_task_delay, api_client):
        # Action
        payload = {
            "cohort_id": "8c42b2ab-9d83-4903-87bb-7b0ee56dcd69",
            "date_from": "2024-01-01",
            "date_to": "2024-12-31"
        }
        response = api_client.post("/api/chats/export-jobs/", payload, format="json")

        # Assertions
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["status"] == "pending"
        assert data["cohort_id"] == "8c42b2ab-9d83-4903-87bb-7b0ee56dcd69"
        assert data["date_from"] == "2024-01-01"
        assert data["date_to"] == "2024-12-31"

        # Verify task was enqueued
        import uuid
        mock_task_delay.assert_called_once_with(uuid.UUID(data["id"]))


    def test_retrieve_export_job(self, api_client):
        # Setup
        job = ExportJob.objects.create(
            status=ExportJob.Status.DONE,
            cohort_id="8c42b2ab-9d83-4903-87bb-7b0ee56dcd69",
            date_from="2024-01-01",
            date_to="2024-12-31",
            download_url="https://storage.googleapis.com/fake-bucket/fake.csv"
        )

        # Action
        response = api_client.get(f"/api/chats/export-jobs/{job.id}/")

        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(job.id)
        assert data["status"] == "done"
        assert data["download_url"] == "https://storage.googleapis.com/fake-bucket/fake.csv"


@pytest.mark.django_db
class TestExportJobTask:

    @patch("chat.tasks.GCSManager.generate_signed_url")
    @patch("chat.tasks.GCSManager.upload_csv")
    def test_export_conversations_to_gcs_success(self, mock_upload_csv, mock_generate_signed_url):
        # Setup
        job = ExportJob.objects.create(
            cohort_id="8c42b2ab-9d83-4903-87bb-7b0ee56dcd69"
        )
        mock_upload_csv.return_value = f"exports/chat-export-{job.id}.csv"
        mock_generate_signed_url.return_value = "https://storage.googleapis.com/fake-bucket/signed-url"

        # Action
        export_conversations_to_gcs(str(job.id))

        # Assertions
        job.refresh_from_db()
        assert job.status == ExportJob.Status.DONE
        assert job.gcs_blob_name == f"exports/chat-export-{job.id}.csv"
        assert job.download_url == "https://storage.googleapis.com/fake-bucket/signed-url"
        assert job.error_message is None

        # Verify GCSManager calls
        assert mock_upload_csv.called
        mock_generate_signed_url.assert_called_once_with(f"exports/chat-export-{job.id}.csv")

    @patch("chat.tasks.GCSManager.upload_csv")
    def test_export_conversations_to_gcs_failure(self, mock_upload_csv):
        # Setup
        job = ExportJob.objects.create()
        mock_upload_csv.side_effect = Exception("Connection error to GCS")

        # Action
        export_conversations_to_gcs(str(job.id))

        # Assertions
        job.refresh_from_db()
        assert job.status == ExportJob.Status.FAILED
        assert job.error_message == "Connection error to GCS"
        assert job.download_url is None
