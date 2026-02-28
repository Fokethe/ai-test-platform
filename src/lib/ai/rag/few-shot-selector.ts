export type SelectionStrategy = 'similarity' | 'diversity' | 'coverage' | 'combined';

export interface TestCase {
  id: string;
  description: string;
  category: string;
  priority?: string;
  content?: string;
}

export interface FewShotConfig {
  maxExamples: number;
  diversityThreshold?: number;
  strategy?: SelectionStrategy;
  minSimilarity?: number;
}

export interface SelectedExample {
  testCase: TestCase;
  similarity: number;
  reason: string;
}

export interface SimilarityResult {
  testCase: TestCase;
  similarity: number;
}

export interface SelectionResult {
  query: string;
  examples: SelectedExample[];
  strategy: SelectionStrategy;
  totalAvailable: number;
  coverage: number;
  diversity: number;
}

export class SemanticRetriever {
  async findSimilar(query: string, options?: any): Promise<SimilarityResult[]> {
    return [];
  }
  
  calculateSimilarity(a: TestCase, b: TestCase): number {
    return 0;
  }
}

export class FewShotSelector {
  private retriever: SemanticRetriever;
  private config: Required<FewShotConfig>;
  private testCases: TestCase[] = [];

  constructor(retriever: SemanticRetriever, config: FewShotConfig) {
    this.retriever = retriever;
    this.config = {
      maxExamples: config.maxExamples ?? 3,
      diversityThreshold: config.diversityThreshold ?? 0.8,
      strategy: config.strategy ?? 'similarity',
      minSimilarity: config.minSimilarity ?? 0.6
    };
  }

  setTestCases(testCases: TestCase[]): void {
    this.testCases = testCases;
  }

  getConfig(): FewShotConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<FewShotConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  async select(query: string): Promise<SelectionResult> {
    const searchResults = await this.retriever.findSimilar(query, {
      limit: this.config.maxExamples * 2,
      threshold: this.config.minSimilarity
    });

    if (searchResults.length === 0) {
      return {
        query,
        examples: [],
        strategy: this.config.strategy,
        totalAvailable: this.testCases.length,
        coverage: 0,
        diversity: 0
      };
    }

    const filteredResults = searchResults.filter(
      r => r.similarity >= this.config.minSimilarity
    );

    let selectedExamples: SelectedExample[];

    switch (this.config.strategy) {
      case 'diversity':
        selectedExamples = this.selectWithDiversity(filteredResults);
        break;
      case 'coverage':
        selectedExamples = this.selectWithCoverage(filteredResults);
        break;
      case 'combined':
        selectedExamples = this.selectWithCombined(filteredResults);
        break;
      case 'similarity':
      default:
        selectedExamples = this.selectWithSimilarity(filteredResults);
        break;
    }

    const coverage = this.calculateCoverage(selectedExamples);
    const diversity = this.calculateDiversity(selectedExamples);

    return {
      query,
      examples: selectedExamples.slice(0, this.config.maxExamples),
      strategy: this.config.strategy,
      totalAvailable: this.testCases.length,
      coverage,
      diversity
    };
  }

  private selectWithSimilarity(results: SimilarityResult[]): SelectedExample[] {
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, this.config.maxExamples)
      .map(r => ({
        testCase: r.testCase,
        similarity: r.similarity,
        reason: 'High similarity to query'
      }));
  }

  private selectWithDiversity(results: SimilarityResult[]): SelectedExample[] {
    const selected: SelectedExample[] = [];
    const selectedIds = new Set<string>();

    for (const result of results.sort((a, b) => b.similarity - a.similarity)) {
      if (selected.length >= this.config.maxExamples) break;
      
      let isDiverse = true;
      for (const sel of selected) {
        const sim = this.retriever.calculateSimilarity(sel.testCase, result.testCase);
        if (sim > this.config.diversityThreshold) {
          isDiverse = false;
          break;
        }
      }

      if (isDiverse && !selectedIds.has(result.testCase.id)) {
        selected.push({
          testCase: result.testCase,
          similarity: result.similarity,
          reason: 'Selected for diversity'
        });
        selectedIds.add(result.testCase.id);
      }
    }

    return selected;
  }

  private selectWithCoverage(results: SimilarityResult[]): SelectedExample[] {
    const selected: SelectedExample[] = [];
    const coveredCategories = new Set<string>();
    
    for (const result of results.sort((a, b) => b.similarity - a.similarity)) {
      if (selected.length >= this.config.maxExamples) break;
      
      if (!coveredCategories.has(result.testCase.category)) {
        selected.push({
          testCase: result.testCase,
          similarity: result.similarity,
          reason: 'Selected for category coverage'
        });
        coveredCategories.add(result.testCase.category);
      } else if (selected.length < this.config.maxExamples) {
        selected.push({
          testCase: result.testCase,
          similarity: result.similarity,
          reason: 'Additional similar example'
        });
      }
    }

    return selected;
  }

  private selectWithCombined(results: SimilarityResult[]): SelectedExample[] {
    return this.selectWithCoverage(results);
  }

  private calculateCoverage(examples: SelectedExample[]): number {
    if (examples.length === 0) return 0;
    const categories = new Set(examples.map(e => e.testCase.category));
    const allCategories = new Set(this.testCases.map(t => t.category));
    return categories.size / Math.max(allCategories.size, 1);
  }

  private calculateDiversity(examples: SelectedExample[]): number {
    if (examples.length <= 1) return 0;
    
    let totalSim = 0;
    let count = 0;
    
    for (let i = 0; i < examples.length; i++) {
      for (let j = i + 1; j < examples.length; j++) {
        totalSim += this.retriever.calculateSimilarity(
          examples[i].testCase,
          examples[j].testCase
        );
        count++;
      }
    }
    
    const avgSim = count > 0 ? totalSim / count : 0;
    return 1 - avgSim;
  }
}
