import React, { useState, useRef } from 'react';

interface ApplicationFormData {
  applicantName: string;
  applicantEmail: string;
  projectTitle: string;
  projectDescription: string;
  requestedAmount: number | '';
}

interface FileInfo {
  name: string;
  size: number;
  file: File;
}

interface ApplicationFormProps {
  formData: ApplicationFormData;
  highlightedField: string | null;
  onManualEdit: (field: string, value: string) => void;
  onSubmit: () => void;
}

export function ApplicationForm({
  formData,
  highlightedField,
  onManualEdit,
  onSubmit,
}: ApplicationFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    
    const newFiles: FileInfo[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      newFiles.push({
        name: selectedFiles[i].name,
        size: selectedFiles[i].size,
        file: selectedFiles[i],
      });
    }
    setFiles([...files, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const newErrors: Record<string, string> = {};
    if (!formData.applicantName.trim()) newErrors.applicantName = 'Name is required';
    if (!formData.applicantEmail.trim()) newErrors.applicantEmail = 'Email is required';
    if (!formData.projectTitle.trim()) newErrors.projectTitle = 'Project title is required';
    if (!formData.projectDescription.trim())
      newErrors.projectDescription = 'Description is required';
    if (!formData.requestedAmount || formData.requestedAmount <= 0)
      newErrors.requestedAmount = 'Valid amount is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      // Create application
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          requestedAmount: Number(formData.requestedAmount),
        }),
      });

      const result = await response.json();
      if (result.success) {
        const appId = result.data.id;
        setApplicationId(appId);
        setReferenceNumber(result.data.referenceNumber);

        // Upload files if any
        if (files.length > 0) {
          setUploadingFiles(true);
          for (const fileInfo of files) {
            const formDataUpload = new FormData();
            formDataUpload.append('file', fileInfo.file);
            await fetch(`/api/applications/${appId}/files`, {
              method: 'POST',
              body: formDataUpload,
            });
          }
          setUploadingFiles(false);
        }

        setSubmitted(true);
        onSubmit();
      } else {
        setErrors({ submit: result.error?.message || 'Submission failed' });
      }
    } catch {
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldClass = (field: string) => {
    const base = 'w-full border rounded px-3 py-2 transition-all duration-300';
    if (errors[field]) return `${base} border-red-500`;
    if (highlightedField === field) return `${base} border-dove-500 ring-2 ring-dove-300 bg-dove-50`;
    return `${base} border-dove-300`;
  };

  if (submitted) {
    return (
      <div className="p-6">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-dove-800 mb-2">Application Submitted!</h2>
          <p className="text-dove-600 mb-4">Your reference number is:</p>
          <p className="text-3xl font-mono font-bold text-dove-800 mb-6">{referenceNumber}</p>
          <p className="text-dove-500">
            We'll review your application and get back to you soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">📝 Grant Application</h2>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow">
        <div>
          <label className="block text-sm font-medium text-dove-700 mb-1">Your Name</label>
          <input
            type="text"
            value={formData.applicantName}
            onChange={(e) => onManualEdit('applicantName', e.target.value)}
            className={getFieldClass('applicantName')}
          />
          {errors.applicantName && (
            <p className="text-red-500 text-sm mt-1">{errors.applicantName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-dove-700 mb-1">Email</label>
          <input
            type="email"
            value={formData.applicantEmail}
            onChange={(e) => onManualEdit('applicantEmail', e.target.value)}
            className={getFieldClass('applicantEmail')}
          />
          {errors.applicantEmail && (
            <p className="text-red-500 text-sm mt-1">{errors.applicantEmail}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-dove-700 mb-1">Project Title</label>
          <input
            type="text"
            value={formData.projectTitle}
            onChange={(e) => onManualEdit('projectTitle', e.target.value)}
            className={getFieldClass('projectTitle')}
          />
          {errors.projectTitle && (
            <p className="text-red-500 text-sm mt-1">{errors.projectTitle}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-dove-700 mb-1">Project Description</label>
          <textarea
            rows={4}
            value={formData.projectDescription}
            onChange={(e) => onManualEdit('projectDescription', e.target.value)}
            className={getFieldClass('projectDescription')}
          />
          {errors.projectDescription && (
            <p className="text-red-500 text-sm mt-1">{errors.projectDescription}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-dove-700 mb-1">Requested Amount ($)</label>
          <input
            type="number"
            value={formData.requestedAmount}
            onChange={(e) => onManualEdit('requestedAmount', e.target.value)}
            className={getFieldClass('requestedAmount')}
            min="0"
            step="100"
          />
          {errors.requestedAmount && (
            <p className="text-red-500 text-sm mt-1">{errors.requestedAmount}</p>
          )}
        </div>

        {/* File Attachments */}
        <div>
          <label className="block text-sm font-medium text-dove-700 mb-1">Attachments (optional)</label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-dove-300 rounded px-4 py-2 text-dove-600 hover:bg-dove-50 w-full"
          >
            📎 Add Files
          </button>
          {files.length > 0 && (
            <div className="mt-2 space-y-1">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-dove-50 rounded px-3 py-1 text-sm">
                  <span className="truncate">{file.name} ({formatFileSize(file.size)})</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || uploadingFiles}
          className="w-full bg-dove-600 text-white py-2 rounded hover:bg-dove-700 disabled:opacity-50"
        >
          {uploadingFiles ? 'Uploading files...' : isSubmitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
    </div>
  );
}
