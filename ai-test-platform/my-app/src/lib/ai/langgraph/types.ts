/**
 * LangGraph Types
 * 工作流类型定义
 */

// 文档类型
export interface ParsedDocument {
  type: 'txt' | 'md' | 'pdf' | 'docx';
  filename: string;
  title: string;
  content: string;
  rawText: string;
  size: number;
}

// 业务规则
export interface BusinessRule {
  type: 'length' | 'time' | 'limit' | 'range' | 'format' | 'other';
  description: string;
  value?: string;
}

// 测试点
export interface TestPoint {
  id: string;
  name: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  relatedFeature: string;
}

// 生成的测试用例
export interface GeneratedTestCase {
  id: string;
  title: string;
  precondition: string;
  steps: string[];
  expectedResult: string;
  priority: string;
  testPointId: string;
  relatedFeature: string;
}

// 相似用例检索结果
export interface RetrievalResult {
  testCase: GeneratedTestCase;
  similarity: number;
}

// 工作流状态枚举
export enum WorkflowStatus {
  IDLE = 'idle',
  PARSING = 'parsing',
  ANALYZING = 'analyzing',
  DECOMPOSING = 'decomposing',
  RETRIEVING = 'retrieving',
  GENERATING = 'generating',
  REVIEWING = 'reviewing',
  COMPLETED = 'completed',
  ERROR = 'error',
}

// Agent 状态
export interface AgentState {
  // 输入
  document?: ParsedDocument;
  requirementText?: string;
  
  // 中间状态
  features?: string[];
  businessRules?: BusinessRule[];
  testPoints?: TestPoint[];
  similarCases?: RetrievalResult[];
  generatedCases?: GeneratedTestCase[];
  reviewedCases?: GeneratedTestCase[];
  
  // 控制
  status: WorkflowStatus;
  error?: string;
  retryCount: number;
  
  // 审核相关
  reviewDecision?: 'approve' | 'regenerate' | 'edit';
  reviewComments?: string;
}

// 工作流配置
export interface WorkflowConfig {
  maxRetries: number;
  enableRAG: boolean;
  enableReview: boolean;
  ragOptions?: {
    maxResults: number;
    minSimilarity: number;
  };
}

// 工作流事件
export interface WorkflowEvent {
  type: 'node_start' | 'node_end' | 'error' | 'review_required' | 'completed';
  node?: string;
  state: AgentState;
  timestamp: number;
}

// 工作流回调
export interface WorkflowCallbacks {
  onNodeStart?: (node: string, state: AgentState) => void;
  onNodeEnd?: (node: string, state: AgentState) => void;
  onError?: (error: string, state: AgentState) => void;
  onReviewRequired?: (state: AgentState) => void;
  onCompleted?: (state: AgentState) => void;
}
