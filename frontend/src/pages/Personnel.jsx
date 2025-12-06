import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { Formik, Form, Field, ErrorMessage, useFormikContext } from "formik";
import * as Yup from "yup";
import {
  UserPlus,
  ArrowRightLeft,
  Users,
  Briefcase,
  Search,
  Check,
  X,
  MapPin,
  Filter,
  Edit2,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { getDateAfterYears } from "../utils/distance";

// --- HELPER: SCHOOL AUTOCOMPLETE (Reused) ---
const SchoolAutocomplete = ({ schools, name }) => {
  const { setFieldValue, setFieldTouched, values, errors, touched } =
    useFormikContext();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const wrapperRef = useRef(null);

  const filteredSchools = useMemo(() => {
    if (!inputValue) return schools.slice(0, 50);
    return schools
      .filter(
        (s) =>
          s.name.toLowerCase().includes(inputValue.toLowerCase()) ||
          s.region.toLowerCase().includes(inputValue.toLowerCase())
      )
      .slice(0, 50);
  }, [schools, inputValue]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setFieldTouched(name, true);
        const selectedSchool = schools.find((s) => s.id === values[name]);
        if (selectedSchool) {
          setInputValue(selectedSchool.name);
        } else if (!values[name]) {
          setInputValue("");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [name, schools, values, setFieldTouched]);

  useEffect(() => {
    if (!values[name]) {
      setInputValue("");
    }
  }, [values[name]]);

  const handleSelect = (school) => {
    setFieldValue(name, school.id);
    setInputValue(school.name);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          className={`w-full p-2 pl-8 border rounded bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none ${
            errors[name] && touched[name] ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="Type to search school..."
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
            if (values[name]) setFieldValue(name, "");
          }}
          onFocus={() => setIsOpen(true)}
        />
        <Search className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredSchools.map((school) => (
            <div
              key={school.id}
              onClick={() => handleSelect(school)}
              className="px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 flex justify-between items-center"
            >
              <div>
                <div className="font-medium text-gray-800">{school.name}</div>
                <div className="text-xs text-gray-500">{school.region}</div>
              </div>
              {values[name] === school.id && (
                <Check size={14} className="text-blue-600" />
              )}
            </div>
          ))}
        </div>
      )}
      <ErrorMessage
        name={name}
        component="div"
        className="text-red-500 text-xs mt-1"
      />
    </div>
  );
};

// --- COMPONENT: EDIT PERSONNEL MODAL ---
const EditPersonnelModal = ({
  personnel,
  onClose,
  grades,
  domains,
  adminPositions,
  statuses,
}) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (values) =>
      api.put(`/personnel/${personnel.matricule}`, values),
    onSuccess: () => {
      queryClient.invalidateQueries(["personnelList"]);
      alert("Personnel updated successfully");
      onClose();
    },
    onError: (err) => alert(err.message),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-lg">
            Edit Personnel: {personnel.full_name}
          </h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <Formik
            initialValues={{
              full_name: personnel.full_name,
              date_of_birth: personnel.date_of_birth
                ? personnel.date_of_birth.split("T")[0]
                : "",
              grade_code: personnel.grade_code || "",
              teaching_domain_id: personnel.teaching_domain_id || "",
              status_code: personnel.status_code || "",
            }}
            validationSchema={Yup.object({
              full_name: Yup.string().required(),
              date_of_birth: Yup.date().required(
                "Date of birth is required for retirement calculation"
              ),
              status_code: Yup.string().required(),
            })}
            onSubmit={(values) => mutation.mutate(values)}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Full Name
                    </label>
                    <Field
                      name="full_name"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Date of Birth
                    </label>
                    <Field
                      name="date_of_birth"
                      type="date"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Grade
                    </label>
                    <Field
                      as="select"
                      name="grade_code"
                      className="w-full p-2 border rounded"
                    >
                      <option value="">No Grade</option>
                      {grades.map((g) => (
                        <option key={g.grade_code} value={g.grade_code}>
                          {g.grade_code}
                        </option>
                      ))}
                    </Field>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Teaching Domain
                    </label>
                    <Field
                      as="select"
                      name="teaching_domain_id"
                      className="w-full p-2 border rounded"
                    >
                      <option value="">No Domain</option>
                      {domains.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </Field>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Current Status
                    </label>
                    <Field
                      as="select"
                      name="status_code"
                      className="w-full p-2 border rounded bg-yellow-50"
                    >
                      <option value="">-- Select Status --</option>
                      {statuses.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.name}
                        </option>
                      ))}
                    </Field>
                  </div>
                  {/* Admin Position is usually handled via posting transfer, but can be displayed/cleared here if needed */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Admin Position
                    </label>
                    <div className="p-2 border rounded bg-gray-100 text-gray-500">
                      {personnel.admin_position_code || "None"}
                      <span className="text-xs italic ml-2">
                        (Use Transfer form to change)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT: RECRUIT FORM ---
const RecruitForm = ({ grades, domains }) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (values) => api.post("/personnel", values),
    onSuccess: () => {
      alert("Personnel recruited successfully");
      queryClient.invalidateQueries(["personnelList"]);
    },
    onError: (err) => alert(err.message),
  });

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-6">
      <div className="flex items-center mb-4 text-green-600">
        <UserPlus className="w-5 h-5 mr-2" />
        <h3 className="text-lg font-bold">Recruit New Personnel</h3>
      </div>
      <Formik
        initialValues={{
          matricule: "",
          full_name: "",
          grade_code: "",
          teaching_domain_id: "",
          date_of_birth: "",
        }}
        validationSchema={Yup.object({
          matricule: Yup.string()
            .trim()
            .required("Matricule is required")
            .matches(
              /^[01][0-9]{6}[A-Z]$/,
              "Must start with 0 or 1, followed by 6 digits, then an uppercase letter"
            )
            .length(8, "Must be exactly 8 characters"),
          full_name: Yup.string().required(),
          grade_code: Yup.string().required(),
          date_of_birth: Yup.date().required("Date of birth is required"),
        })}
        onSubmit={(values, { resetForm }) => {
          mutation.mutate(values);
          resetForm();
        }}
      >
        {({ isSubmitting }) => (
          <Form className="grid grid-cols-1 gap-4 items-end">
            <div className="lg:col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Matricule
              </label>
              <Field
                name="matricule"
                className="w-full p-2 border rounded"
                placeholder="e.g. 0654321A"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Full Name
              </label>
              <Field
                name="full_name"
                className="w-full p-2 border rounded"
                placeholder="Name"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Date of Birth
              </label>
              <Field
                name="date_of_birth"
                type="date"
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Grade
              </label>
              <Field
                as="select"
                name="grade_code"
                className="w-full p-2 border rounded"
              >
                <option value="">-- Grade --</option>
                {grades.map((g) => (
                  <option key={g.grade_code} value={g.grade_code}>
                    {g.grade_code}
                  </option>
                ))}
              </Field>
            </div>
            <div className="lg:col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Domain
              </label>
              <Field
                as="select"
                name="teaching_domain_id"
                className="w-full p-2 border rounded"
              >
                <option value="">-- Domain --</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Field>
            </div>
            <div className="lg:col-span-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-green-600 text-white py-2 rounded font-medium"
              >
                {isSubmitting ? "..." : "Recruit"}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

// --- COMPONENT: TRANSFER FORM (Reused) ---
const TransferForm = () => {
  const queryClient = useQueryClient();
  const { data: schools = [] } = useQuery({
    queryKey: ["schoolsList"],
    queryFn: async () => (await api.get("/schools")).data,
  });
  const { data: adminPositions = [] } = useQuery({
    queryKey: ["adminPositions"],
    queryFn: async () => (await api.get("/schools/admin-positions")).data,
  });

  const mutation = useMutation({
    mutationFn: (values) => api.post("/postings/transfer", values),
    onSuccess: () => {
      alert("Transfer processed successfully");
      queryClient.invalidateQueries(["personnelList"]);
    },
    onError: (err) =>
      alert(
        "Error processing transfer: " +
          (err.response?.data?.message || err.message)
      ),
  });

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      <div className="flex items-center mb-4 text-blue-600">
        <ArrowRightLeft className="w-5 h-5 mr-2" />
        <h3 className="text-lg font-bold">Transfer / Post Personnel</h3>
      </div>
      <Formik
        initialValues={{
          personnel_matricule: "",
          new_school_id: "",
          admin_position_code: "",
        }}
        validationSchema={Yup.object({
          personnel_matricule: Yup.string()
            .trim()
            .required("Matricule is required")
            .matches(
              /^[01][0-9]{6}[A-Z]$/,
              "Must start with 0 or 1, followed by 6 digits, then an uppercase letter"
            )
            .length(8, "Must be exactly 8 characters"),
          new_school_id: Yup.number().required("Select a school"),
        })}
        onSubmit={(values, { resetForm }) => {
          const payload = {
            ...values,
            admin_position_code: values.admin_position_code || null,
          };
          mutation.mutate(payload);
          resetForm();
        }}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Personnel Matricule
              </label>
              <Field
                name="personnel_matricule"
                className="w-full p-2 border rounded"
                placeholder="e.g. 0654321A"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Destination School
              </label>
              <SchoolAutocomplete schools={schools} name="new_school_id" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center">
                <Briefcase size={12} className="mr-1" /> Administrative Position
                (Optional)
              </label>
              <Field
                as="select"
                name="admin_position_code"
                className="w-full p-2 border rounded bg-white"
              >
                <option value="">-- None (Teacher only) --</option>
                {adminPositions.map((p) => (
                  <option key={p.position_code} value={p.position_code}>
                    {p.name}
                  </option>
                ))}
              </Field>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-medium"
            >
              {isSubmitting ? "Processing..." : "Transfer Personnel"}
            </button>
          </Form>
        )}
      </Formik>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
const Personnel = () => {
  // Filters State
  const [filters, setFilters] = useState({
    full_name: "",
    grade_code: "",
    teaching_domain_id: "",
    admin_position_code: "",
    status_code: "",
    retirement_status: "", // 'RETIRING_THIS_YEAR', 'RETIRED_BUT_ACTIVE', 'active'
  });

  const [editingPersonnel, setEditingPersonnel] = useState(null);

  // 1. Fetch References
  const { data: grades = [] } = useQuery({
    queryKey: ["grades"],
    queryFn: async () => (await api.get("/schools/grades")).data,
  });
  const { data: domains = [] } = useQuery({
    queryKey: ["domains"],
    queryFn: async () => (await api.get("/schools/domaines")).data,
  });
  const { data: adminPositions = [] } = useQuery({
    queryKey: ["adminPositions"],
    queryFn: async () => (await api.get("/schools/admin-positions")).data,
  });
  // FETCH STATUSES FROM API
  const { data: statuses = [] } = useQuery({
    queryKey: ["statuses"],
    queryFn: async () => (await api.get("/personnel/statuses")).data,
  });

  // 2. Fetch Personnel with Backend Filters
  const { data: personnelData, isLoading } = useQuery({
    queryKey: ["personnelList", filters],
    queryFn: async () => {
      // Convert filters to query string
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params.append(key, filters[key]);
      });
      return (await api.get(`/personnel?${params.toString()}`)).data;
    },
    keepPreviousData: true,
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Personnel Management Directory
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="space-y-6 lg:col-span-1">
          <TransferForm />
        </div>
        <div className="lg:col-span-2">
          <RecruitForm grades={grades} domains={domains} />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200 mb-6">
        <div className="flex items-center mb-2 text-gray-600">
          <Filter className="w-4 h-4 mr-2" />
          <h3 className="text-sm font-bold uppercase">Advanced Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <input
            name="full_name"
            placeholder="Search Name..."
            className="p-2 border rounded text-sm"
            onChange={handleFilterChange}
          />
          <select
            name="grade_code"
            className="p-2 border rounded text-sm"
            onChange={handleFilterChange}
          >
            <option value="">All Grades</option>
            {grades.map((g) => (
              <option key={g.grade_code} value={g.grade_code}>
                {g.grade_code}
              </option>
            ))}
          </select>
          <select
            name="teaching_domain_id"
            className="p-2 border rounded text-sm"
            onChange={handleFilterChange}
          >
            <option value="">All Domains</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            name="admin_position_code"
            className="p-2 border rounded text-sm"
            onChange={handleFilterChange}
          >
            <option value="">All Positions</option>
            {adminPositions.map((p) => (
              <option key={p.position_code} value={p.position_code}>
                {p.name}
              </option>
            ))}
          </select>
          {/* DYNAMIC STATUS FILTER */}
          <select
            name="status_code"
            className="p-2 border rounded text-sm"
            onChange={handleFilterChange}
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            name="retirement_status"
            className="p-2 border rounded text-sm bg-indigo-50 border-indigo-200"
            onChange={handleFilterChange}
          >
            <option value="">Any Retirement Status</option>
            <option value="RETIRING_THIS_YEAR">Retiring This Year</option>
            <option value="RETIRED_BUT_ACTIVE">Overdue for Retirement</option>
          </select>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between">
          <span className="font-bold text-gray-700">
            Results: {personnelData?.meta?.total || personnelData?.length || 0}{" "}
            Records
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 border-b">Matricule</th>
                <th className="p-3 border-b">Full Name</th>
                <th className="p-3 border-b">Status</th>
                <th className="p-3 border-b">Grade / Domain</th>
                <th className="p-3 border-b">Position</th>
                <th className="p-3 border-b">Retirement Info</th>
                <th className="p-3 border-b text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center">
                    Loading data...
                  </td>
                </tr>
              ) : (
                personnelData?.data?.map((p) => {
                  const birthDate = p.date_of_birth
                    ? new Date(p.date_of_birth)
                    : null;
                  const today = new Date();
                  const age = birthDate
                    ? today.getFullYear() - birthDate.getFullYear()
                    : "N/A";
                  const isRetiringSoon = typeof age === "number" && age >= 60;

                  return (
                    <tr
                      key={p.matricule}
                      className={`hover:bg-gray-50 ${
                        isRetiringSoon && p.status_code === "ACTIVE"
                          ? "bg-orange-50"
                          : ""
                      }`}
                    >
                      <td className="p-3 border-b font-mono">{p.matricule}</td>
                      <td className="p-3 border-b font-medium">
                        {p.full_name}
                      </td>
                      <td className="p-3 border-b">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            p.status_code === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : p.status_code === "SICK"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {p.status_name || p.status_code}
                        </span>
                      </td>
                      <td className="p-3 border-b text-gray-500">
                        {p.grade_code}
                        <br />
                        <span className="text-xs">{p.domain_name}</span>
                      </td>
                      <td className="p-3 border-b">
                        {p.admin_position_code || "Teacher"}
                        <div className="text-xs text-gray-400">
                          {p.school_name || "Not Posted"}
                        </div>
                      </td>
                      <td className="p-3 border-b">
                        {birthDate
                          ? getDateAfterYears(
                              birthDate,
                              60
                            ).toLocaleDateString()
                          : "N/A"}
                        {isRetiringSoon && (
                          <div className="text-xs text-orange-600 font-bold flex items-center mt-1">
                            <AlertTriangle size={10} className="mr-1" /> Age:{" "}
                            {age}
                          </div>
                        )}
                      </td>
                      <td className="p-3 border-b text-right">
                        <button
                          onClick={() => setEditingPersonnel(p)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit Details"
                        >
                          <Edit2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingPersonnel && (
        <EditPersonnelModal
          personnel={editingPersonnel}
          onClose={() => setEditingPersonnel(null)}
          grades={grades}
          domains={domains}
          adminPositions={adminPositions}
          statuses={statuses}
        />
      )}
    </div>
  );
};

export default Personnel;
