from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Report
from .serializers import ReportSerializer
class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        qs = Report.objects.all()
        return qs if self.request.user.is_staff else qs.filter(reporter=self.request.user)
    def perform_create(self, serializer): serializer.save(reporter=self.request.user)
