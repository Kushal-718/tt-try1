import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, X, Download, Info, Settings } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onGenerationStart: (sessionId: string) => void;
  disabled?: boolean;
}

export function FileUpload({ onGenerationStart, disabled }: FileUploadProps) {
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [configFile, setConfigFile] = useState<File | null>(null);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async (files: { dataset: File; config: File }) => {
      const formData = new FormData();
      formData.append("dataset", files.dataset);
      formData.append("config", files.config);

      const response = await fetch("/api/schedule", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate timetable");
      }

      return response.json();
    },
    onSuccess: (data) => {
      onGenerationStart(data.sessionId);
      toast({
        title: "Processing Started",
        description: "Your timetable is being generated. Please wait...",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onDatasetDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setDatasetFile(acceptedFiles[0]);
    }
  }, []);

  const onConfigDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setConfigFile(acceptedFiles[0]);
    }
  }, []);

  const datasetDropzone = useDropzone({
    onDrop: onDatasetDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
    disabled,
  });

  const configDropzone = useDropzone({
    onDrop: onConfigDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
    disabled,
  });

  const handleGenerate = () => {
    if (datasetFile && configFile) {
      generateMutation.mutate({ dataset: datasetFile, config: configFile });
    }
  };

  const downloadExample = async (type: "dataset" | "config") => {
    try {
      const response = await fetch(`/api/examples/${type}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `example_${type}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not download example file",
        variant: "destructive",
      });
    }
  };

  const canGenerate = datasetFile && configFile && !disabled;

  return (
    <div className="mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Upload Schedule Files</h2>
            <p className="text-sm text-gray-600">Upload your dataset and configuration CSV files to generate the timetable</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Dataset Upload */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Dataset File (.csv)</label>
              <div
                {...datasetDropzone.getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  datasetDropzone.isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-gray-300 hover:border-primary/50"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <input {...datasetDropzone.getInputProps()} />
                <div className="flex flex-col items-center">
                  <Upload className="text-gray-400 w-8 h-8 mb-3" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drop your dataset.csv here or <span className="text-primary font-medium">browse</span>
                  </p>
                  <p className="text-xs text-gray-400">Contains subjects, credits, teachers, etc.</p>
                </div>
              </div>
              
              {datasetFile && (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="text-green-500 w-4 h-4" />
                    <span className="text-sm font-medium text-green-800">{datasetFile.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDatasetFile(null)}
                    className="text-green-600 hover:text-green-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Config Upload */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Configuration File (.csv)</label>
              <div
                {...configDropzone.getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  configDropzone.isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-gray-300 hover:border-primary/50"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <input {...configDropzone.getInputProps()} />
                <div className="flex flex-col items-center">
                  <Settings className="text-gray-400 w-8 h-8 mb-3" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drop your config.csv here or <span className="text-primary font-medium">browse</span>
                  </p>
                  <p className="text-xs text-gray-400">Contains rooms and resource configuration</p>
                </div>
              </div>
              
              {configFile && (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="text-green-500 w-4 h-4" />
                    <span className="text-sm font-medium text-green-800">{configFile.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfigFile(null)}
                    className="text-green-600 hover:text-green-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Example Files Section */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <Info className="text-blue-500 w-5 h-5 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-800 mb-2">Need example files?</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadExample("dataset")}
                    className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Sample Dataset
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadExample("config")}
                    className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Sample Config
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate || generateMutation.isPending}
              className="flex items-center space-x-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L13.5 8.5L20 7L15 12L20 17L13.5 15.5L12 22L10.5 15.5L4 17L9 12L4 7L10.5 8.5L12 2Z" fill="currentColor"/>
              </svg>
              <span>{generateMutation.isPending ? "Generating..." : "Generate Timetable"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
