import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import ApiService, { DetectionOptions } from '../../services/api';
import { ProcessedItem } from './types';

type SliderEvent = Event;

export type DropzoneBindings = {
  getRootProps: ReturnType<typeof useDropzone>['getRootProps'];
  getInputProps: ReturnType<typeof useDropzone>['getInputProps'];
  isDragActive: boolean;
};

type UploadProcessingState = {
  files: File[];
  results: ProcessedItem[];
  processing: boolean;
  error: string | null;
  uploadProgress: number;
  blurFaces: boolean;
  blurPlates: boolean;
  minKernel: number;
  maxKernel: number;
  focusExponent: number;
  baseWeight: number;
  hasCustomSettings: boolean;
  dropzone: DropzoneBindings;
};

type UploadProcessingActions = {
  setBlurFaces: (value: boolean) => void;
  setBlurPlates: (value: boolean) => void;
  handleMinKernelChange: (_: SliderEvent, value: number | number[]) => void;
  handleMaxKernelChange: (_: SliderEvent, value: number | number[]) => void;
  handleFocusExponentChange: (_: SliderEvent, value: number | number[]) => void;
  handleBaseWeightChange: (_: SliderEvent, value: number | number[]) => void;
  resetParameters: () => void;
  processFiles: () => Promise<void>;
  removeFile: (index: number) => void;
  reprocessImage: (index: number) => Promise<void>;
  downloadResult: (filename: string, cacheBust?: number) => void;
};

export type UploadProcessingHook = UploadProcessingState & UploadProcessingActions;

const DEFAULT_MIN_KERNEL = 9;
const DEFAULT_MAX_KERNEL = 45;
const DEFAULT_FOCUS_EXPONENT = 2.5;
const DEFAULT_BASE_WEIGHT = 0.35;

const ensureOdd = (value: number) => {
  const rounded = Math.round(value);
  return rounded % 2 === 0 ? rounded + 1 : rounded;
};

const extractSliderValue = (value: number | number[]) => (Array.isArray(value) ? value[0] : value);

const buildDownloadUrl = (filename: string, cacheBust?: number) =>
  ApiService.getDownloadUrl(filename, cacheBust);

