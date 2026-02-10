import React, { useState, useEffect } from 'react';
import { Upload, X, Trash2, Image as ImageIcon, Loader, Plus } from 'lucide-react';
import employeeDocumentsService from '../../../services/employeeDocumentsService';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

const SignatureManagement = () => {
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    file: null,
    signatureName: '',
    signatureType: '',
  });
  const [preview, setPreview] = useState(null);

  // Fetch signatures
  const fetchSignatures = async () => {
    setLoading(true);
    try {
      const response = await employeeDocumentsService.getSignatures();
      if (response.success) {
        setSignatures(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching signatures:', error);
      alertify.error(error.message || 'Failed to fetch signatures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignatures();
  }, []);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.match(/^image\/(png|jpg|jpeg)$/)) {
        alertify.error('Please select a PNG, JPG, or JPEG image file');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alertify.error('File size must be less than 5MB');
        return;
      }

      setUploadData({ ...uploadData, file });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle signature upload
  const handleUpload = async () => {
    if (!uploadData.file) {
      alertify.error('Please select a signature image');
      return;
    }

    setUploading(true);
    try {
      const response = await employeeDocumentsService.uploadSignature(
        uploadData.file,
        uploadData.signatureName,
        uploadData.signatureType
      );

      if (response.success) {
        alertify.success('Signature uploaded successfully');
        setShowUploadModal(false);
        setUploadData({ file: null, signatureName: '', signatureType: '' });
        setPreview(null);
        fetchSignatures();
      }
    } catch (error) {
      console.error('Error uploading signature:', error);
      alertify.error(error.message || 'Failed to upload signature');
    } finally {
      setUploading(false);
    }
  };

  // Handle signature deletion
  const handleDelete = async (signatureId) => {
    if (!window.confirm('Are you sure you want to delete this signature?')) {
      return;
    }

    try {
      const response = await employeeDocumentsService.deleteSignature(signatureId);
      if (response.success) {
        alertify.success('Signature deleted successfully');
        fetchSignatures();
      }
    } catch (error) {
      console.error('Error deleting signature:', error);
      alertify.error(error.message || 'Failed to delete signature');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Signature Management</h2>
          <p className="text-sm text-gray-600 mt-1">Upload and manage signatures for use in documents</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Upload Signature
        </button>
      </div>

      {/* Signatures Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : signatures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <ImageIcon className="w-12 h-12 mb-4 text-gray-400" />
          <p className="text-lg font-medium">No signatures uploaded</p>
          <p className="text-sm">Upload your first signature to get started</p>
        </div>
      ) : (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {signatures.map((signature) => (
              <div
                key={signature.signatureId}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="mb-4">
                  <img
                    src={signature.signatureUrl}
                    alt={signature.signatureName || 'Signature'}
                    className="w-full h-32 object-contain bg-gray-50 rounded border border-gray-200"
                  />
                </div>
                <div className="mb-2">
                  <h3 className="font-medium text-gray-900">
                    {signature.signatureName || 'Unnamed Signature'}
                  </h3>
                  {signature.signatureType && (
                    <p className="text-sm text-gray-500 capitalize">{signature.signatureType}</p>
                  )}
                </div>
                <div className="text-xs text-gray-400 mb-4">
                  Uploaded: {new Date(signature.uploadedAt).toLocaleDateString()}
                </div>
                <button
                  onClick={() => handleDelete(signature.signatureId)}
                  className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Upload Signature</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadData({ file: null, signatureName: '', signatureType: '' });
                  setPreview(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Signature Image *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  {preview ? (
                    <div className="space-y-4">
                      <img
                        src={preview}
                        alt="Preview"
                        className="max-h-48 mx-auto rounded border border-gray-200"
                      />
                      <button
                        onClick={() => {
                          setUploadData({ ...uploadData, file: null });
                          setPreview(null);
                        }}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <label className="cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-700 font-medium">
                          Click to upload
                        </span>
                        <span className="text-gray-600"> or drag and drop</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-2">
                        PNG, JPG, JPEG up to 5MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Signature Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Signature Name
                </label>
                <input
                  type="text"
                  value={uploadData.signatureName}
                  onChange={(e) => setUploadData({ ...uploadData, signatureName: e.target.value })}
                  placeholder="e.g., HR Manager Signature"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Signature Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Signature Type
                </label>
                <select
                  value={uploadData.signatureType}
                  onChange={(e) => setUploadData({ ...uploadData, signatureType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select type (optional)</option>
                  <option value="hr_manager">HR Manager</option>
                  <option value="ceo">CEO</option>
                  <option value="authorized_person">Authorized Person</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadData({ file: null, signatureName: '', signatureType: '' });
                  setPreview(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadData.file || uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading && <Loader className="w-4 h-4 animate-spin" />}
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignatureManagement;
