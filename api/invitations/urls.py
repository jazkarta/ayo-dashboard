from django.urls import path
from .views import InviteParticipantView, VerifyInvitationView, AcceptInvitationView

urlpatterns = [
    path("invite/", InviteParticipantView.as_view(), name="invite-participant"),
    path("verify/", VerifyInvitationView.as_view(), name="verify-invitation"),
    path("accept/", AcceptInvitationView.as_view(), name="accept-invitation"),
]