export const useUploadProcessing = (): UploadProcessingHook => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ProcessedItem[]>([]);
  const [blurFaces, setBlurFaces] = useState(true);
  const [blurPlates, setBlurPlates] = useState(true);
  const [minKernel, setMinKernel] = useState(DEFAULT_MIN_KERNEL);
  const [maxKernel, setMaxKernel] = useState(DEFAULT_MAX_KERNEL);
  const [focusExponent, setFocusExponent] = useState(DEFAULT_FOCUS_EXPONENT);
  const [baseWeight, setBaseWeight] = useState(DEFAULT_BASE_WEIGHT);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const previewUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];
    };
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    setError(null);
  }, []);

  const dropzone = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.bmp', '.tiff', '.webp'] },
    maxSize: 10 * 1024 * 1024,
    onDropRejected: (rejectedFiles) => {
      const errors = rejectedFiles.map(file => file.errors.map(err => err.message).join(', '));
      setError(`Some files were rejected: ${errors.join('; ')}`);
    },
  });

  const handleMinKernelChange = (_: SliderEvent, value: number | number[]) => {
    const newValue = ensureOdd(extractSliderValue(value));
    setMinKernel(newValue);
    setMaxKernel(prev => (prev < newValue ? newValue : ensureOdd(prev)));
  };

  const handleMaxKernelChange = (_: SliderEvent, value: number | number[]) => {
    const newValue = ensureOdd(extractSliderValue(value));
    setMaxKernel(newValue < minKernel ? minKernel : newValue);
  };

  const handleFocusExponentChange = (_: SliderEvent, value: number | number[]) => {
    const newValue = extractSliderValue(value);
    setFocusExponent(Number(newValue.toFixed(2)));
  };

  const handleBaseWeightChange = (_: SliderEvent, value: number | number[]) => {
    const newValue = extractSliderValue(value);
    setBaseWeight(Number(newValue.toFixed(2)));
  };

  const hasCustomSettings = useMemo(() => (
    minKernel !== DEFAULT_MIN_KERNEL ||
    maxKernel !== DEFAULT_MAX_KERNEL ||
    Number(focusExponent.toFixed(2)) !== Number(DEFAULT_FOCUS_EXPONENT.toFixed(2)) ||
    Number(baseWeight.toFixed(2)) !== Number(DEFAULT_BASE_WEIGHT.toFixed(2))
  ), [minKernel, maxKernel, focusExponent, baseWeight]);

  const resetParameters = () => {
    setMinKernel(DEFAULT_MIN_KERNEL);
    setMaxKernel(DEFAULT_MAX_KERNEL);
    setFocusExponent(DEFAULT_FOCUS_EXPONENT);
    setBaseWeight(DEFAULT_BASE_WEIGHT);
  };

  const buildRequestOptions = (): DetectionOptions => {
    const sanitizedMin = ensureOdd(minKernel);
    const sanitizedMax = Math.max(ensureOdd(maxKernel), sanitizedMin);
    const sanitizedFocus = Number(focusExponent.toFixed(2));
    const sanitizedBaseWeight = Number(baseWeight.toFixed(2));

    return {
      blurFaces,
      blurPlates,
      minKernel: sanitizedMin,
      maxKernel: sanitizedMax,
      focusExponent: sanitizedFocus,
      baseWeight: sanitizedBaseWeight,
    };
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const reprocessImage = async (index: number) => {
    const item = results[index];
    if (!item) {
      return;
    }

    const requestOptions = buildRequestOptions();
    setError(null);
    setResults(prev => prev.map((entry, idx) => (
      idx === index ? { ...entry, isReprocessing: true } : entry
    )));

    try {
      const updatedResult = await ApiService.detectSensitiveData(item.originalFile, requestOptions);
      const cacheBust = Date.now();
      setResults(prev => prev.map((entry, idx) => (
        idx === index
          ? { ...entry, result: updatedResult, parameters: requestOptions, isReprocessing: false, cacheBust }
          : entry
      )));
    } catch (err: any) {
      setError(`Failed to reprocess ${item.originalFile.name}: ${err.response?.data?.detail || err.message}`);
      setResults(prev => prev.map((entry, idx) => (
        idx === index ? { ...entry, isReprocessing: false } : entry
      )));
    }
  };

  const processFiles = async () => {
    if (files.length === 0) {
      setError('Please select at least one file to process');
      return;
    }

    setProcessing(true);
    setError(null);
    setUploadProgress(0);

    const requestOptions = buildRequestOptions();
    const pendingResults: ProcessedItem[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const previewUrl = URL.createObjectURL(file);
          previewUrlsRef.current.push(previewUrl);

          const result = await ApiService.detectSensitiveData(file, requestOptions);
          const processedItem: ProcessedItem = {
            id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
            originalFile: file,
            originalPreviewUrl: previewUrl,
            parameters: { ...requestOptions },
            result,
            isReprocessing: false,
            cacheBust: Date.now(),
          };
          pendingResults.push(processedItem);
          setUploadProgress(((i + 1) / files.length) * 100);
        } catch (err: any) {
          setError(`Failed to process ${file.name}: ${err.response?.data?.detail || err.message}`);
          break;
        }
      }

      if (pendingResults.length > 0) {
        setResults(prev => [...pendingResults, ...prev]);
      }
      setFiles([]);
    } catch (err: any) {
      setError(`Processing failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const downloadResult = (filename: string, cacheBust?: number) => {
    const url = buildDownloadUrl(filename, cacheBust);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    files,
    results,
    processing,
    error,
    uploadProgress,
    blurFaces,
    blurPlates,
    minKernel,
    maxKernel,
    focusExponent,
    baseWeight,
    hasCustomSettings,
    dropzone: {
      getRootProps: dropzone.getRootProps,
      getInputProps: dropzone.getInputProps,
      isDragActive: dropzone.isDragActive,
    },
    setBlurFaces,
    setBlurPlates,
    handleMinKernelChange,
    handleMaxKernelChange,
    handleFocusExponentChange,
    handleBaseWeightChange,
    resetParameters,
    processFiles,
    removeFile,
    reprocessImage,
    downloadResult,
  };
};
