import api from './api';

export const enrollmentService = {
  // Enroll in a course
  enroll: (courseId) => api.post(`/enrollments/${courseId}`),

  // Get all my enrolled courses
  getMyEnrollments: () => api.get('/enrollments/my'),

  // Get full access to a course (modules, lessons, zoom links)
  getCourseAccess: (courseId) => api.get(`/enrollments/${courseId}`),

  // Mark a lesson as completed
  completeLesson: (courseId, lessonId, watchedSeconds = 0) =>
    api.post(`/enrollments/${courseId}/lessons/${lessonId}/complete`, { watchedSeconds }),
};

export const moduleService = {
  // Get modules for a course (instructor)
  getByCourse: (courseId) => api.get(`/modules/course/${courseId}`),

  // Create a module
  create: (courseId, data) => api.post(`/modules/course/${courseId}`, data),

  // Update a module
  update: (id, data) => api.put(`/modules/${id}`, data),

  // Delete a module
  delete: (id) => api.delete(`/modules/${id}`),

  // Reorder modules
  reorder: (courseId, orderedIds) =>
    api.patch(`/modules/course/${courseId}/reorder`, { orderedIds }),
};

export const lessonService = {
  // Get lessons for a module (instructor)
  getByModule: (moduleId) => api.get(`/lessons/module/${moduleId}`),

  // Create a lesson
  create: (moduleId, data) => api.post(`/lessons/module/${moduleId}`, data),

  // Update a lesson
  update: (id, data) => api.put(`/lessons/${id}`, data),

  // Delete a lesson
  delete: (id) => api.delete(`/lessons/${id}`),
};

export const instructorService = {
  // Get instructor's own courses
  getMyCourses: () => api.get('/courses/instructor/my-courses'),

  // Get enrolled students for a course
  getCourseStudents: (courseId) => api.get(`/enrollments/${courseId}/students`),

  // Create course
  createCourse: (formData) =>
    api.post('/courses', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  // Update course
  updateCourse: (courseId, formData) =>
    api.put(`/courses/${courseId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  // Delete (archive) course
  deleteCourse: (courseId) => api.delete(`/courses/${courseId}`),

  // Get categories
  getCategories: () => api.get('/categories'),
};

export const zoomService = {
  // Get meetings for a course
  getByCourse: (courseId) => api.get(`/zoom/course/${courseId}`),
  // Create a live class
  create: (courseId, data) => api.post(`/zoom/course/${courseId}`, data),
  // End a live class
  endClass: (meetingId) => api.delete(`/zoom/${meetingId}`),
};
