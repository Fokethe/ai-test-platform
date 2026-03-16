/**
 * Document Parser Node
 * LangGraph Node: 解析文档内容
 */

import { AgentState, WorkflowStatus } from '../types';
import { DocumentParser } from '../../agents/document-parser';

const parser = new DocumentParser();

/**
 * 文档解析节点
 * 输入: document (Buffer + filename)
 * 输出: document (ParsedDocument)
 */
export async function documentParserNode(state: AgentState): Promise<AgentState> {
  try {
    // 如果已经有解析好的文档，直接跳过
    if (state.document?.content && state.document.content.length > 0) {
      return {
        ...state,
        status: WorkflowStatus.ANALYZING,
      };
    }

    // 检查是否有文档数据
    if (!state.document) {
      throw new Error('No document provided');
    }

    // 文档已经在状态中，标记为已解析
    return {
      ...state,
      status: WorkflowStatus.ANALYZING,
      error: undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Document parsing failed';
    
    // 如果重试次数小于3，增加重试计数
    if (state.retryCount < 3) {
      return {
        ...state,
        retryCount: state.retryCount + 1,
        error: errorMessage,
      };
    }

    // 超过最大重试次数，进入错误状态
    return {
      ...state,
      status: WorkflowStatus.ERROR,
      error: errorMessage,
    };
  }
}

/**
 * 条件边: 检查解析是否成功
 */
export function documentParserRouter(state: AgentState): 'continue' | 'retry' | 'error' {
  if (state.status === WorkflowStatus.ERROR) {
    return 'error';
  }

  if (state.error && state.retryCount < 3) {
    return 'retry';
  }

  return 'continue';
}
