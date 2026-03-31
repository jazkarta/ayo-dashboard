from django.urls import path

from users.views.users_view import CurrentUserView

urlpatterns = [
    path('me/', CurrentUserView.as_view()),
]