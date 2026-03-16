/**
 * Collection Manager
 * 部门级Collection管理器
 */

import { ChromaVectorStore, createChromaStore } from './chroma-store';
import type { VectorStoreConfig, HNSWIndexConfig } from './vector-store';

export interface CollectionInfo {
  name: string;
  departmentId: string;
  projectId?: string;
  documentCount: number;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    departmentName: string;
    projectName?: string;
    description?: string;
  };
}

export interface CollectionCreateOptions {
  departmentId: string;
  departmentName: string;
  projectId?: string;
  projectName?: string;
  description?: string;
}

// HNSW默认配置
const DEFAULT_HNSW_CONFIG: HNSWIndexConfig = {
  M: 16,
  efConstruction: 200,
  efSearch: 100,
};

export class CollectionManager {
  private stores: Map<string, ChromaVectorStore> = new Map();

  /**
   * 生成Collection名称
   * 命名规范: {department}_{project}_knowledge
   */
  private generateCollectionName(options: CollectionCreateOptions): string {
    const { departmentId, projectId } = options;
    if (projectId) {
      return `${departmentId}_${projectId}_knowledge`;
    }
    return `${departmentId}_knowledge`;
  }

  /**
   * 获取或创建Collection
   */
  async getOrCreateCollection(
    options: CollectionCreateOptions
  ): Promise<ChromaVectorStore> {
    const collectionName = this.generateCollectionName(options);

    // 检查缓存
    if (this.stores.has(collectionName)) {
      return this.stores.get(collectionName)!;
    }

    // 创建新的store
    const store = createChromaStore();
    const config: VectorStoreConfig = {
      collectionName,
      dimension: 1024, // bge-m3维度
      distance: 'cosine',
    };

    await store.initialize(config, DEFAULT_HNSW_CONFIG);

    // 缓存store
    this.stores.set(collectionName, store);

    return store;
  }

  /**
   * 获取指定部门的Collection
   */
  async getDepartmentCollection(
    departmentId: string
  ): Promise<ChromaVectorStore | null> {
    const collectionName = `${departmentId}_knowledge`;
    return this.stores.get(collectionName) || null;
  }

  /**
   * 获取指定项目的Collection
   */
  async getProjectCollection(
    departmentId: string,
    projectId: string
  ): Promise<ChromaVectorStore | null> {
    const collectionName = `${departmentId}_${projectId}_knowledge`;
    return this.stores.get(collectionName) || null;
  }

  /**
   * 列出部门的所有Collection
   */
  async listDepartmentCollections(
    departmentId: string
  ): Promise<CollectionInfo[]> {
    const collections: CollectionInfo[] = [];

    for (const [name, store] of this.stores.entries()) {
      if (name.startsWith(`${departmentId}_`)) {
        const parts = name.split('_');
        const hasProject = parts.length === 3;

        collections.push({
          name,
          departmentId,
          projectId: hasProject ? parts[1] : undefined,
          documentCount: await this.getDocumentCount(store),
          createdAt: new Date(), // 实际应从元数据获取
          updatedAt: new Date(),
          metadata: {
            departmentName: parts[0],
            projectName: hasProject ? parts[1] : undefined,
          },
        });
      }
    }

    return collections;
  }

  /**
   * 获取Collection文档数量
   */
  private async getDocumentCount(store: ChromaVectorStore): Promise<number> {
    // 实际应查询ChromaDB collection.count()
    return 0;
  }

  /**
   * 删除Collection
   */
  async deleteCollection(
    departmentId: string,
    projectId?: string
  ): Promise<void> {
    const collectionName = projectId
      ? `${departmentId}_${projectId}_knowledge`
      : `${departmentId}_knowledge`;

    const store = this.stores.get(collectionName);
    if (store) {
      await store.close();
      this.stores.delete(collectionName);
    }
  }

  /**
   * 关闭所有Collection连接
   */
  async closeAll(): Promise<void> {
    for (const store of this.stores.values()) {
      await store.close();
    }
    this.stores.clear();
  }
}

// 单例实例
let globalCollectionManager: CollectionManager | null = null;

export function getCollectionManager(): CollectionManager {
  if (!globalCollectionManager) {
    globalCollectionManager = new CollectionManager();
  }
  return globalCollectionManager;
}

export function resetCollectionManager(): void {
  globalCollectionManager = null;
}
