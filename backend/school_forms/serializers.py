from rest_framework import serializers


class SF1StudentSerializer(serializers.Serializer):
    no = serializers.IntegerField(read_only=True)
    lrn = serializers.CharField(max_length=12, allow_blank=True, required=False)
    name = serializers.CharField(max_length=255, required=False)
    sex = serializers.CharField(max_length=10, allow_blank=True, required=False)
    birthdate = serializers.DateField(allow_null=True, required=False)
    age = serializers.IntegerField(allow_null=True, required=False)
    grade_level = serializers.CharField(max_length=20, required=False)
    section = serializers.CharField(max_length=50, required=False)
    adviser = serializers.CharField(max_length=255, required=False)
    enrollment_status = serializers.CharField(max_length=20, required=False)


class SF1ClassroomSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    grade_level = serializers.CharField(max_length=20)
    section = serializers.CharField(max_length=50)
    adviser = serializers.CharField(max_length=255, required=False)
    academic_year = serializers.CharField(max_length=20, required=False)


class SF1RegisterSerializer(serializers.Serializer):
    classroom = SF1ClassroomSerializer()
    students = SF1StudentSerializer(many=True)


class SF1ResponseSerializer(serializers.Serializer):
    data = SF1RegisterSerializer(many=True)
    validation = serializers.DictField()
    filters = serializers.DictField()


class SF2DateSerializer(serializers.Serializer):
    date = serializers.DateField()
    status = serializers.CharField(max_length=20, allow_null=True)
    subject = serializers.CharField(max_length=100, allow_null=True)
    time_slot = serializers.CharField(max_length=50, allow_null=True)


class SF2StudentSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    lrn = serializers.CharField(max_length=12, allow_blank=True, required=False)
    name = serializers.CharField(max_length=255)
    grade_level = serializers.CharField(max_length=20, required=False)
    section = serializers.CharField(max_length=50, required=False)
    daily_attendance = SF2DateSerializer(many=True)


class SF2SummaryStudentSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    name = serializers.CharField(max_length=255)
    present = serializers.IntegerField()
    absent = serializers.IntegerField()
    late = serializers.IntegerField()
    excused = serializers.IntegerField()
    total_recorded = serializers.IntegerField()


class SF2ResponseSerializer(serializers.Serializer):
    matrix = serializers.DictField()
    summary = serializers.DictField()


class SF5StudentSerializer(serializers.Serializer):
    student = serializers.DictField()
    classroom = serializers.DictField()
    promotion_status = serializers.DictField()
    subject_grades = serializers.ListField()


class SF5ClassSummarySerializer(serializers.Serializer):
    total_students = serializers.IntegerField()
    promoted = serializers.IntegerField()
    retained = serializers.IntegerField()
    conditional = serializers.IntegerField()
    no_data = serializers.IntegerField()
    class_average = serializers.DecimalField(max_digits=5, decimal_places=2)
    promotion_rate = serializers.DecimalField(max_digits=5, decimal_places=2)


class SF5ResponseSerializer(serializers.Serializer):
    students = SF5StudentSerializer(many=True)
    class_summary = SF5ClassSummarySerializer()


class SF9StudentInfoSerializer(serializers.Serializer):
    student = serializers.DictField()


class SF9ResponseSerializer(serializers.Serializer):
    student_info = SF9StudentInfoSerializer(required=False)
    quarter_grades = serializers.DictField(required=False)
    final_grades = serializers.ListField(required=False)
    general_average = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True, required=False)
    attendance_summary = serializers.DictField(required=False)
    core_values = serializers.DictField(required=False)
    remarks = serializers.DictField(required=False)
    academic_year = serializers.CharField(required=False)


class SF9ValidationSerializer(serializers.Serializer):
    valid = serializers.BooleanField()
    warnings = serializers.ListField()


class SF10StudentInfoSerializer(serializers.Serializer):
    student = serializers.DictField()


class SF10EnrollmentHistorySerializer(serializers.Serializer):
    academic_year = serializers.CharField()
    grade_level = serializers.CharField(max_length=20)
    section = serializers.CharField(max_length=50)
    subjects = serializers.ListField(required=False)


class SF10PromotionHistorySerializer(serializers.Serializer):
    academic_year = serializers.CharField()
    grade_level = serializers.CharField(max_length=20)
    section = serializers.CharField(max_length=50)
    gpa = serializers.DecimalField(max_digits=5, decimal_places=2)
    promotion_status = serializers.CharField()


class SF10ResponseSerializer(serializers.Serializer):
    student_info = SF10StudentInfoSerializer()
    enrollment_history = SF10EnrollmentHistorySerializer(many=True)
    promotion_history = SF10PromotionHistorySerializer(many=True)
    school_transfers = serializers.ListField()
    transcript = serializers.DictField(allow_null=True)