import type {
  QuizSummary,
  QuizDetail,
  CreateQuizDto,
  UpdateQuizDto,
  QuestionDetail,
  CreateQuestionDto,
  UpdateQuestionDto,
  OptionDetail,
  CreateOptionDto,
  UpdateOptionDto,
  ApiErrorResponse,
} from "../types/api";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export class ApiClientError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toUserFriendlyMessage(): string {
    if (this.code === "NETWORK_ERROR" || this.status === 0) {
      return "Unable to connect to the Quizora server. Please ensure the backend is running and reachable.";
    }
    if (this.status === 401) {
      return "Unauthorized: Development user identity is missing or invalid. Please check VITE_DEV_USER_ID in client/.env.";
    }
    if (this.status === 403) {
      return "You do not have permission to view or modify this quiz resource.";
    }
    if (this.status === 404) {
      return "The requested quiz, question, or option was not found. It may have already been deleted.";
    }
    if (this.status === 409) {
      return (
        this.message ||
        "A conflict occurred. A question or option with this order may already exist."
      );
    }
    if (this.status === 400) {
      return (
        this.message ||
        "Invalid input data. Please check your form and try again."
      );
    }
    if (this.status >= 500) {
      return "An unexpected server error occurred. Please try again later.";
    }
    return this.message || "An unexpected error occurred.";
  }
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    return err.toUserFriendlyMessage();
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "An unexpected error occurred.";
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const devUserId = import.meta.env.VITE_DEV_USER_ID;

  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (devUserId) {
    headers.set("X-Dev-User-Id", devUserId);
  }

  const url = `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiClientError(
      0,
      "NETWORK_ERROR",
      "Unable to connect to the Quizora server. Please ensure the backend is running.",
    );
  }

  if (!response.ok) {
    let errorData: ApiErrorResponse | null = null;
    try {
      errorData = (await response.json()) as ApiErrorResponse;
    } catch {
      // Body not JSON
    }

    const code = errorData?.error?.code || "API_ERROR";
    const message =
      errorData?.error?.message ||
      `Request failed with status ${response.status} (${response.statusText})`;

    throw new ApiClientError(
      response.status,
      code,
      message,
      errorData?.error?.details,
    );
  }

  // 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

export const api = {
  getDevUserId(): string | undefined {
    return import.meta.env.VITE_DEV_USER_ID;
  },

  health: {
    check(): Promise<{ status: string; message: string; timestamp: string }> {
      return request("/health");
    },
  },

  quizzes: {
    list(): Promise<QuizSummary[]> {
      return request("/quizzes");
    },

    get(id: string): Promise<QuizDetail> {
      return request(`/quizzes/${id}`);
    },

    create(dto: CreateQuizDto): Promise<QuizSummary> {
      return request("/quizzes", {
        method: "POST",
        body: JSON.stringify(dto),
      });
    },

    update(id: string, dto: UpdateQuizDto): Promise<QuizSummary> {
      return request(`/quizzes/${id}`, {
        method: "PUT",
        body: JSON.stringify(dto),
      });
    },

    delete(id: string): Promise<{ message: string }> {
      return request(`/quizzes/${id}`, {
        method: "DELETE",
      });
    },
  },

  questions: {
    create(quizId: string, dto: CreateQuestionDto): Promise<QuestionDetail> {
      return request(`/quizzes/${quizId}/questions`, {
        method: "POST",
        body: JSON.stringify(dto),
      });
    },

    update(id: string, dto: UpdateQuestionDto): Promise<QuestionDetail> {
      return request(`/questions/${id}`, {
        method: "PUT",
        body: JSON.stringify(dto),
      });
    },

    delete(id: string): Promise<{ message: string }> {
      return request(`/questions/${id}`, {
        method: "DELETE",
      });
    },
  },

  options: {
    create(questionId: string, dto: CreateOptionDto): Promise<OptionDetail> {
      return request(`/questions/${questionId}/options`, {
        method: "POST",
        body: JSON.stringify(dto),
      });
    },

    update(id: string, dto: UpdateOptionDto): Promise<OptionDetail> {
      return request(`/options/${id}`, {
        method: "PUT",
        body: JSON.stringify(dto),
      });
    },

    delete(id: string): Promise<{ message: string }> {
      return request(`/options/${id}`, {
        method: "DELETE",
      });
    },
  },
};
