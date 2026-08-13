from django.db.models import Avg

def safe_average_rating(queryset):
    value = queryset.aggregate(avg=Avg("rating"))["avg"]
    return round(float(value), 1) if value is not None else 0.0
