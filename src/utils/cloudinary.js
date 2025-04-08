const CLOUDINARY_CLOUD_NAME = 'dtxxvwnqv';
const CLOUDINARY_API_KEY = '379552942984115';
const CLOUDINARY_API_SECRET = 'OkTz4G0o2Ln6844Q53jL3ilw5Dk';
const CLOUDINARY_UPLOAD_PRESET_PROFILE = 'Profile_picture';
const CLOUDINARY_UPLOAD_PRESET_EXAM = 'exam_pictures';
const CLOUDINARY_UPLOAD_PRESET_PDF = 'pdf_upload'; // New preset for PDFs

// Existing function for image uploads (unchanged)
export const uploadImageToCloudinary = async (file, preset) => {
  const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!file || !validImageTypes.includes(file.type)) {
    console.error('Cloudinary: Invalid file type. Only JPEG, PNG, and GIF are allowed.');
    throw new Error('Invalid file type. Please upload a JPEG, PNG, or GIF image.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', preset);

  console.log('Cloudinary: Uploading file with preset:', preset);
  console.log('Cloudinary: File details:', { name: file.name, size: file.size, type: file.type });

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();
    console.log('Cloudinary: Full response:', data);

    if (!response.ok || !data.secure_url) {
      console.error('Cloudinary: Upload failed:', data);
      throw new Error(data.error?.message || 'Failed to upload image to Cloudinary');
    }

    console.log('Cloudinary: Upload successful, secure_url:', data.secure_url);
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary: Error during upload:', error);
    throw error;
  }
};

// New function for file uploads (e.g., PDFs)
export const uploadFileToCloudinary = async (file, preset = CLOUDINARY_UPLOAD_PRESET_PDF) => {
  const validFileTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];

  if (!file || !validFileTypes.includes(file.type)) {
    console.error('Cloudinary: Invalid file type. Only PDF, DOC, DOCX, PPT, and PPTX are allowed.');
    throw new Error('Invalid file type. Please upload a PDF, DOC, DOCX, PPT, or PPTX file.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', preset);

  console.log('Cloudinary: Uploading file with preset:', preset);
  console.log('Cloudinary: File details:', { name: file.name, size: file.size, type: file.type });

  try {
    // Use raw upload endpoint for non-image files
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();
    console.log('Cloudinary: Full response:', data);

    if (!response.ok || !data.secure_url) {
      console.error('Cloudinary: Upload failed:', data);
      throw new Error(data.error?.message || 'Failed to upload file to Cloudinary');
    }

    console.log('Cloudinary: Upload successful, secure_url:', data.secure_url);
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary: Error during upload:', error);
    throw error;
  }
};