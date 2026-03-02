// encoding: utf-8
/**
 * TDD Round 15 - UI 元素识别服务
 * 基于 Qwen-VL 视觉模型分析截图，识别 UI 元素
 */

import { callAI } from '../client'

export enum UIElementType {
  BUTTON = 'button',
  INPUT = 'input',
  DROPDOWN = 'dropdown',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  LINK = 'link',
  TEXT = 'text',
  IMAGE = 'image',
  CONTAINER = 'container',
  UNKNOWN = 'unknown',
}

export interface Position {
  x: number
  y: number
  width: number
  height: number
}

export interface UIElement {
  id: string
  type: UIElementType
  text?: string
  position: Position
  attributes?: Record<string, string>
  confidence: number
  children?: UIElement[]
}

export interface DetectOptions {
  minConfidence?: number
  includeAttributes?: boolean
  detectChildren?: boolean
}

export interface DetectionResult {
  elements: UIElement[]
  screenshotWidth: number
  screenshotHeight: number
  elementCount: number
}

/**
 * 构建视觉分析提示词
 */
function buildVisionPrompt(): string {
  return `分析这张 UI 截图，识别所有可交互的 UI 元素。

请返回 JSON 格式：
{
  "elements": [
    {
      "type": "button|input|dropdown|checkbox|radio|link|text|image|container",
      "text": "元素文本内容",
      "position": {
        "x": 左上角的 x 坐标,
        "y": 左上角的 y 坐标,
        "width": 宽度,
        "height": 高度
      },
      "attributes": {
        "id": "元素id",
        "class": "元素class",
        "placeholder": "占位文本",
        "src": "图片源地址"
      },
      "confidence": 0.95
    }
  ]
}

要求：
1. 只返回 JSON，不要其他说明文字
2. 坐标使用像素值
3. confidence 范围 0-1
4. 包含所有可见的可交互元素`;
}

/**
 * 解析 AI 返回的 JSON
 */
function parseAIResponse(response: string): UIElement[] {
  try {
    // 尝试提取 JSON 部分
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return [];
    }
    
    const data = JSON.parse(jsonMatch[0]);
    
    if (!data.elements || !Array.isArray(data.elements)) {
      return [];
    }
    
    return data.elements.map((el: any, index: number) => ({
      id: el.id || `el-${index}`,
      type: parseElementType(el.type),
      text: el.text || el.content || '',
      position: {
        x: el.position?.x || 0,
        y: el.position?.y || 0,
        width: el.position?.width || 0,
        height: el.position?.height || 0,
      },
      attributes: el.attributes || {},
      confidence: el.confidence || 0.5,
      children: el.children ? parseAIResponse(JSON.stringify({ elements: el.children })) : undefined,
    }));
  } catch (error) {
    console.error('解析 AI 响应失败:', error);
    return [];
  }
}

/**
 * 解析元素类型
 */
function parseElementType(type: string): UIElementType {
  const typeMap: Record<string, UIElementType> = {
    button: UIElementType.BUTTON,
    btn: UIElementType.BUTTON,
    input: UIElementType.INPUT,
    textbox: UIElementType.INPUT,
    dropdown: UIElementType.DROPDOWN,
    select: UIElementType.DROPDOWN,
    checkbox: UIElementType.CHECKBOX,
    radio: UIElementType.RADIO,
    link: UIElementType.LINK,
    a: UIElementType.LINK,
    text: UIElementType.TEXT,
    label: UIElementType.TEXT,
    image: UIElementType.IMAGE,
    img: UIElementType.IMAGE,
    container: UIElementType.CONTAINER,
    div: UIElementType.CONTAINER,
  };
  
  return typeMap[type?.toLowerCase()] || UIElementType.UNKNOWN;
}

/**
 * 检测 UI 元素
 */
