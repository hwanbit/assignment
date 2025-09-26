// src/components/courses/CourseForm.tsx

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createCourse, getCourseDetails, updateCourse } from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

const CourseForm = () => {
    const [name, setName] = useState('');
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    useEffect(() => {
        if (id) {
            const fetchCourse = async () => {
                try {
                    const response = await getCourseDetails(id);
                    setName(response.data.name);
                } catch (error) {
                    console.error('Failed to fetch course details', error);
                }
            };
            fetchCourse();
        }
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const courseData = { name };

        try {
            if (id) {
                await updateCourse(id, courseData);
            } else {
                await createCourse(courseData);
            }
            navigate('/courses');
        } catch (error) {
            console.error('Failed to save course', error);
        }
    };

    return (
        <Card className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">{id ? 'Edit Course' : 'Create Course'}</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Course Name</label>
                    <Input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="mt-1"
                    />
                </div>
                <div className="flex justify-end">
                    <Button type="submit">{id ? 'Update' : 'Create'}</Button>
                </div>
            </form>
        </Card>
    );
};

export default CourseForm;