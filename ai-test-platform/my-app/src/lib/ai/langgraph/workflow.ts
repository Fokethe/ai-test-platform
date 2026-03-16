/**
 * LangGraph Workflow
 * AI测试用例生成工作流编排
 */

import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { AgentState, WorkflowStatus, WorkflowConfig } from './types';
import {
  documentParserNode,
  documentParserRouter,
  requirementAnalyzerNode,
  ragRetrieverNode,
  testGeneratorNode,
} from './nodes';

// 默认配置
const DEFAULT_CONFIG: WorkflowConfig = {
  maxRetries: 3,
  enableRAG: true,
  enableReview: false,
  ragOptions: {
    maxResults: 3,
    minSimilarity: 0.5,
  },
};

// 定义状态注解 - 使用LangGraph推荐的Annotation方式
const AgentStateAnnotation = Annotation.Root({
  document: Annotation<any>,
  requirementText: Annotation<string | undefined>,
  features: Annotation<string[]>,
  businessRules: Annotation<any[]>,
  testPoints: Annotation<any[]>,
  similarCases: Annotation<any[]>,
  generatedCases: Annotation<any[]>,
  reviewedCases: Annotation<any[]>,
  status: Annotation<WorkflowStatus>,
  error: Annotation<string | undefined>,
  retryCount: Annotation<number>,
  reviewDecision: Annotation<string | undefined>,
  reviewComments: Annotation<string | undefined>,
});

/**
 * 创建工作流
 */
export function createWorkflow(config: Partial<WorkflowConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // 创建工作流图 - 使用Annotation定义状态
  const workflow = new StateGraph(AgentStateAnnotation);

  // 添加节点
  workflow
    .addNode('document_parser', documentParserNode)
    .addNode('requirement_analyzer', requirementAnalyzerNode)
    .addNode('rag_retriever', ragRetrieverNode)
    .addNode('test_generator', testGeneratorNode);

  // 添加边
  workflow
    // 开始 -> 文档解析
    .addEdge(START, 'document_parser')
    
    // 文档解析 -> 需求分析
    .addEdge('document_parser', 'requirement_analyzer')
    
    // 需求分析 -> RAG检索
    .addEdge('requirement_analyzer', 'rag_retriever')
    
    // RAG检索 -> 测试生成
    .addEdge('rag_retriever', 'test_generator')
    
    // 测试生成 -> 结束
    .addEdge('test_generator', END);

  // 编译工作流
  return workflow.compile();
}

/**
 * 带条件边的高级工作流（支持重试）
 */
export function createAdvancedWorkflow(config: Partial<WorkflowConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // 使用Annotation定义状态
  const workflow = new StateGraph(AgentStateAnnotation);

  // 添加节点
  workflow
    .addNode('document_parser', documentParserNode)
    .addNode('requirement_analyzer', requirementAnalyzerNode)
    .addNode('rag_retriever', ragRetrieverNode)
    .addNode('test_generator', testGeneratorNode);

  // 开始 -> 文档解析
  workflow.addEdge(START, 'document_parser');

  // 文档解析 -> 条件路由
  workflow.addConditionalEdges(
    'document_parser',
    (state) => {
      const route = documentParserRouter(state);
      if (route === 'error') return END;
      if (route === 'retry') return 'document_parser';
      return 'requirement_analyzer';
    },
    {
      document_parser: 'document_parser',
      requirement_analyzer: 'requirement_analyzer',
      [END]: END,
    }
  );

  // 需求分析 -> RAG检索
  workflow.addEdge('requirement_analyzer', 'rag_retriever');

  // RAG检索 -> 测试生成
  workflow.addEdge('rag_retriever', 'test_generator');

  // 测试生成 -> 结束
  workflow.addEdge('test_generator', END);

  return workflow.compile();
}

// 导出类型
export { AgentState, WorkflowStatus };
export * from './types';