export async function detectUIElements(
  screenshot: Buffer | string,
  options: DetectOptions = {}
): Promise<DetectionResult> {
  const { minConfidence = 0.5, includeAttributes = true, detectChildren = false } = options;
  
  // 调用 AI 进行视觉分析
  const prompt = buildVisionPrompt();
  
  try {
    // 注意：这里假设 callAI 支持图片输入
    // 实际实现可能需要根据你的 AI 客户端调整
    const response = await callAI({
      prompt,
      image: screenshot,
      model: 'qwen-vl', // 使用视觉模型
    });
    
    const elements = parseAIResponse(response);
    
    // 过滤低置信度的元素
    const filteredElements = elements.filter(
      (el) => el.confidence >= minConfidence
    );
    
    // 构建元素树
    const elementTree = detectChildren 
      ? buildElementTree(filteredElements)
      : filteredElements;
    
    return {
      elements: elementTree,
      screenshotWidth: 1920, // 默认值，实际应从截图获取
      screenshotHeight: 1080,
      elementCount: filteredElements.length,
    };
  } catch (error) {
    console.error('UI 元素检测失败:', error);
    throw new Error('UI 元素检测失败: ' + (error as Error).message);
  }
}

/**
 * 构建元素树
 * 根据位置关系推断父子关系
 */
function buildElementTree(elements: UIElement[]): UIElement[] {
  if (elements.length === 0) return [];
  
  // 按面积从大到小排序（容器通常更大）
  const sorted = [...elements].sort((a, b) => {
    const areaA = a.position.width * a.position.height;
    const areaB = b.position.width * b.position.height;
    return areaB - areaA;
  });
  
  const roots: UIElement[] = [];
  const assigned = new Set<string>();
  
  for (const element of sorted) {
    if (assigned.has(element.id)) continue;
    
    // 查找父元素
    const parent = sorted.find(
      (p) => 
        p.id !== element.id &&
        !assigned.has(p.id) &&
        contains(p.position, element.position)
    );
    
    if (parent) {
      if (!parent.children) parent.children = [];
      parent.children.push(element);
      assigned.add(element.id);
    } else {
      roots.push(element);
    }
  }
  
  return roots;
}

/**
 * 检查外层是否包含内层
 */
function contains(outer: Position, inner: Position): boolean {
  return (
    outer.x <= inner.x &&
    outer.y <= inner.y &&
    outer.x + outer.width >= inner.x + inner.width &&
    outer.y + outer.height >= inner.y + inner.height
  );
}

/**
 * 根据文本查找元素
 */
export function findElementByText(
  elements: UIElement[],
  text: string
): UIElement | undefined {
  const lowerText = text.toLowerCase();
  
  for (const el of elements) {
    if (el.text?.toLowerCase().includes(lowerText)) {
      return el;
    }
    
    if (el.children) {
      const found = findElementByText(el.children, text);
      if (found) return found;
    }
  }
  
  return undefined;
}

/**
 * 根据类型查找元素
 */
export function findElementsByType(
  elements: UIElement[],
  type: UIElementType
): UIElement[] {
  const results: UIElement[] = [];
  
  for (const el of elements) {
    if (el.type === type) {
      results.push(el);
    }
    
    if (el.children) {
      results.push(...findElementsByType(el.children, type));
    }
  }
  
  return results;
}

/**
 * 生成元素定位信息
 */
export function generateLocator(element: UIElement): string {
  // 优先级：data-testid > id > text > class > xpath
  if (element.attributes?.['data-testid']) {
    return `[data-testid="${element.attributes['data-testid']}"]`;
  }
  
  if (element.attributes?.['id']) {
    return `#${element.attributes['id']}`;
  }
  
  if (element.text) {
    return `text="${element.text}"`;
  }
  
  if (element.attributes?.['class']) {
    return `.${element.attributes['class'].split(' ')[0]}`;
  }
  
  // 使用坐标作为后备
  return `xpath=//${element.type}[position()]`;
}
