import { Colors } from '@/constants/Colors';

export const getAmmoniaLevelColor = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'low':
      return Colors.safe;
    case 'medium':
      return Colors.warning;
    case 'high':
      return Colors.high;
    case 'critical':
      return Colors.critical;
    default:
      return Colors.secondary;
  }
};

export const getAmmoniaCategory = (ppm: number): string => {
  if (ppm <= 10) return 'Low';
  if (ppm <= 25) return 'Medium';
  if (ppm <= 50) return 'High';
  return 'Critical';
};

export const getBatteryLevelColor = (level: number): string => {
  if (level > 60) return Colors.safe;
  if (level > 30) return Colors.warning;
  if (level > 15) return Colors.high;
  return Colors.critical;
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (date: string): string => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatTimeAgo = (date: string): string => {
  const now = new Date();
  const past = new Date(date);
  const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
};

export const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};