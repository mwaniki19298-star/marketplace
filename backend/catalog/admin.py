from django.contrib import admin
from .models import Category, Listing, ListingImage, SavedItem, Store, StoreFollow
admin.site.register(Category)
admin.site.register(Store)
admin.site.register(Listing)
admin.site.register(ListingImage)
admin.site.register(SavedItem)
admin.site.register(StoreFollow)
