from rest_framework.pagination import PageNumberPagination

class CustomPagination(PageNumberPagination):
    page_size_query_param = 'limit'
    page_size = 50
    max_page_size = 500
