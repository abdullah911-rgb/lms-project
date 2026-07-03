export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const ROUTES = {
  HOME: '/',
  ABOUT: '/about',
  COURSES: '/courses',
  COURSE_DETAIL: '/courses/:slug',
  FAQ: '/faq',
  CONTACT: '/contact',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  
  // Student Portal
  STUDENT_DASHBOARD: '/student/dashboard',
  STUDENT_MY_COURSES: '/student/my-courses',
  STUDENT_COURSE_VIEW: '/student/course/:courseId',
  STUDENT_PROFILE: '/student/profile',

  // Instructor Portal
  INSTRUCTOR_DASHBOARD: '/instructor/dashboard',
  INSTRUCTOR_COURSES: '/instructor/courses',
  INSTRUCTOR_COURSE_NEW: '/instructor/courses/new',
  INSTRUCTOR_COURSE_EDIT: '/instructor/courses/:courseId/edit',
  INSTRUCTOR_STUDENTS: '/instructor/students',
  INSTRUCTOR_PROFILE: '/instructor/profile',

  // Admin Portal
  ADMIN_DASHBOARD: '/admin/dashboard',
};

export const ROLES = {
  STUDENT: 'STUDENT',
  INSTRUCTOR: 'INSTRUCTOR',
  ADMIN: 'ADMIN',
};
