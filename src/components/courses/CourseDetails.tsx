// src/components/courses/CourseDetails.tsx

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getCourseDetails, enrollStudent, unenrollStudent, getAllStudents } from '../../lib/api';
import { Course, User } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

const CourseDetails = () => {
    const [course, setCourse] = useState<Course | null>(null);
    const [allStudents, setAllStudents] = useState<User[]>([]);
    const [selectedStudent, setSelectedStudent] = useState('');
    const { id } = useParams<{ id: string }>();

    useEffect(() => {
        if (id) {
            fetchCourseData();
            fetchAllStudents();
        }
    }, [id]);

    const fetchCourseData = async () => {
        if (!id) return;
        try {
            const response = await getCourseDetails(id);
            setCourse(response.data);
        } catch (error) {
            console.error('Failed to fetch course details', error);
        }
    };

    const fetchAllStudents = async () => {
        try {
            const response = await getAllStudents();
            setAllStudents(response.data);
        } catch (error) {
            console.error('Failed to fetch students', error);
        }
    }

    const handleEnroll = async () => {
        if (!id || !selectedStudent) return;
        try {
            await enrollStudent(id, selectedStudent);
            fetchCourseData(); // 목록 새로고침
            setSelectedStudent('');
        } catch (error) {
            console.error('Failed to enroll student', error);
            alert('Failed to enroll student. They may already be enrolled.');
        }
    };

    const handleUnenroll = async (studentId: string) => {
        if (!id) return;
        if (window.confirm('Are you sure you want to remove this student?')) {
            try {
                await unenrollStudent(id, studentId);
                fetchCourseData(); // 목록 새로고침
            } catch (error) {
                console.error('Failed to unenroll student', error);
            }
        }
    };

    if (!course) return <div>Loading...</div>;

    const enrolledStudentIds = course.students?.map(s => s.id) || [];
    const availableStudents = allStudents.filter(s => !enrolledStudentIds.includes(s.id));

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">{course.name}</h1>

            <Card className="p-4">
                <h2 className="text-xl font-semibold mb-4">Enroll New Student</h2>
                <div className="flex items-center space-x-2">
                    <select
                        value={selectedStudent}
                        onChange={(e) => setSelectedStudent(e.target.value)}
                        className="block w-full p-2 border border-gray-300 rounded-md"
                    >
                        <option value="">Select a student</option>
                        {availableStudents.map(student => (
                            <option key={student.id} value={student.id}>
                                {student.name} ({student.email})
                            </option>
                        ))}
                    </select>
                    <Button onClick={handleEnroll} disabled={!selectedStudent}>Enroll</Button>
                </div>
            </Card>

            <Card className="p-4">
                <h2 className="text-xl font-semibold mb-4">Enrolled Students ({course.students?.length || 0})</h2>
                <ul className="divide-y divide-gray-200">
                    {course.students && course.students.length > 0 ? (
                        course.students.map(student => (
                            <li key={student.id} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="font-medium">{student.name}</p>
                                    <p className="text-sm text-gray-500">{student.email}</p>
                                </div>
                                <Button variant="destructive" size="sm" onClick={() => handleUnenroll(student.id)}>
                                    Remove
                                </Button>
                            </li>
                        ))
                    ) : (
                        <p>No students are enrolled in this course.</p>
                    )}
                </ul>
            </Card>
        </div>
    );
};

export default CourseDetails;