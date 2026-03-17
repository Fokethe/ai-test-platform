/**
 * MCP Tools 统一导出
 */

// 抽象基类
export { AbstractTool, AbstractFileTool } from './abstract-tool';
export type { ToolExecutionContext } from './abstract-tool';

// 文档解析工具
export { PDFParserTool } from './pdf-parser';
export type { PDFParserInput, PDFParserOutput } from './pdf-parser';
export { DOCXParserTool } from './docx-parser';
export type { DOCXParserInput, DOCXParserOutput } from './docx-parser';
export { OCRExtractorTool } from './ocr-extractor';
export type { OCRExtractorInput, OCRExtractorOutput } from './ocr-extractor';

// 测试技术工具
export { EquivalenceClassTool } from './equivalence-class';
export type { EquivalenceClassInput, EquivalenceClassOutput } from './equivalence-class';
export { BoundaryValueTool } from './boundary-value';
export type { BoundaryValueInput, BoundaryValueOutput } from './boundary-value';
export { ScenarioMethodTool } from './scenario-method';
export type { ScenarioMethodInput, ScenarioMethodOutput } from './scenario-method';
