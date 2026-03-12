/** API Response Cache */  
  
interface CacheEntry<T> {  
  data: T;  
  expiry: number;  
  createdAt: number;  
  accessCount: number;  
} 
