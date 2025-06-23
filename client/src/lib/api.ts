export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
  options?: RequestInit
): Promise<Response> {
  const config: RequestInit = {
    method,
    headers: {
      ...(data && !(data instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
    body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
    credentials: "include",
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response;
}

export async function uploadFiles(dataset: File, config: File): Promise<{ sessionId: string; status: string }> {
  const formData = new FormData();
  formData.append("dataset", dataset);
  formData.append("config", config);

  const response = await apiRequest("POST", "/api/schedule", formData);
  return response.json();
}

export async function getSessionStatus(sessionId: string): Promise<any> {
  const response = await apiRequest("GET", `/api/schedule/${sessionId}`);
  return response.json();
}

export async function downloadExample(type: "dataset" | "config"): Promise<Blob> {
  const response = await apiRequest("GET", `/api/examples/${type}`);
  return response.blob();
}
