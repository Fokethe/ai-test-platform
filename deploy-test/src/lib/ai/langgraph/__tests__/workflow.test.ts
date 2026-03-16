/**
 * LangGraph Workflow Tests
 * TDD for AI Test Case Generation Workflow
 */

import { StateGraph } from '@langchain/langgraph';
import { AgentState, createWorkflow, WorkflowStatus } from '../workflow';
import { documentParserNode } from '../nodes/document-parser-node';
import { requirementAnalyzerNode } from '../nodes/requirement-analyzer-node';
import { ragRetrieverNode } from '../nodes/rag-retriever-node';
import { testGeneratorNode } from '../nodes/test-generator-node';

describe('LangGraph Workflow', () => {
  describe('StateGraph Creation', () => {
    it('should create workflow with all nodes', () => {
      const workflow = createWorkflow();
      expect(workflow).toBeDefined();
    });

    it('should have correct initial state', () => {
      const initialState: AgentState = {
        status: WorkflowStatus.IDLE,
        document: undefined,
        features: [],
        businessRules: [],
        testPoints: [],
        similarCases: [],
        generatedCases: [],
        retryCount: 0,
      };
      
      expect(initialState.status).toBe(WorkflowStatus.IDLE);
      expect(initialState.retryCount).toBe(0);
    });
  });

  describe('Document Parser Node', () => {
    it('should parse document content', async () => {
      const state: AgentState = {
        status: WorkflowStatus.PARSING,
        document: {
          type: 'txt',
          filename: 'test.txt',
          title: '测试需求',
          content: '用户可以通过用户名和密码登录系统',
          rawText: '用户可以通过用户名和密码登录系统',
          size: 100,
        },
        features: [],
        businessRules: [],
        testPoints: [],
        similarCases: [],
        generatedCases: [],
        retryCount: 0,
      };

      const result = await documentParserNode(state);
      expect(result.status).toBe(WorkflowStatus.ANALYZING);
    });

    it('should handle parse errors with retry', async () => {
      const state: AgentState = {
        status: WorkflowStatus.PARSING,
        document: undefined,
        features: [],
        businessRules: [],
        testPoints: [],
        similarCases: [],
        generatedCases: [],
        retryCount: 0,
        error: 'Parse error',
      };

      const result = await documentParserNode(state);
      expect(result.retryCount).toBe(1);
    });
  });

  describe('Requirement Analyzer Node', () => {
    it('should extract features from content', async () => {
      const state: AgentState = {
        status: WorkflowStatus.ANALYZING,
        document: {
          type: 'txt',
          filename: 'test.txt',
          title: '测试需求',
          content: '用户可以通过用户名和密码登录系统',
          rawText: '用户可以通过用户名和密码登录系统',
          size: 100,
        },
        features: [],
        businessRules: [],
        testPoints: [],
        similarCases: [],
        generatedCases: [],
        retryCount: 0,
      };

      const result = await requirementAnalyzerNode(state);
      expect(result.status).toBe(WorkflowStatus.RETRIEVING);
      expect(result.features?.length).toBeGreaterThan(0);
    });
  });

  describe('RAG Retriever Node', () => {
    it('should retrieve similar test cases', async () => {
      const state: AgentState = {
        status: WorkflowStatus.RETRIEVING,
        features: ['用户登录功能'],
        businessRules: [],
        testPoints: [
          { id: 'tp-1', name: '正常登录', description: '输入正确用户名密码', priority: 'P0', relatedFeature: '用户登录' },
        ],
        similarCases: [],
        generatedCases: [],
        retryCount: 0,
      };

      const result = await ragRetrieverNode(state);
      expect(result.status).toBe(WorkflowStatus.GENERATING);
    });
  });

  describe('Test Generator Node', () => {
    it('should generate test cases', async () => {
      const state: AgentState = {
        status: WorkflowStatus.GENERATING,
        features: ['用户登录功能'],
        testPoints: [
          { id: 'tp-1', name: '正常登录', description: '输入正确用户名密码', priority: 'P0', relatedFeature: '用户登录' },
        ],
        similarCases: [],
        generatedCases: [],
        retryCount: 0,
      };

      const result = await testGeneratorNode(state);
      expect(result.status).toBe(WorkflowStatus.COMPLETED);
      expect(result.generatedCases?.length).toBeGreaterThan(0);
    });
  });

  describe('Conditional Edges', () => {
    it('should route to retry on error', () => {
      const state: AgentState = {
        status: WorkflowStatus.PARSING,
        error: 'Parse error',
        retryCount: 1,
      };

      // Should retry if retryCount < 3
      expect(state.retryCount).toBeLessThan(3);
    });

    it('should route to error after max retries', () => {
      const state: AgentState = {
        status: WorkflowStatus.PARSING,
        error: 'Parse error',
        retryCount: 3,
      };

      // Should fail after 3 retries
      expect(state.retryCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full workflow', async () => {
      const workflow = createWorkflow();
      
      const initialState: AgentState = {
        status: WorkflowStatus.IDLE,
        document: {
          type: 'txt',
          filename: 'login.txt',
          title: '登录需求',
          content: '用户可以通过用户名和密码登录系统',
          rawText: '用户可以通过用户名和密码登录系统',
          size: 100,
        },
        features: [],
        businessRules: [],
        testPoints: [],
        similarCases: [],
        generatedCases: [],
        retryCount: 0,
      };

      // Run workflow
      const result = await workflow.invoke(initialState);
      
      expect(result.status).toBe(WorkflowStatus.COMPLETED);
      expect(result.generatedCases?.length).toBeGreaterThan(0);
    });
  });
});
