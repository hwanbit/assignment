import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api'; // api.ts에 추가할 예정
import { User } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatDate } from '../../utils/date';
import { Users, Check, X } from 'lucide-react';

interface PendingUser extends User {
    createdAt: string;
}

export const UserApproval: React.FC = () => {
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchPendingUsers = async () => {
        setLoading(true);
        try {
            const { data } = await adminApi.getPendingUsers();
            setPendingUsers(data || []);
        } catch (err) {
            setError('Failed to load pending users.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingUsers();
    }, []);

    const handleApprove = async (userId: string) => {
        if (!window.confirm('Are you sure you want to approve this user?')) return;
        try {
            await adminApi.approveUser(userId);
            fetchPendingUsers(); // Refresh the list
        } catch (err) {
            alert('Failed to approve user.');
        }
    };

    const handleReject = async (userId: string) => {
        if (!window.confirm('Are you sure you want to reject this user?')) return;
        try {
            await adminApi.rejectUser(userId);
            fetchPendingUsers(); // Refresh the list
        } catch (err) {
            alert('Failed to reject user.');
        }
    };

    if (loading) return <p>사용자 로드 중...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <Card>
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Users className="w-6 h-6 mr-2" />
                사용자 승인 요청
            </h3>
            {pendingUsers.length === 0 ? (
                <p className="text-gray-500">회원가입을 요청한 계정이 없습니다.</p>
            ) : (
                <div className="space-y-4">
                    {pendingUsers.map(user => (
                        <div key={user.id} className="p-4 border rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-semibold">{user.full_name} <Badge>{user.role}</Badge></p>
                                <p className="text-sm text-gray-600">{user.email}</p>
                                <p className="text-xs text-gray-400">Requested on: {formatDate(user.createdAt)}</p>
                            </div>
                            <div className="flex space-x-2">
                                <Button size="sm" onClick={() => handleApprove(user.id)}>
                                    <Check className="w-4 h-4 mr-1" /> 승인
                                </Button>
                                <Button size="sm" variant="danger" onClick={() => handleReject(user.id)}>
                                    <X className="w-4 h-4 mr-1" /> 거부
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
};