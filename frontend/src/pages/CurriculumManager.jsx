import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Trash2, Edit2, Plus, Save, Filter, X } from 'lucide-react';

const CurriculumManager = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ class_level_id: '', series_id: '', subject_id: '' });
  const [editingItem, setEditingItem] = useState(null); // If null, we are in "Add Mode"

  // --- 1. Fetch Reference Data ---
  const { data: classLevels = [] } = useQuery({
    queryKey: ['classLevels'],
    queryFn: async () => (await api.get('/schools/classes')).data,
    staleTime: 600000,
  });

  const { data: seriesList = [] } = useQuery({
    queryKey: ['seriesList'],
    queryFn: async () => (await api.get('/schools/series')).data,
    staleTime: 600000,
  });

  const { data: subjectsList = [] } = useQuery({
    queryKey: ['subjectsList'],
    queryFn: async () => (await api.get('/schools/subjects')).data,
    staleTime: 600000,
  });

  // --- 2. Fetch Curriculum Data ---
  const { data: curriculum = [], isLoading } = useQuery({
    queryKey: ['curriculum', filters],
    queryFn: async () => {
      const params = {};
      if (filters.class_level_id) params.class_level_id = filters.class_level_id;
      if (filters.series_id) params.series_id = filters.series_id;
      if (filters.subject_id) params.subject_id = filters.subject_id;
      return (await api.get('/schools/curriculum', { params })).data;
    }
  });

  // --- 3. Mutations ---
  const createMutation = useMutation({
    mutationFn: (values) => api.post('/schools/curriculum', values),
    onSuccess: () => {
      queryClient.invalidateQueries(['curriculum']);
      alert('Entry added successfully!');
    },
    onError: (err) => alert('Error: ' + (err.response?.data?.message || err.message))
  });

  const updateMutation = useMutation({
    mutationFn: (values) => api.put(`/schools/curriculum/${values.id}`, { weekly_hours: values.weekly_hours }),
    onSuccess: () => {
      queryClient.invalidateQueries(['curriculum']);
      setEditingItem(null);
    },
    onError: (err) => alert('Error: ' + err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/schools/curriculum/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['curriculum']),
    onError: (err) => alert('Error: ' + err.message)
  });

  // --- 4. Handlers ---
  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    // Scroll to form (optional UX)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this curriculum rule?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Curriculum Matrix Manager</h1>
          <p className="text-gray-500 text-sm">Define official weekly hours per subject, class, and series.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: FORM & FILTERS */}
        <div className="space-y-6">
          
          {/* A. ADD / EDIT FORM */}
          <div className={`p-6 rounded-lg shadow-sm border ${editingItem ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-blue-100'}`}>
            <h2 className={`text-lg font-bold mb-4 flex items-center ${editingItem ? 'text-yellow-800' : 'text-blue-800'}`}>
              {editingItem ? <Edit2 size={18} className="mr-2"/> : <Plus size={18} className="mr-2"/>}
              {editingItem ? 'Edit Weekly Hours' : 'Add New Rule'}
            </h2>

            <Formik
              enableReinitialize
              initialValues={{
                id: editingItem?.id || '',
                class_level_id: editingItem?.class_level_id || '',
                series_id: editingItem?.series_id || '',
                subject_id: editingItem?.subject_id || '',
                weekly_hours: editingItem?.weekly_hours || ''
              }}
              validationSchema={Yup.object({
                class_level_id: Yup.number().required('Required'),
                series_id: Yup.number().required('Required'),
                subject_id: Yup.number().required('Required'),
                weekly_hours: Yup.number().min(1).required('Required')
              })}
              onSubmit={(values, { resetForm }) => {
                if (editingItem) {
                  updateMutation.mutate(values);
                } else {
                  createMutation.mutate(values);
                  resetForm();
                }
              }}
            >
              {({ isSubmitting, resetForm }) => (
                <Form className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Class Level</label>
                    <Field as="select" name="class_level_id" disabled={!!editingItem} className="w-full p-2 border rounded bg-white disabled:bg-gray-100">
                      <option value="">-- Select Class --</option>
                      {classLevels.map(c => <option key={c.id} value={c.id}>{c.name} ({c.cycle})</option>)}
                    </Field>
                    <ErrorMessage name="class_level_id" component="div" className="text-red-500 text-xs mt-1"/>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Series</label>
                    <Field as="select" name="series_id" disabled={!!editingItem} className="w-full p-2 border rounded bg-white disabled:bg-gray-100">
                      <option value="">-- Select Series --</option>
                      {seriesList.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                    </Field>
                    <ErrorMessage name="series_id" component="div" className="text-red-500 text-xs mt-1"/>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Subject</label>
                    <Field as="select" name="subject_id" disabled={!!editingItem} className="w-full p-2 border rounded bg-white disabled:bg-gray-100">
                      <option value="">-- Select Subject --</option>
                      {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Field>
                    <ErrorMessage name="subject_id" component="div" className="text-red-500 text-xs mt-1"/>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Weekly Hours</label>
                    <Field name="weekly_hours" type="number" className="w-full p-2 border rounded" />
                    <ErrorMessage name="weekly_hours" component="div" className="text-red-500 text-xs mt-1"/>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className={`flex-1 text-white py-2 rounded font-semibold ${editingItem ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      {isSubmitting ? 'Saving...' : <span className="flex items-center justify-center"><Save size={16} className="mr-1"/> Save</span>}
                    </button>
                    {editingItem && (
                      <button 
                        type="button" 
                        onClick={() => { setEditingItem(null); resetForm(); }}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </Form>
              )}
            </Formik>
          </div>

          {/* B. FILTERS */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <Filter size={18} className="mr-2"/> Filter List
            </h2>
            <div className="space-y-3">
              <select name="class_level_id" value={filters.class_level_id} onChange={handleFilterChange} className="w-full p-2 border rounded text-sm">
                <option value="">All Classes</option>
                {classLevels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select name="series_id" value={filters.series_id} onChange={handleFilterChange} className="w-full p-2 border rounded text-sm">
                <option value="">All Series</option>
                {seriesList.map(s => <option key={s.id} value={s.id}>{s.code}</option>)}
              </select>
              <select name="subject_id" value={filters.subject_id} onChange={handleFilterChange} className="w-full p-2 border rounded text-sm">
                <option value="">All Subjects</option>
                {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button 
                onClick={() => setFilters({ class_level_id: '', series_id: '', subject_id: '' })}
                className="w-full flex items-center justify-center text-sm text-gray-600 hover:text-gray-900 mt-2 border border-gray-300 rounded py-1 hover:bg-gray-50"
              >
                <X size={14} className="mr-1"/> Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DATA TABLE */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[800px]">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-700">Curriculum Rules ({curriculum.length})</h3>
            {isLoading && <span className="text-sm text-blue-600 animate-pulse">Loading data...</span>}
          </div>
          
          <div className="overflow-y-auto flex-1 p-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Series</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {curriculum.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500">
                      No curriculum rules found. Add one or adjust filters.
                    </td>
                  </tr>
                ) : (
                  curriculum.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.className}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-700">{item.serieCode}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.subjectName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-bold">
                        {item.weekly_hours}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button 
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                          title="Edit Hours"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                          title="Delete Rule"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurriculumManager;