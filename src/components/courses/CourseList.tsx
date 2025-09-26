// src/components/courses/CourseList.tsx

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCourses, deleteCourse as apiDeleteCourse } from '../../lib/api';
import { Course } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

const CourseList = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const response = await getCourses();
            setCourses(response.data);
        } catch (error) {
            console.error('Failed to fetch courses', error);
        }
    };

    const handleDelete = async (courseId: string) => {
        if (window.confirm('Are you sure you want to delete this course?')) {
            try {
                await apiDeleteCourse(courseId);
                fetchCourses(); // 목록 새로고침
            } catch (error) {
                console.error('Failed to delete course', error);
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Courses</h1>
                <Button onClick={() => navigate('/courses/new')}>Create Course</Button>
            </div>
            {courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {courses.map((course) => (
                        <Card key={course.id} className="p-4 flex flex-col justify-between">
                            <div>
                                <h2 className="text-xl font-semibold mb-2">{course.name}</h2>
                            </div>
                            <div className="flex justify-end space-x-2 mt-4">
                                <Button variant="outline" onClick={() => navigate(`/courses/${course.id}`)}>
                                    Manage Students
                                </Button>
                                <Button variant="secondary" onClick={() => navigate(`/courses/edit/${course.id}`)}>
                                    Edit
                                </Button>
                                <Button variant="destructive" onClick={() => handleDelete(course.id)}>
                                    Delete
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <p>No courses found. Create one!</p>
            )}
        </div>
    );
};

export default CourseList;