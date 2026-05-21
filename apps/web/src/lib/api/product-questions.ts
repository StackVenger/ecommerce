import { apiClient } from './client';

export interface ProductQuestion {
  id: string;
  productId: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; firstName: string; lastName: string } | null;
  answerer: { id: string; firstName: string; lastName: string } | null;
}

export interface ProductQuestionList {
  questions: ProductQuestion[];
  pagination: { total: number; page: number; limit: number; pages: number };
  answeredCount: number;
}

export async function fetchProductQuestions(
  productId: string,
  params: { page?: number; limit?: number } = {},
): Promise<ProductQuestionList> {
  const search = new URLSearchParams();
  if (params.page) {
    search.set('page', String(params.page));
  }
  if (params.limit) {
    search.set('limit', String(params.limit));
  }
  const qs = search.toString();
  const { data } = await apiClient.get(
    `/product-questions/product/${productId}${qs ? `?${qs}` : ''}`,
  );
  return data.data;
}

export async function askProductQuestion(
  productId: string,
  question: string,
): Promise<ProductQuestion> {
  const { data } = await apiClient.post('/product-questions', { productId, question });
  return data.data;
}
