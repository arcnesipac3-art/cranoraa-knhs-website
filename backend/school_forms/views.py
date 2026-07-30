from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsAdmin, IsAdminOrStaff

import school_forms.services.sf1 as sf1_service
import school_forms.services.sf2 as sf2_service
import school_forms.services.sf5 as sf5_service
import school_forms.services.sf9 as sf9_service
import school_forms.services.sf10 as sf10_service
from school_forms.utils.pdf import generate_pdf_report
from school_forms.utils.excel import generate_excel_report


class SchoolFormsViewSet(viewsets.ViewSet):
    """Base ViewSet for School Forms"""
    permission_classes = [IsAuthenticated]

    def get_filters(self):
        queryset = self.request.query_params
        return {
            'academic_year': queryset.get('academic_year'),
            'grade_level': queryset.get('grade_level'),
            'section': queryset.get('section'),
            'adviser': queryset.get('adviser'),
            'student_id': queryset.get('student_id'),
            'start_date': queryset.get('start_date'),
            'end_date': queryset.get('end_date'),
            'report_type': queryset.get('report_type', 'daily'),
        }


class SF1ViewSet(SchoolFormsViewSet):
    """SF1 - School Register"""

    def list(self, request):
        filters = self.get_filters()
        try:
            result = sf1_service.generate_sf1(
                academic_year=filters['academic_year'],
                grade_level=filters['grade_level'],
                section=filters['section'],
                adviser=filters['adviser'],
                student_id=filters['student_id'],
            )
            return Response(result)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='filters')
    def get_filters_data(self, request):
        filters = self.get_filters()
        try:
            result = sf1_service.generate_sf1(
                academic_year=filters['academic_year'],
                grade_level=filters['grade_level'],
                section=filters['section'],
                adviser=filters['adviser'],
                student_id=filters['student_id'],
            )
            return Response(result.get('filters', {}))
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def export_pdf(self, request):
        filters = self.get_filters()
        filters.update(request.data)
        try:
            result = sf1_service.generate_sf1(**{k: v for k, v in filters.items() if v})
            pdf_content = generate_pdf_report('SF1', result.get('data', {}))
            return Response({'pdf': pdf_content}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def export_excel(self, request):
        filters = self.get_filters()
        filters.update(request.data)
        try:
            result = sf1_service.generate_sf1(**{k: v for k, v in filters.items() if v})
            excel_content = generate_excel_report('SF1', result.get('data', {}))
            return Response({'excel': excel_content}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SF2ViewSet(SchoolFormsViewSet):
    """SF2 - Daily Attendance Report"""

    def list(self, request):
        filters = self.get_filters()
        try:
            result = sf2_service.generate_sf2(
                academic_year=filters['academic_year'],
                grade_level=filters['grade_level'],
                section=filters['section'],
                adviser=filters['adviser'],
                start_date=filters['start_date'],
                end_date=filters['end_date'],
                report_type=filters['report_type'],
            )
            return Response(result)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def export_pdf(self, request):
        filters = self.get_filters()
        filters.update(request.data)
        try:
            result = sf2_service.generate_sf2(**{k: v for k, v in filters.items() if v})
            pdf_content = generate_pdf_report('SF2', result.get('data', {}))
            return Response({'pdf': pdf_content}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def export_excel(self, request):
        filters = self.get_filters()
        filters.update(request.data)
        try:
            result = sf2_service.generate_sf2(**{k: v for k, v in filters.items() if v})
            excel_content = generate_excel_report('SF2', result.get('data', {}))
            return Response({'excel': excel_content}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SF5ViewSet(SchoolFormsViewSet):
    """SF5 - Promotion and Learning Progress Report"""

    def list(self, request):
        filters = self.get_filters()
        try:
            result = sf5_service.generate_sf5(
                academic_year=filters['academic_year'],
                grade_level=filters['grade_level'],
                section=filters['section'],
                adviser=filters['adviser'],
            )
            return Response(result)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def export_pdf(self, request):
        filters = self.get_filters()
        filters.update(request.data)
        try:
            result = sf5_service.generate_sf5(**{k: v for k, v in filters.items() if v})
            pdf_content = generate_pdf_report('SF5', result.get('data', {}))
            return Response({'pdf': pdf_content}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def export_excel(self, request):
        filters = self.get_filters()
        filters.update(request.data)
        try:
            result = sf5_service.generate_sf5(**{k: v for k, v in filters.items() if v})
            excel_content = generate_excel_report('SF5', result.get('data', {}))
            return Response({'excel': excel_content}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SF9ViewSet(SchoolFormsViewSet):
    """SF9 - Learner Progress Report Card"""

    def get_student(self, request, student_id=None):
        academic_year = request.query_params.get('academic_year')
        try:
            result = sf9_service.generate_sf9(student_id=student_id, academic_year=academic_year)
            return Response(result)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def export_pdf(self, request):
        student_id = request.data.get('student_id') or request.query_params.get('student_id')
        academic_year = request.data.get('academic_year') or request.query_params.get('academic_year')
        try:
            result = sf9_service.generate_sf9(student_id=student_id, academic_year=academic_year)
            pdf_content = generate_pdf_report('SF9', result.get('data', {}))
            return Response({'pdf': pdf_content}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SF10ViewSet(SchoolFormsViewSet):
    """SF10 - Permanent Academic Record"""

    def list(self, request, student_id=None):
        sid = student_id or request.query_params.get('student_id')
        try:
            result = sf10_service.generate_sf10(student_id=sid)
            return Response(result)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def export_pdf(self, request):
        student_id = request.data.get('student_id') or request.query_params.get('student_id')
        try:
            result = sf10_service.generate_sf10(student_id=student_id)
            pdf_content = generate_pdf_report('SF10', result.get('data', {}))
            return Response({'pdf': pdf_content}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def export_excel(self, request):
        student_id = request.data.get('student_id') or request.query_params.get('student_id')
        try:
            result = sf10_service.generate_sf10(student_id=student_id)
            excel_content = generate_excel_report('SF10', result.get('data', {}))
            return Response({'excel': excel_content}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)