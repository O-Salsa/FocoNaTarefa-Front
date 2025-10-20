import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080',
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    console.log(
      '[API ERROR]',
      error?.config?.method?.toUpperCase(),
      error?.config?.url,
      '→',
      error?.response?.status,
      error?.response?.data
    );
    return Promise.reject(error);
  }
);


export default api;
