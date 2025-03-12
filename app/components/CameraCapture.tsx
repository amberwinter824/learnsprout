'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RotateCw, Check, Image, Loader } from 'lucide-react';
import { uploadPhotoToStorage } from '@/lib/storageService';

interface CameraCaptureProps {
  onCapture: (photoUrl: string, file?: File) => void;
  onCancel: () => void;
  childId: string;
  maxWidth?: number;
  aspectRatio?: string;
  mode?: 'camera' | 'photo' | 'both';
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onCancel,
  childId,
  maxWidth = 800,
  aspectRatio = '4:3',
  mode = 'both'
}) => {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(mode === 'camera');
  const [isCameraAvailable, setIsCameraAvailable] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  // Parse aspect ratio
  const [aspectWidth, aspectHeight] = aspectRatio.split(':').map(Number);
  const aspectRatioValue = aspectWidth / aspectHeight;
  
  // Effect to initialize camera when component mounts
  useEffect(() => {
    if (isCameraActive) {
      initializeCamera();
    }
    
    // Clean up function
    return () => {
      // Stop the media stream when component unmounts
      stopMediaStream();
    };
  }, [isCameraActive, facingMode]);
  
  // Function to start the camera
  const initializeCamera = async () => {
    try {
      // Check if the browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support camera access');
      }
      
      // Stop any existing media stream
      stopMediaStream();
      
      // Get access to the camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          aspectRatio: aspectRatioValue
        },
        audio: false
      });
      
      // Store the stream in the ref
      mediaStreamRef.current = stream;
      
      // Set the video source
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraAvailable(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      let errorMessage = 'Could not access camera';
      
      // More specific error messages
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Camera access denied. Please allow camera access in your browser settings.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera found on your device.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera is in use by another application.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Camera constraints not satisfied. Try a different setting.';
        }
      }
      
      setError(errorMessage);
      setIsCameraAvailable(false);
    }
  };
  
  // Function to stop the media stream
  const stopMediaStream = () => {
    if (mediaStreamRef.current) {
      const tracks = mediaStreamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };
  
  // Function to capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video aspect ratio
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    // Calculate dimensions to maintain aspect ratio and max width
    let width = videoWidth;
    let height = videoHeight;
    
    if (width > maxWidth) {
      width = maxWidth;
      height = (width / videoWidth) * videoHeight;
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // Draw the current video frame to the canvas
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, width, height);
      
      // Convert canvas to data URL
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        setCapturedImage(dataUrl);
        
        // Convert data URL to File
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setCapturedFile(file);
          }
        }, 'image/jpeg', 0.92);
        
        // Stop the camera after capturing
        stopMediaStream();
      } catch (err) {
        console.error('Error creating data URL:', err);
        setError('Failed to capture photo. Please try again.');
      }
    }
  };
  
  // Function to handle file selection
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }
    
    const file = files[0];
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    
    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size too large (max 5MB)');
      return;
    }
    
    // Create file URL and preview
    const fileUrl = URL.createObjectURL(file);
    setCapturedImage(fileUrl);
    setCapturedFile(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Function to switch camera
  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };
  
  // Function to handle cancellation
  const handleCancel = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    stopMediaStream();
    setIsCameraActive(false);
    onCancel();
  };
  
  // Function to handle confirmation and upload
  const handleConfirm = async () => {
    if (!capturedImage || !capturedFile) {
      return;
    }
    
    try {
      setIsUploading(true);
      
      // Upload the photo to Firebase Storage
      const photoUrl = await uploadPhotoToStorage({
        file: capturedFile,
        childId,
        folder: 'observations',
        onProgress: (progress) => setUploadProgress(progress)
      });
      
      // Call the onCapture callback with the URL and file
      onCapture(photoUrl, capturedFile);
      
      // Reset state
      setCapturedImage(null);
      setCapturedFile(null);
      setIsUploading(false);
      
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError('Failed to upload photo. Please try again.');
      setIsUploading(false);
    }
  };
  
  // Function to toggle between camera and photo upload modes
  const toggleCameraMode = () => {
    if (isCameraActive) {
      stopMediaStream();
      setIsCameraActive(false);
    } else {
      setIsCameraActive(true);
    }
  };
  
  // Function to open file selector
  const openFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-medium">
          {capturedImage ? 'Review Photo' : (isCameraActive ? 'Take a Photo' : 'Add a Photo')}
        </h3>
        <button 
          onClick={handleCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="p-4">
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm mb-4">
            {error}
            <button 
              onClick={() => setError(null)}
              className="ml-2 text-red-700 hover:text-red-900"
            >
              <X className="h-4 w-4 inline" />
            </button>
          </div>
        )}
        
        {capturedImage ? (
          // Show captured image preview
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              <img 
                src={capturedImage} 
                alt="Captured" 
                className="max-w-full rounded-lg border border-gray-200"
                style={{ maxHeight: '60vh' }}
              />
              {isUploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 rounded-lg">
                  <Loader className="h-8 w-8 text-white animate-spin mb-2" />
                  <span className="text-white text-sm">{uploadProgress}%</span>
                </div>
              )}
            </div>
            
            {!isUploading && (
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setCapturedImage(null);
                    if (mode === 'camera') {
                      setIsCameraActive(true);
                    } else {
                      setIsCameraActive(false);
                    }
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg flex items-center hover:bg-gray-200"
                >
                  <RotateCw className="h-4 w-4 mr-2" />
                  Retake
                </button>
                
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg flex items-center hover:bg-emerald-600"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Use Photo
                </button>
              </div>
            )}
          </div>
        ) : isCameraActive ? (
          // Show camera view
          <div className="flex flex-col items-center">
            {!isCameraAvailable && !error ? (
              <div className="h-60 w-full flex items-center justify-center bg-gray-100 rounded-lg">
                <Loader className="h-8 w-8 text-gray-400 animate-spin" />
                <span className="ml-2 text-gray-500">Initializing camera...</span>
              </div>
            ) : (
              <>
                <div className="relative w-full mb-4 bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full"
                    style={{ 
                      aspectRatio: aspectRatio.replace(':', '/'),
                      display: isCameraAvailable ? 'block' : 'none' 
                    }}
                  />
                  
                  {/* Canvas for capturing photos - hidden */}
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                </div>
                
                <div className="flex space-x-4">
                  <button
                    onClick={capturePhoto}
                    className="px-6 py-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 flex items-center justify-center"
                    disabled={!isCameraAvailable}
                  >
                    <Camera className="h-5 w-5 mr-2" />
                    Capture
                  </button>
                  
                  <button
                    onClick={switchCamera}
                    className="p-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                    title="Switch camera"
                    disabled={!isCameraAvailable}
                  >
                    <RotateCw className="h-5 w-5" />
                  </button>
                </div>
              </>
            )}
            
            {mode === 'both' && (
              <div className="mt-4 text-center">
                <button
                  onClick={toggleCameraMode}
                  className="text-sm text-emerald-600 hover:text-emerald-700 underline"
                >
                  Or upload a photo instead
                </button>
              </div>
            )}
          </div>
        ) : (
          // Show photo upload option
          <div className="flex flex-col items-center">
            <div 
              className="h-60 w-full flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg mb-4 cursor-pointer hover:bg-gray-100"
              onClick={openFileSelector}
            >
              <Image className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-gray-500 text-center mb-1">Click to select a photo</p>
              <p className="text-gray-400 text-sm text-center">or drag and drop</p>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelection}
              className="hidden"
            />
            
            {mode === 'both' && (
              <div className="mt-2 text-center">
                <button
                  onClick={toggleCameraMode}
                  className="text-sm text-emerald-600 hover:text-emerald-700 underline"
                >
                  Or use camera instead
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;