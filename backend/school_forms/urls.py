from django.urls import path, include
from rest_framework.routers import DefaultRouter
from school_forms.views import (
    SF1ViewSet, SF2ViewSet, SF5ViewSet, SF9ViewSet, SF10ViewSet,
)

router = DefaultRouter(trailing_slash=False)
router.register(r'sf1', SF1ViewSet, basename='sf1')
router.register(r'sf2', SF2ViewSet, basename='sf2')
router.register(r'sf5', SF5ViewSet, basename='sf5')
router.register(r'sf9', SF9ViewSet, basename='sf9')
router.register(r'sf10', SF10ViewSet, basename='sf10')

urlpatterns = [
    path('', include(router.urls)),
]