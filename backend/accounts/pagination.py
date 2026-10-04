"""Pagination for the people/user directory endpoints.

The global default (school_portal.settings) stays a plain PageNumberPagination
with a fixed page size of 50 for every viewset. The user directory opts into
this subclass so it can request larger pages (bounded) for exports and bulk
selection without touching other endpoints.
"""
from rest_framework.pagination import PageNumberPagination


class UserPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 500
