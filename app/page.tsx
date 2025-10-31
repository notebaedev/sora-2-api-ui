'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getApiUrl } from '@/lib/api';
import { Video, Trash2, Download, Image as ImageIcon, Loader2, Play, Eye, DollarSign, Sparkles, X } from 'lucide-react';

interface VideoJob {
  id: string;
  status: string;
  progress?: number;
  model: string;
  size: string;
  seconds: string;
  prompt: string;
  created_at: number;
  thumbnailUrl?: string;
  videoUrl?: string;
  error?: string;
  cost?: number;
  remixOf?: string;
}

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('sora-2');
  const [size, setSize] = useState('1280x720');
  const [seconds, setSeconds] = useState('8');
  const [inputImage, setInputImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videos, setVideos] = useState<VideoJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [totalSessionCost, setTotalSessionCost] = useState(0);
  const [remixingVideoId, setRemixingVideoId] = useState<string | null>(null);
  const [remixPrompt, setRemixPrompt] = useState('');

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('soraApiKey');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('soraApiKey', apiKey);
    }
  }, [apiKey]);

  // Calculate video cost based on model, size, and duration
  const calculateCost = (model: string, size: string, seconds: string): number => {
    const duration = parseInt(seconds);
    const width = parseInt(size.split('x')[0]);
    const height = parseInt(size.split('x')[1]);
    
    // Determine if it's a high resolution (1024+ or 1792+)
    const isHighRes = width >= 1024 || height >= 1024;
    
    let pricePerSecond = 0;
    
    if (model === 'sora-2') {
      pricePerSecond = 0.10; // $0.10/second for standard resolutions
    } else if (model === 'sora-2-pro') {
      if (isHighRes) {
        pricePerSecond = 0.50; // $0.50/second for high res
      } else {
        pricePerSecond = 0.30; // $0.30/second for standard res
      }
    }
    
    return pricePerSecond * duration;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInputImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setInputImage(null);
    setImagePreview(null);
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      setError('Please enter your OpenAI API key');
      return;
    }

    if (!prompt) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('apiKey', apiKey);
      formData.append('prompt', prompt);
      formData.append('model', model);
      formData.append('size', size);
      formData.append('seconds', seconds);

      if (inputImage) {
        formData.append('inputReference', inputImage);
      }

      const response = await fetch(getApiUrl('/videos/create'), {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create video');
      }

      // Calculate cost for this video
      const videoCost = calculateCost(model, size, seconds);
      
      const newVideo: VideoJob = {
        ...data,
        prompt,
        cost: videoCost,
      };

      setVideos([newVideo, ...videos]);
      setTotalSessionCost(prev => prev + videoCost);
      pollVideoStatus(newVideo.id);

      // Clear form
      setPrompt('');
      setInputImage(null);
      setImagePreview(null);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const pollVideoStatus = async (videoId: string) => {
    const maxAttempts = 300; // 10 minutes with 2-second intervals
    let attempts = 0;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5;

    const poll = async () => {
      try {
        const response = await fetch(getApiUrl('/videos/status'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey, videoId }),
        });

        const data = await response.json();

        // If we got a response, reset error counter
        if (response.ok) {
          consecutiveErrors = 0;
        }

        // Handle retriable errors (5xx server errors)
        if (!response.ok && data.retriable) {
          console.warn('Retriable error, continuing to poll:', data.error);
          consecutiveErrors++;
          
          if (consecutiveErrors >= maxConsecutiveErrors) {
            console.error('Too many consecutive errors, stopping polling');
            setVideos((prevVideos) =>
              prevVideos.map((v) =>
                v.id === videoId ? { ...v, status: 'failed', error: 'Too many errors, please try again' } : v
              )
            );
            return;
          }
          
          // Wait longer after errors (exponential backoff)
          const delay = Math.min(2000 * Math.pow(1.5, consecutiveErrors), 10000);
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, delay);
          }
          return;
        }

        // Handle non-retriable errors
        if (!response.ok) {
          console.error('Non-retriable error:', data.error);
          setVideos((prevVideos) =>
            prevVideos.map((v) =>
              v.id === videoId ? { ...v, status: 'failed', error: data.error } : v
            )
          );
          return;
        }

        // Update video with new data
        setVideos((prevVideos) =>
          prevVideos.map((v) =>
            v.id === videoId ? { ...v, ...data } : v
          )
        );

        if (data.status === 'completed') {
          // Download thumbnail
          downloadThumbnail(videoId);
        } else if (data.status === 'failed') {
          console.error('Video generation failed');
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 2000);
        } else {
          console.warn('Max polling attempts reached');
          setVideos((prevVideos) =>
            prevVideos.map((v) =>
              v.id === videoId ? { ...v, status: 'failed', error: 'Polling timeout' } : v
            )
          );
        }
      } catch (err: any) {
        console.error('Error polling video status:', err);
        consecutiveErrors++;
        
        // Continue polling even after errors, unless too many consecutive errors
        if (consecutiveErrors < maxConsecutiveErrors && attempts < maxAttempts) {
          attempts++;
          const delay = Math.min(2000 * Math.pow(1.5, consecutiveErrors), 10000);
          setTimeout(poll, delay);
        } else {
          setVideos((prevVideos) =>
            prevVideos.map((v) =>
              v.id === videoId ? { ...v, status: 'failed', error: 'Polling stopped due to errors' } : v
            )
          );
        }
      }
    };

    poll();
  };

  const downloadThumbnail = async (videoId: string) => {
    try {
      const response = await fetch(getApiUrl('/videos/download'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, videoId, variant: 'thumbnail' }),
      });

      const data = await response.json();

      if (response.ok) {
        const thumbnailUrl = `data:${data.contentType};base64,${data.data}`;
        setVideos((prevVideos) =>
          prevVideos.map((v) =>
            v.id === videoId ? { ...v, thumbnailUrl } : v
          )
        );
      }
    } catch (err) {
      console.error('Error downloading thumbnail:', err);
    }
  };

  const downloadVideo = async (videoId: string, prompt: string) => {
    try {
      const response = await fetch(getApiUrl('/videos/download'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, videoId, variant: 'video' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to download video');
      }

      // Convert base64 to blob and download
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.contentType });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sora-${videoId.substring(0, 8)}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to download video');
    }
  };

  const viewVideo = async (videoId: string) => {
    try {
      const response = await fetch(getApiUrl('/videos/download'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, videoId, variant: 'video' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load video');
      }

      const videoUrl = `data:${data.contentType};base64,${data.data}`;
      setVideos((prevVideos) =>
        prevVideos.map((v) =>
          v.id === videoId ? { ...v, videoUrl } : v
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to load video');
    }
  };

  const deleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      const response = await fetch(getApiUrl('/videos/delete'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, videoId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete video');
      }

      // Subtract the video cost from session total before deleting
      const deletedVideo = videos.find(v => v.id === videoId);
      if (deletedVideo?.cost !== undefined) {
        setTotalSessionCost(prev => Math.max(0, prev - (deletedVideo.cost || 0)));
      }

      setVideos((prevVideos) => prevVideos.filter((v) => v.id !== videoId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete video');
    }
  };

  const handleRemix = async (videoId: string) => {
    if (!remixPrompt.trim()) {
      setError('Please enter a remix prompt describing the change you want to make');
      return;
    }

    try {
      const response = await fetch(getApiUrl('/videos/remix'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, videoId, prompt: remixPrompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remix video');
      }

      // Find the original video to get its properties
      const originalVideo = videos.find(v => v.id === videoId);
      
      // Calculate cost for the remix (same as original video)
      const remixCost = originalVideo?.cost || 0;

      const newVideo: VideoJob = {
        ...data,
        prompt: `Remix: ${remixPrompt}`,
        cost: remixCost,
        remixOf: videoId,
      };

      setVideos([newVideo, ...videos]);
      setTotalSessionCost(prev => prev + remixCost);
      pollVideoStatus(newVideo.id);

      // Close remix dialog
      setRemixingVideoId(null);
      setRemixPrompt('');
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to remix video');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'in_progress':
        return 'text-blue-400';
      case 'queued':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Video className="w-10 h-10 text-primary" />
              <h1 className="text-4xl font-bold text-white">Sora 2 API UI</h1>
            </div>
            <p className="text-gray-400">Generate stunning videos with OpenAI's Sora 2</p>
          </div>
          
          {/* Session Cost Display */}
          {totalSessionCost > 0 && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm">
              <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-gray-300">Session Total:</span>
                <span className="font-bold text-primary">${totalSessionCost.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
                <CardDescription>Set up your API key and generation parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">OpenAI API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Select id="model" value={model} onChange={(e) => setModel(e.target.value)}>
                    <option value="sora-2">sora-2 (Fast)</option>
                    <option value="sora-2-pro">sora-2-pro (High Quality)</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="size">Resolution</Label>
                  <Select id="size" value={size} onChange={(e) => setSize(e.target.value)}>
                    <option value="1280x720">1280x720 (HD)</option>
                    <option value="1920x1080">1920x1080 (Full HD)</option>
                    <option value="720x1280">720x1280 (Portrait)</option>
                    <option value="1080x1920">1080x1920 (Portrait HD)</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seconds">Duration</Label>
                  <Select id="seconds" value={seconds} onChange={(e) => setSeconds(e.target.value)}>
                    <option value="4">4 seconds</option>
                    <option value="8">8 seconds</option>
                    <option value="12">12 seconds</option>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generate Video</CardTitle>
                <CardDescription>Describe the video you want to create</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt">Prompt</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Wide shot of a child flying a red kite in a grassy park, golden hour sunlight, camera slowly pans upward."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Input Reference Image (Optional)</Label>
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Input reference"
                        className="w-full rounded-lg border"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-800/50">
                      <ImageIcon className="w-8 h-8 text-gray-500 mb-2" />
                      <span className="text-sm text-gray-400">Click to upload image</span>
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-950/50 border border-red-800 rounded-lg text-red-300 text-sm">
                    {error}
                  </div>
                )}

                {/* Cost Estimate */}
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Estimated Cost:</span>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <span className="font-bold text-primary">
                        ${calculateCost(model, size, seconds).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleGenerate}
                  disabled={isGenerating || !apiKey || !prompt}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4 mr-2" />
                      Generate Video
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Videos */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Generated Videos</CardTitle>
                <CardDescription>Your video generation history</CardDescription>
              </CardHeader>
              <CardContent>
                {videos.length === 0 ? (
                  <div className="text-center py-12">
                    <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No videos yet. Generate your first video!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {videos.map((video) => (
                      <Card key={video.id} className="overflow-hidden">
                        <div className="p-4">
                          <div className="flex gap-4">
                            {/* Thumbnail or video player */}
                            <div className="flex-shrink-0 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden">
                              {video.videoUrl ? (
                                <video
                                  src={video.videoUrl}
                                  controls
                                  className="w-full h-full object-cover"
                                />
                              ) : video.thumbnailUrl ? (
                                <img
                                  src={video.thumbnailUrl}
                                  alt="Video thumbnail"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  {video.status === 'in_progress' || video.status === 'queued' ? (
                                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                                  ) : (
                                    <Video className="w-8 h-8 text-gray-400" />
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Video info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 mb-2">
                                {video.remixOf && (
                                  <span className="flex-shrink-0 px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded text-purple-300 text-xs flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    Remix
                                  </span>
                                )}
                                <p className="text-sm text-gray-300 line-clamp-2">
                                  {video.prompt}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs text-gray-400 mb-2">
                                <span className="px-2 py-1 bg-gray-800 rounded">{video.model}</span>
                                <span className="px-2 py-1 bg-gray-800 rounded">{video.size}</span>
                                <span className="px-2 py-1 bg-gray-800 rounded">{video.seconds}s</span>
                                {video.cost && (
                                  <span className="px-2 py-1 bg-primary/20 border border-primary/30 rounded flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" />
                                    {video.cost.toFixed(2)}
                                  </span>
                                )}
                                <span className={`px-2 py-1 bg-gray-800 rounded font-medium ${getStatusColor(video.status)}`}>
                                  {video.status}
                                </span>
                              </div>

                              {/* Error message */}
                              {video.error && (
                                <div className="p-2 bg-red-950/50 border border-red-800 rounded text-red-300 text-xs mb-2">
                                  {video.error}
                                </div>
                              )}

                              {/* Progress bar */}
                              {(video.status === 'in_progress' || video.status === 'queued') && (
                                <div className="space-y-1">
                                  <Progress value={video.progress || 0} />
                                  <p className="text-xs text-gray-400">
                                    {video.progress || 0}% complete
                                  </p>
                                </div>
                              )}

                              {/* Remix UI */}
                              {remixingVideoId === video.id && (
                                <div className="mt-2 p-3 bg-primary/10 border border-primary/20 rounded-lg space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium flex items-center gap-1">
                                      <Sparkles className="w-4 h-4 text-primary" />
                                      Remix this video
                                    </Label>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setRemixingVideoId(null);
                                        setRemixPrompt('');
                                      }}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  <Textarea
                                    placeholder="Describe the change you want to make (e.g., 'Shift the color palette to teal, sand, and rust')"
                                    value={remixPrompt}
                                    onChange={(e) => setRemixPrompt(e.target.value)}
                                    rows={3}
                                    className="text-sm"
                                  />
                                  <Button
                                    size="sm"
                                    className="w-full"
                                    onClick={() => handleRemix(video.id)}
                                  >
                                    <Sparkles className="w-4 h-4 mr-1" />
                                    Create Remix
                                  </Button>
                                </div>
                              )}

                              {/* Action buttons */}
                              {video.status === 'completed' && (
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  {!video.videoUrl && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => viewVideo(video.id)}
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      View
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => downloadVideo(video.id, video.prompt)}
                                  >
                                    <Download className="w-4 h-4 mr-1" />
                                    Download
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setRemixingVideoId(video.id);
                                      setRemixPrompt('');
                                      setError(null);
                                    }}
                                    disabled={remixingVideoId === video.id}
                                  >
                                    <Sparkles className="w-4 h-4 mr-1" />
                                    Remix
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => deleteVideo(video.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
